/**
 * Validadores para autenticación
 */

import { body, param } from 'express-validator';
import { ROLES } from '../config/constants';

/**
 * Validación para registro de usuario
 */
export const registerValidation = [
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
];

/**
 * Validación para login
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
];

/**
 * Validación para refresh token
 */
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('El refresh token es requerido')
    .isString()
    .withMessage('El refresh token debe ser una cadena'),
];

/**
 * Validación para logout
 */
export const logoutValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('El refresh token es requerido')
    .isString()
    .withMessage('El refresh token debe ser una cadena'),
];

/**
 * Validación para actualizar perfil
 */
export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
];

/**
 * Validación para cambiar contraseña
 */
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),

  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
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

  body('refreshToken')
    .optional()
    .isString()
    .withMessage('El refresh token debe ser una cadena'),
];

/**
 * Validación para eliminar sesión
 */
export const deleteSessionValidation = [
  param('sessionId')
    .notEmpty()
    .withMessage('El ID de sesión es requerido')
    .isUUID()
    .withMessage('ID de sesión inválido'),
];