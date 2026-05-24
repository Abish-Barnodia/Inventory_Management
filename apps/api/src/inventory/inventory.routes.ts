import { Router } from 'express';
import multer from 'multer';
import {
  getStockEntries,
  createStockEntry,
  bulkImportStockEntries,
  getStockRequests,
  createStockRequest,
  updateStockRequestStatus
} from './inventory.controller';

const upload = multer({ storage: multer.memoryStorage() });

export const inventoryRouter = Router();

// Stock Entries (Purchases / GRN)
inventoryRouter.get('/entries', getStockEntries);
inventoryRouter.post('/entries', createStockEntry);
inventoryRouter.post('/entries/import', upload.single('file'), bulkImportStockEntries);

// Stock Requests (Issuances)
inventoryRouter.get('/requests', getStockRequests);
inventoryRouter.post('/requests', createStockRequest);
inventoryRouter.put('/requests/:id/status', updateStockRequestStatus);
