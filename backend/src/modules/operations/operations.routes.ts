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

// POST /api/procedures - Schedule an operation / procedure
const scheduleSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  procedureMasterId: z.string().min(1, 'Procedure is required'),
  procedureDate: z.string().min(1, 'Procedure date is required'),
  charges: z.number().min(0),
  clinicalNotes: z.string().optional(),
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = scheduleSchema.parse(req.body);

    const count = await prisma.procedure.count();
    const procedureCode = `PROC-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const proc = await prisma.procedure.create({
      data: {
        procedureCode,
        patientId: data.patientId,
        doctorId: data.doctorId,
        procedureMasterId: data.procedureMasterId,
        procedureDate: new Date(data.procedureDate),
        charges: data.charges,
        clinicalNotes: data.clinicalNotes || null,
        status: ProcedureStatus.SCHEDULED,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
      },
    });

    emitRealtimeEvent('procedure:scheduled', proc);

    res.status(201).json({ success: true, message: 'Procedure scheduled successfully', procedure: proc });
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
