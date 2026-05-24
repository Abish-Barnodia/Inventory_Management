import { Request, Response } from 'express';
import { pool } from '../db';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM hotel_profile WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching hotel profile:', error);
    res.status(500).json({ error: 'Failed to fetch hotel profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, address, phone, timezone, currency, logo_url } = req.body;
    
    // In a real application, you'd want to validate these fields.
    // For now, we'll just update the row with ID 1.
    const result = await pool.query(`
      UPDATE hotel_profile
      SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        phone = COALESCE($3, phone),
        timezone = COALESCE($4, timezone),
        currency = COALESCE($5, currency),
        logo_url = COALESCE($6, logo_url),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *;
    `, [name, address, phone, timezone, currency, logo_url]);

    if (result.rows.length === 0) {
      // If row with id=1 doesn't exist for some reason, return 404
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating hotel profile:', error);
    res.status(500).json({ error: 'Failed to update hotel profile' });
  }
};

