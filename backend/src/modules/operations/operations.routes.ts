import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { ProcedureStatus, PaymentMode, PaymentStatus } from '@prisma/client';

const router = Router();

// GET /api/procedures/masters
router.get('/masters', authenticateToken, async (req: Request, res: Response) => {
  try {
    const masters = await prisma.procedureMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, masters });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/procedures
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, status } = req.query;
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const procedures = await prisma.procedure.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
        operationInvoice: { include: { payments: true } },
      },
      orderBy: { procedureDate: 'desc' },
    });

    res.json({ success: true, procedures });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate sequential procedure code: PROC-2026-00001
async function generateProcedureCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PROC-${currentYear}-`;
  const lastProc = await prisma.procedure.findFirst({
    where: { procedureCode: { startsWith: prefix } },
    orderBy: { procedureCode: 'desc' },
  });

  if (!lastProc) return `${prefix}00001`;
  const parts = lastProc.procedureCode.split('-');
  const seq = parseInt(parts[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

// POST /api/procedures - Create / Schedule a Procedure
const createProcedureSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientCode: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  dentistName: z.string().optional().nullable(),
  procedureMasterId: z.string().optional().nullable(),
  procedureName: z.string().optional().nullable(),
  procedureDate: z.string().min(1, 'Procedure date is required'),
  toothNumber: z.string().optional().nullable(),
  charges: z.number().min(0).optional().default(0),
  clinicalNotes: z.string().optional().nullable(),
  procedureDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().optional().default('PLANNED'),
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = createProcedureSchema.parse(req.body);

    // 1. Validate Patient
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id: data.patientId }, { patientCode: data.patientId }],
      },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Selected patient not found' });
    }

    // 2. Resolve Procedure Master & Procedure Name
    let resolvedMasterId: string | null = data.procedureMasterId || null;
    let resolvedProcName: string | null = data.procedureName?.trim() || null;
    let standardCharge = 0;

    if (resolvedMasterId) {
      const master = await prisma.procedureMaster.findUnique({ where: { id: resolvedMasterId } });
      if (master) {
        if (!resolvedProcName) resolvedProcName = master.name;
        standardCharge = master.standardCharge;
      }
    }

    if (resolvedProcName && !resolvedMasterId) {
      const master = await prisma.procedureMaster.findFirst({
        where: { name: { equals: resolvedProcName, mode: 'insensitive' } },
      });
      if (master) {
        resolvedMasterId = master.id;
        standardCharge = master.standardCharge;
      }
    }

    if (!resolvedProcName) {
      resolvedProcName = 'Consultation';
    }

    // 3. Resolve Doctor / Dentist Name
    let resolvedDoctorId: string | null = data.doctorId || null;
    let resolvedDentistName: string | null = data.dentistName?.trim() || null;

    if (resolvedDoctorId) {
      const doc = await prisma.doctor.findUnique({
        where: { id: resolvedDoctorId },
        include: { user: { select: { fullName: true } } },
      });
      if (doc) {
        if (!resolvedDentistName) resolvedDentistName = doc.user.fullName;
      } else {
        resolvedDoctorId = null;
      }
    }

    // 4. Resolve Procedure Status
    let normalizedStatus: ProcedureStatus = ProcedureStatus.PLANNED;
    const rawStatus = (data.status || 'PLANNED').toUpperCase().replace(/[\s-]+/g, '_');
    if (rawStatus === 'COMPLETED') {
      normalizedStatus = ProcedureStatus.COMPLETED;
    } else if (rawStatus === 'IN_PROGRESS') {
      normalizedStatus = ProcedureStatus.IN_PROGRESS;
    } else if (rawStatus === 'SCHEDULED') {
      normalizedStatus = ProcedureStatus.SCHEDULED;
    } else if (rawStatus === 'CANCELLED') {
      normalizedStatus = ProcedureStatus.CANCELLED;
    } else {
      normalizedStatus = ProcedureStatus.PLANNED;
    }

    // 5. Clinical notes / Description
    const clinicalNotes =
      data.clinicalNotes?.trim() ||
      data.procedureDescription?.trim() ||
      data.description?.trim() ||
      null;

    const parsedDate = new Date(data.procedureDate);

    // 6. Prevent accidental duplicate submissions (within 3 seconds for same patient, procedure & tooth)
    const recentDuplicate = await prisma.procedure.findFirst({
      where: {
        patientId: patient.id,
        procedureName: resolvedProcName,
        toothNumber: data.toothNumber?.trim() || null,
        createdAt: { gte: new Date(Date.now() - 3000) },
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
      },
    });

    if (recentDuplicate) {
      return res.status(200).json({
        success: true,
        message: 'Procedure already saved (duplicate submission prevented)',
        procedure: recentDuplicate,
      });
    }

    const procedureCode = await generateProcedureCode();
    const finalCharges = data.charges && data.charges > 0 ? data.charges : standardCharge;

    const proc = await prisma.procedure.create({
      data: {
        procedureCode,
        patientId: patient.id,
        doctorId: resolvedDoctorId,
        dentistName: resolvedDentistName,
        procedureMasterId: resolvedMasterId,
        procedureName: resolvedProcName,
        toothNumber: data.toothNumber?.trim() || null,
        procedureDate: parsedDate,
        charges: finalCharges,
        clinicalNotes,
        status: normalizedStatus,
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
      },
    });

    emitRealtimeEvent('procedure:scheduled', proc);
    emitRealtimeEvent('procedure:created', proc);

    res.status(201).json({
      success: true,
      message: 'Procedure created successfully',
      procedure: proc,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/procedures/:id/complete - Mark Completed & Generate Separate Operation Invoice
const completeOperationSchema = z.object({
  consumablesFee: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  notes: z.string().optional(),
});

router.post('/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = completeOperationSchema.parse(req.body);

    const proc = await prisma.procedure.findUnique({
      where: { id },
      include: { operationInvoice: true },
    });

    if (!proc) {
      return res.status(404).json({ success: false, message: 'Procedure not found' });
    }

    if (proc.operationInvoice) {
      return res.status(400).json({ success: false, message: 'Operation invoice already generated for this procedure' });
    }

    const subTotal = Math.max(0, proc.charges + data.consumablesFee - data.discount);
    const taxAmount = (subTotal * data.taxRate) / 100;
    const totalAmount = Math.round((subTotal + taxAmount) * 100) / 100;
    const paidAmount = Math.min(totalAmount, data.paidAmount);
    const pendingBalance = Math.round((totalAmount - paidAmount) * 100) / 100;

    const paymentStatus = pendingBalance <= 0 ? PaymentStatus.PAID : paidAmount > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID;

    const billCount = await prisma.operationBill.count();
    const invoiceNumber = `OBILL-${new Date().getFullYear()}-${(billCount + 1).toString().padStart(5, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark procedure completed
      const updatedProc = await tx.procedure.update({
        where: { id },
        data: { status: ProcedureStatus.COMPLETED },
      });

      // 2. Create Operation Bill
      const bill = await tx.operationBill.create({
        data: {
          invoiceNumber,
          procedureId: id,
          procedureFee: proc.charges,
          consumablesFee: data.consumablesFee,
          discount: data.discount,
          taxRate: data.taxRate,
          taxAmount,
          totalAmount,
          paidAmount,
          pendingBalance,
          paymentStatus,
        },
      });

      // 3. Receipt if paid
      let receipt = null;
      if (paidAmount > 0) {
        const pCount = await tx.payment.count();
        const receiptNumber = `RCP-${new Date().getFullYear()}-${(pCount + 1).toString().padStart(5, '0')}`;
        receipt = await tx.payment.create({
          data: {
            receiptNumber,
            amount: paidAmount,
            paymentMode: data.paymentMode,
            operationBillId: bill.id,
            notes: data.notes || `Operation invoice payment ${invoiceNumber}`,
          },
        });
      }

      return { updatedProc, bill, receipt };
    });

    emitRealtimeEvent('procedure:completed', result);

    res.json({
      success: true,
      message: 'Operation completed and invoice generated successfully',
      operation: result,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
