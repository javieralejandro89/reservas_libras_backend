/**
 * Controller del Dashboard
 */

import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest, ApiResponse, UserReservaSummary, PaginatedResponse } from '../types';
import { HTTP_STATUS, STATUS_RESERVA } from '../config/constants';
import { normalizePagination, calculateTotalPages, parseDateWithoutTimezone } from '../utils/validators';
import { createNotFoundError } from '../middlewares/errorHandler';

/**
 * Obtener estadísticas del dashboard
 * GET /api/dashboard/stats
 */
export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Obtener TODOS los periodos activos
  const periodosActivos = await prisma.periodoLibras.findMany({
    where: { isActive: true },
    orderBy: { fechaEnvio: 'asc' },
    include: {
      reservas: {
        where: {
          status: { notIn: ['CANCELADA'] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (periodosActivos.length === 0) {
    const response: ApiResponse = {
      success: true,
      data: {
        periodos: [],
        totalLibrasReservadas: '0',
        totalLibrasDisponibles: '0',
        totalReservas: 0,
        totalUsuariosConReservas: 0,
        usuariosConReservas: [],
      },
    };
    res.status(HTTP_STATUS.OK).json(response);
return;
  }

  // Calcular estadísticas para cada periodo
const periodosConStats = periodosActivos.map(periodo => {
  const librasReservadas = periodo.reservas.reduce((sum, reserva) => {
    return sum + parseFloat(reserva.libras.toString());
  }, 0);

  // AGREGAR: Calcular libras por estado
  const librasEnCentral = periodo.reservas
    .filter(reserva => reserva.status === STATUS_RESERVA.ENTREGADA)
    .reduce((sum, reserva) => sum + parseFloat(reserva.libras.toString()), 0);

  const librasEnTransito = periodo.reservas
    .filter(reserva => reserva.status === STATUS_RESERVA.CONFIRMADA || reserva.status === STATUS_RESERVA.ENVIADA)
    .reduce((sum, reserva) => sum + parseFloat(reserva.libras.toString()), 0);

  const librasPendientes = periodo.reservas
    .filter(reserva => reserva.status === STATUS_RESERVA.PENDIENTE)
    .reduce((sum, reserva) => sum + parseFloat(reserva.libras.toString()), 0);

  const librasDisponibles = periodo.librasTotales - librasReservadas;
  const porcentajeOcupacion = (librasReservadas / periodo.librasTotales) * 100;
    // Contar reservas por status
    const reservasPorStatus = [
      { status: 'PENDIENTE', count: 0 },
      { status: 'CONFIRMADA', count: 0 },
      { status: 'ENVIADA', count: 0 },
      { status: 'ENTREGADA', count: 0 },
      { status: 'CANCELADA', count: 0 },
    ];

    periodo.reservas.forEach(reserva => {
      const statusItem = reservasPorStatus.find(s => s.status === reserva.status);
      if (statusItem) statusItem.count++;
    });

    // Usuarios únicos para este periodo
    const usuariosMap = new Map();
    periodo.reservas.forEach(reserva => {
      if (!usuariosMap.has(reserva.userId)) {
        usuariosMap.set(reserva.userId, {
          userId: reserva.userId,
          userName: reserva.user.name,
          userEmail: reserva.user.email,
          totalLibras: 0,
          totalReservas: 0,
        });
      }
      const usuario = usuariosMap.get(reserva.userId);
      usuario.totalLibras += parseFloat(reserva.libras.toString());
      usuario.totalReservas++;
    });

    const usuariosConReservas = Array.from(usuariosMap.values())
      .map((data: any) => ({
        ...data,
        totalLibras: data.totalLibras.toFixed(2),
      }))
      .sort((a: any, b: any) => parseFloat(b.totalLibras) - parseFloat(a.totalLibras));

    return {
      periodo: {
        id: periodo.id,
        librasTotales: periodo.librasTotales,
        fechaEnvio: periodo.fechaEnvio.toISOString().split('T')[0]!,
        isActive: periodo.isActive,
      },
      librasReservadas: librasReservadas.toFixed(2),
      librasDisponibles: librasDisponibles.toFixed(2),
      librasEnCentral: librasEnCentral.toFixed(2),
      librasEnTransito: librasEnTransito.toFixed(2),
      librasPendientes: librasPendientes.toFixed(2),
      porcentajeOcupacion: parseFloat(porcentajeOcupacion.toFixed(2)),
      totalReservas: periodo.reservas.length,
      totalUsuariosConReservas: usuariosMap.size,
      reservasPorStatus: reservasPorStatus.filter(s => s.count > 0),
      usuariosConReservas,
    };
  });

  // Calcular totales globales
  const totalLibrasReservadas = periodosConStats.reduce(
    (sum, p) => sum + parseFloat(p.librasReservadas), 
    0
  );
  const totalLibrasDisponibles = periodosConStats.reduce(
    (sum, p) => sum + parseFloat(p.librasDisponibles), 
    0
  );
  const totalReservas = periodosConStats.reduce((sum, p) => sum + p.totalReservas, 0);
  
  // Usuarios únicos globales
  const usuariosGlobalesMap = new Map();
  periodosActivos.forEach(periodo => {
    periodo.reservas.forEach(reserva => {
      if (!usuariosGlobalesMap.has(reserva.userId)) {
        usuariosGlobalesMap.set(reserva.userId, {
          userId: reserva.userId,
          userName: reserva.user.name,
          userEmail: reserva.user.email,
          totalLibras: 0,
          totalReservas: 0,
        });
      }
      const usuario = usuariosGlobalesMap.get(reserva.userId);
      usuario.totalLibras += parseFloat(reserva.libras.toString());
      usuario.totalReservas++;
    });
  });

  const usuariosConReservasGlobal: UserReservaSummary[] = Array.from(usuariosGlobalesMap.values())
    .map((data: any) => ({
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      totalLibras: data.totalLibras.toFixed(2),
      totalReservas: data.totalReservas,
    }))
    .sort((a, b) => parseFloat(b.totalLibras) - parseFloat(a.totalLibras));

  const response: ApiResponse = {
    success: true,
    data: {
      periodos: periodosConStats,
      totalLibrasReservadas: totalLibrasReservadas.toFixed(2),
      totalLibrasDisponibles: totalLibrasDisponibles.toFixed(2),
      totalReservas,
      totalUsuariosConReservas: usuariosGlobalesMap.size,
      usuariosConReservas: usuariosConReservasGlobal,
    },
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener histórico de periodos
 * GET /api/dashboard/history
 */
export const getPeriodosHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { page, limit, startDate, endDate, orderBy, orderDirection } = req.query;

  // Normalizar paginación
  const pagination = normalizePagination(page as string, limit as string);

  // Construir filtros de fecha
  const where: any = {};

  if (startDate || endDate) {
    where.fechaArchivado = {};
    if (startDate) where.fechaArchivado.gte = new Date(startDate as string);
    if (endDate) where.fechaArchivado.lte = new Date(endDate as string);
  }

  // Construir ordenamiento
  const orderByField = (orderBy as string) || 'fechaArchivado';
  const orderDir = (orderDirection as string) || 'desc';

  // Obtener total
  const total = await prisma.historicoPeriodo.count({ where });

  // Obtener histórico con paginación
  const historico = await prisma.historicoPeriodo.findMany({
    where,
    orderBy: { [orderByField]: orderDir },
    skip: pagination.skip,
    take: pagination.limit,
  });

  const response: PaginatedResponse<typeof historico[0]> = {
    success: true,
    data: historico,
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
 * Obtener reservas históricas de un periodo
 * GET /api/dashboard/history/:periodoHistoricoId/reservas
 */
export const getReservasHistoricas = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { periodoHistoricoId } = req.params;

  if (!periodoHistoricoId) {
    throw createNotFoundError('ID de periodo histórico requerido');
  }

  const historicoPeriodo = await prisma.historicoPeriodo.findUnique({
    where: { id: parseInt(periodoHistoricoId, 10) },
  });

  if (!historicoPeriodo) {
    throw createNotFoundError('Periodo histórico no encontrado');
  }

  // Buscar reservas históricas de ese periodo
  const reservasHistoricas = await prisma.historicoReserva.findMany({
    where: {
      periodoFechaEnvio: historicoPeriodo.fechaEnvio,
    },
    orderBy: { fechaArchivado: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: reservasHistoricas,
  };

  res.status(HTTP_STATUS.OK).json(response);
};

/**
 * Obtener reportes avanzados
 * GET /api/dashboard/reportes
 */
export const getReportes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { startDate, endDate, userId, estado, periodoId } = req.query;

  // ============================================
  // 1. CONSTRUIR FILTROS DE FECHA
  // ============================================
  const dateFilter: any = {};
  if (startDate || endDate) {
  dateFilter.fecha = {};
  if (startDate) {
    const startDateTime = parseDateWithoutTimezone(startDate as string);
    startDateTime.setHours(0, 0, 0, 0);
    dateFilter.fecha.gte = startDateTime;
  }
  if (endDate) {
    const endDateTime = parseDateWithoutTimezone(endDate as string);
    endDateTime.setHours(23, 59, 59, 999);
    dateFilter.fecha.lte = endDateTime;
  }
}

  // ============================================
  // 2. OBTENER RESERVAS HISTÓRICAS (Periodos cerrados)
  // ============================================
  const reservasHistoricasQuery: any = {
    status: { not: 'CANCELADA' }, // Excluir canceladas
    ...dateFilter, // Aplicar filtro de fecha
    ...(userId ? { userId: parseInt(userId as string, 10) } : {}),
    ...(estado ? { estado: estado as string } : {}),
  };

  const reservasHistoricas = await prisma.historicoReserva.findMany({
    where: reservasHistoricasQuery,
  });

  console.log(`📊 Reservas históricas encontradas: ${reservasHistoricas.length}`);

  // ============================================
  // 3. OBTENER RESERVAS ACTIVAS (Periodos abiertos)
  // ============================================
  const reservasActivasQuery: any = {
    status: { not: 'CANCELADA' }, // Excluir canceladas
    ...dateFilter, // Aplicar filtro de fecha
    ...(userId ? { userId: parseInt(userId as string, 10) } : {}),
    ...(estado ? { estado: estado as string } : {}),
  };

  // Si hay filtro de periodo específico, aplicarlo
  if (periodoId) {
    reservasActivasQuery.periodoId = parseInt(periodoId as string, 10);
  }

  const reservasActivas = await prisma.reserva.findMany({
    where: reservasActivasQuery,
    include: {
      user: true,
      periodo: true,
    },
  });

  console.log(`📊 Reservas activas encontradas: ${reservasActivas.length}`);

  // ============================================
  // 4. COMBINAR AMBAS FUENTES DE DATOS
  // ============================================
  interface ReservaUnificada {
    userId: number;
    userName: string;
    userEmail: string;
    libras: number;
    fecha: Date;
    estado: string;
    periodoFechaEnvio: Date;
    status: string;
  }

  const todasLasReservas: ReservaUnificada[] = [
    // Reservas históricas
    ...reservasHistoricas.map(r => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      libras: parseFloat(r.libras.toString()),
      fecha: r.fecha,
      estado: r.estado,
      periodoFechaEnvio: r.periodoFechaEnvio,
      status: r.status,
    })),
    // Reservas activas
    ...reservasActivas.map(r => ({
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      libras: parseFloat(r.libras.toString()),
      fecha: r.fecha,
      estado: r.estado,
      periodoFechaEnvio: r.periodo.fechaEnvio,
      status: r.status,
    })),
  ];

  console.log(`📊 Total reservas combinadas: ${todasLasReservas.length}`);

  // ============================================
  // 5. REPORTE POR USUARIO
  // ============================================
  const usuariosMap = new Map();
  let totalLibrasGlobal = 0;

  todasLasReservas.forEach(reserva => {
    totalLibrasGlobal += reserva.libras;

    if (!usuariosMap.has(reserva.userId)) {
      usuariosMap.set(reserva.userId, {
        userId: reserva.userId,
        userName: reserva.userName,
        userEmail: reserva.userEmail,
        totalLibras: 0,
        totalReservas: 0,
        periodos: new Set(),
      });
    }

    const usuario = usuariosMap.get(reserva.userId);
    usuario.totalLibras += reserva.libras;
    usuario.totalReservas++;
    usuario.periodos.add(reserva.periodoFechaEnvio.toISOString());
  });

  const porUsuario = Array.from(usuariosMap.values())
    .map((u: any) => ({
      userId: u.userId,
      userName: u.userName,
      userEmail: u.userEmail,
      totalLibras: u.totalLibras.toFixed(2),
      totalReservas: u.totalReservas,
      periodoCount: u.periodos.size,
      porcentajeDelTotal: totalLibrasGlobal > 0 ? (u.totalLibras / totalLibrasGlobal) * 100 : 0,
    }))
    .sort((a, b) => parseFloat(b.totalLibras) - parseFloat(a.totalLibras));

  // ============================================
  // 6. REPORTE POR MES
  // ============================================
  const mesesMap = new Map();

  todasLasReservas.forEach(reserva => {
    const fecha = new Date(reserva.fecha);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (!mesesMap.has(mesKey)) {
      mesesMap.set(mesKey, {
        mes: monthNames[fecha.getMonth()],
        year: fecha.getFullYear(),
        totalLibras: 0,
        totalReservas: 0,
        usuarios: new Set(),
        periodos: new Set(),
      });
    }

    const mes = mesesMap.get(mesKey);
    mes.totalLibras += reserva.libras;
    mes.totalReservas++;
    mes.usuarios.add(reserva.userId);
    mes.periodos.add(reserva.periodoFechaEnvio.toISOString());
  });

  const porMes = Array.from(mesesMap.values())
    .map((m: any) => ({
      mes: m.mes,
      year: m.year,
      totalLibras: m.totalLibras.toFixed(2),
      totalReservas: m.totalReservas,
      totalUsuarios: m.usuarios.size,
      periodos: m.periodos.size,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return meses.indexOf(a.mes) - meses.indexOf(b.mes);
    });

  // ============================================
  // 7. REPORTE POR PERIODO
  // ============================================
  // Obtener periodos históricos con filtros de fecha si aplican
  const periodosHistoricosQuery: any = {};
  
  if (startDate || endDate) {
    periodosHistoricosQuery.fechaEnvio = {
      ...(startDate ? { gte: parseDateWithoutTimezone(startDate as string) } : {}),
      ...(endDate ? { lte: parseDateWithoutTimezone(endDate as string) } : {}),
    };
  }

  if (periodoId) {
    periodosHistoricosQuery.id = parseInt(periodoId as string, 10);
  }

  const periodosHistoricos = await prisma.historicoPeriodo.findMany({
    where: periodosHistoricosQuery,
    orderBy: { fechaArchivado: 'desc' },
  });

  // Obtener periodos activos con filtros
  const periodosActivosQuery: any = { isActive: true };
  
  if (startDate || endDate) {
    periodosActivosQuery.fechaEnvio = {
      ...(startDate ? { gte: parseDateWithoutTimezone(startDate as string) } : {}),
      ...(endDate ? { lte: parseDateWithoutTimezone(endDate as string) } : {}),
    };
  }

  if (periodoId) {
    periodosActivosQuery.id = parseInt(periodoId as string, 10);
  }

  const periodosActivos = await prisma.periodoLibras.findMany({
    where: periodosActivosQuery,
  });

  // Combinar periodos históricos
  const porPeriodo = periodosHistoricos.map(p => ({
    periodoId: p.id,
    fechaEnvio: p.fechaEnvio.toISOString().split('T')[0]!,
    librasTotales: p.librasTotales,
    librasReservadas: parseFloat(p.librasReservadas.toString()).toFixed(2),
    porcentajeOcupacion: (parseFloat(p.librasReservadas.toString()) / p.librasTotales) * 100,
    totalReservas: p.totalReservas,
    totalUsuarios: p.totalUsuarios,
  }));

  // Agregar periodos activos con sus estadísticas
  for (const periodoActivo of periodosActivos) {
    const reservasDelPeriodo = todasLasReservas.filter(r => 
      r.periodoFechaEnvio.getTime() === periodoActivo.fechaEnvio.getTime()
    );

    const librasReservadas = reservasDelPeriodo.reduce((sum, r) => sum + r.libras, 0);
    const usuariosUnicos = new Set(reservasDelPeriodo.map(r => r.userId)).size;

    porPeriodo.push({
      periodoId: periodoActivo.id,
      fechaEnvio: periodoActivo.fechaEnvio.toISOString().split('T')[0]!,
      librasTotales: periodoActivo.librasTotales,
      librasReservadas: librasReservadas.toFixed(2),
      porcentajeOcupacion: (librasReservadas / periodoActivo.librasTotales) * 100,
      totalReservas: reservasDelPeriodo.length,
      totalUsuarios: usuariosUnicos,
    });
  }

  // Ordenar por fecha más reciente
  porPeriodo.sort((a, b) => new Date(b.fechaEnvio).getTime() - new Date(a.fechaEnvio).getTime());

  // ============================================
  // 8. REPORTE POR ESTADO
  // ============================================
  const estadosMap = new Map();

  todasLasReservas.forEach(reserva => {
    if (!estadosMap.has(reserva.estado)) {
      estadosMap.set(reserva.estado, {
        estado: reserva.estado,
        totalLibras: 0,
        totalReservas: 0,
        usuarios: new Set(),
      });
    }

    const estadoData = estadosMap.get(reserva.estado);
    estadoData.totalLibras += reserva.libras;
    estadoData.totalReservas++;
    estadoData.usuarios.add(reserva.userId);
  });

  const porEstado = Array.from(estadosMap.values())
    .map((e: any) => ({
      estado: e.estado,
      totalLibras: e.totalLibras.toFixed(2),
      totalReservas: e.totalReservas,
      totalUsuarios: e.usuarios.size,
      porcentajeDelTotal: totalLibrasGlobal > 0 ? (e.totalLibras / totalLibrasGlobal) * 100 : 0,
    }))
    .sort((a, b) => parseFloat(b.totalLibras) - parseFloat(a.totalLibras));

  // ============================================
  // 9. RESUMEN GLOBAL
  // ============================================
  const totalPeriodos = periodosHistoricos.length + periodosActivos.length;

  const resumen = {
    totalLibrasGlobal: totalLibrasGlobal.toFixed(2),
    totalReservasGlobal: todasLasReservas.length,
    totalUsuariosUnicos: usuariosMap.size,
    totalPeriodos,
    promedioLibrasPorUsuario: usuariosMap.size > 0 ? (totalLibrasGlobal / usuariosMap.size).toFixed(2) : '0',
    promedioLibrasPorPeriodo: totalPeriodos > 0 ? (totalLibrasGlobal / totalPeriodos).toFixed(2) : '0',
  };

  const response: ApiResponse = {
    success: true,
    data: {
      porUsuario,
      porMes,
      porPeriodo,
      porEstado,
      resumen,
    },
  };

  res.status(HTTP_STATUS.OK).json(response);
};