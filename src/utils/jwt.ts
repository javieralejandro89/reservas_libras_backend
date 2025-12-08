/**
 * Utilidades para manejo de JWT
 */

import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/constants';
import type { JWTAccessPayload, JWTRefreshPayload } from '../types';

/**
 * Generar Access Token
 * Duración: 15 minutos
 */
export const generateAccessToken = (
  userId: number,
  email: string,
  role: 'ADMIN_PRINCIPAL' | 'USUARIO'
): string => {
  const payload: JWTAccessPayload = {
    userId,
    email,
    role,
    type: 'access',
  };

  return jwt.sign(payload, CONFIG.JWT_ACCESS_SECRET, {
    expiresIn: CONFIG.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'paqueteria-api',
    audience: 'paqueteria-app',
  });
};

/**
 * Generar Refresh Token
 * Duración: 7 días
 */
export const generateRefreshToken = (userId: number, sessionId: string): string => {
  const payload: JWTRefreshPayload = {
    userId,
    sessionId,
    type: 'refresh',
  };

  return jwt.sign(payload, CONFIG.JWT_REFRESH_SECRET, {
    expiresIn: CONFIG.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'paqueteria-api',
    audience: 'paqueteria-app',
  });
};

/**
 * Verificar Access Token
 */
export const verifyAccessToken = (token: string): JWTAccessPayload => {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_ACCESS_SECRET, {
      issuer: 'paqueteria-api',
      audience: 'paqueteria-app',
    }) as JWTAccessPayload;

    // Validar que sea un access token
    if (decoded.type !== 'access') {
      throw new Error('Token inválido: no es un access token');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw error;
  }
};

/**
 * Verificar Refresh Token
 */
export const verifyRefreshToken = (token: string): JWTRefreshPayload => {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_REFRESH_SECRET, {
      issuer: 'paqueteria-api',
      audience: 'paqueteria-app',
    }) as JWTRefreshPayload;

    // Validar que sea un refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Token inválido: no es un refresh token');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Refresh token inválido');
    }
    throw error;
  }
};

/**
 * Extraer token del header Authorization
 * Formato: "Bearer <token>"
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] ?? null;
};

/**
 * Calcular fecha de expiración
 * Útil para guardar en la base de datos
 */
export const calculateExpirationDate = (expiresIn: string): Date => {
  const now = new Date();
  
  // Parsear el tiempo (ej: "7d", "15m", "24h")
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match || !match[1] || !match[2]) {
    throw new Error('Formato de expiración inválido');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': // segundos
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm': // minutos
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h': // horas
      now.setHours(now.getHours() + value);
      break;
    case 'd': // días
      now.setDate(now.getDate() + value);
      break;
    default:
      throw new Error('Unidad de tiempo no soportada');
  }

  return now;
};

/**
 * Decodificar token sin verificar
 * Útil para debugging
 */
export const decodeToken = (token: string): JWTAccessPayload | JWTRefreshPayload | null => {
  try {
    return jwt.decode(token) as JWTAccessPayload | JWTRefreshPayload;
  } catch {
    return null;
  }
};