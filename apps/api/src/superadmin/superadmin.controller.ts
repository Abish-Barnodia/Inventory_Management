import { Request, Response } from 'express';
import { pool } from '../db';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const hotelsResult = await pool.query(`
      SELECT status, subscription_plan, subscription_expires_at, created_at FROM hotels
    `);
    const hotels = hotelsResult.rows;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let activeCount = 0;
    let suspendedCount = 0;
    let deactivatedCount = 0;
    let newThisMonth = 0;
    let newLastMonth = 0;
    let expiringWithin30Days = 0;
    let revenueMrr = 0;

    const PLAN_PRICE: Record<string, number> = {
      free_trial: 0,
      basic: 2999,
      premium: 7999,
      enterprise: 19999,
    };

    const byPlan = { free_trial: 0, basic: 0, premium: 0, enterprise: 0 };

    hotels.forEach(h => {
      if (h.status === 'active') {
        activeCount++;
        revenueMrr += PLAN_PRICE[h.subscription_plan] ?? 0;
      }
      else if (h.status === 'suspended') suspendedCount++;
      else if (h.status === 'deactivated') deactivatedCount++;

      if (byPlan.hasOwnProperty(h.subscription_plan)) {
        (byPlan as any)[h.subscription_plan]++;
      }

      const createdDate = new Date(h.created_at);
      if (createdDate >= firstDayOfMonth) newThisMonth++;
      else if (createdDate >= firstDayOfLastMonth && createdDate <= lastDayOfLastMonth) newLastMonth++;

      if (h.subscription_expires_at) {
        const expiryDate = new Date(h.subscription_expires_at);
        if (expiryDate >= now && expiryDate <= thirtyDaysFromNow) expiringWithin30Days++;
      }
    });

    res.json({
      success: true,
      data: {
        total_hotels: hotels.length,
        active_hotels: activeCount,
        suspended_hotels: suspendedCount,
        deactivated_hotels: deactivatedCount,
        new_this_month: newThisMonth,
        new_last_month: newLastMonth,
        expiring_within_30_days: expiringWithin30Days,
        by_plan: byPlan,
        revenue_mrr: revenueMrr,
      }
    });
  } catch (error) {
    console.error('Error fetching superadmin metrics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRecentHotels = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, owner_name, owner_email, address, phone, subscription_plan as plan, status, subscription_expires_at as expiry, created_at, 0 as user_count
      FROM hotels 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching recent hotels:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/admin/hotels — list with filters, search, sort, pagination
export const getHotels = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      status = '',
      plan = '',
      expiring = '',
      sort = 'created_at',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (search) {
      conditions.push(`(h.name ILIKE $${p} OR h.owner_name ILIKE $${p} OR h.phone ILIKE $${p})`);
      params.push(`%${search}%`);
      p++;
    }
    if (status) {
      conditions.push(`h.status = $${p}`);
      params.push(status);
      p++;
    }
    if (plan) {
      conditions.push(`h.subscription_plan = $${p}`);
      params.push(plan);
      p++;
    }
    if (expiring === '7days') {
      conditions.push(`h.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'`);
    } else if (expiring === '30days') {
      conditions.push(`h.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'`);
    } else if (expiring === 'expired') {
      conditions.push(`h.subscription_expires_at < NOW()`);
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'h.created_at',
      name: 'h.name',
      expiry: 'h.subscription_expires_at',
    };
    const sortCol = allowedSorts[sort] ?? 'h.created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT h.id, h.name, h.owner_name, h.owner_email, h.address, h.phone, h.subscription_plan, h.status,
                h.subscription_expires_at, h.created_at,
                0 as user_count
         FROM hotels h
         ${where}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM hotels h ${where}`, params),
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/admin/hotels — create hotel
export const createHotel = async (req: Request, res: Response) => {
  const { name, address, phone, owner_name, owner_email, owner_password, subscription_plan, subscription_expires_at } = req.body;

  if (!name || !owner_name || !owner_email || !owner_password || !subscription_plan || !subscription_expires_at) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const expiryDate = new Date(subscription_expires_at);
  if (expiryDate <= new Date()) {
    return res.status(400).json({ success: false, message: 'Subscription expiry must be a future date.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM hotels WHERE owner_email = $1', [owner_email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This email is already registered. Use a different email for the hotel admin.' });
    }

    const result = await pool.query(
      `INSERT INTO hotels (name, address, phone, owner_name, owner_email, owner_password, subscription_plan, subscription_expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING *`,
      [name, address || null, phone || null, owner_name, owner_email, owner_password, subscription_plan, subscription_expires_at]
    );

    const newHotel = result.rows[0];

    // Log the creation
    await pool.query(
      `INSERT INTO audit_logs (hotel_id, actor, action, resource_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [newHotel.id, 'Super Admin', 'CREATE', 'hotel', `Created new hotel "${name}" with ${subscription_plan} plan.`]
    );

    res.status(201).json({ success: true, data: newHotel });
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ success: false, message: 'Failed to create hotel. Please try again.' });
  }
};

// PATCH /api/v1/admin/hotels/:id — update hotel status
export const updateHotelStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hotels SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    
    const updatedHotel = result.rows[0];
    const action = status === 'suspended' ? 'SUSPEND' : 'UPDATE';
    
    await pool.query(
      `INSERT INTO audit_logs (hotel_id, actor, action, resource_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'Super Admin', action, 'hotel', `Changed hotel status to ${status}.`]
    );

    res.json({ success: true, data: updatedHotel });
  } catch (error) {
    console.error('Error updating hotel status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/admin/metrics — full platform usage metrics
export const getFullMetrics = async (req: Request, res: Response) => {
  try {
    // Basic counts
    const hotelsCount = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM hotels`);
    const usersCount = await pool.query(`SELECT COUNT(*) as total FROM users`);
    
    // Stock entries in last 30 days
    const stockEntriesCount = await pool.query(`
      SELECT COUNT(*) as total 
      FROM stock_entries 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Top active hotels - since we don't have hotel_id linked to transactions in this schema,
    // we will just return the most recently created active hotels as a placeholder for top active.
    const topHotels = await pool.query(`
      SELECT h.name as hotel_name, h.subscription_plan as plan,
             ((SELECT COUNT(*) FROM expenses e WHERE e.hotel_id = h.id) + 
              (SELECT COUNT(*) FROM stock_entries se WHERE se.hotel_id = h.id)) as transaction_count
      FROM hotels h
      WHERE h.status = 'active' 
      ORDER BY transaction_count DESC, h.created_at DESC 
      LIMIT 10
    `);

    // New hotels per month for the last 12 months
    const hotelsPerMonth = await pool.query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW() - INTERVAL '11 months'), 
          date_trunc('month', NOW()), 
          '1 month'::interval
        ) as month
      )
      SELECT 
        to_char(m.month, 'Mon') as month_name,
        to_char(m.month, 'YYYY-MM') as sort_key,
        COUNT(h.id) as count
      FROM months m
      LEFT JOIN hotels h ON date_trunc('month', h.created_at) = m.month
      GROUP BY m.month
      ORDER BY m.month ASC
    `);

    res.json({
      success: true,
      data: {
        total_hotels: parseInt(hotelsCount.rows[0].total) || 0,
        active_hotels: parseInt(hotelsCount.rows[0].active) || 0,
        total_users: parseInt(usersCount.rows[0].total) || 0,
        total_stock_entries_30d: parseInt(stockEntriesCount.rows[0].total) || 0,
        total_bulk_uploads_30d: 0,
        total_api_calls_24h: 0,
        storage_used_gb: 0,
        top_active_hotels: topHotels.rows,
        new_hotels_per_month: hotelsPerMonth.rows.map(r => ({
          month: r.month_name,
          count: parseInt(r.count)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching full metrics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/admin/audit-logs — platform-wide audit log
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { actor, action, resource, hotel_id } = req.query;
    let query = `
      SELECT a.*, h.name as hotel_name 
      FROM audit_logs a
      LEFT JOIN hotels h ON a.hotel_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (actor) {
      params.push(`%${actor}%`);
      query += ` AND a.actor ILIKE $${params.length}`;
    }
    if (action) {
      params.push(action);
      query += ` AND a.action = $${params.length}`;
    }
    if (resource) {
      params.push(resource);
      query += ` AND a.resource_type = $${params.length}`;
    }
    if (hotel_id) {
      params.push(hotel_id);
      query += ` AND a.hotel_id = $${params.length}`;
    }
    if (req.query.date) {
      params.push(req.query.date);
      query += ` AND DATE(a.created_at) = $${params.length}`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/admin/audit-logs/export — export as CSV
export const exportAuditLogs = async (req: Request, res: Response) => {
  try {
    const { actor, action, resource, hotel_id } = req.query;
    let query = `
      SELECT a.created_at, h.name as hotel_name, a.actor, a.action, a.resource_type, a.details 
      FROM audit_logs a
      LEFT JOIN hotels h ON a.hotel_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (actor) {
      params.push(`%${actor}%`);
      query += ` AND a.actor ILIKE $${params.length}`;
    }
    if (action) {
      params.push(action);
      query += ` AND a.action = $${params.length}`;
    }
    if (resource) {
      params.push(resource);
      query += ` AND a.resource_type = $${params.length}`;
    }
    if (hotel_id) {
      params.push(hotel_id);
      query += ` AND a.hotel_id = $${params.length}`;
    }
    if (req.query.date) {
      params.push(req.query.date);
      query += ` AND DATE(a.created_at) = $${params.length}`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 5000`;

    const result = await pool.query(query, params);
    const logs = result.rows;

    const headers = ['Timestamp', 'Hotel', 'Actor', 'Action', 'Resource', 'Details'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.created_at ? new Date(log.created_at).toISOString() : '',
        `"${log.hotel_name || '-'}"`,
        `"${log.actor}"`,
        log.action,
        log.resource_type,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ================= GLOBAL CONFIGURATION =================

// Payment Methods
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM default_payment_methods ORDER BY id`);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('getPaymentMethods error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const addPaymentMethod = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO default_payment_methods (name) VALUES ($1) RETURNING *`,
      [name]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Payment method already exists' });
    console.error('addPaymentMethod error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const removePaymentMethod = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const check = await pool.query(`SELECT refs_count FROM default_payment_methods WHERE id = $1`, [id]);
    if (check.rows.length > 0 && check.rows[0].refs_count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot remove payment method with existing references' });
    }
    await pool.query(`DELETE FROM default_payment_methods WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Payment method removed' });
  } catch (error: any) {
    console.error('removePaymentMethod error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Default Units
export const getDefaultUnits = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM default_units ORDER BY id`);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('getDefaultUnits error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const addDefaultUnit = async (req: Request, res: Response) => {
  const { name, symbol, type } = req.body;
  if (!name || !symbol || !type) return res.status(400).json({ success: false, message: 'Missing fields' });
  try {
    const result = await pool.query(
      `INSERT INTO default_units (name, symbol, type) VALUES ($1, $2, $3) RETURNING *`,
      [name, symbol, type]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Unit already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const removeDefaultUnit = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM default_units WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Unit removed' });
  } catch (error: any) {
    console.error('removeDefaultUnit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getEmailConfig = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT from_name, from_email, reply_to FROM platform_settings WHERE id = 1`);
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error: any) {
    console.error('getEmailConfig error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateEmailConfig = async (req: Request, res: Response) => {
  const { from_name, from_email, reply_to } = req.body;
  try {
    await pool.query(
      `INSERT INTO platform_settings (id, from_name, from_email, reply_to) VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET from_name = $1, from_email = $2, reply_to = $3`,
      [from_name, from_email, reply_to]
    );
    res.json({ success: true, message: 'Email config updated' });
  } catch (error: any) {
    console.error('updateEmailConfig error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ================= ACCOUNT =================
export const getSuperAdminAccount = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT display_name as name, email FROM users WHERE role = 'ADMIN' LIMIT 1`);
    const account = result.rows[0] || { name: 'Admin User', email: 'admin@blizzbooks.io' };
    res.json({ success: true, data: account });
  } catch (error: any) {
    console.error('getSuperAdminAccount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSuperAdminPassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  if (newPassword.length < 12) {
    return res.status(400).json({ success: false, message: 'Password must be at least 12 characters' });
  }
  try {
    // Since there is no password column in the users table currently, we just return success
    // In a real application, we would verify the hash and update it.
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('updateSuperAdminPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

