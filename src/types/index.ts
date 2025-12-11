/**
 * Tipos y interfaces del Backend
 */

import { Request } from 'express';

// ============================================
// TIPOS EXTENDIDOS DE EXPRESS
// ============================================

/**
 * Request extendido con usuario autenticado
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'ADMIN_PRINCIPAL' | 'USUARIO';
  };
}

// ============================================
// DTOs DE AUTENTICACIÓN
// ============================================

/**
 * DTO para registro de usuario
 */
export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

/**
 * DTO para login
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * DTO para refresh token
 */
export interface RefreshTokenDTO {
  refreshToken: string;
}

/**
 * DTO para cambiar contraseña
 */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  refreshToken?: string;
}

/**
 * DTO para actualizar perfil
 */
export interface UpdateProfileDTO {
  name?: string;
}

// ============================================
// DTOs DE USUARIOS (ADMIN)
// ============================================

/**
 * DTO para crear usuario (admin)
 */
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN_PRINCIPAL' | 'USUARIO';
}

/**
 * DTO para actualizar usuario (admin)
 */
export interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN_PRINCIPAL' | 'USUARIO';
  isActive?: boolean;
}

// ============================================
// DTOs DE PERIODOS
// ============================================

/**
 * DTO para crear periodo
 */
export interface CreatePeriodoDTO {
  librasTotales: number;
  fechaEnvio: string | Date; // Fecha única de envío
}

/**
 * DTO para actualizar periodo
 */
export interface UpdatePeriodoDTO {
  librasTotales?: number;
  fechaEnvio?: string | Date; // Fecha única de envío
}

// ============================================
// DTOs DE RESERVAS
// ============================================

/**
 * DTO para crear reserva
 */
export interface CreateReservaDTO {
  libras: number | string;
  fecha: string | Date;
  estado: string;
  observaciones?: string;
}

/**
 * DTO para actualizar reserva
 */
export interface UpdateReservaDTO {
  libras?: number | string;
  fecha?: string | Date;
  estado?: string;
  observaciones?: string;
  status?: StatusReserva;
}

/**
 * DTO para actualizar solo el status de una reserva
 */
export interface UpdateStatusReservaDTO {
  status: StatusReserva;
}

// ============================================
// TIPOS DE RESPUESTA API
// ============================================

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// TIPOS DE JWT
// ============================================

/**
 * Payload del Access Token
 */
export interface JWTAccessPayload {
  userId: number;
  email: string;
  role: 'ADMIN_PRINCIPAL' | 'USUARIO';
  type: 'access';
}

/**
 * Payload del Refresh Token
 */
export interface JWTRefreshPayload {
  userId: number;
  sessionId: string;
  type: 'refresh';
}

// ============================================
// TIPOS DE SESIÓN
// ============================================

/**
 * Datos de la sesión
 */
export interface SessionData {
  userAgent?: string;
  ipAddress?: string;
}

// ============================================
// TIPOS DE FILTROS
// ============================================

/**
 * Filtro de rango de fechas
 */
export interface DateRangeFilter {
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Filtro de paginación
 */
export interface PaginationFilter {
  page?: number;
  limit?: number;
}

/**
 * Filtros para reservas
 */
export interface ReservaFilters extends DateRangeFilter, PaginationFilter {
  userId?: number;
  status?: StatusReserva;
  estado?: string;
  periodoId?: number;
}

/**
 * Filtros para usuarios
 */
export interface UserFilters extends PaginationFilter {
  role?: 'ADMIN_PRINCIPAL' | 'USUARIO';
  isActive?: boolean;
  search?: string;
}

/**
 * Filtros para histórico de periodos
 */
export interface HistoricoFilters extends PaginationFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  orderBy?: 'fechaArchivado' | 'fechaEnvio' | 'librasTotales' | 'totalReservas';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Filtros para reportes
 */
export interface ReportesFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  userId?: number;
  estado?: string;
  periodoId?: number;
  groupBy?: 'usuario' | 'mes' | 'periodo' | 'estado';
}

// ============================================
// TIPOS DE ESTADÍSTICAS
// ============================================

/**
 * Resumen de reservas por usuario
 */
export interface UserReservaSummary {
  userId: number;
  userName: string;
  userEmail: string;
  totalLibras: string;
  totalReservas: number;
}

/**
 * Estadísticas de un periodo individual
 */
export interface PeriodoStats {
  periodo: {
    id: number;
    librasTotales: number;
    fechaEnvio: string; // Fecha única de envío
    isActive: boolean;
  };
  librasReservadas: string;
  librasDisponibles: string;
  librasEnCentral: string;      // ENTREGADAS
  librasEnTransito: string;     // CONFIRMADAS + ENVIADAS
  librasPendientes: string;     // PENDIENTES
  porcentajeOcupacion: number;
  totalReservas: number;
  totalUsuariosConReservas: number;
  reservasPorStatus: {
    status: StatusReserva;
    count: number;
  }[];
  usuariosConReservas: UserReservaSummary[];
}

/**
 * Estadísticas del dashboard (múltiples periodos)
 */
export interface DashboardStats {
  periodos: PeriodoStats[];
  totalLibrasReservadas: string;
  totalLibrasDisponibles: string;
  totalReservas: number;
  totalUsuariosConReservas: number;
  usuariosConReservas: UserReservaSummary[];
}

/**
 * Estadísticas de un periodo histórico
 */
export interface PeriodoHistoricoStats {
  id: number;
  librasTotales: number;
  librasReservadas: string;
  librasDisponibles: string;
  porcentajeOcupacion: number;
  fechaEnvio: string; // Fecha única de envío
  totalReservas: number;
  totalUsuarios: number;
  fechaArchivado: string;
}

/**
 * Datos de reporte por usuario
 */
export interface ReporteUsuario {
  userId: number;
  userName: string;
  userEmail: string;
  totalLibras: string;
  totalReservas: number;
  periodoCount: number;
  porcentajeDelTotal: number;
}

/**
 * Datos de reporte por mes
 */
export interface ReporteMensual {
  mes: string;
  year: number;
  totalLibras: string;
  totalReservas: number;
  totalUsuarios: number;
  periodos: number;
}

/**
 * Datos de reporte por periodo
 */
export interface ReportePeriodo {
  periodoId: number;
  fechaEnvio: string; // Fecha única de envío
  librasTotales: number;
  librasReservadas: string;
  porcentajeOcupacion: number;
  totalReservas: number;
  totalUsuarios: number;
}

/**
 * Datos de reporte por estado
 */
export interface ReporteEstado {
  estado: string;
  totalLibras: string;
  totalReservas: number;
  totalUsuarios: number;
  porcentajeDelTotal: number;
}

/**
 * Respuesta completa de reportes
 */
export interface ReportesData {
  porUsuario: ReporteUsuario[];
  porMes: ReporteMensual[];
  porPeriodo: ReportePeriodo[];
  porEstado: ReporteEstado[];
  resumen: {
    totalLibrasGlobal: string;
    totalReservasGlobal: number;
    totalUsuariosUnicos: number;
    totalPeriodos: number;
    promedioLibrasPorUsuario: string;
    promedioLibrasPorPeriodo: string;
  };
}

// ============================================
// ENUMERACIONES (Importadas de Prisma)
// ============================================

import { Role as PrismaRole, StatusReserva as PrismaStatusReserva } from '@prisma/client';

/**
 * Roles de usuario (re-export de Prisma)
 */
export type Role = PrismaRole;
export const Role = PrismaRole;

/**
 * Estados de reserva (re-export de Prisma)
 */
export type StatusReserva = PrismaStatusReserva;
export const StatusReserva = PrismaStatusReserva;

// ============================================
// TIPOS DE ERROR
// ============================================

/**
 * Error personalizado de la aplicación
 */
export interface CustomError extends Error {
  statusCode?: number;
  errors?: Record<string, string[]>;
}

// ============================================
// TIPOS DE UTILIDAD
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number;

/**
 * Tipo para manejar respuestas de servicios
 */
export type ServiceResponse<T> = Promise<T>;

/**
 * Tipo para validar que un objeto tenga al menos una propiedad
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];