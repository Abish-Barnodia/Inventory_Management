import { Router } from 'express';
import { getUsers, createUser, updateUser, deactivateUser, resetPassword } from './users.controller';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/deactivate', deactivateUser);
router.post('/:id/reset-password', resetPassword);

export { router as usersRouter };
