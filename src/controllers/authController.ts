/**
 * Controller de Autenticación
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, LoginDTO, RegisterDTO, ChangePasswordDTO } from '../types';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  calculateExpirationDate 
} from '../utils/jwt';
import { 
  hashPassword, 
  comparePassword, 
  sanitizeEmail, 
  sanitizeText 
} from '../utils/validators';
import { 
  CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  HTTP_STATUS 
} from '../config/constants';
import {   
  createConflictError, 
  createUnauthorizedError,
  createNotFoundError,
  createBadRequestError 
} from '../middlewares/errorHandler';

/**
 * Registrar nuevo usuario
 * POST /api/auth/register
 */
export const register = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { name, email, password } = req.body as RegisterDTO;

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
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: user,
    message: SUCCESS_MESSAGES.REGISTER_SUCCESS,
  };

  res.status(HTTP_STATUS.CREATED).json(response);
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { email, password } = req.body as LoginDTO;

  // Sanitizar email
  const sanitizedEmail = sanitizeEmail(email);

  // Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email: sanitizedEmail },
  });

  if (!user) {
    throw createUnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Verificar que el usuario esté activo
  if (!user.isActive) {
    throw createUnauthorizedError(ERROR_MESSAGES.USER_INACTIVE);
  }

  // Verificar contraseña
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw createUnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Crear sesión
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: '', // Se actualizará después
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      expiresAt: calculateExpirationDate(CONFIG.JWT_REFRESH_EXPIRES_IN),
    },
  });

  // Generar tokens
  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id, session.id);

  // Actualizar sesión con el refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken },
  });

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar, 
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Refresh Token
 * POST /api/auth/refresh
 */
export const refresh = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  // Verificar el refresh token
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw createUnauthorizedError(ERROR_MESSAGES.TOKEN_INVALID);
  }

  // Buscar sesión en la base de datos
  const session = await prisma.session.findUnique({
    where: { 
      id: payload.sessionId,
      refreshToken,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          avatar: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) {
    throw createUnauthorizedError(ERROR_MESSAGES.SESSION_NOT_FOUND);
  }

  // Verificar que el usuario esté activo
  if (!session.user.isActive) {
    throw createUnauthorizedError(ERROR_MESSAGES.USER_INACTIVE);
  }

  // Verificar que la sesión no haya expirado
  if (new Date() > session.expiresAt) {
    // Eliminar sesión expirada
    await prisma.session.delete({ where: { id: session.id } });
    throw createUnauthorizedError('Sesión expirada');
  }

  // Generar nuevo access token
  const newAccessToken = generateAccessToken(
    session.user.id,
    session.user.email,
    session.user.role
  );

  const response: ApiResponse = {
    success: true,
    data: {
      accessToken: newAccessToken,
    },
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;

  // Eliminar sesión de la base de datos
  await prisma.session.deleteMany({
    where: { refreshToken },
  });

  const response: ApiResponse = {
    success: true,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/me
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createUnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
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
 * Actualizar perfil
 * PATCH /api/auth/profile
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createUnauthorizedError();
  }

  const { name } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: name ? sanitizeText(name) : undefined,
    },
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
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Cambiar contraseña
 * PATCH /api/auth/password
 */
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createUnauthorizedError();
  }

  const { currentPassword, newPassword, refreshToken } = req.body as ChangePasswordDTO;

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
    throw createBadRequestError('Contraseña actual incorrecta');
  }

  // Hash de la nueva contraseña
  const hashedPassword = await hashPassword(newPassword);

  // Actualizar contraseña
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Si se proporciona refreshToken, mantener esa sesión y eliminar las demás
  if (refreshToken) {
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        refreshToken: { not: refreshToken },
      },
    });
  } else {
    // Eliminar todas las sesiones (forzar re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });
  }

  const response: ApiResponse = {
    success: true,
    message: SUCCESS_MESSAGES.PASSWORD_CHANGED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener sesiones activas del usuario
 * GET /api/auth/sessions
 */
export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createUnauthorizedError();
  }

  const sessions = await prisma.session.findMany({
    where: { userId: req.user.id },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: sessions,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Eliminar una sesión específica
 * DELETE /api/auth/sessions/:sessionId
 */
export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createUnauthorizedError();
  }

  const { sessionId } = req.params;

  // Verificar que la sesión pertenezca al usuario
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: req.user.id,
    },
  });

  if (!session) {
    throw createNotFoundError(ERROR_MESSAGES.SESSION_NOT_FOUND);
  }

  // Eliminar sesión
  await prisma.session.delete({
    where: { id: sessionId },
  });

  const response: ApiResponse = {
    success: true,
    message: SUCCESS_MESSAGES.SESSION_DELETED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};