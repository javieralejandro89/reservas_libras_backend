/**
 * Validadores para periodos de libras
 */

import { body, param, query } from 'express-validator';

/**
 * Validación para crear periodo
 */
export const createPeriodoValidation = [
  body('librasTotales')
    .notEmpty()
    .withMessage('Las libras totales son requeridas')
    .isInt({ min: 1 })
    .withMessage('Las libras totales deben ser un número entero positivo')
    .toInt(),

  body('fechaEnvio')
    .notEmpty()
    .withMessage('La fecha de envío es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido (usar YYYY-MM-DD)'),
];

/**
 * Validación para actualizar periodo
 */
export const updatePeriodoValidation = [
  param('periodoId')
    .notEmpty()
    .withMessage('El ID de periodo es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de periodo inválido')
    .toInt(),

  body('librasTotales')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Las libras totales deben ser un número entero positivo')
    .toInt(),

  body('fechaEnvio')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido (usar YYYY-MM-DD)'),
];

/**
 * Validación para cerrar periodo
 */
export const closePeriodoValidation = [
  param('periodoId')
    .notEmpty()
    .withMessage('El ID de periodo es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de periodo inválido')
    .toInt(),
];

/**
 * Validación para obtener periodo por ID
 */
export const getPeriodoByIdValidation = [
  param('periodoId')
    .notEmpty()
    .withMessage('El ID de periodo es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de periodo inválido')
    .toInt(),
];

/**
 * Validación para listar periodos
 */
export const listPeriodosValidation = [
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

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser un booleano')
    .toBoolean(),
];