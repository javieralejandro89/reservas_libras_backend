/**
 * Rutas de Perfil de Usuario
 */

import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
} from '../controllers/profileController';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/uploadMiddleware';
import { runValidations } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  updateProfileValidation,
  changeProfilePasswordValidation,
} from '../validators/profileValidators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/', asyncHandler(getProfile));

/**
 * PATCH /api/profile
 * Actualizar nombre del perfil
 */
router.patch(
  '/',
  runValidations(updateProfileValidation),
  asyncHandler(updateProfile)
);

/**
 * PATCH /api/profile/password
 * Cambiar contraseña
 */
router.patch(
  '/password',
  runValidations(changeProfilePasswordValidation),
  asyncHandler(changePassword)
);

/**
 * POST /api/profile/avatar
 * Subir avatar
 */
router.post(
  '/avatar',
  upload.single('avatar'),
  asyncHandler(uploadAvatar)
);

/**
 * DELETE /api/profile/avatar
 * Eliminar avatar
 */
router.delete(
  '/avatar',
  asyncHandler(deleteAvatar)
);

export default router;