import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { PaymentMode, PaymentStatus } from '@prisma/client';

const router = Router();

const billSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentId: z.string().optional().nullable(),
  consultationFee: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0), // % GST
  paidAmount: z.number().min(0).default(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Generate Consultation Bill Invoice Number: CBILL-2026-00001
async function generateBillNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CBILL-${currentYear}-`;
  const lastBill = await prisma.consultationBill.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  if (!lastBill) return `${prefix}00001`;
  const seq = parseInt(lastBill.invoiceNumber.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

// Generate Receipt Number: RCP-2026-00001
async function generateReceiptNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `RCP-${currentYear}-`;
  const lastReceipt = await prisma.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
  });

  if (!lastReceipt) return `${prefix}00001`;
  const seq = parseInt(lastReceipt.receiptNumber.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

// GET /api/billing/consultation - List bills
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;
    const where: any = {};
    if (patientId) where.patientId = patientId;

    const bills = await prisma.consultationBill.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
        payments: true,
      },
      orderBy: { billDate: 'desc' },
    });

    res.json({ success: true, bills });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/consultation - Generate consultation invoice & collect initial payment
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = billSchema.parse(req.body);

    const subTotal = Math.max(0, data.consultationFee - data.discount);
    const taxAmount = (subTotal * data.taxRate) / 100;
    const totalAmount = Math.round((subTotal + taxAmount) * 100) / 100;
    const paidAmount = Math.min(totalAmount, data.paidAmount);
    const pendingBalance = Math.round((totalAmount - paidAmount) * 100) / 100;

    let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
    if (paidAmount >= totalAmount) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIALLY_PAID;
    }

    const invoiceNumber = await generateBillNumber();

    const result = await prisma.$transaction(async (tx) => {
      const bill = await tx.consultationBill.create({
        data: {
          invoiceNumber,
          patientId: data.patientId,
          doctorId: data.doctorId,
          appointmentId: data.appointmentId || null,
          consultationFee: data.consultationFee,
          discount: data.discount,
          taxRate: data.taxRate,
          taxAmount,
          totalAmount,
          paidAmount,
          pendingBalance,
          paymentStatus,
        },
        include: {
          patient: true,
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });

      // Record payment receipt if paidAmount > 0
      let paymentRecord = null;
      if (paidAmount > 0) {
        const receiptNumber = await generateReceiptNumber();
        paymentRecord = await tx.payment.create({
          data: {
            receiptNumber,
            amount: paidAmount,
            paymentMode: data.paymentMode,
            referenceNumber: data.referenceNumber || null,
            notes: data.notes || `Consultation payment for ${invoiceNumber}`,
            consultationBillId: bill.id,
          },
        });
      }

      return { bill, paymentRecord };
    });

    emitRealtimeEvent('billing:consultation-created', result.bill);

    res.status(201).json({
      success: true,
      message: 'Consultation invoice generated successfully',
      bill: result.bill,
      paymentReceipt: result.paymentRecord,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/consultation/:id/payment - Record payment for existing consultation balance
router.post('/:id/payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    const bill = await prisma.consultationBill.findUnique({ where: { id } });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Consultation bill not found' });
    }

    if (bill.pendingBalance <= 0) {
      return res.status(400).json({ success: false, message: 'This bill is already fully paid' });
    }

    const payAmount = Math.min(bill.pendingBalance, parseFloat(amount));
    const newPaidAmount = bill.paidAmount + payAmount;
    const newPending = Math.round((bill.totalAmount - newPaidAmount) * 100) / 100;
    const newStatus = newPending <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await generateReceiptNumber();
      const paymentRecord = await tx.payment.create({
        data: {
          receiptNumber,
          amount: payAmount,
          paymentMode: paymentMode || PaymentMode.CASH,
          referenceNumber: referenceNumber || null,
          notes: notes || `Payment against ${bill.invoiceNumber}`,
          consultationBillId: bill.id,
        },
      });

      const updatedBill = await tx.consultationBill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          pendingBalance: newPending,
          paymentStatus: newStatus,
        },
        include: {
          patient: true,
          payments: true,
        },
      });

      return { updatedBill, paymentRecord };
    });

    emitRealtimeEvent('billing:payment-received', result.updatedBill);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      bill: result.updatedBill,
      paymentReceipt: result.paymentRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
