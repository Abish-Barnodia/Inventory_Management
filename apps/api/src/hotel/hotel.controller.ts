import { Request, Response } from 'express';
import { pool } from '../db';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] as string;
    if (!hotelId) {
      return res.status(400).json({ error: 'Hotel ID is required' });
    }

    const result = await pool.query('SELECT name, address, phone, timezone, currency, logo_url FROM hotels WHERE id = $1', [hotelId]);
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
    const hotelId = req.headers['x-hotel-id'] as string;
    if (!hotelId) {
      return res.status(400).json({ error: 'Hotel ID is required' });
    }

    const { name, address, phone, timezone, currency, logo_url } = req.body;
    
    const result = await pool.query(`
      UPDATE hotels
      SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        phone = COALESCE($3, phone),
        timezone = COALESCE($4, timezone),
        currency = COALESCE($5, currency),
        logo_url = COALESCE($6, logo_url),
        updated_at = NOW()
      WHERE id = $7
      RETURNING name, address, phone, timezone, currency, logo_url;
    `, [name, address, phone, timezone, currency, logo_url, hotelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating hotel profile:', error);
    res.status(500).json({ error: 'Failed to update hotel profile' });
  }
};

