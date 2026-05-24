import { Router } from 'express';
import { getPermissions, togglePermission } from './permissions.controller';

const router = Router();

router.get('/', getPermissions);
router.patch('/', togglePermission);

export { router as permissionsRouter };
