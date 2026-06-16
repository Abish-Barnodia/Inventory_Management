import { Router } from 'express';
import { 
  getDashboardMetrics, getRecentHotels, getHotels, createHotel, updateHotelStatus, getFullMetrics, getAuditLogs, exportAuditLogs,
  getPaymentMethods, addPaymentMethod, removePaymentMethod,
  getDefaultUnits, addDefaultUnit, removeDefaultUnit,
  getEmailConfig, updateEmailConfig,
  getSuperAdminAccount, updateSuperAdminPassword
} from './superadmin.controller';

const router = Router();

router.get('/dashboard/metrics', getDashboardMetrics);
router.get('/metrics', getFullMetrics);
router.get('/audit-logs/export', exportAuditLogs);
router.get('/audit-logs', getAuditLogs);
router.get('/hotels/recent', getRecentHotels);
router.get('/hotels', getHotels);
router.post('/hotels', createHotel);
router.patch('/hotels/:id', updateHotelStatus);

router.get('/config/payment-methods', getPaymentMethods);
router.post('/config/payment-methods', addPaymentMethod);
router.delete('/config/payment-methods/:id', removePaymentMethod);

router.get('/config/default-units', getDefaultUnits);
router.post('/config/default-units', addDefaultUnit);
router.delete('/config/default-units/:id', removeDefaultUnit);

router.get('/config/email', getEmailConfig);
router.patch('/config/email', updateEmailConfig);

router.get('/account', getSuperAdminAccount);
router.put('/account/password', updateSuperAdminPassword);

export { router as superadminRouter };
