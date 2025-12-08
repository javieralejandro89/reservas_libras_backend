/**
 * Middleware de autorización
 * Verifica que el usuario tenga el rol requerido
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ROLES, ERROR_MESSAGES } from '../config/constants';
import { createUnauthorizedError, createForbiddenError } from './errorHandler';

/**
 * Verificar que el usuario esté autenticado
 */
const ensureAuthenticated = (req: AuthenticatedRequest): void => {
  if (!req.user) {
    throw createUnauthorizedError();
  }
};

/**
 * Middleware: Requiere que el usuario sea ADMIN_PRINCIPAL
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    ensureAuthenticated(req);

    if (req.user!.role !== ROLES.ADMIN_PRINCIPAL) {
      throw createForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Requiere uno de los roles especificados
 */
export const requireRole = (allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    try {
      ensureAuthenticated(req);

      if (!allowedRoles.includes(req.user!.role)) {
        throw createForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Verificar que el usuario puede acceder al recurso
 * Solo admin o el propio usuario pueden acceder
 */
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    try {
      ensureAuthenticated(req);

      const paramValue = req.params[userIdParam];
      
      if (!paramValue) {
        throw createForbiddenError('Parámetro de usuario no encontrado');
      }

      const resourceUserId = parseInt(paramValue, 10);

      if (isNaN(resourceUserId)) {
        throw createForbiddenError('ID de usuario inválido');
      }

      // Admin puede acceder a cualquier recurso
      if (req.user!.role === ROLES.ADMIN_PRINCIPAL) {
        next();
        return;
      }

      // Usuario normal solo puede acceder a sus propios recursos
      if (req.user!.id !== resourceUserId) {
        throw createForbiddenError(
          'No tienes permiso para acceder a este recurso'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Verificar que el usuario pueda editar una reserva
 * Solo el dueño o un admin pueden editar
 */
export const canEditReserva = async (
  req: AuthenticatedRequest,
  reservaUserId: number
): Promise<boolean> => {
  if (!req.user) {
    return false;
  }

  // Admin puede editar cualquier reserva
  if (req.user.role === ROLES.ADMIN_PRINCIPAL) {
    return true;
  }

  // Usuario solo puede editar sus propias reservas
  return req.user.id === reservaUserId;
};

/**
 * Verificar que el usuario pueda eliminar una reserva
 * Solo el dueño o un admin pueden eliminar
 */
export const canDeleteReserva = async (
  req: AuthenticatedRequest,
  reservaUserId: number
): Promise<boolean> => {
  if (!req.user) {
    return false;
  }

  // Admin puede eliminar cualquier reserva
  if (req.user.role === ROLES.ADMIN_PRINCIPAL) {
    return true;
  }

  // Usuario solo puede eliminar sus propias reservas
  return req.user.id === reservaUserId;
};

/**
 * Verificar si el usuario puede cambiar el estado de una reserva
 * @param userRole - Rol del usuario
 * @param currentStatus - Estado actual de la reserva
 * @param newStatus - Nuevo estado deseado
 * @returns boolean
 */
export const canChangeReservaStatus = (
  userRole: string,
  currentStatus: string,
  newStatus: string
): { allowed: boolean; reason?: string } => {
  const { STATUS_RESERVA, ROLES } = require('../config/constants');

  // No se puede modificar reservas ya entregadas o canceladas
  if (currentStatus === STATUS_RESERVA.ENTREGADA || currentStatus === STATUS_RESERVA.CANCELADA) {
    return {
      allowed: false,
      reason: 'No se puede modificar una reserva entregada o cancelada',
    };
  }

  // Si el estado no cambia, no permitir
  if (currentStatus === newStatus) {
    return {
      allowed: false,
      reason: 'La reserva ya tiene este estado',
    };
  }

  // ADMIN_PRINCIPAL puede hacer cualquier transición válida
  if (userRole === ROLES.ADMIN_PRINCIPAL) {
    // Validar transiciones válidas para ADMIN_PRINCIPAL
    const validTransitions: Record<string, string[]> = {
      [STATUS_RESERVA.PENDIENTE]: [STATUS_RESERVA.CONFIRMADA, STATUS_RESERVA.CANCELADA],
      [STATUS_RESERVA.CONFIRMADA]: [STATUS_RESERVA.ENVIADA, STATUS_RESERVA.CANCELADA],
      [STATUS_RESERVA.ENVIADA]: [STATUS_RESERVA.ENTREGADA, STATUS_RESERVA.CANCELADA],
    };

    if (validTransitions[currentStatus]?.includes(newStatus)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `No se puede cambiar de ${currentStatus} a ${newStatus}`,
    };
  }

  // USUARIO (otros admins) solo pueden cambiar CONFIRMADA → ENVIADA
  if (userRole === ROLES.USUARIO) {
    if (currentStatus === STATUS_RESERVA.CONFIRMADA && newStatus === STATUS_RESERVA.ENVIADA) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Solo puedes cambiar reservas confirmadas a enviadas',
    };
  }

  return {
    allowed: false,
    reason: 'No tienes permisos para cambiar estados',
  };
};