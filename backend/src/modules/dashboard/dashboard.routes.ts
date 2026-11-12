import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Total & Today's Registered Patients
    const [totalPatients, todayPatients] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({
        where: {
          registrationDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ]);

    // 2. Today's Appointments (Total, Dental, Ortho, Completed)
    const [todayAppointments, dentalToday, orthoToday, completedToday] = await Promise.all([
      prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          specialization: 'DENTAL',
          appointmentDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.appointment.count({
        where: {
          specialization: 'ORTHOPEDIC',
          appointmentDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.appointment.count({
        where: {
          status: 'COMPLETED',
          appointmentDate: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    // 3. Today's Revenue Streams (Consultation, Pharmacy, Operations)
    const [consultationBills, pharmacySales, operationBills] = await Promise.all([
      prisma.consultationBill.aggregate({
        _sum: { paidAmount: true, totalAmount: true, pendingBalance: true },
        where: { billDate: { gte: today, lt: tomorrow } },
      }),
      prisma.pharmacySale.aggregate({
        _sum: { paidAmount: true, grandTotal: true, pendingBalance: true },
        where: { saleDate: { gte: today, lt: tomorrow } },
      }),
      prisma.operationBill.aggregate({
        _sum: { paidAmount: true, totalAmount: true, pendingBalance: true },
        where: { billDate: { gte: today, lt: tomorrow } },
      }),
    ]);

    const totalRevenueToday =
      (consultationBills._sum.paidAmount || 0) +
      (pharmacySales._sum.paidAmount || 0) +
      (operationBills._sum.paidAmount || 0);

    const totalOutstandingToday =
      (consultationBills._sum.pendingBalance || 0) +
      (pharmacySales._sum.pendingBalance || 0) +
      (operationBills._sum.pendingBalance || 0);

    // 4. Low stock medicines count
    const medicines = await prisma.medicineMaster.findMany({
      include: {
        batches: true,
      },
    });

    const lowStockCount = medicines.filter((m) => {
      const totalUnits = m.batches.reduce((sum, b) => sum + b.quantityInBase, 0);
      return totalUnits <= m.reorderLevel;
    }).length;

    // 5. Recent Appointments Today
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 6,
    });

    res.json({
      success: true,
      stats: {
        totalPatients,
        todayPatients,
        todayAppointments,
        dentalToday,
        orthoToday,
        completedToday,
        totalRevenueToday,
        totalOutstandingToday,
        lowStockCount,
        breakdown: {
          consultationCollected: consultationBills._sum.paidAmount || 0,
          pharmacyCollected: pharmacySales._sum.paidAmount || 0,
          operationCollected: operationBills._sum.paidAmount || 0,
        },
      },
      recentAppointments,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
