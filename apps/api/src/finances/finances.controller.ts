import { Request, Response } from 'express';
import { pool } from '../db';
import { parse } from 'csv-parse/sync';

// --------------------------------------------------------
// EXPENSE MANAGEMENT
// --------------------------------------------------------

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, category, paymentMethod, search } = req.query;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

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
  try {
    const { type, description, category, amount, paymentMethod, vendor, date } = req.body;

    const query = `
      INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const params = [type, description, category, amount, paymentMethod, vendor, date];

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
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
    
    let query = 'SELECT * FROM revenue_ledger WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND revenue_date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND revenue_date <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ' ORDER BY revenue_date DESC';
    const result = await pool.query(query, params);

    const formattedRevenue = result.rows.map(row => ({
      id: row.id,
      date: new Date(row.revenue_date).toISOString().split('T')[0],
      amount: Number(row.gross_revenue),
      source: row.source || 'POS Import',
      batch: row.batch_id || '-'
    }));

    // Generate basic summary metrics
    const currentMonthResult = await pool.query(`SELECT SUM(gross_revenue) as total FROM revenue_ledger WHERE date_trunc('month', revenue_date) = date_trunc('month', current_date)`);
    const ytdResult = await pool.query(`SELECT SUM(gross_revenue) as total FROM revenue_ledger WHERE date_trunc('year', revenue_date) = date_trunc('year', current_date)`);

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
    const { period } = req.query; // e.g. Daily, Weekly, Monthly, Custom, Year to Date
    
    let dateFilter = '';
    if (period === 'Daily') dateFilter = `revenue_date = current_date`;
    else if (period === 'Weekly') dateFilter = `revenue_date >= date_trunc('week', current_date)`;
    else if (period === 'Monthly') dateFilter = `revenue_date >= date_trunc('month', current_date)`;
    else if (period === 'Year to Date') dateFilter = `revenue_date >= date_trunc('year', current_date)`;
    else dateFilter = `1=1`; // default to all time if custom or unrecognized

    const revenueResult = await pool.query(`SELECT COALESCE(SUM(gross_revenue), 0) as total FROM revenue_ledger WHERE ${dateFilter.replace('revenue_date', 'revenue_date')}`);
    
    // For expenses, we adjust the date filter string
    const expDateFilter = dateFilter.replace(/revenue_date/g, 'expense_date');

    const expensesResult = await pool.query(`
      SELECT 
        expense_type, 
        COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE ${expDateFilter} 
      GROUP BY expense_type
    `);

    const grossRevenue = Number(revenueResult.rows[0].total);
    let purchaseExpenses = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;

    expensesResult.rows.forEach(row => {
      const amt = Number(row.total);
      if (row.expense_type === 'Purchase') purchaseExpenses = amt;
      else if (row.expense_type === 'Fixed') fixedExpenses = amt;
      else if (row.expense_type === 'Variable') variableExpenses = amt;
    });

    const netProfit = grossRevenue - (purchaseExpenses + fixedExpenses + variableExpenses);
    const profitMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

    res.json({
      grossRevenue,
      purchaseExpenses,
      fixedExpenses,
      variableExpenses,
      netProfit,
      profitMargin
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

    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });

    let rowsParsed = 0;
    const batchId = 'BATCH_' + Date.now();

    for (const record of records) {
      // Expected CSV headers: Date, Gross Revenue, Source
      // E.g., 2026-05-19, 15000, Swiggy
      const dateStr = record['Date'] || record['date'];
      const amtStr = record['Gross Revenue'] || record['amount'] || record['Gross_Revenue'];
      const sourceStr = record['Source'] || record['source'] || 'Manual Import';

      if (dateStr && amtStr) {
        const query = `
          INSERT INTO revenue_ledger (revenue_date, gross_revenue, source, batch_id)
          VALUES ($1, $2, $3, $4)
        `;
        await pool.query(query, [dateStr, Number(amtStr), sourceStr, batchId]);
        rowsParsed++;
      }
    }

    res.status(200).json({
      message: 'POS Report imported successfully',
      rowsParsed,
      batchId
    });
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
    const { reportType, format } = req.query;

    if (format === 'excel' || format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', \`attachment; filename="\${reportType}_report.csv"\`);

      let csvData = '';

      if (reportType === 'expense') {
        const result = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC');
        csvData = 'Date,Type,Description,Category,Amount,Payment Method,Vendor\\n';
        result.rows.forEach(r => {
          csvData += \`\${r.expense_date.toISOString().split('T')[0]},\${r.expense_type},\${r.description},\${r.category},\${r.amount},\${r.payment_method},\${r.vendor}\\n\`;
        });
      } else if (reportType === 'pnl') {
        csvData = 'Metric,Amount\\n';
        const result = await pool.query('SELECT SUM(amount) as total, expense_type FROM expenses GROUP BY expense_type');
        const rev = await pool.query('SELECT SUM(gross_revenue) as total FROM revenue_ledger');
        csvData += \`Gross Revenue,\${rev.rows[0].total || 0}\\n\`;
        result.rows.forEach(r => {
          csvData += \`\${r.expense_type} Expenses,\${r.total}\\n\`;
        });
      } else {
        csvData = 'Column1,Column2\\nData1,Data2\\n'; // Mock for inventory, audit, etc.
      }

      return res.status(200).send(csvData);
    }

    // PDF generation mock
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      message: \`PDF generation for \${reportType} is supported. To get actual PDF, hook up pdfkit here.\`
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
