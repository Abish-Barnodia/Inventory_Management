import { Request, Response } from 'express';
import { pool } from '../db';

export const getAdminDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] || 'all';

    // 1. Today's Revenue (bills does not have hotel_id yet)
    const todayRevenueQuery = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as revenue 
       FROM bills 
       WHERE DATE(created_at) = CURRENT_DATE AND status IN ('completed', 'printed')`
    );
    const todayRevenue = parseFloat(todayRevenueQuery.rows[0].revenue);

    // 2. This Month's P&L (Revenue - Expenses)
    const monthRevenueQuery = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as revenue 
       FROM bills 
       WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) AND status IN ('completed', 'printed')`
    );
    
    let monthExpensesQueryStr = `SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)`;
    let expensesParams: any[] = [];
    if (hotelId && hotelId !== 'all') {
      monthExpensesQueryStr += ` AND hotel_id = $1`;
      expensesParams.push(hotelId);
    }
    const monthExpensesQuery = await pool.query(monthExpensesQueryStr, expensesParams);

    const monthRevenue = parseFloat(monthRevenueQuery.rows[0].revenue);
    const monthExpenses = parseFloat(monthExpensesQuery.rows[0].expenses);
    const monthPL = monthRevenue - monthExpenses;

    // 3. Inventory Items in stock (items table)
    const inStockQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM items 
       WHERE stock_quantity > 0`
    );
    const inStockCount = parseInt(inStockQuery.rows[0].count);

    // 4. Pending Requests (stock_requests table)
    const pendingRequestsQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM stock_requests 
       WHERE status = 'pending'`
    );
    const pendingRequestsCount = parseInt(pendingRequestsQuery.rows[0].count);

    // 5. Low Stock Alerts (items where stock <= 5 since no minimum_stock exists)
    const lowStockQuery = await pool.query(
      `SELECT COUNT(*) as count 
       FROM items 
       WHERE stock_quantity <= 5 AND is_active = true`
    );
    const lowStockCount = parseInt(lowStockQuery.rows[0].count);

    // 6. Top Expense Categories This Month
    let topExpensesQueryStr = `
       SELECT category, SUM(amount) as total 
       FROM expenses 
       WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)
    `;
    if (hotelId && hotelId !== 'all') {
      topExpensesQueryStr += ` AND hotel_id = $1`;
    }
    topExpensesQueryStr += ` GROUP BY category ORDER BY total DESC LIMIT 5`;
    const topExpensesQuery = await pool.query(topExpensesQueryStr, expensesParams);

    // 7. Recent Stock Requests
    const recentRequestsQuery = await pool.query(
      `SELECT r.id, r.department as department_name, r.status, r.created_at,
              (SELECT item_name FROM stock_request_items WHERE request_id = r.id LIMIT 1) as item_name,
              (SELECT quantity_requested FROM stock_request_items WHERE request_id = r.id LIMIT 1) as quantity,
              'pcs' as unit
       FROM stock_requests r
       ORDER BY r.created_at DESC
       LIMIT 5`
    );

    // 8. Low Stock Details
    const lowStockDetailsQuery = await pool.query(
      `SELECT name, stock_quantity as current_stock, 5 as minimum_stock, 'pcs' as unit
       FROM items
       WHERE stock_quantity <= 5 AND is_active = true
       ORDER BY stock_quantity ASC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        today_revenue: todayRevenue,
        month_pl: monthPL,
        in_stock_items: inStockCount,
        pending_requests: pendingRequestsCount,
        low_stock_count: lowStockCount,
        top_expenses: topExpensesQuery.rows.map(r => ({ category: r.category || 'Uncategorized', total: parseFloat(r.total) })),
        recent_requests: recentRequestsQuery.rows,
        low_stock_items: lowStockDetailsQuery.rows
      }
    });

  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
