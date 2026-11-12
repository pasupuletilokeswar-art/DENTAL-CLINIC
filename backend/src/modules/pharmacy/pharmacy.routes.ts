import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { MedicineType, PrescriptionType, PaymentMode, PaymentStatus } from '@prisma/client';

const router = Router();

// ==========================================
// 8.1 MEDICINE MASTER
// ==========================================
const medicineMasterSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  brandName: z.string().optional(),
  manufacturer: z.string().optional(),
  barcode: z.string().optional(),
  hsnCode: z.string().optional(),
  packageInfo: z.string().optional(),
  buyingUnit: z.string().default('STRIP'),
  sellingUnit: z.string().default('TABLET'),
  unitRatio: z.number().int().min(1).default(1),
  medicineType: z.nativeEnum(MedicineType).default(MedicineType.TABLET),
  strength: z.string().optional(),
  prescriptionType: z.nativeEnum(PrescriptionType).default(PrescriptionType.OTC),
  reorderLevel: z.number().int().min(0).default(20),
  specialization: z.enum(['DENTAL', 'ORTHOPEDIC']).optional().nullable(),
});

// GET /api/pharmacy/medicines
router.get('/medicines', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, type, specialization } = req.query;
    const where: any = { isActive: true };

    if (search && typeof search === 'string') {
      where.OR = [
        { medicineName: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type && typeof type === 'string') where.medicineType = type;
    if (specialization && typeof specialization === 'string') where.specialization = specialization;

    const medicines = await prisma.medicineMaster.findMany({
      where,
      include: {
        batches: {
          where: { quantityInBase: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }, // FEFO order
        },
      },
      orderBy: { medicineName: 'asc' },
    });

    // Compute live total stock units & batch summary
    const responseData = medicines.map((med) => {
      const currentStock = med.batches.reduce((sum, b) => sum + b.quantityInBase, 0);
      const isLowStock = currentStock <= med.reorderLevel;
      return {
        ...med,
        currentStock,
        isLowStock,
      };
    });

    res.json({ success: true, medicines: responseData });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pharmacy/medicines
router.post('/medicines', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = medicineMasterSchema.parse(req.body);

    const count = await prisma.medicineMaster.count();
    const itemCode = `MED-${(count + 1).toString().padStart(5, '0')}`;

    const medicine = await prisma.medicineMaster.create({
      data: {
        itemCode,
        medicineName: data.medicineName,
        brandName: data.brandName || null,
        manufacturer: data.manufacturer || null,
        barcode: data.barcode || null,
        hsnCode: data.hsnCode || null,
        packageInfo: data.packageInfo || null,
        buyingUnit: data.buyingUnit,
        sellingUnit: data.sellingUnit,
        unitRatio: data.unitRatio,
        medicineType: data.medicineType,
        strength: data.strength || null,
        prescriptionType: data.prescriptionType,
        reorderLevel: data.reorderLevel,
        specialization: data.specialization || null,
      },
    });

    res.status(201).json({ success: true, medicine });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8.2 SUPPLIER MANAGEMENT & PURCHASES
// ==========================================
// GET /api/pharmacy/suppliers
router.get('/suppliers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, suppliers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pharmacy/suppliers
router.post('/suppliers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const count = await prisma.supplier.count();
    const supplierCode = `SUP-${(count + 1).toString().padStart(3, '0')}`;
    const supplier = await prisma.supplier.create({
      data: {
        supplierCode,
        name: req.body.name,
        contactName: req.body.contactName || null,
        mobile: req.body.mobile,
        email: req.body.email || null,
        gstin: req.body.gstin || null,
        address: req.body.address || null,
      },
    });
    res.status(201).json({ success: true, supplier });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pharmacy/purchases (Receive Stock with FEFO & GST)
const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().min(1, 'Vendor invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  items: z.array(
    z.object({
      medicineId: z.string().min(1),
      batchNumber: z.string().min(1),
      expiryDate: z.string().min(1),
      quantityUnits: z.number().int().min(1),
      purchaseRate: z.number().min(0),
      mrp: z.number().min(0),
      sellingPrice: z.number().min(0),
      discountPercent: z.number().min(0).default(0),
      gstPercent: z.number().min(0).default(12),
    })
  ).min(1, 'At least one medicine item is required'),
});

router.post('/purchases', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = purchaseSchema.parse(req.body);

    const count = await prisma.purchaseInvoice.count();
    const internalRef = `PUR-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const purchase = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      let totalGst = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;

      const createdPurchase = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          internalRef,
          supplierId: data.supplierId,
          invoiceDate: new Date(data.invoiceDate),
          totalAmount: 0,
          grandTotal: 0,
        },
      });

      for (const item of data.items) {
        const itemGross = item.quantityUnits * item.purchaseRate;
        const itemDiscount = (itemGross * item.discountPercent) / 100;
        const itemTaxable = itemGross - itemDiscount;
        const itemGst = (itemTaxable * item.gstPercent) / 100;
        const itemTotal = itemTaxable + itemGst;

        totalAmount += itemTaxable;
        totalGst += itemGst;
        cgstAmount += itemGst / 2;
        sgstAmount += itemGst / 2;

        // Upsert batch stock
        const batchStock = await tx.medicineBatchStock.upsert({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
            },
          },
          update: {
            quantityInBase: { increment: item.quantityUnits },
            expiryDate: new Date(item.expiryDate),
            purchasePrice: item.purchaseRate,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
          },
          create: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            quantityInBase: item.quantityUnits,
            purchasePrice: item.purchaseRate,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
          },
        });

        // Record purchase item
        await tx.purchaseItem.create({
          data: {
            purchaseId: createdPurchase.id,
            medicineId: item.medicineId,
            batchStockId: batchStock.id,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            quantityUnits: item.quantityUnits,
            purchaseRate: item.purchaseRate,
            discountPercent: item.discountPercent,
            gstPercent: item.gstPercent,
            cgstRate: item.gstPercent / 2,
            sgstRate: item.gstPercent / 2,
            totalCost: itemTotal,
          },
        });

        // Record stock movement audit
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            movementType: 'PURCHASE_IN',
            quantityChange: item.quantityUnits,
            previousStock: batchStock.quantityInBase - item.quantityUnits,
            newStock: batchStock.quantityInBase,
            referenceId: createdPurchase.id,
            remarks: `Purchase invoice ${data.invoiceNumber}`,
          },
        });
      }

      const grandTotal = totalAmount + totalGst;

      return tx.purchaseInvoice.update({
        where: { id: createdPurchase.id },
        data: {
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalGst: Math.round(totalGst * 100) / 100,
          cgstAmount: Math.round(cgstAmount * 100) / 100,
          sgstAmount: Math.round(sgstAmount * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100,
        },
        include: {
          supplier: true,
          items: { include: { medicine: true } },
        },
      });
    });

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'PURCHASE', purchase });

    res.status(201).json({ success: true, message: 'Stock received successfully', purchase });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8.4 PHARMACY SALES (FEFO & Billing)
// ==========================================
const pharmacySaleSchema = z.object({
  patientId: z.string().optional().nullable(),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.CASH),
  items: z.array(
    z.object({
      medicineId: z.string().min(1),
      batchStockId: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
      discount: z.number().min(0).default(0),
      gstRate: z.number().min(0).default(12),
    })
  ).min(1, 'At least one medicine item is required'),
});

router.post('/sales', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = pharmacySaleSchema.parse(req.body);

    const count = await prisma.pharmacySale.count();
    const invoiceNumber = `PHARM-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const sale = await prisma.$transaction(async (tx) => {
      let subTotal = 0;
      let totalGst = 0;

      // 1. Check stock availability for every batch first
      for (const item of data.items) {
        const batchStock = await tx.medicineBatchStock.findUnique({
          where: { id: item.batchStockId },
          include: { medicine: true },
        });

        if (!batchStock || batchStock.quantityInBase < item.quantity) {
          throw new Error(
            `Insufficient stock for ${batchStock?.medicine.medicineName || 'medicine'} (Batch ${
              batchStock?.batchNumber || ''
            }). Available: ${batchStock?.quantityInBase || 0}`
          );
        }

        const lineGross = item.quantity * item.unitPrice - item.discount;
        const lineGst = (lineGross * item.gstRate) / 100;
        subTotal += lineGross;
        totalGst += lineGst;
      }

      const grandTotal = Math.round((subTotal + totalGst - data.discount) * 100) / 100;
      const paidAmount = Math.min(grandTotal, data.paidAmount);
      const pendingBalance = Math.round((grandTotal - paidAmount) * 100) / 100;
      const paymentStatus = pendingBalance <= 0 ? PaymentStatus.PAID : paidAmount > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID;

      // 2. Create Sale Record
      const createdSale = await tx.pharmacySale.create({
        data: {
          invoiceNumber,
          patientId: data.patientId || null,
          subTotal,
          discount: data.discount,
          totalGst,
          grandTotal,
          paidAmount,
          pendingBalance,
          paymentStatus,
        },
      });

      // 3. Deduct stock and record items
      for (const item of data.items) {
        const lineGross = item.quantity * item.unitPrice - item.discount;
        const lineTotal = lineGross + (lineGross * item.gstRate) / 100;

        const updatedBatch = await tx.medicineBatchStock.update({
          where: { id: item.batchStockId },
          data: {
            quantityInBase: { decrement: item.quantity },
          },
        });

        await tx.pharmacySaleItem.create({
          data: {
            saleId: createdSale.id,
            medicineId: item.medicineId,
            batchStockId: item.batchStockId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            gstRate: item.gstRate,
            totalAmount: lineTotal,
          },
        });

        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchNumber: updatedBatch.batchNumber,
            movementType: 'SALE_OUT',
            quantityChange: -item.quantity,
            previousStock: updatedBatch.quantityInBase + item.quantity,
            newStock: updatedBatch.quantityInBase,
            referenceId: createdSale.id,
            remarks: `Sale invoice ${invoiceNumber}`,
          },
        });
      }

      // 4. Create Receipt if paid > 0
      if (paidAmount > 0) {
        const pCount = await tx.payment.count();
        const receiptNumber = `RCP-${new Date().getFullYear()}-${(pCount + 1).toString().padStart(5, '0')}`;
        await tx.payment.create({
          data: {
            receiptNumber,
            amount: paidAmount,
            paymentMode: data.paymentMode,
            pharmacySaleId: createdSale.id,
            notes: `Pharmacy sale payment ${invoiceNumber}`,
          },
        });
      }

      return tx.pharmacySale.findUnique({
        where: { id: createdSale.id },
        include: {
          patient: true,
          items: { include: { medicine: true, batchStock: true } },
          payments: true,
        },
      });
    });

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'SALE', sale });

    res.status(201).json({ success: true, message: 'Pharmacy sale completed', sale });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pharmacy/sales
router.get('/sales', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sales = await prisma.pharmacySale.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        items: { include: { medicine: true } },
        payments: true,
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });
    res.json({ success: true, sales });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8.3 & 8.5 INVENTORY, ALERTS & REPORTS
// ==========================================
router.get('/inventory/alerts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 45);

    // Expiring batches
    const expiringBatches = await prisma.medicineBatchStock.findMany({
      where: {
        quantityInBase: { gt: 0 },
        expiryDate: { lte: thirtyDaysFromNow },
      },
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' },
    });

    // Low stock medicines
    const medicines = await prisma.medicineMaster.findMany({
      where: { isActive: true },
      include: {
        batches: { where: { quantityInBase: { gt: 0 } } },
      },
    });

    const lowStockMedicines = medicines
      .map((med) => {
        const totalStock = med.batches.reduce((sum, b) => sum + b.quantityInBase, 0);
        return {
          ...med,
          totalStock,
        };
      })
      .filter((med) => med.totalStock <= med.reorderLevel);

    res.json({
      success: true,
      alerts: {
        expiringBatches,
        lowStockMedicines,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
