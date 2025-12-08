/**
 * Rutas de Periodos (Admin)
 */

import { Router } from 'express';
import {
  createPeriodo,
  listPeriodos,
  getPeriodoActivo,
  getPeriodoById,
  updatePeriodo,
  closePeriodo,
} from '../controllers/periodoController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/authorization';
import { runValidations } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  createPeriodoValidation,
  updatePeriodoValidation,
  closePeriodoValidation,
  getPeriodoByIdValidation,
  listPeriodosValidation,
} from '../validators/periodoValidators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/periodos/active
 * Obtener periodo activo
 * Usuario/Admin
 */
router.get(
  '/active',
  asyncHandler(getPeriodoActivo)
);

/**
 * POST /api/periodos
 * Crear periodo
 * Solo Admin
 */
router.post(
  '/',
  requireAdmin,
  runValidations(createPeriodoValidation),
  asyncHandler(createPeriodo)
);

/**
 * GET /api/periodos
 * Listar periodos
 * Solo Admin
 */
router.get(
  '/',
  requireAdmin,
  runValidations(listPeriodosValidation),
  asyncHandler(listPeriodos)
);

/**
 * GET /api/periodos/:periodoId
 * Obtener periodo por ID
 * Solo Admin
 */
router.get(
  '/:periodoId',
  requireAdmin,
  runValidations(getPeriodoByIdValidation),
  asyncHandler(getPeriodoById)
);

/**
 * PATCH /api/periodos/:periodoId
 * Actualizar periodo
 * Solo Admin
 */
router.patch(
  '/:periodoId',
  requireAdmin,
  runValidations(updatePeriodoValidation),
  asyncHandler(updatePeriodo)
);

/**
 * POST /api/periodos/:periodoId/close
 * Cerrar y archivar periodo
 * Solo Admin
 */
router.post(
  '/:periodoId/close',
  requireAdmin,
  runValidations(closePeriodoValidation),
  asyncHandler(closePeriodo)
);

export default router;