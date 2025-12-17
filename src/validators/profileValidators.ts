/**
 * Validadores para perfil de usuario
 */

import { body } from 'express-validator';

/**
 * Validación para actualizar perfil
 */
export const updateProfileValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
];

/**
 * Validación para cambiar contraseña
 */
export const changeProfilePasswordValidation = [
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
];