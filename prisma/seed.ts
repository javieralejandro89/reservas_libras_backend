/**
 * Script de Seed para inicializar la base de datos
 * Crea el admin por defecto y datos de prueba
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Datos del admin por defecto
 */
const ADMIN_DATA = {
  name: process.env.ADMIN_NAME || 'Admin Principal',
  email: process.env.ADMIN_EMAIL || 'admin@paqueteria.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!@#',
};

/**
 * Hashear contraseña
 */
const hashPassword = async (password: string): Promise<string> => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
};

/**
 * Crear admin si no existe
 */
const createAdmin = async () => {
  console.log('📝 Verificando admin...');

  // Verificar si ya existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_DATA.email },
  });

  if (existingAdmin) {
    console.log('✅ Admin ya existe:', ADMIN_DATA.email);
    return existingAdmin;
  }

  // Crear admin
  const hashedPassword = await hashPassword(ADMIN_DATA.password);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_DATA.name,
      email: ADMIN_DATA.email,
      password: hashedPassword,
      role: 'ADMIN_PRINCIPAL',
      isActive: true,
    },
  });

  console.log('✅ Admin creado exitosamente');
  console.log('📧 Email:', ADMIN_DATA.email);
  console.log('🔑 Password:', ADMIN_DATA.password);

  return admin;
};

/**
 * Crear periodo activo de prueba
 */
const createPeriodoActivo = async () => {
  console.log('\n📅 Verificando periodo activo...');

  // Verificar si ya existe un periodo activo
  const existingPeriodo = await prisma.periodoLibras.findFirst({
    where: { isActive: true },
  });

  if (existingPeriodo) {
    console.log('✅ Ya existe un periodo activo');
    console.log('📊 Libras totales:', existingPeriodo.librasTotales);
    console.log('📆 Fecha inicio:', existingPeriodo.fechaInicio.toISOString().split('T')[0]);
    console.log('📆 Fecha fin:', existingPeriodo.fechaFin.toISOString().split('T')[0]);
    return existingPeriodo;
  }

  // Crear periodo activo (siguiente mes)
  const now = new Date();
  const fechaInicio = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Primer día del próximo mes
  const fechaFin = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Último día del próximo mes

  const librasTotales = parseInt(process.env.DEFAULT_LIBRAS_TOTALES || '2000', 10);

  const periodo = await prisma.periodoLibras.create({
    data: {
      librasTotales,
      fechaInicio,
      fechaFin,
      isActive: true,
    },
  });

  console.log('✅ Periodo activo creado');
  console.log('📊 Libras totales:', periodo.librasTotales);
  console.log('📆 Fecha inicio:', periodo.fechaInicio.toISOString().split('T')[0]);
  console.log('📆 Fecha fin:', periodo.fechaFin.toISOString().split('T')[0]);

  return periodo;
};

/**
 * Crear usuarios de prueba (opcional)
 */
const createTestUsers = async () => {
  console.log('\n👥 Creando usuarios de prueba...');

  const testUsers = [
    {
      name: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'Test123!@#',
      role: 'USUARIO' as const,
    },
    {
      name: 'María González',
      email: 'maria@test.com',
      password: 'Test123!@#',
      role: 'USUARIO' as const,
    },
    {
      name: 'Carlos Rodríguez',
      email: 'carlos@test.com',
      password: 'Test123!@#',
      role: 'USUARIO' as const,
    },
  ];

  const createdUsers = [];

  for (const userData of testUsers) {
    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log('⏭️  Usuario ya existe:', userData.email);
      createdUsers.push(existing);
      continue;
    }

    // Crear usuario
    const hashedPassword = await hashPassword(userData.password);
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });

    console.log('✅ Usuario creado:', userData.email);
    createdUsers.push(user);
  }

  return createdUsers;
};

/**
 * Crear reservas de prueba (opcional)
 */
const createTestReservas = async (users: any[], periodoId: number) => {
  console.log('\n📦 Creando reservas de prueba...');

  const periodo = await prisma.periodoLibras.findUnique({
    where: { id: periodoId },
  });

  if (!periodo) {
    console.log('⚠️  No se puede crear reservas sin periodo activo');
    return [];
  }

  const estados = ['CDMX', 'Jalisco', 'Nuevo León', 'Guanajuato'];
  const reservasData = [
    { userId: users[0].id, libras: 50, estado: estados[0]!, observaciones: 'Primera reserva de prueba' as string | null },
    { userId: users[1].id, libras: 75, estado: estados[1]!, observaciones: 'Paquete importante' as string | null },
    { userId: users[2].id, libras: 100, estado: estados[2]!, observaciones: null as string | null },
    { userId: users[0].id, libras: 25, estado: estados[3]!, observaciones: 'Segunda reserva' as string | null },
  ];

  const createdReservas = [];

  for (const reservaData of reservasData) {
    // Fecha aleatoria dentro del periodo
    const dayOffset = Math.floor(Math.random() * 20) + 5; // Entre 5 y 25 días desde inicio
    const fecha = new Date(periodo.fechaInicio);
    fecha.setDate(fecha.getDate() + dayOffset);

    const reserva = await prisma.reserva.create({
      data: {
        userId: reservaData.userId,
        libras: reservaData.libras,
        estado: reservaData.estado,
        observaciones: reservaData.observaciones,
        fecha,
        periodoId: periodo.id,
        status: 'PENDIENTE',
      },
    });

    // Obtener el usuario para el log
    const user = users.find(u => u.id === reserva.userId);

    console.log(`✅ Reserva creada: ${reserva.libras} lbs - ${user?.name || 'Usuario'}`);
    createdReservas.push(reserva);
  }

  return createdReservas;
};

/**
 * Función principal de seed
 */
const main = async () => {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  try {
    // 1. Crear admin
    await createAdmin();

    // 2. Crear periodo activo
    const periodo = await createPeriodoActivo();

    // 3. Preguntar si crear datos de prueba
    const shouldCreateTestData = process.env.CREATE_TEST_DATA === 'true';

    if (shouldCreateTestData) {
      console.log('\n🧪 Creando datos de prueba...');

      // 4. Crear usuarios de prueba
      const users = await createTestUsers();

      // 5. Crear reservas de prueba
      if (users.length > 0 && periodo) {
        await createTestReservas(users, periodo.id);
      }
    } else {
      console.log('\n⏭️  Omitiendo datos de prueba (CREATE_TEST_DATA=false)');
    }

    console.log('\n✅ Seed completado exitosamente\n');

    // Resumen
    const userCount = await prisma.user.count();
    const reservaCount = await prisma.reserva.count();

    console.log('📊 RESUMEN:');
    console.log('='.repeat(50));
    console.log(`👥 Usuarios totales: ${userCount}`);
    console.log(`📦 Reservas totales: ${reservaCount}`);
    console.log(`📅 Periodos activos: 1`);
    console.log('='.repeat(50));

    console.log('\n🔑 CREDENCIALES DEL ADMIN:');
    console.log('='.repeat(50));
    console.log(`📧 Email: ${ADMIN_DATA.email}`);
    console.log(`🔑 Password: ${ADMIN_DATA.password}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
};

// Ejecutar seed
main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });