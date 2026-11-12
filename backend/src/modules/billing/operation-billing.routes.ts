import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { PaymentMode, PaymentStatus } from '@prisma/client';

const router = Router();

// Settle balance on Operation / Procedure Bill
router.post('/operation/:id/payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    const bill = await prisma.operationBill.findUnique({
      where: { id },
      include: { procedure: { include: { patient: true } } },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Operation bill not found' });
    }

    if (bill.pendingBalance <= 0) {
      return res.status(400).json({ success: false, message: 'This procedure bill is already fully paid' });
    }

    const payAmount = Math.min(bill.pendingBalance, parseFloat(amount));
    const newPaidAmount = bill.paidAmount + payAmount;
    const newPending = Math.round((bill.totalAmount - newPaidAmount) * 100) / 100;
    const newStatus = newPending <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

    const pCount = await prisma.payment.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${(pCount + 1).toString().padStart(5, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          receiptNumber,
          amount: payAmount,
          paymentMode: paymentMode || PaymentMode.CASH,
          referenceNumber: referenceNumber || null,
          notes: notes || `Procedure settlement for ${bill.invoiceNumber}`,
          operationBillId: bill.id,
        },
      });

      const updatedBill = await tx.operationBill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          pendingBalance: newPending,
          paymentStatus: newStatus,
        },
        include: {
          procedure: {
            include: {
              patient: true,
              doctor: { include: { user: { select: { fullName: true } } } },
              procedureMaster: true,
            },
          },
          payments: true,
        },
      });

      return { updatedBill, paymentRecord };
    });

    emitRealtimeEvent('billing:payment-received', result.updatedBill);

    res.json({
      success: true,
      message: 'Procedure bill payment recorded successfully',
      bill: result.updatedBill,
      paymentReceipt: result.paymentRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/billing/consultation/operations - Fetch all operation / procedure bills with patient details
router.get('/operations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;
    const where: any = {};
    if (patientId) {
      where.procedure = { patientId: patientId as string };
    }

    const bills = await prisma.operationBill.findMany({
      where,
      include: {
        procedure: {
          include: {
            patient: true,
            doctor: { include: { user: { select: { fullName: true } } } },
            procedureMaster: true,
          },
        },
        payments: true,
      },
      orderBy: { billDate: 'desc' },
    });

    res.json({ success: true, bills });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

