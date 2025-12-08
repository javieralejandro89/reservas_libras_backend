/**
 * Rutas de Reservas
 */

import { Router } from 'express';
import {
  createReserva,
  listReservas,
  getReservaById,
  updateReserva,
  updateReservaStatus,
  deleteReserva,
} from '../controllers/reservaController';
import { authenticate } from '../middlewares/auth';
import { runValidations } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  createReservaValidation,
  updateReservaValidation,
  updateStatusReservaValidation,
  deleteReservaValidation,
  getReservaByIdValidation,
  listReservasValidation,
} from '../validators/reservaValidators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /api/reservas
 * Crear reserva
 * Usuario/Admin
 */
router.post(
  '/',
  runValidations(createReservaValidation),
  asyncHandler(createReserva)
);

/**
 * GET /api/reservas
 * Listar reservas con filtros
 * Usuario (solo sus reservas) / Admin (todas)
 */
router.get(
  '/',
  runValidations(listReservasValidation),
  asyncHandler(listReservas)
);

/**
 * GET /api/reservas/:reservaId
 * Obtener reserva por ID
 * Usuario (solo su reserva) / Admin (cualquiera)
 */
router.get(
  '/:reservaId',
  runValidations(getReservaByIdValidation),
  asyncHandler(getReservaById)
);

/**
 * PATCH /api/reservas/:reservaId
 * Actualizar reserva
 * Usuario (solo su reserva) / Admin (cualquiera)
 */
router.patch(
  '/:reservaId',
  runValidations(updateReservaValidation),
  asyncHandler(updateReserva)
);

/**
 * PATCH /api/reservas/:reservaId/status
 * Actualizar solo el status de una reserva
 * Solo Admin
 */
router.patch(
  '/:reservaId/status',  
  runValidations(updateStatusReservaValidation),
  asyncHandler(updateReservaStatus)
);

/**
 * DELETE /api/reservas/:reservaId
 * Eliminar reserva
 * Usuario (solo su reserva) / Admin (cualquiera)
 */
router.delete(
  '/:reservaId',
  runValidations(deleteReservaValidation),
  asyncHandler(deleteReserva)
);

export default router;