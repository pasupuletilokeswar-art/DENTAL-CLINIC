import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// GET /api/reports/analytics
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const fromDate = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = endDate ? new Date(endDate as string) : new Date();

    // 1. Patient Registrations Trend
    const patients = await prisma.patient.findMany({
      where: { registrationDate: { gte: fromDate, lte: toDate } },
      select: { registrationDate: true, gender: true },
    });

    // 2. Doctor Consultation Summary
    const consultationSummary = await prisma.consultationBill.groupBy({
      by: ['doctorId'],
      where: { billDate: { gte: fromDate, lte: toDate } },
      _sum: {
        consultationFee: true,
        paidAmount: true,
        pendingBalance: true,
      },
      _count: { id: true },
    });

    // Fetch doctor names
    const doctors = await prisma.doctor.findMany({
      include: { user: { select: { fullName: true } } },
    });

    const doctorReport = consultationSummary.map((item) => {
      const doc = doctors.find((d) => d.id === item.doctorId);
      return {
        doctorId: item.doctorId,
        doctorName: doc?.user.fullName || 'Doctor',
        specialization: doc?.specialization,
        totalConsultations: item._count.id,
        revenueCollected: item._sum.paidAmount || 0,
        pendingBalance: item._sum.pendingBalance || 0,
      };
    });

    // 3. Pharmacy Summary
    const [pharmacySales, pharmacyPurchases] = await Promise.all([
      prisma.pharmacySale.aggregate({
        where: { saleDate: { gte: fromDate, lte: toDate } },
        _sum: { grandTotal: true, paidAmount: true, totalGst: true, pendingBalance: true },
        _count: { id: true },
      }),
      prisma.purchaseInvoice.aggregate({
        where: { invoiceDate: { gte: fromDate, lte: toDate } },
        _sum: { grandTotal: true, totalGst: true, cgstAmount: true, sgstAmount: true },
        _count: { id: true },
      }),
    ]);

    // 4. Operation Summary
    const operationSummary = await prisma.operationBill.aggregate({
      where: { billDate: { gte: fromDate, lte: toDate } },
      _sum: { totalAmount: true, paidAmount: true, pendingBalance: true, taxAmount: true },
      _count: { id: true },
    });

    // 5. Total Financial Picture
    const totalRevenueCollected =
      (doctorReport.reduce((acc, d) => acc + d.revenueCollected, 0)) +
      (pharmacySales._sum.paidAmount || 0) +
      (operationSummary._sum.paidAmount || 0);

    const totalOutstanding =
      (doctorReport.reduce((acc, d) => acc + d.pendingBalance, 0)) +
      (pharmacySales._sum.pendingBalance || 0) +
      (operationSummary._sum.pendingBalance || 0);

    res.json({
      success: true,
      period: { fromDate, toDate },
      summary: {
        totalPatientsRegistered: patients.length,
        totalRevenueCollected,
        totalOutstanding,
        doctorReport,
        pharmacy: {
          totalSales: pharmacySales._sum.grandTotal || 0,
          salesCollected: pharmacySales._sum.paidAmount || 0,
          salesCount: pharmacySales._count.id,
          gstCollected: pharmacySales._sum.totalGst || 0,
          totalPurchases: pharmacyPurchases._sum.grandTotal || 0,
          purchaseGstPaid: pharmacyPurchases._sum.totalGst || 0,
        },
        operations: {
          totalProcedures: operationSummary._count.id,
          billed: operationSummary._sum.totalAmount || 0,
          collected: operationSummary._sum.paidAmount || 0,
          pending: operationSummary._sum.pendingBalance || 0,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/doctors - Doctor listing for dropdowns
router.get('/doctors', authenticateToken, async (req: Request, res: Response) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true, phone: true } },
      },
    });
    res.json({ success: true, doctors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
