/**
 * Controller de Perfil de Usuario
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, UpdateProfileDTO, ChangeProfilePasswordDTO } from '../types';
import { hashPassword, comparePassword, sanitizeText } from '../utils/validators';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, HTTP_STATUS } from '../config/constants';
import { createBadRequestError, createNotFoundError } from '../middlewares/errorHandler';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Obtener perfil del usuario autenticado
 * GET /api/profile
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          reservas: true,
        },
      },
    },
  });

  if (!user) {
    throw createNotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  const response: ApiResponse = {
    success: true,
    data: user,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Actualizar nombre del perfil
 * PATCH /api/profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { name } = req.body as UpdateProfileDTO;

  if (!name) {
    throw createBadRequestError('El nombre es requerido');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { name: sanitizeText(name) },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: SUCCESS_MESSAGES.USER_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Cambiar contraseña del perfil
 * PATCH /api/profile/password
 */
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { currentPassword, newPassword } = req.body as ChangeProfilePasswordDTO;

  // Obtener usuario con contraseña
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw createNotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Verificar contraseña actual
  const isPasswordValid = await comparePassword(currentPassword, user.password);

  if (!isPasswordValid) {
    throw createBadRequestError('La contraseña actual es incorrecta');
  }

  // Hash de la nueva contraseña
  const hashedPassword = await hashPassword(newPassword);

  // Actualizar contraseña
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  // Eliminar todas las sesiones (forzar re-login)
  await prisma.session.deleteMany({
    where: { userId: req.user.id },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente.',
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Subir avatar
 * POST /api/profile/avatar
 */
export const uploadAvatar = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  if (!req.file) {
    throw createBadRequestError('No se ha subido ningún archivo');
  }

  // Obtener usuario actual para eliminar avatar antiguo
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { avatar: true },
  });

  // Eliminar avatar antiguo si existe
  if (user?.avatar) {
    const oldAvatarPath = path.join(process.cwd(), user.avatar);
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }

  // Guardar ruta del nuevo avatar
  const avatarPath = `/uploads/avatars/${req.file.filename}`;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatar: avatarPath },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: 'Avatar actualizado exitosamente',
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Eliminar avatar
 * DELETE /api/profile/avatar
 */
export const deleteAvatar = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  // Obtener usuario actual
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { avatar: true },
  });

  if (!user?.avatar) {
    throw createBadRequestError('No tienes un avatar para eliminar');
  }

  // Eliminar archivo físico
  const avatarPath = path.join(process.cwd(), user.avatar);
  if (fs.existsSync(avatarPath)) {
    fs.unlinkSync(avatarPath);
  }

  // Actualizar BD
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatar: null },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: 'Avatar eliminado exitosamente',
  };

  res.status(HTTP_STATUS.OK).json(response);
};