/**
 * Validadores para usuarios (Admin)
 */

import { body, param, query } from 'express-validator';
import { ROLES } from '../config/constants';

/**
 * Validación para crear usuario (admin)
 */
export const createUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres'),

  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 8, max: 100 })
    .withMessage('La contraseña debe tener entre 8 y 100 caracteres')
    .matches(/[a-z]/)
    .withMessage('Debe contener al menos una minúscula')
    .matches(/[A-Z]/)
    .withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('Debe contener al menos un número')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Debe contener al menos un carácter especial'),

  body('role')
    .optional()
    .isIn([ROLES.ADMIN_PRINCIPAL, ROLES.USUARIO])
    .withMessage('Rol inválido'),
];

/**
 * Validación para actualizar usuario (admin)
 */
export const updateUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('El ID de usuario es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
    .toInt(),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres'),

  body('password')
    .optional()
    .isLength({ min: 8, max: 100 })
    .withMessage('La contraseña debe tener entre 8 y 100 caracteres')
    .matches(/[a-z]/)
    .withMessage('Debe contener al menos una minúscula')
    .matches(/[A-Z]/)
    .withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('Debe contener al menos un número')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Debe contener al menos un carácter especial'),

  body('role')
    .optional()
    .isIn([ROLES.ADMIN_PRINCIPAL, ROLES.USUARIO])
    .withMessage('Rol inválido'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un booleano'),
];

/**
 * Validación para eliminar usuario
 */
export const deleteUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('El ID de usuario es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
    .toInt(),
];

/**
 * Validación para obtener usuario por ID
 */
export const getUserByIdValidation = [
  param('userId')
    .notEmpty()
    .withMessage('El ID de usuario es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
    .toInt(),
];

/**
 * Validación para listar usuarios
 */
export const listUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100')
    .toInt(),

  query('role')
    .optional()
    .isIn([ROLES.ADMIN_PRINCIPAL, ROLES.USUARIO])
    .withMessage('Rol inválido'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un booleano')
    .toBoolean(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('La búsqueda no puede exceder 255 caracteres'),
];

/**
 * Validación para cambiar rol de usuario
 */
export const changeUserRoleValidation = [
  param('userId')
    .notEmpty()
    .withMessage('El ID de usuario es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
    .toInt(),

  body('role')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isIn([ROLES.ADMIN_PRINCIPAL, ROLES.USUARIO])
    .withMessage('Rol inválido'),
];