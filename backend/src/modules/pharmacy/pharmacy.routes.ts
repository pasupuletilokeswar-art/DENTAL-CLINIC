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
  gstRate: z.number().min(0).optional().default(12),
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

// POST /api/pharmacy/medicines (With support for Opening Stock & Batch)
router.post('/medicines', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = medicineMasterSchema.parse(req.body);
    const { openingStock, batchNumber, expiryDate, buyingPrice, mrp, sellingPrice, itemCodeCustom, gstRate, sellingTax } = req.body;
    const taxRate = Number(gstRate) || Number(data.gstRate) || parseFloat(String(sellingTax).replace(/[^0-9.]/g, '')) || 12;

    const count = await prisma.medicineMaster.count();
    const itemCode = itemCodeCustom && itemCodeCustom.trim() !== ''
      ? itemCodeCustom.trim()
      : `MED-${(count + 1).toString().padStart(5, '0')}`;

    const medicine = await prisma.$transaction(async (tx) => {
      const createdMed = await tx.medicineMaster.create({
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
          gstRate: taxRate,
        },
      });

      // If opening stock is provided, create initial batch stock entry
      if (openingStock && Number(openingStock) > 0 && batchNumber && batchNumber.trim() !== '') {
        const qty = Number(openingStock);
        const exp = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const bPrice = Number(buyingPrice) || 0;
        const mPrice = Number(mrp) || Number(sellingPrice) || 0;
        const sPrice = Number(sellingPrice) || (taxRate > 0 ? Math.round((mPrice / (1 + taxRate / 100)) * 100) / 100 : mPrice);

        await tx.medicineBatchStock.create({
          data: {
            medicineId: createdMed.id,
            batchNumber: batchNumber.trim(),
            expiryDate: exp,
            quantityInBase: qty,
            purchasePrice: bPrice,
            mrp: mPrice,
            sellingPrice: sPrice,
            gstRate: taxRate,
          },
        });

        await tx.stockMovement.create({
          data: {
            medicineId: createdMed.id,
            batchNumber: batchNumber.trim(),
            movementType: 'OPENING_STOCK',
            quantityChange: qty,
            previousStock: 0,
            newStock: qty,
            referenceId: createdMed.id,
            remarks: `Initial opening inventory stock for ${createdMed.medicineName}`,
          },
        });
      }

      return tx.medicineMaster.findUnique({
        where: { id: createdMed.id },
        include: { batches: true },
      });
    });

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'MEDICINE_CREATED', medicine });

    res.status(201).json({ success: true, medicine });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || 'Validation error', errors: err.errors });
    }
    res.status(400).json({ success: false, message: err.message || 'Error creating pharmacy sale' });
  }
});

// POST /api/pharmacy/medicines/bulk-import (CSV / Batch Array)
router.post('/medicines/bulk-import', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of items to import' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.medicineName) {
          errors.push(`Row ${i + 1}: Missing medicine name`);
          continue;
        }

        const existing = await prisma.medicineMaster.findFirst({
          where: {
            OR: [
              { medicineName: { equals: item.medicineName, mode: 'insensitive' } },
              ...(item.barcode ? [{ barcode: item.barcode }] : []),
            ],
          },
        });

        await prisma.$transaction(async (tx) => {
          let targetMedId = existing?.id;

          if (!existing) {
            const count = await prisma.medicineMaster.count();
            const itemCode = item.itemCode || `MED-${(count + 1).toString().padStart(5, '0')}`;
            let packageInfo = item.packageInfo || '10X10';
            if (item.shelfNo && !packageInfo.includes('Shelf:')) {
              packageInfo = `${packageInfo} | Shelf: ${item.shelfNo}`;
            }

            const med = await tx.medicineMaster.create({
              data: {
                itemCode,
                medicineName: item.medicineName.trim(),
                brandName: item.brandName?.trim() || null,
                manufacturer: item.manufacturer?.trim() || null,
                barcode: item.barcode?.trim() || null,
                hsnCode: item.hsnCode?.trim() || '3004 90 00',
                packageInfo,
                buyingUnit: item.buyingUnit?.trim() || 'STRIP',
                sellingUnit: item.sellingUnit?.trim() || 'TABLET',
                unitRatio: Number(item.unitRatio) || 1,
                medicineType: item.medicineType || MedicineType.TABLET,
                strength: item.strength?.trim() || null,
                prescriptionType: item.prescriptionType || PrescriptionType.OTC,
                reorderLevel: Number(item.reorderLevel) || 20,
              },
            });
            targetMedId = med.id;
          }

          // Always create a batch if batchNumber or openingStock is provided
          const qty = Number(item.openingStock) || 0;
          const batchNumber = item.batchNumber && String(item.batchNumber).trim() !== ''
            ? String(item.batchNumber).trim()
            : (qty > 0 ? `BATCH-${Date.now().toString().slice(-4)}-${i + 1}` : null);

          if (batchNumber && targetMedId) {
            let exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2);
            if (item.expiryDate) {
              const parsedExp = new Date(item.expiryDate);
              if (!isNaN(parsedExp.getTime())) {
                exp = parsedExp;
              }
            }
            const bPrice = Number(item.buyingPrice) || 0;
            const mPrice = Number(item.mrp) || Number(item.sellingPrice) || 0;
            const sPrice = Number(item.sellingPrice) || Number(item.mrp) || 0;

            await tx.medicineBatchStock.create({
              data: {
                medicineId: targetMedId,
                batchNumber,
                expiryDate: exp,
                quantityInBase: qty,
                purchasePrice: bPrice,
                mrp: mPrice,
                sellingPrice: sPrice,
              },
            });

            if (qty > 0) {
              await tx.stockMovement.create({
                data: {
                  medicineId: targetMedId,
                  batchNumber,
                  movementType: existing ? 'PURCHASE' : 'OPENING_STOCK',
                  quantityChange: qty,
                  previousStock: 0,
                  newStock: qty,
                  referenceId: targetMedId,
                  remarks: `CSV inventory import for ${item.medicineName} (${batchNumber})`,
                },
              });
            }
          }
        });
        importedCount++;
      } catch (rowErr: any) {
        errors.push(`Row ${i + 1} (${item.medicineName || 'Unknown'}): ${rowErr.message}`);
      }
    }

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'BULK_IMPORT', count: importedCount });

    res.json({
      success: true,
      message: `Successfully processed ${importedCount} items`,
      importedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/pharmacy/medicines/:id/batches (Direct Receive & Inward Shipment Batch)
router.post('/medicines/:id/batches', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { batchNumber, expiryDate, quantityUnits, purchasePrice, mrp, sellingPrice } = req.body;

    if (!batchNumber || !quantityUnits || Number(quantityUnits) <= 0) {
      return res.status(400).json({ success: false, message: 'Batch number and quantity are required' });
    }

    const medicine = await prisma.medicineMaster.findUnique({ where: { id } });
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    const qty = Number(quantityUnits);
    const exp = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const bPrice = Number(purchasePrice) || 0;
    const mPrice = Number(mrp) || Number(sellingPrice) || 0;
    const sPrice = Number(sellingPrice) || Number(mrp) || 0;

    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.medicineBatchStock.create({
        data: {
          medicineId: id,
          batchNumber: String(batchNumber).trim(),
          expiryDate: exp,
          quantityInBase: qty,
          purchasePrice: bPrice,
          mrp: mPrice,
          sellingPrice: sPrice,
        },
      });

      await tx.stockMovement.create({
        data: {
          medicineId: id,
          batchNumber: String(batchNumber).trim(),
          movementType: 'PURCHASE',
          quantityChange: qty,
          previousStock: 0,
          newStock: qty,
          referenceId: createdBatch.id,
          remarks: `Shipment received: batch ${batchNumber} for ${medicine.medicineName}`,
        },
      });

      return createdBatch;
    });

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'BATCH_ADDED', medicineId: id, batch });

    res.status(201).json({
      success: true,
      batch,
      message: `Batch ${batchNumber} (${qty} units) received and added to inventory!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/pharmacy/patient-prescriptions/:patientId
router.get('/patient-prescriptions/:patientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const clinicalNotes = await prisma.clinicalNote.findMany({
      where: { patientId },
      include: { doctor: { include: { user: { select: { fullName: true } } } } },
      orderBy: { consultationDate: 'desc' },
      take: 5,
    });

    res.json({ success: true, clinicalNotes });
  } catch (err: any) {
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
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || 'Validation error', errors: err.errors });
    }
    res.status(400).json({ success: false, message: err.message || 'Error creating pharmacy sale' });
  }
});

// ==========================================
// 8.4 PHARMACY SALES (FEFO & Billing)
// ==========================================
const pharmacySaleSchema = z.object({
  patientId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAge: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0),
  paymentMode: z.preprocess((val) => {
    if (typeof val === 'string') {
      const u = val.toUpperCase().trim();
      if (u === 'CASH') return PaymentMode.CASH;
      if (u.includes('UPI')) return PaymentMode.UPI;
      if (u.includes('CARD')) return PaymentMode.CARD;
      if (u.includes('SPLIT')) return PaymentMode.CASH;
      if (u.includes('BANK')) return PaymentMode.BANK_TRANSFER;
    }
    return val;
  }, z.nativeEnum(PaymentMode).default(PaymentMode.CASH)),
  items: z.array(
    z.object({
      medicineId: z.string().min(1),
      batchStockId: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
      discount: z.number().min(0).default(0),
      gstRate: z.number().min(0).default(12),
      taxRate: z.number().min(0).optional(),
    }).transform((item) => ({
      ...item,
      gstRate: item.gstRate !== undefined ? item.gstRate : (item.taxRate !== undefined ? item.taxRate : 12),
    }))
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

        // Strict Medical Safety: Strictly block sale of expired batches
        if (new Date(batchStock.expiryDate).getTime() < Date.now()) {
          throw new Error(
            `DISPENSE BLOCKED: "${batchStock.medicine.medicineName}" (Batch ${batchStock.batchNumber}) has EXPIRED on ${batchStock.expiryDate.toISOString().slice(0, 10)}. Selling expired medicines is strictly prohibited.`
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

      // 4. Create Receipt if paid > 0 (store customer details in notes if walk-in)
      if (paidAmount > 0) {
        const pCount = await tx.payment.count();
        const receiptNumber = `RCP-${new Date().getFullYear()}-${(pCount + 1).toString().padStart(5, '0')}`;
        await tx.payment.create({
          data: {
            receiptNumber,
            amount: paidAmount,
            paymentMode: data.paymentMode,
            pharmacySaleId: createdSale.id,
            notes: data.customerName
              ? JSON.stringify({
                  customerName: data.customerName,
                  customerPhone: data.customerPhone || '',
                  customerAge: data.customerAge || '',
                })
              : `Pharmacy sale payment ${invoiceNumber}`,
          },
        });
      }

      const foundSale: any = await tx.pharmacySale.findUnique({
        where: { id: createdSale.id },
        include: {
          patient: true,
          items: { include: { medicine: true, batchStock: true } },
          payments: true,
        },
      });

      if (foundSale) {
        foundSale.customerName = data.customerName || foundSale.patient?.name || 'Walk-in Customer';
        foundSale.customerPhone = data.customerPhone || foundSale.patient?.mobile || '';
        foundSale.customerAge = data.customerAge || foundSale.patient?.age || '';
      }

      return foundSale;
    });

    emitRealtimeEvent('pharmacy:inventory-updated', { type: 'SALE', sale });

    res.status(201).json({ success: true, message: 'Pharmacy sale completed', sale });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0]?.message || 'Validation error', errors: err.errors });
    }
    res.status(400).json({ success: false, message: err.message || 'Error creating pharmacy sale' });
  }
});

// GET /api/pharmacy/sales
router.get('/sales', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rawSales = await prisma.pharmacySale.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true, age: true } },
        items: { include: { medicine: true, batchStock: true } },
        payments: true,
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });

    const sales = rawSales.map((s: any) => {
      let custName = s.patient?.name;
      let custPhone = s.patient?.mobile;
      let custAge = s.patient?.age;

      if (!custName && s.payments?.[0]?.notes) {
        try {
          const parsed = JSON.parse(s.payments[0].notes);
          if (parsed.customerName) {
            custName = parsed.customerName;
            custPhone = parsed.customerPhone || '';
            custAge = parsed.customerAge || '';
          }
        } catch {}
      }

      return {
        ...s,
        customerName: custName || 'Walk-in Customer',
        customerPhone: custPhone || '',
        customerAge: custAge || '',
      };
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
