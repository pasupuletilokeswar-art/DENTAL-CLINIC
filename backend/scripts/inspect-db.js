const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, fullName: true, role: true } });
  const doctors = await prisma.doctor.findMany({ include: { user: { select: { fullName: true } } } });
  const procMasters = await prisma.procedureMaster.findMany({ select: { id: true, name: true, category: true, standardCharge: true } });
  const counts = {
    patients: await prisma.patient.count(),
    appointments: await prisma.appointment.count(),
    consultationBills: await prisma.consultationBill.count(),
    operationBills: await prisma.operationBill.count(),
    procedures: await prisma.procedure.count(),
    payments: await prisma.payment.count(),
    medicines: await prisma.medicineMaster.count(),
    batches: await prisma.medicineBatchStock.count(),
    sales: await prisma.pharmacySale.count(),
  };

  console.log('=== USERS ===', JSON.stringify(users, null, 2));
  console.log('=== DOCTORS ===', JSON.stringify(doctors, null, 2));
  console.log('=== PROCEDURE MASTERS ===', procMasters.length);
  console.log('=== TRANSACTION COUNTS ===', JSON.stringify(counts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
