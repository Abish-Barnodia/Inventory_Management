import { Router } from 'express';
import multer from 'multer';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  getRevenue,
  getPnLAnalytics,
  importRevenue,
  generateReport
} from './finances.controller';

const upload = multer({ storage: multer.memoryStorage() });

export const financesRouter = Router();

// Expense Routes
financesRouter.get('/expenses', getExpenses);
financesRouter.post('/expenses', createExpense);
financesRouter.put('/expenses/:id', updateExpense);
financesRouter.delete('/expenses/:id', deleteExpense);

// Revenue Routes
financesRouter.get('/revenue', getRevenue);
financesRouter.post('/revenue/import', upload.single('file'), importRevenue);

// Analytics Routes
financesRouter.get('/analytics/pnl', getPnLAnalytics);

// Reports Generation Routes
financesRouter.get('/reports/export', generateReport);
