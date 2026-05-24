import { Router } from 'express';
import { getProfile, updateProfile } from './hotel.controller';

const router = Router();

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

export { router as hotelRouter };
