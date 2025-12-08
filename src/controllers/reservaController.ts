/**
 * Controller de Reservas
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, CreateReservaDTO, UpdateReservaDTO, PaginatedResponse } from '../types';
import { normalizePagination, calculateTotalPages, parseDecimal, parseDateWithoutTimezone } from '../utils/validators';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, HTTP_STATUS, ROLES } from '../config/constants';
import { createNotFoundError, createBadRequestError, createForbiddenError } from '../middlewares/errorHandler';
import { canChangeReservaStatus } from '../middlewares/authorization';


/**
 * Calcular libras disponibles en el periodo activo
 */
const calcularLibrasDisponibles = async (periodoId: number, excludeReservaId?: number): Promise<number> => {
  const periodo = await prisma.periodoLibras.findUnique({
    where: { id: periodoId },
    include: {
      reservas: {
        where: {
          id: excludeReservaId ? { not: excludeReservaId } : undefined,
          status: { notIn: ['CANCELADA'] }, // No contar reservas canceladas
        },
      },
    },
  });

  if (!periodo) {
    throw createNotFoundError(ERROR_MESSAGES.PERIODO_NOT_FOUND);
  }

  // Sumar todas las libras reservadas
  const librasReservadas = periodo.reservas.reduce((sum, reserva) => {
    return sum + parseFloat(reserva.libras.toString());
  }, 0);

  return periodo.librasTotales - librasReservadas;
};

/**
 * Crear reserva
 * POST /api/reservas
 */
export const createReserva = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { libras, fecha, estado, observaciones } = req.body as CreateReservaDTO;
  const librasDecimal = parseDecimal(libras);
  const fechaReserva = parseDateWithoutTimezone(fecha);

  // Buscar periodos activos que incluyan o sean posteriores a esta fecha
  const periodosActivos = await prisma.periodoLibras.findMany({
    where: {
      isActive: true,
      fechaFin: { gte: fechaReserva },
    },
    orderBy: {
      fechaInicio: 'asc',
    },
    include: {
      reservas: {
        where: {
          status: { notIn: ['CANCELADA'] },
        },
      },
    },
  });

  if (periodosActivos.length === 0) {
    throw createBadRequestError('No hay periodos activos disponibles para esta fecha o fechas futuras');
  }

  // Validar que la fecha esté dentro de al menos un periodo
  const periodoConFecha = periodosActivos.find(p => {
  const inicio = parseDateWithoutTimezone(p.fechaInicio.toISOString().split('T')[0]!);
  const fin = parseDateWithoutTimezone(p.fechaFin.toISOString().split('T')[0]!);
  return fechaReserva >= inicio && fechaReserva <= fin;
});

  if (!periodoConFecha) {
    throw createBadRequestError(
      `La fecha ${fechaReserva.toLocaleDateString('es-MX')} no corresponde a ningún periodo activo. ` +
      `Selecciona una fecha entre los periodos disponibles.`
    );
  }

  // PRIMERO: Calcular cuántas libras se pueden reservar SIN crear nada
  let librasRestantes = librasDecimal;
  const planDeReservas: Array<{
    periodo: any;
    libras: number;
    fecha: Date;
  }> = [];

  for (const periodo of periodosActivos) {
    if (librasRestantes <= 0) break;

    const librasReservadas = periodo.reservas.reduce((sum, reserva) => {
      return sum + parseFloat(reserva.libras.toString());
    }, 0);

    const librasDisponibles = periodo.librasTotales - librasReservadas;

    if (librasDisponibles > 0) {
      const librasParaEstePeriodo = Math.min(librasRestantes, librasDisponibles);

      const fechaInicioPeriodo = parseDateWithoutTimezone(periodo.fechaInicio.toISOString().split('T')[0]!);
const fechaFinPeriodo = parseDateWithoutTimezone(periodo.fechaFin.toISOString().split('T')[0]!);

const fechaReservaParaPeriodo: Date = 
  planDeReservas.length === 0 && 
  fechaReserva >= fechaInicioPeriodo && 
  fechaReserva <= fechaFinPeriodo
    ? fechaReserva
    : fechaInicioPeriodo;

      planDeReservas.push({
        periodo,
        libras: librasParaEstePeriodo,
        fecha: fechaReservaParaPeriodo,
      });

      librasRestantes -= librasParaEstePeriodo;
    }
  }

  // Validar si quedan libras sin asignar ANTES de crear
  if (librasRestantes > 0) {
    const librasDisponiblesTotales = librasDecimal - librasRestantes;
    throw createBadRequestError(
      `No hay suficientes libras disponibles. Se pueden reservar máximo ${librasDisponiblesTotales.toFixed(2)} lbs ` +
      `distribuidas entre los periodos activos. Faltan ${librasRestantes.toFixed(2)} lbs por asignar.`
    );
  }

  // AHORA SÍ: Crear las reservas
  const reservasCreadas: any[] = [];

for (const [index, plan] of planDeReservas.entries()) {
  const reserva = await prisma.reserva.create({
      data: {
        libras: plan.libras,
        fecha: plan.fecha,
        estado,
        observaciones: index === 0 
  ? observaciones || null
  : `Reserva dividida - Parte ${index + 1}. ${observaciones || ''}`,
        userId: req.user.id,
        periodoId: plan.periodo.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        periodo: {
          select: {
            id: true,
            librasTotales: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
    });

    reservasCreadas.push(reserva);
  }

  // Preparar mensaje de respuesta
  let mensaje = '';
  if (reservasCreadas.length === 1) {
    mensaje = SUCCESS_MESSAGES.RESERVA_CREATED;
  } else {
    const detalles = reservasCreadas.map((r, _index) => {
      const inicio = r.periodo.fechaInicio.toLocaleDateString('es-MX');
      const fin = r.periodo.fechaFin.toLocaleDateString('es-MX');
      return `${parseFloat(r.libras.toString())} lbs en periodo ${inicio} - ${fin}`;
    }).join(', ');
    
    mensaje = `Reserva dividida en ${reservasCreadas.length} periodos: ${detalles}`;
  }

  const response: ApiResponse = {
    success: true,
    data: reservasCreadas.length === 1 ? reservasCreadas[0] : reservasCreadas,
    message: mensaje,
  };

  res.status(HTTP_STATUS.CREATED).json(response);
};

/**
 * Listar reservas con filtros y paginación
 * GET /api/reservas
 */
export const listReservas = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { page, limit, userId, status, estado, periodoId, startDate, endDate } = req.query;

  // Normalizar paginación
  const pagination = normalizePagination(page as string, limit as string);

  // Construir filtros
  const where: any = {};

  // Si es usuario regular, solo ver sus propias reservas
  if (req.user.role === ROLES.USUARIO) {
    where.userId = req.user.id;
  } else if (userId) {
    // Admin puede filtrar por usuario
    where.userId = parseInt(userId as string, 10);
  }

  if (status) {
    where.status = status;
  }

  if (estado) {
    where.estado = estado;
  }

  if (periodoId) {
    where.periodoId = parseInt(periodoId as string, 10);
  }

  if (startDate || endDate) {
    where.fecha = {};
    if (startDate) where.fecha.gte = new Date(startDate as string);
    if (endDate) where.fecha.lte = new Date(endDate as string);
  }

  // Obtener total
  const total = await prisma.reserva.count({ where });

  // Obtener reservas
  const reservas = await prisma.reserva.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
    skip: pagination.skip,
    take: pagination.limit,
    orderBy: { createdAt: 'desc' },
  });

  const response: PaginatedResponse<typeof reservas[0]> = {
    success: true,
    data: reservas,
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
 * Obtener reserva por ID
 * GET /api/reservas/:reservaId
 */
export const getReservaById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { reservaId } = req.params;

  if (!reservaId) {
    throw createBadRequestError('ID de reserva requerido');
  }

  const reserva = await prisma.reserva.findUnique({
    where: { id: parseInt(reservaId, 10) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
  });

  if (!reserva) {
    throw createNotFoundError(ERROR_MESSAGES.RESERVA_NOT_FOUND);
  }

  // Verificar permisos: usuario solo puede ver sus propias reservas
  if (req.user.role === ROLES.USUARIO && reserva.userId !== req.user.id) {
    throw createForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
  }

  const response: ApiResponse = {
    success: true,
    data: reserva,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Actualizar reserva
 * PATCH /api/reservas/:reservaId
 */
export const updateReserva = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { reservaId } = req.params;

  if (!reservaId) {
    throw createBadRequestError('ID de reserva requerido');
  }

  const { libras, fecha, estado, observaciones, status } = req.body as UpdateReservaDTO;

  // Buscar reserva
  const reserva = await prisma.reserva.findUnique({
    where: { id: parseInt(reservaId, 10) },
    include: { periodo: true },
  });

  if (!reserva) {
    throw createNotFoundError(ERROR_MESSAGES.RESERVA_NOT_FOUND);
  }

  // Verificar permisos
  if (req.user.role === ROLES.USUARIO && reserva.userId !== req.user.id) {
    throw createForbiddenError(ERROR_MESSAGES.NO_PUEDE_EDITAR_RESERVA);
  }

  // Preparar datos de actualización
  const updateData: any = {};

  // Si se actualizan las libras, validar disponibilidad
  if (libras !== undefined) {
    const librasDecimal = parseDecimal(libras);
    const librasDisponibles = await calcularLibrasDisponibles(
      reserva.periodoId,
      reserva.id // Excluir esta reserva del cálculo
    );

    if (librasDecimal > librasDisponibles + parseFloat(reserva.libras.toString())) {
      throw createBadRequestError(
        `${ERROR_MESSAGES.LIBRAS_INSUFICIENTES}. Disponibles: ${librasDisponibles + parseFloat(reserva.libras.toString())} lbs`
      );
    }

    updateData.libras = librasDecimal;
  }

  if (fecha !== undefined) {
  const fechaReserva = parseDateWithoutTimezone(fecha);

  // Buscar periodo activo que contenga la nueva fecha
  const nuevoPeriodo = await prisma.periodoLibras.findFirst({
    where: {
      isActive: true,
      fechaInicio: { lte: fechaReserva },
      fechaFin: { gte: fechaReserva },
    },
  });

  if (!nuevoPeriodo) {
    throw createBadRequestError(
      `La fecha ${fechaReserva.toLocaleDateString('es-MX')} no corresponde a ningún periodo activo.`
    );
  }

  updateData.fecha = fechaReserva;

  // Si cambió de periodo, verificar disponibilidad y actualizar periodoId
  if (nuevoPeriodo.id !== reserva.periodoId) {
    // Calcular libras disponibles en el nuevo periodo
    const reservasNuevoPeriodo = await prisma.reserva.findMany({
      where: {
        periodoId: nuevoPeriodo.id,
        status: { notIn: ['CANCELADA'] },
        id: { not: reserva.id }, // Excluir esta reserva
      },
    });

    const librasReservadasNuevoPeriodo = reservasNuevoPeriodo.reduce((sum, r) => {
      return sum + parseFloat(r.libras.toString());
    }, 0);

    const librasDisponiblesNuevoPeriodo = nuevoPeriodo.librasTotales - librasReservadasNuevoPeriodo;

    // Verificar que haya espacio para las libras de esta reserva
    const librasReserva = libras !== undefined ? parseDecimal(libras) : parseFloat(reserva.libras.toString());

    if (librasReserva > librasDisponiblesNuevoPeriodo) {
      throw createBadRequestError(
        `No hay suficientes libras disponibles en el periodo ${nuevoPeriodo.fechaInicio.toLocaleDateString('es-MX')} - ${nuevoPeriodo.fechaFin.toLocaleDateString('es-MX')}. ` +
        `Disponibles: ${librasDisponiblesNuevoPeriodo.toFixed(2)} lbs, necesarias: ${librasReserva.toFixed(2)} lbs.`
      );
    }

    // Actualizar periodoId
    updateData.periodoId = nuevoPeriodo.id;
  }
}

  if (estado) updateData.estado = estado;
  if (observaciones !== undefined) updateData.observaciones = observaciones;
  if (status) updateData.status = status;

  // Actualizar reserva
  const updatedReserva = await prisma.reserva.update({
    where: { id: parseInt(reservaId, 10) },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaInicio: true,
          fechaFin: true,
        },
      },
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedReserva,
    message: SUCCESS_MESSAGES.RESERVA_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Actualizar status de reserva (admin)
 * PATCH /api/reservas/:reservaId/status
 */
export const updateReservaStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { reservaId } = req.params;
  const { status } = req.body;

  if (!reservaId) {
    throw createBadRequestError('ID de reserva requerido');
  }

  // Verificar que la reserva exista
  const reserva = await prisma.reserva.findUnique({
    where: { id: parseInt(reservaId, 10) },
  });

  if (!reserva) {
    throw createNotFoundError(ERROR_MESSAGES.RESERVA_NOT_FOUND);
  }

  // NUEVO: Verificar permisos de cambio de estado
  const canChange = canChangeReservaStatus(
    req.user!.role,
    reserva.status,
    status
  );

  if (!canChange.allowed) {
    throw createBadRequestError(
      canChange.reason || ERROR_MESSAGES.CANNOT_CHANGE_STATUS
    );
  }

  // Actualizar status
  const updatedReserva = await prisma.reserva.update({
    where: { id: parseInt(reservaId, 10) },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const response: ApiResponse = {
    success: true,
    data: updatedReserva,
    message: SUCCESS_MESSAGES.RESERVA_STATUS_UPDATED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Eliminar reserva
 * DELETE /api/reservas/:reservaId
 */
export const deleteReserva = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw createBadRequestError('Usuario no autenticado');
  }

  const { reservaId } = req.params;

  if (!reservaId) {
    throw createBadRequestError('ID de reserva requerido');
  }

  // Buscar reserva
  const reserva = await prisma.reserva.findUnique({
    where: { id: parseInt(reservaId, 10) },
  });

  if (!reserva) {
    throw createNotFoundError(ERROR_MESSAGES.RESERVA_NOT_FOUND);
  }

  // Verificar permisos
  if (req.user.role === ROLES.USUARIO && reserva.userId !== req.user.id) {
    throw createForbiddenError(ERROR_MESSAGES.NO_PUEDE_ELIMINAR_RESERVA);
  }

  // Eliminar reserva
  await prisma.reserva.delete({
    where: { id: parseInt(reservaId, 10) },
  });

  const response: ApiResponse = {
    success: true,
    message: SUCCESS_MESSAGES.RESERVA_DELETED,
  };

  res.status(HTTP_STATUS.OK).json(response);
};