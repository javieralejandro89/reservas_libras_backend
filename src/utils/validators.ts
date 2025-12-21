/**
 * Utilidades de validación y sanitización
 */

import bcrypt from 'bcryptjs';
import { CONFIG } from '../config/constants';

// ============================================
// VALIDACIONES DE CONTRASEÑA
// ============================================

/**
 * Hash de contraseña con bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);
};

/**
 * Comparar contraseña con hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Validar fortaleza de contraseña
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una minúscula');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una mayúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================
// SANITIZACIÓN DE STRINGS
// ============================================

/**
 * Sanitizar texto eliminando caracteres peligrosos
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/\s+/g, ' '); // Normalizar espacios
};

/**
 * Sanitizar email
 */
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Escapar caracteres HTML
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
};

// ============================================
// VALIDACIONES DE FORMATO
// ============================================

/**
 * Validar formato de email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar formato de fecha (YYYY-MM-DD)
 */
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(date)) {
    return false;
  }

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Validar que una fecha esté dentro de un rango
 */
export const isDateInRange = (
  date: Date,
  startDate: Date,
  endDate: Date
): boolean => {
  return date >= startDate && date <= endDate;
};

// ============================================
// VALIDACIONES DE NÚMEROS
// ============================================

/**
 * Validar que un número sea positivo
 */
export const isPositiveNumber = (value: number): boolean => {
  return !isNaN(value) && value > 0;
};

/**
 * Validar que un número esté en un rango
 */
export const isNumberInRange = (
  value: number,
  min: number,
  max: number
): boolean => {
  return !isNaN(value) && value >= min && value <= max;
};

/**
 * Parsear número decimal seguro
 */
export const parseDecimal = (value: string | number): number => {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsed)) {
    throw new Error('Valor numérico inválido');
  }

  // Redondear a 2 decimales
  return Math.round(parsed * 100) / 100;
};

// ============================================
// UTILIDADES DE PAGINACIÓN
// ============================================

/**
 * Validar y normalizar parámetros de paginación
 */
export const normalizePagination = (
  page?: string | number,
  limit?: string | number
): { page: number; limit: number; skip: number } => {
  const normalizedPage = Math.max(
    1,
    parseInt(String(page || 1), 10)
  );

  const normalizedLimit = Math.min(
    100, // Máximo
    Math.max(1, parseInt(String(limit || 20), 10))
  );

  const skip = (normalizedPage - 1) * normalizedLimit;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip,
  };
};

/**
 * Calcular total de páginas
 */
export const calculateTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

// ============================================
// UTILIDADES DE FECHA
// ============================================

/**
 * Crear fecha desde string sin problemas de timezone
 * Convierte "2025-12-04" a Date con hora al mediodía local
 * 
 * @param dateString - String de fecha en formato YYYY-MM-DD o objeto Date
 * @returns Date con hora al mediodía (12:00) para evitar problemas de timezone
 */
export const parseDateWithoutTimezone = (dateString: string | Date): Date => {
  // Si ya es Date, retornar como está
  if (dateString instanceof Date) {
    return dateString;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  // Crear fecha con hora al mediodía para evitar problemas de timezone
  return new Date(year!, month! - 1, day!, 12, 0, 0, 0);
};

/**
 * Convertir string a Date
 */
export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error('Fecha inválida');
  }

  return date;
};

/**
 * Formatear fecha a YYYY-MM-DD
 */
export const formatDateToISO = (date: Date): string => {
  const isoString = date.toISOString().split('T')[0];
  if (!isoString) {
    throw new Error('Error al formatear fecha');
  }
  return isoString;
};

/**
 * Verificar si una fecha ya pasó
 */
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Verificar si una fecha es futura
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Obtener inicio del día (00:00:00)
 */
export const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Obtener fin del día (23:59:59)
 */
export const getEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

// ============================================
// UTILIDADES GENERALES
// ============================================

/**
 * Generar código alfanumérico aleatorio
 */
export const generateRandomCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

/**
 * Sleep/delay asíncrono
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Capitalizar primera letra
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Truncar texto
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Obtener fecha actual en formato YYYY-MM-DD
 */
export const getTodayDateString = (): string => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};