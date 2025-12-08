/**
 * Constantes y configuraciones de la aplicación
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración general de la aplicación
 */
export const CONFIG = {
  // Entorno
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret_CHANGE_ME',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_CHANGE_ME',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Seguridad
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // Configuración de negocio
  DEFAULT_LIBRAS_TOTALES: parseInt(process.env.DEFAULT_LIBRAS_TOTALES || '2000', 10),

  // Admin por defecto
  ADMIN_NAME: process.env.ADMIN_NAME || 'Admin Principal',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@paqueteria.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123!@#',
} as const;

/**
 * Estados de México para el campo "estado" de las reservas
 */
export const ESTADOS_MEXICO = [
  'Aguascalientes',  
  'Campeche',
  'Cancún',
  'Chiapas',
  'Chihuahua',
  'CDMX',
  'CDMX Sur',  
  'Guadalajara',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Monterrey',  
  'Puebla',
  'Querétaro',  
  'San Luis Potosí',
  'Saltillo',  
  'Texcoco',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Xalapa',
  'Zacatecas',
] as const;

/**
 * Códigos de estado HTTP
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: 'No autorizado',
  TOKEN_INVALID: 'Token inválido o expirado',
  TOKEN_REQUIRED: 'Token requerido',
  SESSION_NOT_FOUND: 'Sesión no encontrada',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  EMAIL_ALREADY_EXISTS: 'El correo electrónico ya está registrado',
  USER_NOT_FOUND: 'Usuario no encontrado',
  USER_INACTIVE: 'Usuario inactivo',
  INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',

  // Reservas
  RESERVA_NOT_FOUND: 'Reserva no encontrada',
  LIBRAS_INSUFICIENTES: 'Libras insuficientes disponibles',
  PERIODO_NOT_FOUND: 'Periodo no encontrado',
  PERIODO_INACTIVO: 'No hay un periodo activo',
  PERIODO_ACTIVO_EXISTS: 'Ya existe un periodo activo',
  FECHA_FUERA_PERIODO: 'La fecha está fuera del periodo activo',
  NO_PUEDE_EDITAR_RESERVA: 'No tienes permiso para editar esta reserva',
  NO_PUEDE_ELIMINAR_RESERVA: 'No tienes permiso para eliminar esta reserva',
  INVALID_STATUS_TRANSITION: 'Transición de estado no permitida',
  CANNOT_CHANGE_STATUS: 'No tienes permiso para cambiar este estado',
  STATUS_ALREADY_SET: 'La reserva ya tiene este estado',
  CANNOT_MODIFY_FINAL_STATUS: 'No se puede modificar una reserva entregada o cancelada',

  // Genéricos
  VALIDATION_ERROR: 'Error de validación',
  INTERNAL_SERVER_ERROR: 'Error interno del servidor',
  NOT_FOUND: 'Recurso no encontrado',
} as const;

/**
 * Mensajes de éxito comunes
 */
export const SUCCESS_MESSAGES = {
  // Auth
  REGISTER_SUCCESS: 'Usuario registrado exitosamente',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente',
  PROFILE_UPDATED: 'Perfil actualizado exitosamente',
  SESSION_DELETED: 'Sesión eliminada exitosamente',

  // Usuarios
  USER_CREATED: 'Usuario creado exitosamente',
  USER_UPDATED: 'Usuario actualizado exitosamente',
  USER_DELETED: 'Usuario eliminado exitosamente',
  USER_ROLE_UPDATED: 'Rol de usuario actualizado exitosamente',

  // Periodos
  PERIODO_CREATED: 'Periodo creado exitosamente',
  PERIODO_UPDATED: 'Periodo actualizado exitosamente',
  PERIODO_CLOSED: 'Periodo cerrado y archivado exitosamente',

  // Reservas
  RESERVA_CREATED: 'Reserva creada exitosamente',
  RESERVA_UPDATED: 'Reserva actualizada exitosamente',
  RESERVA_DELETED: 'Reserva eliminada exitosamente',
  RESERVA_STATUS_UPDATED: 'Estado de reserva actualizado exitosamente',
} as const;

/**
 * Roles de usuario
 */
export const ROLES = {
  ADMIN_PRINCIPAL: 'ADMIN_PRINCIPAL',
  USUARIO: 'USUARIO',
} as const;

/**
 * Estados de reserva
 */
export const STATUS_RESERVA = {
  PENDIENTE: 'PENDIENTE',
  CONFIRMADA: 'CONFIRMADA',
  ENVIADA: 'ENVIADA',
  ENTREGADA: 'ENTREGADA',
  CANCELADA: 'CANCELADA',
} as const;

/**
 * Límites de paginación
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;