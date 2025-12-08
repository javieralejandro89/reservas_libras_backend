/**
 * Validadores para reservas
 */

import { body, param, query } from 'express-validator';
import { STATUS_RESERVA } from '../config/constants';

/**
 * Validación para crear reserva
 */
export const createReservaValidation = [
  body('libras')
    .notEmpty()
    .withMessage('Las libras son requeridas')
    .isFloat({ min: 0.01 })
    .withMessage('Las libras deben ser un número positivo')
    .toFloat(),

  body('fecha')
    .notEmpty()
    .withMessage('La fecha es requerida')
    .isISO8601()
    .withMessage('Formato de fecha inválido (usar YYYY-MM-DD)'),
    

  body('estado')
    .notEmpty()
    .withMessage('El estado es requerido')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El estado debe tener entre 2 y 100 caracteres'),

  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
];

/**
 * Validación para actualizar reserva
 */
export const updateReservaValidation = [
  param('reservaId')
    .notEmpty()
    .withMessage('El ID de reserva es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido')
    .toInt(),

  body('libras')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Las libras deben ser un número positivo')
    .toFloat(),

  body('fecha')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido (usar YYYY-MM-DD)'),
    

  body('estado')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El estado debe tener entre 2 y 100 caracteres'),

  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  body('status')
    .optional()
    .isIn(Object.values(STATUS_RESERVA))
    .withMessage('Status inválido'),
];

/**
 * Validación para actualizar status de reserva
 */
export const updateStatusReservaValidation = [
  param('reservaId')
    .notEmpty()
    .withMessage('El ID de reserva es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido')
    .toInt(),

  body('status')
    .notEmpty()
    .withMessage('El status es requerido')
    .isIn(Object.values(STATUS_RESERVA))
    .withMessage('Status inválido'),
];

/**
 * Validación para eliminar reserva
 */
export const deleteReservaValidation = [
  param('reservaId')
    .notEmpty()
    .withMessage('El ID de reserva es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido')
    .toInt(),
];

/**
 * Validación para obtener reserva por ID
 */
export const getReservaByIdValidation = [
  param('reservaId')
    .notEmpty()
    .withMessage('El ID de reserva es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido')
    .toInt(),
];

/**
 * Validación para listar reservas
 */
export const listReservasValidation = [
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

  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
    .toInt(),

  query('status')
    .optional()
    .isIn(Object.values(STATUS_RESERVA))
    .withMessage('Status inválido'),

  query('estado')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El estado no puede exceder 100 caracteres'),

  query('periodoId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de periodo inválido')
    .toInt(),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inicial inválido (usar YYYY-MM-DD)')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha final inválido (usar YYYY-MM-DD)'),
    
];