import { Request, Response } from 'express';
import { pool } from '../db';

const AVAILABLE_PERMISSIONS = [
  { key: 'bulk_upload_stock_entry', title: 'Bulk Upload — Stock Entry', description: 'Allows CSV bulk upload for purchase entries', lockedFor: [] },
  { key: 'bulk_upload_stock_issuance', title: 'Bulk Upload — Stock Issuance', description: 'Allows CSV bulk upload for issuances', lockedFor: [] },
  { key: 'raise_stock_request', title: 'Raise Stock Request', description: 'Allow role to raise stock requests', lockedFor: [] },
  { key: 'view_expenses', title: 'View Expenses', description: 'Read access to expense records', lockedFor: [] },
  { key: 'upload_pos_report', title: 'Upload POS Report', description: 'Always OFF for non-admins', lockedFor: ['Store Manager', 'Dept Manager', 'Staff'] },
];

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({ error: 'Role query parameter is required' });
    }

    const roleStr = String(role);
    const result = await pool.query('SELECT permission_key, is_enabled FROM role_permissions WHERE role = $1', [roleStr]);
    
    const dbPermissions = result.rows.reduce((acc, row) => {
      acc[row.permission_key] = row.is_enabled;
      return acc;
    }, {} as Record<string, boolean>);

    const permissions = AVAILABLE_PERMISSIONS.map(p => {
      const isLocked = p.lockedFor.includes(roleStr);
      return {
        key: p.key,
        title: p.title,
        description: isLocked && p.key === 'upload_pos_report' ? 'Always OFF for ' + roleStr + ' — Hotel Admin only' : p.description,
        is_enabled: isLocked ? false : (dbPermissions[p.key] || false),
        is_locked: isLocked
      };
    });

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};

export const togglePermission = async (req: Request, res: Response) => {
  try {
    const { role, permission_key, is_enabled } = req.body;
    
    if (!role || !permission_key) {
      return res.status(400).json({ error: 'role and permission_key are required' });
    }

    // Check if locked
    const permDef = AVAILABLE_PERMISSIONS.find(p => p.key === permission_key);
    if (permDef && permDef.lockedFor.includes(role)) {
      return res.status(403).json({ error: 'Permission is locked for this role' });
    }

    await pool.query(`
      INSERT INTO role_permissions (role, permission_key, is_enabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (role, permission_key)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    `, [role, permission_key, is_enabled]);

    res.json({ success: true, role, permission_key, is_enabled });
  } catch (error) {
    console.error('Error toggling permission:', error);
    res.status(500).json({ error: 'Failed to toggle permission' });
  }
};
