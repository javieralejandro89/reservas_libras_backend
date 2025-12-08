/**
 * Middleware de manejo de errores
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, CustomError, ApiResponse } from '../types';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

/**
 * Clase de error personalizado de la aplicación
 */
export class AppError extends Error implements CustomError {
  public statusCode: number;
  public errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'AppError';

    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Crear error de validación
 */
export const createValidationError = (
  errors: Record<string, string[]>
): AppError => {
  return new AppError(ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, errors);
};

/**
 * Crear error de no autorizado
 */
export const createUnauthorizedError = (
  message: string = ERROR_MESSAGES.UNAUTHORIZED
): AppError => {
  return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Crear error de permisos insuficientes
 */
export const createForbiddenError = (
  message: string = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS
): AppError => {
  return new AppError(message, HTTP_STATUS.FORBIDDEN);
};

/**
 * Crear error de recurso no encontrado
 */
export const createNotFoundError = (resource: string = 'Recurso'): AppError => {
  return new AppError(`${resource} no encontrado`, HTTP_STATUS.NOT_FOUND);
};

/**
 * Crear error de conflicto (ej: email duplicado)
 */
export const createConflictError = (message: string): AppError => {
  return new AppError(message, HTTP_STATUS.CONFLICT);
};

/**
 * Crear error de bad request
 */
export const createBadRequestError = (message: string): AppError => {
  return new AppError(message, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.path}`,
    HTTP_STATUS.NOT_FOUND
  );
  next(error);
};

/**
 * Middleware global de manejo de errores
 * Debe ser el último middleware registrado
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log del error en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Si es un AppError, usar sus propiedades
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      errors: err.errors,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Error desconocido - no exponer detalles en producción
  const response: ApiResponse = {
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  };

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};

/**
 * Wrapper para funciones async de Express
 * Captura errores automáticamente
 */
export const asyncHandler = (
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};