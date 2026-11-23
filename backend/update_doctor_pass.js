if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:clinic_secure_pass_2026@postgres:5432/clinic_db?schema=public';
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateDoctorPassword() {
  const hash = await bcrypt.hash('doctor123', 10);
  const updated = await prisma.user.updateMany({
    where: {
      role: { in: ['DOCTOR_DENTAL', 'DOCTOR_ORTHO'] },
    },
    data: {
      passwordHash: hash,
    },
  });
  console.log(`Updated ${updated.count} doctor password(s) to 'doctor123'`);

  const doctors = await prisma.user.findMany({
    where: { role: { in: ['DOCTOR_DENTAL', 'DOCTOR_ORTHO'] } },
    include: { doctorProfile: true },
  });
  doctors.forEach((d) => {
    console.log(`Doctor: ${d.fullName} | Username: ${d.username} | Specialization: ${d.doctorProfile?.specialization}`);
  });
}

updateDoctorPassword()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
