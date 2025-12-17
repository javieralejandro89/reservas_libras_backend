/**
 * Configuración de la aplicación Express
 */

import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { CONFIG } from './config/constants';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Importar rutas
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import reservaRoutes from './routes/reservaRoutes';
import periodoRoutes from './routes/periodoRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import profileRoutes from './routes/profileRoutes';

/**
 * Crear y configurar la aplicación Express
 */
export const createApp = (): Application => {
  const app = express();

  // ============================================
  // MIDDLEWARES BÁSICOS
  // ============================================

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.use(
    cors({
      origin: CONFIG.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Logger HTTP
  if (CONFIG.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ============================================
  // ARCHIVOS ESTÁTICOS
  // ============================================

  // Servir archivos de uploads (avatares)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get('/health', (_, res) => {
    res.json({
      success: true,
      message: 'API funcionando correctamente',
      timestamp: new Date().toISOString(),
      environment: CONFIG.NODE_ENV,
    });
  });

  // ============================================
  // RUTAS API
  // ============================================

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/reservas', reservaRoutes);
  app.use('/api/periodos', periodoRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile', profileRoutes);

  // ============================================
  // MANEJADORES DE ERROR
  // ============================================

  // Ruta no encontrada (404)
  app.use(notFoundHandler);

  // Manejador global de errores
  app.use(errorHandler);

  return app;
};