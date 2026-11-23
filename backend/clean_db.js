if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:clinic_secure_pass_2026@postgres:5432/clinic_db?schema=public';
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('--- Cleaning All Seed and Demo Data ---');

  // Order of deletion respecting foreign key constraints
  const modelsInOrder = [
    'labPhoto',
    'labDocument',
    'labItem',
    'labCase',
    'dentalFinding',
    'stockMovement',
    'pharmacySaleItem',
    'pharmacySale',
    'purchaseItem',
    'purchaseInvoice',
    'medicineBatchStock',
    'medicineMaster',
    'supplier',
    'payment',
    'operationBill',
    'procedure',
    'procedureMaster',
    'consultationBill',
    'clinicalNote',
    'appointment',
    'patient',
    'doctor',
  ];

  for (const model of modelsInOrder) {
    if (prisma[model]) {
      const deleted = await prisma[model].deleteMany({});
      console.log(`Deleted ${deleted.count} records from ${model}`);
    }
  }

  // Delete all users except admin
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      username: { not: 'admin' },
    },
  });
  console.log(`Deleted ${deletedUsers.count} non-admin user records`);

  // Ensure Admin user exists with default credentials
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Clinic Administrator',
      email: 'admin@dentalorthoclinic.com',
      phone: '+91 99999 00000',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✓ Master Admin Verified:', admin.username, admin.fullName, admin.role);

  // Print remaining counts
  console.log('\n--- Final Database Status ---');
  for (const model of [...modelsInOrder, 'user']) {
    const count = await prisma[model].count();
    console.log(`${model}: ${count} record(s)`);
  }
}

cleanDatabase()
  .catch((err) => {
    console.error('Error cleaning database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
