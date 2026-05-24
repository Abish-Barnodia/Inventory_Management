import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment } from './departments.controller';

const router = Router();

router.get('/', getDepartments);
router.post('/', createDepartment);
router.patch('/:id', updateDepartment);

export { router as departmentsRouter };
