/**
 * Middleware de validación
 * Procesa los resultados de express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';
import { createValidationError } from './errorHandler';

/**
 * Ejecutar validaciones y procesar errores
 */
export const runValidations = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Ejecutar todas las validaciones
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Obtener resultados
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      next();
      return;
    }

    // Formatear errores
    const formattedErrors: Record<string, string[]> = {};

    errors.array().forEach((error) => {
      if (error.type === 'field') {
        const field = error.path;
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.msg);
      }
    });

    // Lanzar error de validación
    next(createValidationError(formattedErrors));
  };
};