import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing Clean Minimal Setup (Admin Account Only) ---');

  const adminPassword = await bcrypt.hash('admin123', 10);

  // 1. Create Default Master Administrator
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'Clinic Administrator',
      email: 'admin@dentalorthoclinic.com',
      phone: '+91 99999 00000',
      role: Role.ADMIN,
    },
  });

  console.log(`✓ Admin user created (username: admin / password: admin123)`);
  console.log('--- Ready for Manual User, Patient, and Inventory Testing! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
