/**
 * Rutas del Dashboard
 */

import { Router } from 'express';
import {
  getDashboardStats,
  getPeriodosHistory,
  getReservasHistoricas,
  getReportes,
} from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Obtener estadísticas del dashboard
 * Usuario/Admin
 */
router.get(
  '/stats',
  asyncHandler(getDashboardStats)
);

/**
 * GET /api/dashboard/history
 * Obtener histórico de periodos
 * Usuario/Admin
 */
router.get(
  '/history',
  asyncHandler(getPeriodosHistory)
);

/**
 * GET /api/dashboard/history/:periodoHistoricoId/reservas
 * Obtener reservas históricas de un periodo
 * Usuario/Admin
 */
router.get(
  '/history/:periodoHistoricoId/reservas',
  asyncHandler(getReservasHistoricas)
);

/**
 * GET /api/dashboard/reportes
 * Obtener reportes avanzados
 * Usuario/Admin
 */
router.get(
  '/reportes',
  asyncHandler(getReportes)
);
export default router;