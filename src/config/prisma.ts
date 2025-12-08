/**
 * Cliente de Prisma
 * Singleton para evitar múltiples instancias en desarrollo
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { CONFIG } from './constants';

/**
 * Extensión global para TypeScript
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Configuración del cliente Prisma
 */
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log:
    CONFIG.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
};

/**
 * Crear instancia de Prisma
 * En desarrollo, reutilizar instancia global para evitar
 * múltiples conexiones con hot-reload
 */
const createPrismaClient = () => {
  return new PrismaClient(prismaClientOptions);
};

/**
 * Cliente de Prisma (Singleton)
 */
export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (CONFIG.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Desconectar Prisma al cerrar la aplicación
 */
export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

/**
 * Conectar a la base de datos
 */
export const connectPrisma = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    process.exit(1);
  }
};