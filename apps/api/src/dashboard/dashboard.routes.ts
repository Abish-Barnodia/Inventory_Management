import { Router } from 'express';
import { getAdminDashboardMetrics } from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', getAdminDashboardMetrics);
