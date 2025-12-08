/**
 * Rutas de Usuarios (Admin)
 */

import { Router } from 'express';
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserRole,
} from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/authorization';
import { runValidations } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';
import {
  createUserValidation,
  updateUserValidation,
  deleteUserValidation,
  getUserByIdValidation,
  listUsersValidation,
  changeUserRoleValidation,
} from '../validators/userValidators';

const router = Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticate);
router.use(requireAdmin);

/**
 * POST /api/users
 * Crear usuario
 * Admin
 */
router.post(
  '/',
  runValidations(createUserValidation),
  asyncHandler(createUser)
);

/**
 * GET /api/users
 * Listar usuarios con filtros
 * Admin
 */
router.get(
  '/',
  runValidations(listUsersValidation),
  asyncHandler(listUsers)
);

/**
 * GET /api/users/:userId
 * Obtener usuario por ID
 * Admin
 */
router.get(
  '/:userId',
  runValidations(getUserByIdValidation),
  asyncHandler(getUserById)
);

/**
 * PATCH /api/users/:userId
 * Actualizar usuario
 * Admin
 */
router.patch(
  '/:userId',
  runValidations(updateUserValidation),
  asyncHandler(updateUser)
);

/**
 * DELETE /api/users/:userId
 * Eliminar usuario
 * Admin
 */
router.delete(
  '/:userId',
  runValidations(deleteUserValidation),
  asyncHandler(deleteUser)
);

/**
 * PATCH /api/users/:userId/role
 * Cambiar rol de usuario
 * Admin
 */
router.patch(
  '/:userId/role',
  runValidations(changeUserRoleValidation),
  asyncHandler(changeUserRole)
);

export default router;