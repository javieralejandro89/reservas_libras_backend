/**
 * Rutas de Autenticación
 */

import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getSessions,
  deleteSession,
} from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { runValidations } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  logoutValidation,
  updateProfileValidation,
  changePasswordValidation,
  deleteSessionValidation,
} from '../validators/authValidators';

const router = Router();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 * Público
 */
router.post(
  '/register',
  runValidations(registerValidation),
  asyncHandler(register)
);

/**
 * POST /api/auth/login
 * Iniciar sesión
 * Público
 */
router.post(
  '/login',
  runValidations(loginValidation),
  asyncHandler(login)
);

/**
 * POST /api/auth/refresh
 * Refrescar access token
 * Público
 */
router.post(
  '/refresh',
  runValidations(refreshTokenValidation),
  asyncHandler(refresh)
);

/**
 * POST /api/auth/logout
 * Cerrar sesión
 * Público
 */
router.post(
  '/logout',
  runValidations(logoutValidation),
  asyncHandler(logout)
);

/**
 * GET /api/auth/me
 * Obtener perfil del usuario autenticado
 * Privado
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getProfile)
);

/**
 * PATCH /api/auth/profile
 * Actualizar perfil
 * Privado
 */
router.patch(
  '/profile',
  authenticate,
  runValidations(updateProfileValidation),
  asyncHandler(updateProfile)
);

/**
 * PATCH /api/auth/password
 * Cambiar contraseña
 * Privado
 */
router.patch(
  '/password',
  authenticate,
  runValidations(changePasswordValidation),
  asyncHandler(changePassword)
);

/**
 * GET /api/auth/sessions
 * Obtener sesiones activas
 * Privado
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(getSessions)
);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Eliminar sesión específica
 * Privado
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  runValidations(deleteSessionValidation),
  asyncHandler(deleteSession)
);

export default router;