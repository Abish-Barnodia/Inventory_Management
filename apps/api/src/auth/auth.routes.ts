import { Router } from 'express';
import { login, updateProfile, updatePassword } from './auth.controller';

const router = Router();

router.post('/login', login);
router.patch('/update-profile', updateProfile);
router.patch('/update-password', updatePassword);

export { router as authRouter };
