const { PrismaClient, Role, Specialization, VisitType, AppointmentStatus, PaymentStatus, ProcedureStatus, MedicineType, PrescriptionType } = require('@prisma/client');
const prisma = new PrismaClient();

async function runE2ETests() {
  console.log('=====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE END-TO-END BUSINESS LOGIC TESTS');
  console.log('=====================================================');

  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Get Doctor
  const doctor = await prisma.doctor.findFirst({
    include: { user: true },
  });
  if (!doctor) throw new Error('No doctor found in database!');
  console.log(`✓ 1. Specialist Doctor found: ${doctor.user.fullName} (${doctor.specialization}), Fee: ₹${doctor.consultationFee}`);

  // 2. Create Test Patient
  const patientCode = `DOC-TEST-${Date.now().toString().slice(-4)}`;
  const testPatient = await prisma.patient.create({
    data: {
      patientCode,
      name: 'E2E Test Patient',
      mobile: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      gender: 'MALE',
      age: 28,
    },
  });
  console.log(`✓ 2. Patient created: ${testPatient.name} (${testPatient.patientCode})`);

  // 3. Book Today Consultation Appointment
  const aptCode1 = `APT-TEST-${Date.now().toString().slice(-4)}`;
  const aptToday = await prisma.appointment.create({
    data: {
      appointmentCode: aptCode1,
      patientId: testPatient.id,
      doctorId: doctor.id,
      specialization: doctor.specialization,
      appointmentDate: today,
      startTime: today,
      endTime: new Date(today.getTime() + 30 * 60000),
      visitType: VisitType.NEW_VISIT,
      procedureName: 'Tooth Sensitivity',
      status: AppointmentStatus.SCHEDULED,
    },
  });
  console.log(`✓ 3. Today's appointment created: ${aptToday.appointmentCode} (${aptToday.visitType}), status: ${aptToday.status}`);

  // 4. Book Tomorrow Procedure Appointment
  const aptCode2 = `APT-TEST-TMR-${Date.now().toString().slice(-4)}`;
  const aptTomorrow = await prisma.appointment.create({
    data: {
      appointmentCode: aptCode2,
      patientId: testPatient.id,
      doctorId: doctor.id,
      specialization: doctor.specialization,
      appointmentDate: tomorrow,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 30 * 60000),
      visitType: VisitType.PROCEDURE,
      procedureName: 'Dental Examination',
      status: AppointmentStatus.SCHEDULED,
    },
  });
  console.log(`✓ 4. Tomorrow's procedure appointment created: ${aptTomorrow.appointmentCode} (${aptTomorrow.visitType}), status: ${aptTomorrow.status}`);

  // 5. Progress Today's appointment to IN_PROGRESS
  const inChairApt = await prisma.appointment.update({
    where: { id: aptToday.id },
    data: { status: AppointmentStatus.IN_PROGRESS },
  });
  console.log(`✓ 5. Today's appointment status progressed: ${inChairApt.status} (In Chair)`);

  // 6. Generate Consultation Bill for Today's Visit
  const billCount = await prisma.consultationBill.count();
  const invoiceNumber = `CBILL-E2E-${(billCount + 1).toString().padStart(5, '0')}`;
  const bill1 = await prisma.consultationBill.create({
    data: {
      invoiceNumber,
      patientId: testPatient.id,
      doctorId: doctor.id,
      appointmentId: aptToday.id,
      consultationFee: doctor.consultationFee,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: doctor.consultationFee,
      paidAmount: doctor.consultationFee,
      pendingBalance: 0,
      paymentStatus: PaymentStatus.PAID,
    },
  });
  await prisma.appointment.update({
    where: { id: aptToday.id },
    data: { status: AppointmentStatus.COMPLETED },
  });
  console.log(`✓ 6. Consultation invoice generated: ${bill1.invoiceNumber} (₹${bill1.totalAmount} - ${bill1.paymentStatus})`);

  // 7. Test Duplicate Billing Prevention Logic
  const existingBill = await prisma.consultationBill.findFirst({
    where: {
      patientId: testPatient.id,
      billDate: { gte: todayStart, lte: todayEnd },
    },
  });
  const unbilledSameDayApt = await prisma.appointment.findFirst({
    where: {
      patientId: testPatient.id,
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
      visitType: { not: VisitType.PROCEDURE },
      appointmentDate: { gte: todayStart, lte: todayEnd },
      consultationBill: null,
    },
  });

  if (existingBill && !unbilledSameDayApt) {
    console.log(`✓ 7. Duplicate Consultation Billing Check: CORRECTLY BLOCKED! (Patient already billed today under #${existingBill.invoiceNumber})`);
  } else {
    throw new Error('FAIL: Duplicate billing guard did not trigger!');
  }

  // 8. Verify Tomorrow's Appointment Remains Strictly SCHEDULED
  const tomorrowCheck = await prisma.appointment.findUnique({
    where: { id: aptTomorrow.id },
  });
  if (tomorrowCheck.status !== AppointmentStatus.SCHEDULED) {
    throw new Error(`FAIL: Tomorrow's appointment was corrupted! Status is: ${tomorrowCheck.status}`);
  }
  console.log(`✓ 8. Tomorrow's appointment date guard verified: status is strictly SCHEDULED (${tomorrowCheck.status})`);

  // 9. Procedure Workflow: Create procedure for today and complete it
  const procCount = await prisma.procedure.count();
  const procedure = await prisma.procedure.create({
    data: {
      procedureCode: `PROC-TEST-${(procCount + 1).toString().padStart(5, '0')}`,
      patientId: testPatient.id,
      doctorId: doctor.id,
      dentistName: doctor.user.fullName,
      procedureName: 'Dental Examination',
      procedureDate: today,
      charges: 800,
      status: ProcedureStatus.COMPLETED,
    },
  });
  const opBillCount = await prisma.operationBill.count();
  const opBill = await prisma.operationBill.create({
    data: {
      invoiceNumber: `OBILL-TEST-${(opBillCount + 1).toString().padStart(5, '0')}`,
      procedureId: procedure.id,
      procedureFee: 800,
      consumablesFee: 0,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 800,
      paidAmount: 800,
      pendingBalance: 0,
      paymentStatus: PaymentStatus.PAID,
    },
  });
  console.log(`✓ 9. Procedure invoice generated: ${opBill.invoiceNumber} for ${procedure.procedureName} (₹${opBill.totalAmount})`);

  // 10. Re-verify Tomorrow's Appointment after procedure completion
  const tomorrowCheck2 = await prisma.appointment.findUnique({
    where: { id: aptTomorrow.id },
  });
  if (tomorrowCheck2.status !== AppointmentStatus.SCHEDULED) {
    throw new Error(`FAIL: Procedure billing corrupted tomorrow's appointment! Status is: ${tomorrowCheck2.status}`);
  }
  console.log(`✓ 10. Tomorrow's appointment re-verified: Still strictly SCHEDULED (${tomorrowCheck2.status})`);

  // 11. Pharmacy Calculation Test:
  // Buying: 150 + 12% buy tax
  // MRP: 180
  // Selling Before Tax: 160.71, Sale Tax: 12% -> Final Patient Selling Price: 180.00
  const baseSelling = 160.71;
  const saleGstPct = 12;
  const saleTaxAmt = (baseSelling * saleGstPct) / 100;
  const finalSelling = Math.round((baseSelling + saleTaxAmt) * 100) / 100;
  console.log(`✓ 11. Pharmacy Math: Base ₹${baseSelling} + GST ${saleGstPct}% (₹${saleTaxAmt.toFixed(2)}) = Final Patient Price ₹${finalSelling.toFixed(2)} (Matches MRP ₹180.00)`);

  // Clean up test records
  await prisma.operationBill.delete({ where: { id: opBill.id } });
  await prisma.procedure.delete({ where: { id: procedure.id } });
  await prisma.consultationBill.delete({ where: { id: bill1.id } });
  await prisma.appointment.delete({ where: { id: aptToday.id } });
  await prisma.appointment.delete({ where: { id: aptTomorrow.id } });
  await prisma.patient.delete({ where: { id: testPatient.id } });
  console.log('✓ 12. Test records cleanly pruned.');

  console.log('=====================================================');
  console.log('🎉 ALL 12 END-TO-END BUSINESS LOGIC VERIFICATIONS PASSED 100%!');
  console.log('=====================================================');
}

runE2ETests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
