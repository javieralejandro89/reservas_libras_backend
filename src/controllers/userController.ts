/**
 * Controller de Usuarios (Admin)
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, CreateUserDTO, UpdateUserDTO, PaginatedResponse } from '../types';
import { hashPassword, sanitizeEmail, sanitizeText, normalizePagination, calculateTotalPages } from '../utils/validators';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, HTTP_STATUS } from '../config/constants';
import { createConflictError, createNotFoundError, createBadRequestError } from '../middlewares/errorHandler';

/**
 * Crear usuario (admin)
 * POST /api/users
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { name, email, password, role } = req.body as CreateUserDTO;

  // Sanitizar inputs
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedName = sanitizeText(name);

  // Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  });

  if (existingUser) {
    throw createConflictError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
  }

  // Hash de la contraseña
  const hashedPassword = await hashPassword(password);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      role: role || 'USUARIO',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: user,
    message: SUCCESS_MESSAGES.USER_CREATED,
  };

  res.status(HTTP_STATUS.CREATED).json(response);
};

/**
 * Listar usuarios con filtros y paginación
 * GET /api/users
 */
export const listUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { page, limit, role, isActive, search } = req.query;

  // Normalizar paginación
  const pagination = normalizePagination(page as string, limit as string);

  // Construir filtros
  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
  where.isActive = isActive === 'true';
}

  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } },
    ];
  }

  // Obtener total
  const total = await prisma.user.count({ where });

  // Obtener usuarios
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    skip: pagination.skip,
    take: pagination.limit,
    orderBy: { createdAt: 'desc' },
  });

  const response: PaginatedResponse<typeof users[0]> = {
    success: true,
    data: users,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: calculateTotalPages(total, pagination.limit),
    },
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener usuario por ID
 * GET /api/users/:userId
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    throw createBadRequestError('ID de usuario requerido');
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId, 10) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
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
 * Actualizar usuario
 * PATCH /api/users/:userId
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { name, email, password, role, isActive } = req.body as UpdateUserDTO;

  if (!userId) {
    throw createBadRequestError('ID de usuario requerido');
  }

  // Verificar que el usuario exista
  const existingUser = await prisma.user.findUnique({
    where: { id: parseInt(userId, 10) },
  });

  if (!existingUser) {
    throw createNotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Si se actualiza el email, verificar que no exista
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: sanitizeEmail(email) },
    });

    if (emailExists) {
      throw createConflictError(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  // Preparar datos de actualización
  const updateData: any = {};

  if (name) updateData.name = sanitizeText(name);
  if (email) updateData.email = sanitizeEmail(email);
  if (password) updateData.password = await hashPassword(password);
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  // Actualizar usuario
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(userId, 10) },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Si se cambió la contraseña, eliminar todas las sesiones
  if (password) {
    await prisma.session.deleteMany({
      where: { userId: parseInt(userId, 10) },
    });
  }

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: SUCCESS_MESSAGES.USER_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Eliminar usuario
 * DELETE /api/users/:userId
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  if (!userId) {
    throw createBadRequestError('ID de usuario requerido');
  }

  // No permitir que el usuario se elimine a sí mismo
  if (req.user && req.user.id === parseInt(userId, 10)) {
    throw createBadRequestError('No puedes eliminar tu propia cuenta');
  }

  // Verificar que el usuario exista
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId, 10) },
  });

  if (!user) {
    throw createNotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Eliminar usuario (las sesiones se eliminan en cascada)
  await prisma.user.delete({
    where: { id: parseInt(userId, 10) },
  });

  const response: ApiResponse = {
    success: true,
    message: SUCCESS_MESSAGES.USER_DELETED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Cambiar rol de usuario
 * PATCH /api/users/:userId/role
 */
export const changeUserRole = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!userId) {
    throw createBadRequestError('ID de usuario requerido');
  }

  // No permitir que el usuario cambie su propio rol
  if (req.user && req.user.id === parseInt(userId, 10)) {
    throw createBadRequestError('No puedes cambiar tu propio rol');
  }

  // Verificar que el usuario exista
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId, 10) },
  });

  if (!user) {
    throw createNotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Actualizar rol
  const updatedUser = await prisma.user.update({
    where: { id: parseInt(userId, 10) },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedUser,
    message: SUCCESS_MESSAGES.USER_ROLE_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};