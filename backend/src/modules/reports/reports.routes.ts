import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Helper: parse date filter
function resolveDateRange(period?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (period === 'today') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    fromDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'this_year') {
    fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom' && startDate && endDate) {
    fromDate = new Date(startDate);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(endDate);
    toDate.setHours(23, 59, 59, 999);
  } else {
    // Default: this_month
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { fromDate, toDate };
}

// GET /api/reports/analytics
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { period, startDate, endDate, fromDate: qFromDate, toDate: qToDate, from, to } = req.query;
    const start = (startDate || qFromDate || from) as string | undefined;
    const end = (endDate || qToDate || to) as string | undefined;
    const { fromDate, toDate } = resolveDateRange(
      period as string,
      start,
      end
    );

    // ==============================================================
    // 1. REVENUE & COLLECTIONS (Real payments realized in period)
    // ==============================================================
    const paymentsInPeriod = await prisma.payment.findMany({
      where: { paymentDate: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paymentMode: true,
        paymentDate: true,
        consultationBillId: true,
        operationBillId: true,
        pharmacySaleId: true,
      },
    });

    const consultationRevenue = paymentsInPeriod
      .filter((p) => p.consultationBillId)
      .reduce((sum, p) => sum + p.amount, 0);

    const operationRevenue = paymentsInPeriod
      .filter((p) => p.operationBillId)
      .reduce((sum, p) => sum + p.amount, 0);

    const pharmacyRevenue = paymentsInPeriod
      .filter((p) => p.pharmacySaleId)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRevenueCollected = consultationRevenue + operationRevenue + pharmacyRevenue;

    // Payment mode breakdown
    const paymentModeBreakdown: Record<string, { count: number; amount: number }> = {};
    for (const p of paymentsInPeriod) {
      const mode = p.paymentMode || 'CASH';
      if (!paymentModeBreakdown[mode]) {
        paymentModeBreakdown[mode] = { count: 0, amount: 0 };
      }
      paymentModeBreakdown[mode].count += 1;
      paymentModeBreakdown[mode].amount += p.amount;
    }

    // ==============================================================
    // 2. OUTSTANDING RECEIVABLES (Unpaid balances from active bills)
    // ==============================================================
    const [unpaidConsultations, unpaidOperations, unpaidPharmacy] = await Promise.all([
      prisma.consultationBill.aggregate({
        where: { pendingBalance: { gt: 0 } },
        _sum: { pendingBalance: true, totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      prisma.operationBill.aggregate({
        where: { pendingBalance: { gt: 0 } },
        _sum: { pendingBalance: true, totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      prisma.pharmacySale.aggregate({
        where: { pendingBalance: { gt: 0 } },
        _sum: { pendingBalance: true, grandTotal: true, paidAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalOutstanding =
      (unpaidConsultations._sum.pendingBalance || 0) +
      (unpaidOperations._sum.pendingBalance || 0) +
      (unpaidPharmacy._sum.pendingBalance || 0);

    // ==============================================================
    // 3. PATIENTS (Registrations & Demographics)
    // ==============================================================
    const [newPatientsInPeriod, totalPatientsAllTime, allPatients] = await Promise.all([
      prisma.patient.findMany({
        where: { registrationDate: { gte: fromDate, lte: toDate } },
        select: {
          id: true,
          name: true,
          patientCode: true,
          mobile: true,
          gender: true,
          age: true,
          registrationDate: true,
        },
        orderBy: { registrationDate: 'desc' },
      }),
      prisma.patient.count(),
      prisma.patient.findMany({
        select: { id: true, age: true, gender: true },
      }),
    ]);

    // Unique patient visits in period (via clinical notes)
    const notesInPeriod = await prisma.clinicalNote.findMany({
      where: { consultationDate: { gte: fromDate, lte: toDate } },
      select: { patientId: true, consultationDate: true },
    });
    const uniqueVisitsInPeriod = new Set(notesInPeriod.map((n) => n.patientId)).size;

    // Demographics
    const ageDistribution = {
      pediatric: allPatients.filter((p) => p.age <= 12).length,
      teens: allPatients.filter((p) => p.age >= 13 && p.age <= 19).length,
      adults: allPatients.filter((p) => p.age >= 20 && p.age <= 59).length,
      seniors: allPatients.filter((p) => p.age >= 60).length,
    };
    const genderDistribution = {
      male: allPatients.filter((p) => p.gender === 'MALE').length,
      female: allPatients.filter((p) => p.gender === 'FEMALE').length,
      other: allPatients.filter((p) => p.gender === 'OTHER').length,
    };

    // ==============================================================
    // 4. DOCTOR CONSULTATION PERFORMANCE
    // ==============================================================
    const doctors = await prisma.doctor.findMany({
      include: {
        user: { select: { fullName: true } },
      },
    });

    const doctorReport = await Promise.all(
      doctors.map(async (doc) => {
        // Actual completed consultations in period
        const clinicalCount = await prisma.clinicalNote.count({
          where: {
            doctorId: doc.id,
            consultationDate: { gte: fromDate, lte: toDate },
          },
        });

        const completedApptCount = await prisma.appointment.count({
          where: {
            doctorId: doc.id,
            appointmentDate: { gte: fromDate, lte: toDate },
            status: 'COMPLETED',
          },
        });

        // Consultation billing for this doctor in period
        const docBills = await prisma.consultationBill.aggregate({
          where: {
            doctorId: doc.id,
            billDate: { gte: fromDate, lte: toDate },
          },
          _sum: {
            totalAmount: true,
            paidAmount: true,
            pendingBalance: true,
          },
        });

        return {
          doctorId: doc.id,
          doctorName: doc.user?.fullName || 'Doctor',
          specialization: doc.specialization,
          totalConsultations: Math.max(clinicalCount, completedApptCount),
          revenueCollected: docBills._sum.paidAmount || 0,
          pendingBalance: docBills._sum.pendingBalance || 0,
          totalBilled: docBills._sum.totalAmount || 0,
        };
      })
    );

    // ==============================================================
    // 5. APPOINTMENTS BREAKDOWN
    // ==============================================================
    const appointmentStats = await prisma.appointment.groupBy({
      by: ['status'],
      where: { appointmentDate: { gte: fromDate, lte: toDate } },
      _count: { id: true },
    });

    const appointmentCounts = {
      total: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      scheduled: 0,
    };

    for (const stat of appointmentStats) {
      appointmentCounts.total += stat._count.id;
      if (stat.status === 'COMPLETED') appointmentCounts.completed += stat._count.id;
      else if (stat.status === 'CANCELLED') appointmentCounts.cancelled += stat._count.id;
      else if (stat.status === 'NO_SHOW') appointmentCounts.noShow += stat._count.id;
      else appointmentCounts.scheduled += stat._count.id;
    }

    // ==============================================================
    // 6. CLINICAL & EXAMINATION NOTES
    // ==============================================================
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: { consultationDate: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        consultationDate: true,
        clinicalFindings: true,
        recommendedTreatments: true,
      },
    });

    let totalFindingsRecorded = 0;
    let totalTreatmentsRecommended = 0;

    clinicalNotes.forEach((n) => {
      if (Array.isArray(n.clinicalFindings)) {
        totalFindingsRecorded += n.clinicalFindings.length;
      }
      if (Array.isArray(n.recommendedTreatments)) {
        totalTreatmentsRecommended += n.recommendedTreatments.length;
      }
    });

    // ==============================================================
    // 7. PHARMACY & INVENTORY (FEFO)
    // ==============================================================
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

    const nowTime = new Date();
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 3600 * 1000);

    const [expiredBatchesCount, nearExpiryBatchesCount, stockMovementsCount] = await Promise.all([
      prisma.medicineBatchStock.count({
        where: {
          expiryDate: { lt: nowTime },
          quantityInBase: { gt: 0 },
        },
      }),
      prisma.medicineBatchStock.count({
        where: {
          expiryDate: { gte: nowTime, lte: ninetyDaysFromNow },
          quantityInBase: { gt: 0 },
        },
      }),
      prisma.stockMovement.count({
        where: { timestamp: { gte: fromDate, lte: toDate } },
      }),
    ]);

    // ==============================================================
    // 8. OPERATIONS & PROCEDURES
    // ==============================================================
    const [completedProceduresCount, operationBillStats, proceduresByStatusGroup] = await Promise.all([
      prisma.procedure.count({
        where: {
          status: 'COMPLETED',
          procedureDate: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.operationBill.aggregate({
        where: { billDate: { gte: fromDate, lte: toDate } },
        _sum: { totalAmount: true, paidAmount: true, pendingBalance: true },
        _count: { id: true },
      }),
      prisma.procedure.groupBy({
        by: ['status'],
        where: { procedureDate: { gte: fromDate, lte: toDate } },
        _count: { id: true },
      }),
    ]);

    const procedureStatusCounts = {
      completed: 0,
      planned: 0,
      scheduled: 0,
      inProgress: 0,
      cancelled: 0,
    };
    for (const g of proceduresByStatusGroup) {
      if (g.status === 'COMPLETED') procedureStatusCounts.completed += g._count.id;
      else if (g.status === 'PLANNED') procedureStatusCounts.planned += g._count.id;
      else if (g.status === 'SCHEDULED') procedureStatusCounts.scheduled += g._count.id;
      else if (g.status === 'IN_PROGRESS') procedureStatusCounts.inProgress += g._count.id;
      else if (g.status === 'CANCELLED') procedureStatusCounts.cancelled += g._count.id;
    }

    // ==============================================================
    // 9. DENTAL LAB & DIAGNOSTICS
    // ==============================================================
    const [totalLabCases, receivedLabItems, pendingHandoverItems, handedOverItems, uploadedPdfReports] =
      await Promise.all([
        prisma.labCase.count({
          where: { sentDate: { gte: fromDate, lte: toDate } },
        }),
        prisma.labItem.count({
          where: {
            status: { in: ['RECEIVED_FROM_LAB', 'READY_FOR_HANDOVER', 'HANDED_OVER'] },
            updatedAt: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.labItem.count({
          where: {
            status: { in: ['RECEIVED_FROM_LAB', 'READY_FOR_HANDOVER'] },
          },
        }),
        prisma.labItem.count({
          where: {
            status: 'HANDED_OVER',
            handoverDate: { gte: fromDate, lte: toDate },
          },
        }),
        prisma.labDocument.count({
          where: {
            uploadedAt: { gte: fromDate, lte: toDate },
          },
        }),
      ]);

    // Send formatted summary
    res.json({
      success: true,
      period: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
      summary: {
        // High-level top 3 cards
        totalRevenueCollected,
        totalOutstanding,
        totalPatientsRegistered: newPatientsInPeriod.length,
        totalRegisteredPatientsAllTime: totalPatientsAllTime,
        uniqueVisitsInPeriod,

        // Collection Breakdown
        collections: {
          total: totalRevenueCollected,
          consultation: consultationRevenue,
          operations: operationRevenue,
          pharmacy: pharmacyRevenue,
          paymentModes: paymentModeBreakdown,
        },

        // Receivables Breakdown
        receivables: {
          total: totalOutstanding,
          consultation: unpaidConsultations._sum.pendingBalance || 0,
          operations: unpaidOperations._sum.pendingBalance || 0,
          pharmacy: unpaidPharmacy._sum.pendingBalance || 0,
          unpaidInvoicesCount:
            unpaidConsultations._count.id + unpaidOperations._count.id + unpaidPharmacy._count.id,
        },

        // Patient Demographics
        patientDemographics: {
          ageDistribution,
          genderDistribution,
          newPatientsList: newPatientsInPeriod.slice(0, 10),
        },

        // Doctor Performance
        doctorReport,

        // Appointments
        appointments: appointmentCounts,

        // Clinical
        clinical: {
          totalConsultations: clinicalNotes.length,
          findingsRecorded: totalFindingsRecorded,
          treatmentsRecommended: totalTreatmentsRecommended,
        },

        // Pharmacy
        pharmacy: {
          totalSales: pharmacySales._sum.grandTotal || 0,
          salesCollected: pharmacySales._sum.paidAmount || 0,
          salesCount: pharmacySales._count.id,
          gstCollected: pharmacySales._sum.totalGst || 0,
          totalPurchases: pharmacyPurchases._sum.grandTotal || 0,
          purchaseGstPaid: pharmacyPurchases._sum.totalGst || 0,
          expiredBatchesCount,
          nearExpiryBatchesCount,
          stockMovementsCount,
        },

        // Operations & Procedures
        operations: {
          totalProcedures: completedProceduresCount,
          billed: operationBillStats._sum.totalAmount || 0,
          collected: operationBillStats._sum.paidAmount || 0,
          pending: operationBillStats._sum.pendingBalance || 0,
          statusBreakdown: procedureStatusCounts,
        },

        // Dental Lab
        dentalLab: {
          totalLabCases,
          physicalItemsReceived: receivedLabItems,
          itemsAwaitingHandover: pendingHandoverItems,
          itemsHandedOver: handedOverItems,
          pdfReportsUploaded: uploadedPdfReports,
        },
      },
    });
  } catch (err: any) {
    console.error('Reports analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/doctors - Doctor listing for dropdowns
router.get('/doctors', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    const where: any = {};
    if (all !== 'true') {
      where.user = { isActive: true };
    }
    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true, phone: true, isActive: true, allowedModules: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
    res.json({ success: true, doctors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
