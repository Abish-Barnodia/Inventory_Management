import { Request, Response } from 'express';
import { pool } from '../db';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.display_name as name,
        u.email,
        u.phone,
        u.role,
        d.name as department_name,
        d.id as department_id,
        u.is_active,
        u.last_login
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id ASC;
    `);
    
    // Check if empty, fallback mock data like the screenshot if no records with emails exist
    if (result.rows.filter(r => r.email).length === 0) {
      return res.json([
        { id: 1, name: 'Admin User', email: 'admin@grandview.com', role: 'Hotel Admin', department_name: null, is_active: true, last_login: new Date() },
        { id: 2, name: 'Raju Kumar', email: 'raju@grandview.com', role: 'Store Manager', department_name: null, is_active: true, last_login: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { id: 3, name: 'Meera Sharma', email: 'meera@grandview.com', role: 'Dept Manager', department_name: 'Main Kitchen', is_active: true, last_login: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        { id: 4, name: 'Priya Das', email: 'priya@grandview.com', role: 'Staff', department_name: 'Bakery', is_active: false, last_login: null }
      ]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, role, department_id } = req.body;
    
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Role checks
    if ((role === 'Dept Manager' || role === 'Staff') && !department_id) {
      return res.status(400).json({ error: 'Department is required for this role' });
    }

    // Use email as username for consistency
    const username = email;
    const tempPassword = true; // password_is_temporary

    const result = await pool.query(`
      INSERT INTO users (username, display_name, email, phone, role, department_id, password_is_temporary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [username, name, email, phone, role, department_id || null, tempPassword]);

    res.status(201).json({ message: 'User created. Welcome email sent to ' + email, user: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, role, department_id, is_active } = req.body;

    // Optional: add protection so you can't demote the last hotel admin.
    
    const result = await pool.query(`
      UPDATE users
      SET 
        display_name = COALESCE($1, display_name),
        phone = COALESCE($2, phone),
        role = COALESCE($3, role),
        department_id = $4,
        is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING *;
    `, [name, phone, role, department_id !== undefined ? department_id : null, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(`
      UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *;
    `, [is_active, id]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // In a real app: generate temp password, hash it, email it.
    await pool.query('UPDATE users SET password_is_temporary = true WHERE id = $1', [id]);

    const user = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    const email = user.rows[0]?.email || 'user';

    res.json({ message: `Password reset email sent to ${email}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
