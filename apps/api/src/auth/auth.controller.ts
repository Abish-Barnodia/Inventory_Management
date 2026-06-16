import { Request, Response } from 'express';
import { pool } from '../db';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const hotelResult = await pool.query(
      `SELECT id, name as hotel_name, owner_name, owner_email, phone, status, subscription_plan 
       FROM hotels 
       WHERE owner_email = $1 AND owner_password = $2`,
      [email, password]
    );

    if (hotelResult.rows.length > 0) {
      const hotel = hotelResult.rows[0];
      
      if (hotel.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Hotel account is ' + hotel.status });
      }

      // Return a simulated user session
      return res.json({
        success: true,
        user: {
          id: `hotel_admin_${hotel.id}`,
          name: hotel.owner_name,
          email: hotel.owner_email,
          phone: hotel.phone || '',
          role: 'admin',
          hotelId: String(hotel.id),
          hotelName: hotel.hotel_name
        }
      });
    }

    const userResult = await pool.query(
      `SELECT id, username, display_name, email, phone, role, department_id, is_active
       FROM users
       WHERE email = $1 AND password = $2`,
      [email, password]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'User account is inactive' });
      }

      return res.json({
        success: true,
        user: {
          id: String(user.id),
          name: user.display_name,
          email: user.email,
          phone: user.phone || '',
          role: user.role, // e.g. 'superadmin', 'admin', 'staff', 'manager'
          departmentId: user.department_id ? String(user.department_id) : null
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId, name, phone } = req.body;
    
    if (!userId || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (String(userId).startsWith('hotel_admin_')) {
      const hotelId = String(userId).replace('hotel_admin_', '');
      await pool.query(
        `UPDATE hotels SET owner_name = $1, phone = $2, updated_at = NOW() WHERE id = $3`,
        [name, phone || null, hotelId]
      );
    } else {
      await pool.query(
        `UPDATE users SET display_name = $1, phone = $2 WHERE id = $3`,
        [name, phone || null, userId]
      );
    }
    
    return res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let isValid = false;

    if (String(userId).startsWith('hotel_admin_')) {
      const hotelId = String(userId).replace('hotel_admin_', '');
      const result = await pool.query(
        `SELECT id FROM hotels WHERE id = $1 AND owner_password = $2`,
        [hotelId, currentPassword]
      );
      if (result.rows.length > 0) {
        isValid = true;
        await pool.query(
          `UPDATE hotels SET owner_password = $1, updated_at = NOW() WHERE id = $2`,
          [newPassword, hotelId]
        );
      }
    } else {
      const result = await pool.query(
        `SELECT id FROM users WHERE id = $1 AND password = $2`,
        [userId, currentPassword]
      );
      if (result.rows.length > 0) {
        isValid = true;
        await pool.query(
          `UPDATE users SET password = $1 WHERE id = $2`,
          [newPassword, userId]
        );
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }
    
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
