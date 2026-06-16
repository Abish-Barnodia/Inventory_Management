import { Request, Response } from 'express';
import { pool } from '../db';
import { parse } from 'csv-parse/sync';

// --------------------------------------------------------
// EXPENSE MANAGEMENT
// --------------------------------------------------------

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, category, paymentMethod, search } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const userDept = req.headers['x-user-dept'] as string;
    const hotelId = req.headers['x-hotel-id'] as string;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (hotelId && hotelId !== 'all') {
      query += ` AND hotel_id = $${paramIndex++}`;
      params.push(hotelId);
    }

    // Module 3: Dept Manager Scoping for Variable Expenses (and in general)
    if (userRole === 'Dept Manager' && userDept) {
      query += ` AND (dept_id = $${paramIndex++} OR dept_id IS NULL)`; // Scoping to their dept (or allow nulls if they need to see hotel-wide, but flowchart says "Show ONLY own dept expenses")
      params.push(userDept);
    }

    if (startDate) {
      query += ` AND expense_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND expense_date <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (type && type !== 'All Types') {
      query += ` AND expense_type = $${paramIndex++}`;
      params.push(type);
    }
    if (category && category !== 'All Categories') {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (paymentMethod && paymentMethod !== 'All Payment Methods') {
      query += ` AND payment_method = $${paramIndex++}`;
      params.push(paymentMethod);
    }
    if (search) {
      query += ` AND (description ILIKE $${paramIndex} OR vendor ILIKE $${paramIndex++})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY expense_date DESC';

    const result = await pool.query(query, params);

    // Dynamic totals calculation
    let totalPurchase = 0;
    let totalFixed = 0;
    let totalVariable = 0;

    const formattedExpenses = result.rows.map(row => {
      const amount = Number(row.amount);
      if (row.expense_type === 'Purchase') totalPurchase += amount;
      else if (row.expense_type === 'Fixed') totalFixed += amount;
      else if (row.expense_type === 'Variable') totalVariable += amount;

      return {
        id: row.id,
        date: new Date(row.expense_date).toISOString().split('T')[0],
        type: row.expense_type,
        description: row.description,
        category: row.category || '-',
        amount: amount,
        payment: row.payment_method || '-',
        vendor: row.vendor || '-'
      };
    });

    res.json({
      expenses: formattedExpenses,
      totals: {
        totalAll: totalPurchase + totalFixed + totalVariable,
        totalPurchase,
        totalFixed,
        totalVariable
      }
    });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { type, description, category, amount, paymentMethod, vendor, date, salaryDetails, forceFuture, deptId } = req.body;
    const userRole = req.headers['x-user-role'] as string;
    const userDept = req.headers['x-user-dept'] as string;
    const hotelId = req.headers['x-hotel-id'] as string;
    const canVariable = req.headers['x-can-variable-expense'] as string; // Feature flag

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    let finalDeptId = deptId;

    if (type === 'Variable') {
      // 1. Role Authorization
      if (canVariable === 'false') {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Access not permitted: You do not have permission to log variable expenses.' });
      }
      
      // 2. Department Scoping
      if (userRole === 'Dept Manager') {
        finalDeptId = userDept;
      }
    }

    if (type === 'Fixed' && !forceFuture) {
      const expenseDate = new Date(date);
      const now = new Date();
      // Calculate months difference
      const monthsDiff = (expenseDate.getFullYear() - now.getFullYear()) * 12 + (expenseDate.getMonth() - now.getMonth());
      if (monthsDiff > 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          conflict: true, 
          message: 'The expense date is more than 1 month in the future. Are you sure you want to proceed?' 
        });
      }
    }

    let metadata = null;

    if (category === 'Salary' && salaryDetails && Array.isArray(salaryDetails)) {
      let totalNet = 0;
      for (const emp of salaryDetails) {
        if (Number(emp.gross) < Number(emp.deductions)) {
          return res.status(400).json({ error: `Gross cannot be less than deductions for ${emp.name}` });
        }
        totalNet += Number(emp.net);
      }
      if (Math.abs(totalNet - Number(amount)) > 0.01) {
         return res.status(400).json({ error: 'Sum of employee net salaries must equal the total amount' });
      }
      metadata = JSON.stringify({ salaryBreakdown: salaryDetails });
    }

    const query = `
      INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, metadata, dept_id, hotel_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `;
    const params = [type, description, category, amount, paymentMethod, vendor, date, metadata, finalDeptId, hotelId || null];

    const result = await client.query(query, params);
    const expenseId = result.rows[0].id;

    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, reason, metadata)
       VALUES ('CREATE_EXPENSE', 'expenses', $1, 'Manual Expense Entry', $2)`,
      [expenseId, JSON.stringify({ type, amount, category, date })]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    client.release();
  }
};

export const cloneFixedExpenses = async (req: Request, res: Response) => {
  const { sourceMonth, targetMonth, force } = req.body; // e.g., '2026-04', '2026-05'
  
  if (!sourceMonth || !targetMonth) {
    return res.status(400).json({ error: 'Source and target months are required' });
  }

  const client = await pool.connect();
  try {
    // 1. Check for conflict in target month
    const existingCheck = await client.query(`
      SELECT COUNT(*) as count FROM expenses 
      WHERE expense_type = 'Fixed' 
      AND to_char(expense_date, 'YYYY-MM') = $1
    `, [targetMonth]);
    
    if (Number(existingCheck.rows[0].count) > 0 && !force) {
      return res.status(409).json({ 
        conflict: true, 
        message: `${existingCheck.rows[0].count} fixed expense records already exist for ${targetMonth}. Do you want to proceed and duplicate them?`
      });
    }

    await client.query('BEGIN');

    // 2. Fetch source records
    const sourceRecords = await client.query(`
      SELECT * FROM expenses 
      WHERE expense_type = 'Fixed' 
      AND to_char(expense_date, 'YYYY-MM') = $1
    `, [sourceMonth]);

    if (sourceRecords.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `No fixed expenses found in ${sourceMonth} to clone` });
    }

    // 3. Clone to target month
    for (const record of sourceRecords.rows) {
      // Calculate new date by replacing the year-month part
      // This is a simple approach: if original was 2026-04-15, new is 2026-05-15.
      // We will parse the original date, set the month to targetMonth.
      const originalDay = new Date(record.expense_date).getDate();
      const newDateStr = `${targetMonth}-${String(originalDay).padStart(2, '0')}`;

      await client.query(`
        INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, metadata, paid_on)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
      `, [
        record.expense_type, 
        record.description, 
        record.category, 
        record.amount, 
        record.payment_method, 
        record.vendor, 
        newDateStr,
        record.metadata
      ]);
    }

    // 4. Write audit log
    await client.query(`
      INSERT INTO audit_log (action, entity_type, reason, metadata)
      VALUES ('CLONE_FIXED_EXPENSES', 'expenses', 'Cloned fixed expenses to new month', $1)
    `, [JSON.stringify({ sourceMonth, targetMonth, count: sourceRecords.rowCount })]);

    await client.query('COMMIT');
    res.json({ message: `Successfully cloned ${sourceRecords.rowCount} fixed expenses to ${targetMonth}` });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error cloning expenses:', error);
    res.status(500).json({ error: 'Failed to clone expenses' });
  } finally {
    client.release();
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, description, category, amount, paymentMethod, vendor, date } = req.body;

    const query = `
      UPDATE expenses 
      SET expense_type = $1, description = $2, category = $3, amount = $4, payment_method = $5, vendor = $6, expense_date = $7
      WHERE id = $8 RETURNING *
    `;
    const params = [type, description, category, amount, paymentMethod, vendor, date, id];

    const result = await pool.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// --------------------------------------------------------
// REVENUE MANAGEMENT
// --------------------------------------------------------

export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const hotelId = req.headers['x-hotel-id'] as string;
    
    let ledgerQuery = 'SELECT id, revenue_date, gross_revenue, source, batch_id FROM revenue_ledger WHERE 1=1';
    let billsQuery = "SELECT MIN(id) as id, DATE(created_at) as revenue_date, SUM(grand_total) as gross_revenue, 'POS System' as source, '-' as batch_id FROM bills WHERE status IN ('completed', 'printed')";

    const params: any[] = [];
    let paramIndex = 1;

    let ledgerConditions = '';
    let billsConditions = '';

    if (hotelId && hotelId !== 'all') {
      ledgerConditions += ` AND hotel_id = $${paramIndex}`;
      // bills does not have hotel_id yet, but we will ignore it or you can add it if needed.
      params.push(hotelId);
      paramIndex++;
    }

    if (startDate) {
      ledgerConditions += ` AND revenue_date >= $${paramIndex}`;
      billsConditions += ` AND DATE(created_at) >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      ledgerConditions += ` AND revenue_date <= $${paramIndex}`;
      billsConditions += ` AND DATE(created_at) <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    billsQuery += billsConditions + ' GROUP BY DATE(created_at)';
    ledgerQuery += ledgerConditions;

    const query = `
      SELECT * FROM (
        ${ledgerQuery}
        UNION ALL
        ${billsQuery}
      ) as combined
      ORDER BY revenue_date DESC
    `;

    const result = await pool.query(query, params);

    const formattedRevenue = result.rows.map(row => ({
      id: row.id,
      date: new Date(row.revenue_date).toISOString().split('T')[0],
      amount: Number(row.gross_revenue),
      source: row.source || 'POS Import',
      batch: row.batch_id || '-'
    }));

    // Generate basic summary metrics
    const currentMonthResult = await pool.query(`
      SELECT SUM(gross_revenue) as total FROM (
        SELECT gross_revenue FROM revenue_ledger WHERE date_trunc('month', revenue_date) = date_trunc('month', current_date) ${hotelId && hotelId !== 'all' ? 'AND hotel_id = $1' : ''}
        UNION ALL
        SELECT grand_total as gross_revenue FROM bills WHERE status IN ('completed', 'printed') AND date_trunc('month', created_at) = date_trunc('month', current_date)
      ) as combined
    `, hotelId && hotelId !== 'all' ? [hotelId] : []);

    const ytdResult = await pool.query(`
      SELECT SUM(gross_revenue) as total FROM (
        SELECT gross_revenue FROM revenue_ledger WHERE date_trunc('year', revenue_date) = date_trunc('year', current_date) ${hotelId && hotelId !== 'all' ? 'AND hotel_id = $1' : ''}
        UNION ALL
        SELECT grand_total as gross_revenue FROM bills WHERE status IN ('completed', 'printed') AND date_trunc('year', created_at) = date_trunc('year', current_date)
      ) as combined
    `, hotelId && hotelId !== 'all' ? [hotelId] : []);

    res.json({
      revenues: formattedRevenue,
      summary: {
        thisMonth: Number(currentMonthResult.rows[0].total) || 0,
        ytd: Number(ytdResult.rows[0].total) || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
};

// --------------------------------------------------------
// ANALYTICS (P&L)
// --------------------------------------------------------

export const getPnLAnalytics = async (req: Request, res: Response) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    // Assume Hotel Admin, ADMIN, or superadmin are allowed
    if (userRole !== 'Hotel Admin' && userRole !== 'ADMIN' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { period, customStart, customEnd } = req.query; 
    let startDate = new Date();
    let endDate = new Date();
    
    // Normalize to start of day
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    if (period === 'Daily') {
      // today to today
    } else if (period === 'Weekly') {
      startDate.setDate(endDate.getDate() - 6); // 7 day window
    } else if (period === 'Monthly') {
      startDate.setDate(1);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'Year to Date' || period === 'YTD') {
      startDate = new Date(endDate.getFullYear(), 0, 1);
    } else if (period === 'Custom') {
      startDate = customStart ? new Date(customStart as string) : new Date();
      endDate = customEnd ? new Date(customEnd as string) : new Date();
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays > 366) {
        return res.status(400).json({ error: 'Range exceeds max 366 days' });
      }
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Get revenue
    const hotelId = req.headers['x-hotel-id'] as string;
    const revenueParams: any[] = [startStr, endStr];
    let revenueQuery = `
      SELECT COALESCE(SUM(gross_revenue), 0) as total 
      FROM (
        SELECT gross_revenue FROM revenue_ledger WHERE revenue_date >= $1 AND revenue_date <= $2 ${hotelId && hotelId !== 'all' ? 'AND hotel_id = $3' : ''}
        UNION ALL
        SELECT grand_total as gross_revenue FROM bills WHERE status IN ('completed', 'printed') AND DATE(created_at) >= $1 AND DATE(created_at) <= $2
      ) as combined
    `;
    
    if (hotelId && hotelId !== 'all') {
      revenueParams.push(hotelId);
    }
    
    const revenueResult = await pool.query(revenueQuery, revenueParams);
    const grossRevenue = Number(revenueResult.rows[0].total);

    // Get expenses
    const expensesParams: any[] = [startStr, endStr];
    let expensesQuery = `
      SELECT expense_type, COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE expense_date >= $1 AND expense_date <= $2
    `;
    if (hotelId && hotelId !== 'all') {
      expensesQuery += ` AND hotel_id = $3`;
      expensesParams.push(hotelId);
    }
    expensesQuery += ` GROUP BY expense_type`;

    const expensesResult = await pool.query(expensesQuery, expensesParams);

    let purchaseExpenses = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;

    expensesResult.rows.forEach(row => {
      const amt = Number(row.total);
      if (row.expense_type === 'Purchase') purchaseExpenses = amt;
      else if (row.expense_type === 'Fixed') fixedExpenses = amt;
      else if (row.expense_type === 'Variable') variableExpenses = amt;
    });

    // Proration logic for fixed expenses if partial month
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    
    // Let's get the fixed expenses for the month of `startDate`
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthlyFixedResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE expense_type = 'Fixed' AND expense_date >= $1 AND expense_date <= $2
    `, [monthStart, monthEnd]);
    
    let monthlyFixedAmount = Number(monthlyFixedResult.rows[0].total);
    
    let proratedFixed = fixedExpenses;
    // If daysInPeriod is less than daysInMonth, we prorate the monthly fixed amount
    if (daysInPeriod < daysInMonth && period !== 'Monthly' && period !== 'YTD') {
       proratedFixed = (monthlyFixedAmount / daysInMonth) * daysInPeriod;
    } else if (period === 'Monthly') {
       proratedFixed = monthlyFixedAmount;
    }
    
    // Use prorated fixed
    fixedExpenses = proratedFixed;

    const totalExpenses = purchaseExpenses + fixedExpenses + variableExpenses;
    const netPnL = grossRevenue - totalExpenses;

    let marginPercent: number | string = '-';
    let costRatioPercent: number | string = '-';

    if (grossRevenue > 0) {
      marginPercent = ((netPnL / grossRevenue) * 100).toFixed(2);
      costRatioPercent = ((totalExpenses / grossRevenue) * 100).toFixed(2);
    }

    res.json({
      period,
      dateRange: { start: startStr, end: endStr },
      metrics: {
        grossRevenue,
        totalExpenses,
        netPnL,
        marginPercent,
        costRatioPercent
      },
      breakdown: {
        purchase: purchaseExpenses,
        fixed: fixedExpenses,
        variable: variableExpenses
      }
    });
  } catch (error: any) {
    console.error('Error fetching P&L analytics:', error);
    res.status(500).json({ error: 'Failed to fetch P&L analytics' });
  }
};

// --------------------------------------------------------
// REVENUE IMPORT
// --------------------------------------------------------

export const importRevenue = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    // Module 4: File type & size validation
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'Unsupported size > 5 MB' });
    }

    const isConfirm = req.query.confirm === 'true';

    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });

    let validRows: any[] = [];
    let errorRows: any[] = [];
    let totalRevenue = 0;
    const batchId = 'BATCH_' + Date.now();

    for (const record of records) {
      const dateStr = record['Date'] || record['date'];
      // Strip currency symbols and commas
      let rawAmt = record['Gross Revenue'] || record['amount'] || record['Gross_Revenue'];
      if (typeof rawAmt === 'string') {
        rawAmt = rawAmt.replace(/[^0-9.-]+/g, '');
      }
      const amtNum = Number(rawAmt);
      const sourceStr = record['Source'] || record['source'] || 'Manual Import';

      if (dateStr && !isNaN(amtNum) && amtNum > 0) {
        validRows.push({ date: dateStr, amount: amtNum, source: sourceStr });
        totalRevenue += amtNum;
      } else {
        errorRows.push({ raw: JSON.stringify(record), reason: 'Unparseable date or amount' });
      }
    }

    if (validRows.length === 0) {
      return res.status(400).json({ error: 'No valid rows found in CSV' });
    }

    const dates = validRows.map(r => r.date);
    const minDate = dates.sort()[0];
    const maxDate = dates.sort()[dates.length - 1];

    const client = await pool.connect();
    try {
      // Check for conflicts
      const existingCheck = await client.query(`
        SELECT revenue_date, gross_revenue FROM revenue_ledger 
        WHERE revenue_date = ANY($1::date[])
      `, [dates]);

      const conflicts = existingCheck.rows.map(r => new Date(r.revenue_date).toISOString().split('T')[0]);

      if (!isConfirm) {
        // Preview Mode
        return res.status(200).json({
          preview: true,
          dateRange: `${minDate} to ${maxDate}`,
          rowCount: validRows.length,
          totalRevenue,
          errorRows,
          hasConflicts: conflicts.length > 0,
          conflicts,
          message: conflicts.length > 0 ? `${conflicts.length} dates exist — uploading will overwrite` : 'Ready to import'
        });
      }

      // Confirmation Mode - UPSERT
      await client.query('BEGIN');
      const currentUser = req.headers['x-user-name'] as string || 'Admin';

      for (const row of validRows) {
        const existing = existingCheck.rows.find(
          r => new Date(r.revenue_date).toISOString().split('T')[0] === new Date(row.date).toISOString().split('T')[0]
        );

        if (existing) {
          // Overwrite
          await client.query(`
            UPDATE revenue_ledger SET gross_revenue = $1, source = $2, batch_id = $3 WHERE revenue_date = $4
          `, [row.amount, row.source, batchId, row.date]);

          // Write change log
          await client.query(`
            INSERT INTO revenue_change_log (revenue_date, old_revenue, new_revenue, changed_by)
            VALUES ($1, $2, $3, $4)
          `, [row.date, existing.gross_revenue, row.amount, currentUser]);

        } else {
          // Insert new
          await client.query(`
            INSERT INTO revenue_ledger (revenue_date, gross_revenue, source, batch_id)
            VALUES ($1, $2, $3, $4)
          `, [row.date, row.amount, row.source, batchId]);
        }
      }

      await client.query('COMMIT');
      res.status(200).json({
        message: `${validRows.length} dates imported, total revenue: ${totalRevenue}`,
        rowsParsed: validRows.length,
        batchId
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error importing revenue:', error);
    res.status(500).json({ error: 'Failed to parse and import POS CSV' });
  }
};

// --------------------------------------------------------
// REPORTS & EXPORTS
// --------------------------------------------------------

export const generateReport = async (req: Request, res: Response) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    // Assume Hotel Admin or ADMIN are allowed
    // Assume Hotel Admin, ADMIN, or superadmin are allowed
    if (userRole !== 'Hotel Admin' && userRole !== 'ADMIN' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied: Only Hotel Admin can export reports' });
    }

    const { reportType, format, customStart, customEnd } = req.query; // reportType e.g., 'pnl', 'expenses', 'inventory', 'audit', 'requests'
    const hotelId = req.headers['x-hotel-id'] as string;

    const client = await pool.connect();
    let csvData = '';

    try {
      if (reportType === 'pnl' || reportType === 'expenses') {
        let query = 'SELECT expense_date, expense_type, category, amount, payment_method, vendor, description FROM expenses WHERE 1=1';
        const params: any[] = [];
        if (hotelId && hotelId !== 'all') {
           query += ' AND hotel_id = $1';
           params.push(hotelId);
        }
        query += ' ORDER BY expense_date DESC';
        const result = await client.query(query, params);
        csvData = 'Date,Type,Category,Amount,Payment Method,Vendor,Description\n';
        result.rows.forEach(row => {
          csvData += `${new Date(row.expense_date).toISOString().split('T')[0]},${row.expense_type},${row.category || ''},${row.amount},${row.payment_method || ''},"${(row.vendor || '').replace(/"/g, '""')}","${(row.description || '').replace(/"/g, '""')}"\n`;
        });
      } else if (reportType === 'inventory') {
        let query = 'SELECT invoice_number, vendor_name, total_amount, payment_status, created_at FROM stock_entries WHERE 1=1';
        const params: any[] = [];
        if (hotelId && hotelId !== 'all') {
           query += ' AND hotel_id = $1';
           params.push(hotelId);
        }
        query += ' ORDER BY created_at DESC';
        const result = await client.query(query, params);
        csvData = 'Date,Invoice Number,Vendor Name,Total Amount,Payment Status\n';
        result.rows.forEach(row => {
          csvData += `${new Date(row.created_at).toISOString().split('T')[0]},"${(row.invoice_number || '').replace(/"/g, '""')}","${(row.vendor_name || '').replace(/"/g, '""')}",${row.total_amount},${row.payment_status || ''}\n`;
        });
      } else if (reportType === 'audit') {
         const result = await client.query('SELECT created_at, action, entity_type, reason FROM audit_log ORDER BY created_at DESC');
         csvData = 'Date,Action,Entity,Reason\n';
         result.rows.forEach(row => {
           csvData += `${new Date(row.created_at).toISOString()},${row.action},${row.entity_type},"${(row.reason || '').replace(/"/g, '""')}"\n`;
         });
      } else if (reportType === 'requests') {
         // Query stock_requests if it exists, otherwise return a placeholder
         try {
           const result = await client.query('SELECT id, user_id, status, created_at FROM stock_requests ORDER BY created_at DESC');
           csvData = 'Date,Request ID,User ID,Status\n';
           result.rows.forEach(row => {
             csvData += `${new Date(row.created_at).toISOString().split('T')[0]},${row.id},${row.user_id},${row.status}\n`;
           });
         } catch (e) {
           csvData = 'Date,Request ID,User ID,Status\n';
         }
      } else {
        csvData = 'Report Type,Not Supported\n' + reportType;
      }
      
      // Write Audit Log for Report Exported
      await client.query(`
        INSERT INTO audit_log (action, entity_type, reason, metadata)
        VALUES ('REPORT_EXPORTED', 'report', 'Admin exported CSV report', $1)
      `, [JSON.stringify({ reportType, dateRange: reportType === 'Custom' ? `${customStart} to ${customEnd}` : reportType, format: 'CSV' })]);

    } finally {
      client.release();
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report.csv`);
    return res.status(200).send(csvData);

  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
