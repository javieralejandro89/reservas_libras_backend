/**
 * Controller de Reservas
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, CreateReservaDTO, UpdateReservaDTO, PaginatedResponse } from '../types';
import { normalizePagination, calculateTotalPages, parseDecimal, parseDateWithoutTimezone, getTodayDateString } from '../utils/validators';
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

  const { libras, fecha, estado, observaciones, periodoId } = req.body as CreateReservaDTO;
  const librasDecimal = parseDecimal(libras);
  const fechaReserva = parseDateWithoutTimezone(fecha);

  // Buscar periodos activos
  let periodosActivos;
  
  if (periodoId) {
    // Si se especificó un periodo del dropdown, usarlo directamente
    const periodoEspecifico = await prisma.periodoLibras.findFirst({
      where: {
        id: periodoId,
        isActive: true,
      },
      include: {
        reservas: {
          where: {
            status: { notIn: ['CANCELADA'] },
          },
        },
      },
    });

    if (!periodoEspecifico) {
      throw createBadRequestError('El periodo seleccionado no existe o no está activo');
    }

    periodosActivos = [periodoEspecifico];
  } else {
    // Lógica original: buscar periodos desde la fecha
    periodosActivos = await prisma.periodoLibras.findMany({
      where: {
        isActive: true,
        fechaEnvio: { gte: fechaReserva },
      },
      orderBy: {
        fechaEnvio: 'asc',
      },
      include: {
        reservas: {
          where: {
            status: { notIn: ['CANCELADA'] },
          },
        },
      },
    });
  }

  console.log('📦 Periodos activos encontrados:', periodosActivos.length);
  periodosActivos.forEach((periodo, index) => {
    const librasReservadas = periodo.reservas.reduce((sum, reserva) => {
      return sum + parseFloat(reserva.libras.toString());
    }, 0);
    const disponibles = periodo.librasTotales - librasReservadas;
    
    console.log(`📊 Periodo ${index + 1}:`, {
      id: periodo.id,
      fechaEnvio: periodo.fechaEnvio.toISOString().split('T')[0],
      librasTotales: periodo.librasTotales,
      cantidadReservas: periodo.reservas.length,
      librasReservadas,
      librasDisponibles: disponibles
    });
  });

  if (periodosActivos.length === 0) {
    throw createBadRequestError('No hay periodos activos disponibles para esta fecha o fechas futuras');
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

      // ✅ CORREGIDO: Usar >= 0.01 en vez de > 0
      if (librasParaEstePeriodo >= 0.01) {
        const fechaEnvioPeriodo = parseDateWithoutTimezone(periodo.fechaEnvio.toISOString().split('T')[0]!);

        const fechaReservaParaPeriodo: Date = 
          planDeReservas.length === 0 && 
          fechaReserva.getTime() === fechaEnvioPeriodo.getTime()
            ? fechaReserva
            : fechaEnvioPeriodo;

        planDeReservas.push({
          periodo,
          libras: librasParaEstePeriodo,
          fecha: fechaReservaParaPeriodo,
        });

        librasRestantes -= librasParaEstePeriodo;
      }
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
            avatar: true,
          },
        },
        periodo: {
          select: {
            id: true,
            librasTotales: true,
            fechaEnvio: true,
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
      const envio = r.periodo.fechaEnvio.toLocaleDateString('es-MX');
      return `${parseFloat(r.libras.toString())} lbs en periodo con envío el ${envio}`;
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

  const { page, limit, userId, status, estado, periodoId } = req.query;

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
          avatar: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaEnvio: true,
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
          avatar: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaEnvio: true,
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

  const { libras, estado, observaciones, status } = req.body as UpdateReservaDTO;

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
    
    // Calcular libras disponibles (excluyendo esta reserva)
    const librasDisponibles = await calcularLibrasDisponibles(
      reserva.periodoId,
      reserva.id
    );
    
    // Validar que las nuevas libras no excedan lo disponible
    if (librasDecimal > librasDisponibles) {
      throw createBadRequestError(
        `No hay suficientes libras disponibles en este periodo. ` +
        `Solicitadas: ${librasDecimal} lbs, ` +
        `Disponibles: ${librasDisponibles.toFixed(2)} lbs`
      );
    }

    updateData.libras = librasDecimal;
  }

  // ✅ ELIMINADO: Todo el bloque de validación de fecha (líneas 387-436)
  // La fecha NO se puede cambiar después de crear la reserva

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
          avatar: true,
        },
      },
      periodo: {
        select: {
          id: true,
          librasTotales: true,
          fechaEnvio: true,
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

  // Preparar datos de actualización con tracking
  const updateData: any = { status };
  
  // Registrar fecha actual (solo fecha, sin hora)
  const fechaActual = parseDateWithoutTimezone(getTodayDateString());
  
  if (status === 'CONFIRMADA') {
    updateData.fechaConfirmacion = fechaActual;
  } else if (status === 'ENVIADA') {
    updateData.fechaEnvio = fechaActual;
  } else if (status === 'ENTREGADA') {
    updateData.fechaEntrega = fechaActual;
  }
  
  // Actualizar status
  const updatedReserva = await prisma.reserva.update({
    where: { id: parseInt(reservaId, 10) },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
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