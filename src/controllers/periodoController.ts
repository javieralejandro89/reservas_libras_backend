/**
 * Controller de Periodos
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, CreatePeriodoDTO, UpdatePeriodoDTO, PaginatedResponse } from '../types';
import { normalizePagination, calculateTotalPages, parseDateWithoutTimezone } from '../utils/validators';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, HTTP_STATUS } from '../config/constants';
import { createNotFoundError, createBadRequestError } from '../middlewares/errorHandler';

/**
 * Crear periodo
 * POST /api/periodos
 */
export const createPeriodo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { librasTotales, fechaInicio, fechaFin } = req.body as CreatePeriodoDTO;

  // Validar que las fechas sean futuras
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
  
const fechaInicioDate = parseDateWithoutTimezone(fechaInicio);
if (fechaInicioDate < hoy) {
  throw createBadRequestError('La fecha de inicio debe ser hoy o en el futuro');
}

// Validar que fechaFin > fechaInicio
const fechaFinDate = parseDateWithoutTimezone(fechaFin);
if (fechaFinDate <= fechaInicioDate) {
  throw createBadRequestError('La fecha de fin debe ser posterior a la fecha de inicio');
}

  // Crear periodo
  const periodo = await prisma.periodoLibras.create({
    data: {
      librasTotales,
      fechaInicio: parseDateWithoutTimezone(fechaInicio),
      fechaFin: parseDateWithoutTimezone(fechaFin),
      isActive: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    data: periodo,
    message: SUCCESS_MESSAGES.PERIODO_CREATED,
  };

  res.status(HTTP_STATUS.CREATED).json(response);
};

/**
 * Listar periodos
 * GET /api/periodos
 */
export const listPeriodos = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { page, limit, isActive } = req.query;

  // Normalizar paginación
  const pagination = normalizePagination(page as string, limit as string);

  // Construir filtros
  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Obtener total
  const total = await prisma.periodoLibras.count({ where });

  // Obtener periodos
  const periodos = await prisma.periodoLibras.findMany({
    where,
    include: {
      _count: {
        select: {
          reservas: true,
        },
      },
    },
    skip: pagination.skip,
    take: pagination.limit,
    orderBy: { createdAt: 'desc' },
  });

  const response: PaginatedResponse<typeof periodos[0]> = {
    success: true,
    data: periodos,
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
 * Obtener periodo activo
 * GET /api/periodos/active
 */
export const getPeriodoActivo = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const periodo = await prisma.periodoLibras.findFirst({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          reservas: true,
        },
      },
    },
  });

  if (!periodo) {
    throw createNotFoundError(ERROR_MESSAGES.PERIODO_INACTIVO);
  }

  // Calcular libras reservadas
  const reservas = await prisma.reserva.findMany({
    where: {
      periodoId: periodo.id,
      status: { notIn: ['CANCELADA'] },
    },
  });

  const librasReservadas = reservas.reduce((sum, reserva) => {
    return sum + parseFloat(reserva.libras.toString());
  }, 0);

  const librasDisponibles = periodo.librasTotales - librasReservadas;

  const response: ApiResponse = {
    success: true,
    data: {
      ...periodo,
      librasReservadas,
      librasDisponibles,
      porcentajeOcupacion: (librasReservadas / periodo.librasTotales) * 100,
    },
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener periodo por ID
 * GET /api/periodos/:periodoId
 */
export const getPeriodoById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { periodoId } = req.params;

  if (!periodoId) {
    throw createBadRequestError('ID de periodo requerido');
  }

  const periodo = await prisma.periodoLibras.findUnique({
    where: { id: parseInt(periodoId, 10) },
    include: {
      _count: {
        select: {
          reservas: true,
        },
      },
    },
  });

  if (!periodo) {
    throw createNotFoundError(ERROR_MESSAGES.PERIODO_NOT_FOUND);
  }

  const response: ApiResponse = {
    success: true,
    data: periodo,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Actualizar periodo
 * PATCH /api/periodos/:periodoId
 */
export const updatePeriodo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { periodoId } = req.params;

  if (!periodoId) {
    throw createBadRequestError('ID de periodo requerido');
  }

  const { librasTotales, fechaInicio, fechaFin } = req.body as UpdatePeriodoDTO;

  // Verificar que el periodo exista
  const periodo = await prisma.periodoLibras.findUnique({
    where: { id: parseInt(periodoId, 10) },
  });

  if (!periodo) {
    throw createNotFoundError(ERROR_MESSAGES.PERIODO_NOT_FOUND);
  }

  // Si se reduce librasTotales, verificar que no sea menor a las reservadas
  if (librasTotales !== undefined && librasTotales < periodo.librasTotales) {
    const reservas = await prisma.reserva.findMany({
      where: {
        periodoId: periodo.id,
        status: { notIn: ['CANCELADA'] },
      },
    });

    const librasReservadas = reservas.reduce((sum, reserva) => {
      return sum + parseFloat(reserva.libras.toString());
    }, 0);

    if (librasTotales < librasReservadas) {
      throw createBadRequestError(
        `No se puede reducir el total a ${librasTotales} lbs. Ya hay ${librasReservadas} lbs reservadas.`
      );
    }
  }

  // Preparar datos de actualización
  const updateData: any = {};

  if (librasTotales) updateData.librasTotales = librasTotales;
  if (fechaInicio) updateData.fechaInicio = parseDateWithoutTimezone(fechaInicio);
  if (fechaFin) updateData.fechaFin = parseDateWithoutTimezone(fechaFin);

  // Actualizar periodo
  const updatedPeriodo = await prisma.periodoLibras.update({
    where: { id: parseInt(periodoId, 10) },
    data: updateData,
  });

  const response: ApiResponse = {
    success: true,
    data: updatedPeriodo,
    message: SUCCESS_MESSAGES.PERIODO_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Cerrar periodo y archivar
 * POST /api/periodos/:periodoId/close
 */
export const closePeriodo = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { periodoId } = req.params;

  if (!periodoId) {
    throw createBadRequestError('ID de periodo requerido');
  }

  // Buscar periodo
  const periodo = await prisma.periodoLibras.findUnique({
    where: { id: parseInt(periodoId, 10) },
    include: {
      reservas: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!periodo) {
    throw createNotFoundError(ERROR_MESSAGES.PERIODO_NOT_FOUND);
  }

  // Calcular estadísticas
  const reservasActivas = periodo.reservas.filter(r => r.status !== 'CANCELADA');

  const librasReservadas = reservasActivas.reduce((sum, reserva) => {
    return sum + parseFloat(reserva.libras.toString());
  }, 0);

  const librasDisponibles = periodo.librasTotales - librasReservadas;

  const usuariosUnicos = new Set(reservasActivas.map(r => r.userId)).size;

  // Crear histórico del periodo
  const historicoPeriodo = await prisma.historicoPeriodo.create({
    data: {
      librasTotales: periodo.librasTotales,
      librasReservadas,
      librasDisponibles,
      fechaInicio: periodo.fechaInicio,
      fechaFin: periodo.fechaFin,
      totalReservas: reservasActivas.length,
      totalUsuarios: usuariosUnicos,
    },
  });

  // Crear histórico de cada reserva
  await Promise.all(
    periodo.reservas.map((reserva) =>
      prisma.historicoReserva.create({
        data: {
          userId: reserva.userId,
          userName: reserva.user.name,
          userEmail: reserva.user.email,
          libras: reserva.libras,
          fecha: reserva.fecha,
          estado: reserva.estado,
          observaciones: reserva.observaciones,
          status: reserva.status,
          periodoFechaInicio: periodo.fechaInicio,
          periodoFechaFin: periodo.fechaFin,
          reservaOriginalId: reserva.id,
        },
      })
    )
  );

  // CRÍTICO: Eliminar reservas archivadas de la tabla reservas
  await prisma.reserva.deleteMany({
    where: { periodoId: parseInt(periodoId, 10) },
  });

  // Desactivar el periodo
  await prisma.periodoLibras.update({
    where: { id: parseInt(periodoId, 10) },
    data: { isActive: false },
  });

  const response: ApiResponse = {
    success: true,
    data: historicoPeriodo,
    message: SUCCESS_MESSAGES.PERIODO_CLOSED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};