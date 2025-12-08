/**
 * Middleware de autenticación
 * Verifica el Access Token y agrega el usuario al request
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { ERROR_MESSAGES } from '../config/constants';
import { createUnauthorizedError } from './errorHandler';

/**
 * Middleware de autenticación
 * Verifica el Access Token y agrega el usuario al request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraer token del header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw createUnauthorizedError(ERROR_MESSAGES.TOKEN_REQUIRED);
    }

    // Verificar token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.TOKEN_INVALID;
      throw createUnauthorizedError(errorMessage);
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Validar que el usuario exista y esté activo
    if (!user || !user.isActive) {
      throw createUnauthorizedError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Agregar usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional de autenticación
 * Agrega el usuario al request si el token es válido
 * No falla si no hay token
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }
      } catch {
        // Ignorar errores de token inválido en autenticación opcional
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};