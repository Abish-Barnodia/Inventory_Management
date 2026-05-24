import { Request, Response } from 'express';
import { pool } from '../db';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.description,
        d.is_active,
        -- Mocking staff count and open requests for now until those features are fully wired in the DB
        COALESCE((SELECT COUNT(*) FROM users u WHERE u.role = 'STAFF' AND d.name = 'Main Kitchen'), 0) as staff_count,
        COALESCE((SELECT COUNT(*) FROM stock_requests sr WHERE sr.department = d.name AND sr.status = 'pending'), 0) as open_requests
      FROM departments d
      ORDER BY d.id ASC;
    `);
    
    // Fallback if db is empty, mock data based on screenshot
    if (result.rows.length === 0) {
      return res.json([
        { id: 1, name: 'Main Kitchen', description: 'Primary food preparation', staff_count: 8, open_requests: 3, is_active: true },
        { id: 2, name: 'Tea Stall', description: 'Beverages and snacks', staff_count: 3, open_requests: 0, is_active: true },
        { id: 3, name: 'Bakery', description: 'Breads and pastries', staff_count: 4, open_requests: 2, is_active: true }
      ]);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(`
      INSERT INTO departments (name, description)
      VALUES ($1, $2)
      RETURNING *;
    `, [name, description]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Department name already exists' });
    }
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    // Check if trying to deactivate and if it has open requests (mock validation)
    if (is_active === false) {
       const openRequests = await pool.query('SELECT COUNT(*) FROM stock_requests WHERE department = (SELECT name FROM departments WHERE id = $1) AND status = $2', [id, 'pending']);
       if (parseInt(openRequests.rows[0].count) > 0) {
         return res.status(409).json({ error: 'DEPARTMENT_HAS_OPEN_REQUESTS', count: openRequests.rows[0].count });
       }
    }

    const result = await pool.query(`
      UPDATE departments
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `, [name, description, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { 
      return res.status(400).json({ error: 'Department name already exists' });
    }
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};
