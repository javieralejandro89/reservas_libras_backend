/**
 * Servidor principal
 */

// ============================================
// CONFIGURAR TIMEZONE A MÉXICO
// ============================================
process.env.TZ = 'America/Mexico_City';

import { createApp } from './app';
import { CONFIG } from './config/constants';
import { connectPrisma, disconnectPrisma } from './config/prisma';

/**
 * Inicializar servidor
 */
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectPrisma();

    // Crear aplicación
    const app = createApp();

    // Iniciar servidor
    const server = app.listen(CONFIG.PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Servidor iniciado correctamente');
      console.log('='.repeat(50));
      console.log(`📡 Entorno: ${CONFIG.NODE_ENV}`);
      console.log(`🌐 Puerto: ${CONFIG.PORT}`);
      console.log(`🔗 URL: http://localhost:${CONFIG.PORT}`);
      console.log(`🏥 Health check: http://localhost:${CONFIG.PORT}/health`);
      console.log(`⏰ Timezone: ${process.env.TZ}`);
      console.log(`📅 Fecha servidor: ${new Date().toLocaleString('es-MX')}`);
      console.log('='.repeat(50));
    });

    // Manejo de señales de terminación
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);

      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');

        try {
          await disconnectPrisma();
          console.log('🔌 Conexión a base de datos cerrada');
          console.log('✅ Servidor cerrado correctamente');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error al cerrar conexiones:', error);
          process.exit(1);
        }
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('⏱️  Tiempo de espera excedido. Forzando cierre...');
        process.exit(1);
      }, 10000);
    };

    // Escuchar señales de terminación
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();
