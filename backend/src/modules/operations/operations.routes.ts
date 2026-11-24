import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { ProcedureStatus, PaymentMode, PaymentStatus, AppointmentStatus, VisitType } from '@prisma/client';

const router = Router();

const DEFAULT_PROCEDURES_SEED = [
  // Consultation & Examination
  { category: 'Consultation & Examination', name: 'Consultation', standardCharge: 500, description: 'General dental consultation and preliminary clinical evaluation' },
  { category: 'Consultation & Examination', name: 'Dental Examination', standardCharge: 500, description: 'Comprehensive examination of teeth, gums, and oral structures' },
  { category: 'Consultation & Examination', name: 'Oral Examination', standardCharge: 500, description: 'Detailed visual and tactile oral cavity inspection' },
  { category: 'Consultation & Examination', name: 'Diagnosis', standardCharge: 500, description: 'Clinical diagnostic assessment and treatment planning' },

  // Restorative Procedures
  { category: 'Restorative Procedures', name: 'Dental Filling', standardCharge: 1200, description: 'Direct restorative cavity filling' },
  { category: 'Restorative Procedures', name: 'GIC Restoration', standardCharge: 1000, description: 'Glass Ionomer Cement tooth restoration' },
  { category: 'Restorative Procedures', name: 'Composite Restoration', standardCharge: 1500, description: 'Tooth-colored aesthetic composite resin restoration' },
  { category: 'Restorative Procedures', name: 'Amalgam Restoration', standardCharge: 800, description: 'Dental amalgam restorative filling' },
  { category: 'Restorative Procedures', name: 'Crown Placement', standardCharge: 4000, description: 'Full coverage prosthetic crown placement and cementation' },
  { category: 'Restorative Procedures', name: 'Bridge Placement', standardCharge: 8000, description: 'Fixed partial denture bridge placement' },
  { category: 'Restorative Procedures', name: 'Inlay / Onlay', standardCharge: 3500, description: 'Indirect laboratory fabricated inlay or onlay' },

  // Endodontic Procedures
  { category: 'Endodontic Procedures', name: 'Root Canal Treatment (RCT)', standardCharge: 3500, description: 'Complete root canal therapy and canal obturation' },
  { category: 'Endodontic Procedures', name: 'Re-RCT', standardCharge: 4500, description: 'Endodontic retreatment of previously treated tooth' },
  { category: 'Endodontic Procedures', name: 'Pulp Capping', standardCharge: 1200, description: 'Direct or indirect vital pulp capping therapy' },
  { category: 'Endodontic Procedures', name: 'Pulpotomy', standardCharge: 1800, description: 'Coronal pulp removal with medicament dressing' },

  // Surgical Procedures
  { category: 'Surgical Procedures', name: 'Tooth Extraction', standardCharge: 800, description: 'Non-surgical routine tooth extraction' },
  { category: 'Surgical Procedures', name: 'Surgical Extraction', standardCharge: 2500, description: 'Surgical tooth extraction with mucoperiosteal flap' },
  { category: 'Surgical Procedures', name: 'Impacted Tooth Removal', standardCharge: 3500, description: 'Surgical extraction of bone-impacted tooth' },
  { category: 'Surgical Procedures', name: 'Irrigation', standardCharge: 400, description: 'Antiseptic debridement and socket/pocket irrigation' },
  { category: 'Surgical Procedures', name: 'Suture Placement', standardCharge: 500, description: 'Surgical wound closure and suture placement' },
  { category: 'Surgical Procedures', name: 'Sutures Removal', standardCharge: 300, description: 'Post-operative suture removal and evaluation' },
  { category: 'Surgical Procedures', name: 'Incision and Drainage', standardCharge: 1500, description: 'Incision and drainage of acute dental abscess' },

  // Periodontal Procedures
  { category: 'Periodontal Procedures', name: 'Dental Scaling', standardCharge: 1200, description: 'Full mouth ultrasonic scaling and plaque debridement' },
  { category: 'Periodontal Procedures', name: 'Polishing', standardCharge: 800, description: 'Prophylactic polishing and extrinsic stain removal' },
  { category: 'Periodontal Procedures', name: 'Deep Scaling', standardCharge: 2000, description: 'Subgingival deep calculus debridement' },
  { category: 'Periodontal Procedures', name: 'Root Planing', standardCharge: 2500, description: 'Root surface smoothing to remove necrotic cementum' },
  { category: 'Periodontal Procedures', name: 'Gingival Treatment', standardCharge: 1800, description: 'Therapeutic treatment for gingival inflammation and disease' },

  // Prosthodontic Procedures
  { category: 'Prosthodontic Procedures', name: 'Denture Placement', standardCharge: 12000, description: 'Fitting and insertion of complete or partial denture' },
  { category: 'Prosthodontic Procedures', name: 'Denture Adjustment', standardCharge: 800, description: 'Clinical relief and adjustment of denture borders or occlusion' },
  { category: 'Prosthodontic Procedures', name: 'Impression Taking', standardCharge: 600, description: 'Diagnostic or master dental impression taking' },
  { category: 'Prosthodontic Procedures', name: 'Temporary Crown Placement', standardCharge: 1000, description: 'Interim temporary crown fabrication and cementation' },

  // Orthodontic Procedures
  { category: 'Orthodontic Procedures', name: 'Orthodontic Consultation', standardCharge: 800, description: 'Orthodontic diagnostic analysis and alignment planning' },
  { category: 'Orthodontic Procedures', name: 'Orthodontic Alignment', standardCharge: 25000, description: 'Comprehensive orthodontic alignment and archwire adjustment' },
  { category: 'Orthodontic Procedures', name: 'Braces Placement', standardCharge: 30000, description: 'Fixed orthodontic appliance bracket bonding' },
  { category: 'Orthodontic Procedures', name: 'Retainer Placement', standardCharge: 5000, description: 'Post-treatment retention appliance placement' },

  // Other Procedures
  { category: 'Other Procedures', name: 'Fluoride Application', standardCharge: 1000, description: 'Topical preventive fluoride application' },
  { category: 'Other Procedures', name: 'Sealant Application', standardCharge: 1200, description: 'Preventive dental pit and fissure sealant application' },
  { category: 'Other Procedures', name: 'Tooth Whitening', standardCharge: 6000, description: 'Professional in-office vital tooth bleaching' },
  { category: 'Other Procedures', name: 'Other Procedure', standardCharge: 500, description: 'Clinical dental procedure' },
];

async function ensureDefaultProcedureCatalogue() {
  const count = await prisma.procedureMaster.count();
  if (count === 0) {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < DEFAULT_PROCEDURES_SEED.length; i++) {
      const item = DEFAULT_PROCEDURES_SEED[i];
      const code = `PM-${currentYear}-${(i + 1).toString().padStart(5, '0')}`;
      await prisma.procedureMaster.create({
        data: {
          code,
          name: item.name,
          category: item.category,
          specialization: 'DENTAL',
          description: item.description,
          standardCharge: item.standardCharge,
          estimatedMins: 45,
          isActive: true,
        },
      });
    }
  }
}

// GET /api/procedures/masters - Query procedure masters catalogue
router.get('/masters', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureDefaultProcedureCatalogue();

    const { search, category, status, includeInactive } = req.query;
    const where: any = {};

    // Filter by Active / Inactive status
    if (status === 'INACTIVE') {
      where.isActive = false;
    } else if (status === 'ALL' || includeInactive === 'true') {
      // Return both active and inactive
    } else {
      // Default to active only
      where.isActive = true;
    }

    if (category && category !== 'ALL') {
      where.category = String(category);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const masters = await prisma.procedureMaster.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, masters });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/procedures/masters - Add New Procedure (Permanent Catalogue Entry)
const createProcedureMasterSchema = z.object({
  name: z.string().min(1, 'Procedure name is required'),
  category: z.string().min(1, 'Procedure category is required'),
  description: z.string().optional().nullable(),
  standardCharge: z.number().min(0).optional().default(500),
  estimatedMins: z.number().min(1).optional().default(45),
  isActive: z.boolean().optional().default(true),
});

router.post('/masters', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = createProcedureMasterSchema.parse(req.body);
    const trimmedName = data.name.trim();
    const trimmedCategory = data.category.trim();

    // Prevent duplicate procedure names in catalogue (case-insensitive)
    const existing = await prisma.procedureMaster.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A procedure named "${trimmedName}" already exists in the catalogue (${existing.code}).`,
      });
    }

    const count = await prisma.procedureMaster.count();
    const code = `PM-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    const master = await prisma.procedureMaster.create({
      data: {
        code,
        name: trimmedName,
        category: trimmedCategory,
        specialization: 'DENTAL',
        description: data.description?.trim() || null,
        standardCharge: Number(data.standardCharge) || 500,
        estimatedMins: Number(data.estimatedMins) || 45,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Procedure "${master.name}" permanently added to the procedure catalogue`,
      master,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/procedures/masters/:id - Edit Existing Catalogue Entry
const updateProcedureMasterSchema = z.object({
  name: z.string().min(1, 'Procedure name is required').optional(),
  category: z.string().min(1, 'Procedure category is required').optional(),
  description: z.string().optional().nullable(),
  standardCharge: z.number().min(0).optional(),
  estimatedMins: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.put('/masters/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateProcedureMasterSchema.parse(req.body);

    const existing = await prisma.procedureMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Procedure not found in catalogue' });
    }

    // Check duplicate name if name is being changed
    if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.procedureMaster.findFirst({
        where: {
          id: { not: id },
          name: { equals: data.name.trim(), mode: 'insensitive' },
        },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another procedure named "${data.name.trim()}" already exists in the catalogue (${duplicate.code}).`,
        });
      }
    }

    const updated = await prisma.procedureMaster.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.category && { category: data.category.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.standardCharge !== undefined && { standardCharge: Number(data.standardCharge) }),
        ...(data.estimatedMins !== undefined && { estimatedMins: Number(data.estimatedMins) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      },
    });

    res.json({
      success: true,
      message: `Procedure "${updated.name}" updated successfully`,
      master: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/procedures/masters/:id/status - Toggle Active / Inactive Status
router.patch('/masters/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const existing = await prisma.procedureMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Procedure not found in catalogue' });
    }

    const updated = await prisma.procedureMaster.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    res.json({
      success: true,
      message: `Procedure "${updated.name}" is now ${updated.isActive ? 'Active' : 'Inactive'}`,
      master: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/procedures/history - Grouped Clinical & Treatment History by patient and visit date
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;
    const patientFilter = patientId ? { patientId: String(patientId) } : {};

    const [clinicalNotes, procedures, pharmacySales] = await Promise.all([
      prisma.clinicalNote.findMany({
        where: patientFilter,
        include: {
          patient: { select: { id: true, name: true, patientCode: true, mobile: true, age: true, gender: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          appointment: true,
          procedures: true,
        },
        orderBy: { consultationDate: 'desc' },
      }),
      prisma.procedure.findMany({
        where: patientFilter,
        include: {
          patient: { select: { id: true, name: true, patientCode: true, mobile: true, age: true, gender: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          procedureMaster: true,
          operationInvoice: { include: { payments: true } },
        },
        orderBy: { procedureDate: 'desc' },
      }),
      prisma.pharmacySale.findMany({
        where: patientFilter,
        include: {
          items: { include: { medicine: true, batchStock: true } },
        },
        orderBy: { saleDate: 'desc' },
      }),
    ]);

    // Group records by patientId and date (YYYY-MM-DD)
    const visitsMap = new Map<string, any>();

    const toDateKey = (d: any) => {
      const date = new Date(d);
      return isNaN(date.getTime()) ? 'Unspecified Date' : date.toISOString().substring(0, 10);
    };

    // 1. Ingest Clinical Notes
    clinicalNotes.forEach((cn) => {
      const dateKey = toDateKey(cn.consultationDate);
      const visitKey = `${cn.patientId}_${dateKey}`;

      if (!visitsMap.has(visitKey)) {
        visitsMap.set(visitKey, {
          id: visitKey,
          visitDate: dateKey,
          patientId: cn.patientId,
          patient: cn.patient,
          consultingDoctors: [],
          clinicalNotes: [],
          procedures: [],
          prescriptions: [],
          prescribedMedications: [],
          appointment: cn.appointment || null,
        });
      }

      const visit = visitsMap.get(visitKey);
      visit.clinicalNotes.push(cn);

      const docName = cn.doctor?.user?.fullName;
      if (docName && !visit.consultingDoctors.some((d: any) => d.name === docName)) {
        visit.consultingDoctors.push({
          id: cn.doctor.id,
          name: docName,
          specialization: cn.doctor.specialization,
        });
      }
    });

    // 2. Ingest Procedures
    procedures.forEach((pr) => {
      const dateKey = toDateKey(pr.procedureDate);
      const visitKey = `${pr.patientId}_${dateKey}`;

      if (!visitsMap.has(visitKey)) {
        visitsMap.set(visitKey, {
          id: visitKey,
          visitDate: dateKey,
          patientId: pr.patientId,
          patient: pr.patient,
          consultingDoctors: [],
          clinicalNotes: [],
          procedures: [],
          prescriptions: [],
          prescribedMedications: [],
          appointment: null,
        });
      }

      const visit = visitsMap.get(visitKey);
      visit.procedures.push(pr);

      // Collect prescribed medications from procedures into the visit level
      if (Array.isArray(pr.prescribedMedications) && pr.prescribedMedications.length > 0) {
        pr.prescribedMedications.forEach((med: any) => {
          if (med && med.name && !visit.prescribedMedications.some((m: any) => m.name === med.name && m.dosage === med.dosage && m.frequency === med.frequency)) {
            visit.prescribedMedications.push(med);
          }
        });
      }

      const docName = pr.doctor?.user?.fullName || pr.dentistName;
      if (docName && !visit.consultingDoctors.some((d: any) => d.name === docName)) {
        visit.consultingDoctors.push({
          id: pr.doctor?.id || null,
          name: docName,
          specialization: pr.doctor?.specialization || 'DENTAL',
        });
      }
    });

    // 3. Ingest Pharmacy Sales / Medicines
    pharmacySales.forEach((sale) => {
      const dateKey = toDateKey(sale.saleDate);
      const visitKey = `${sale.patientId}_${dateKey}`;

      if (visitsMap.has(visitKey)) {
        const visit = visitsMap.get(visitKey);
        visit.prescriptions.push(sale);
      }
    });

    // Convert to sorted array
    const visits = Array.from(visitsMap.values()).sort((a, b) => {
      return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
    });

    res.json({
      success: true,
      visits,
      totalVisits: visits.length,
      totalNotes: clinicalNotes.length,
      totalProcedures: procedures.length,
    });
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

const medicationEntrySchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /api/procedures - Create / Schedule a Procedure (Supports single or multiple procedures)
const createProcedureSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientCode: z.string().optional().nullable(),
  doctorId: z.string().optional().nullable(),
  dentistName: z.string().optional().nullable(),
  procedureMasterId: z.string().optional().nullable(),
  procedureName: z.string().optional().nullable(),
  procedureNames: z.array(z.string()).optional().nullable(),
  procedureDate: z.string().min(1, 'Procedure date is required'),
  toothNumber: z.string().optional().nullable(),
  charges: z.number().min(0).optional().default(0),
  clinicalNotes: z.string().optional().nullable(),
  procedureDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().optional().default('PLANNED'),
  clinicalNoteId: z.string().optional().nullable(),
  prescribedMedications: z.array(medicationEntrySchema).optional().nullable(),
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

    // 2. Resolve Procedure Names (support multiple or single)
    let procNames: string[] = [];
    if (Array.isArray(data.procedureNames) && data.procedureNames.length > 0) {
      procNames = data.procedureNames.map((n) => n.trim()).filter((n) => n.length > 0);
    } else if (data.procedureName && data.procedureName.trim().length > 0) {
      procNames = [data.procedureName.trim()];
    } else {
      return res.status(400).json({ success: false, message: 'At least one procedure must be selected' });
    }
    // Remove accidental duplicate entries in the same submission list
    procNames = Array.from(new Set(procNames));

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

    // 6. Prevent accidental rapid double-submission (within 4 seconds for same patient and procedure names)
    const recentDuplicate = await prisma.procedure.findMany({
      where: {
        patientId: patient.id,
        procedureName: { in: procNames },
        toothNumber: data.toothNumber?.trim() || null,
        createdAt: { gte: new Date(Date.now() - 4000) },
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
      },
    });

    if (recentDuplicate.length >= procNames.length) {
      return res.status(200).json({
        success: true,
        message: 'Procedures already saved (duplicate submission prevented)',
        procedure: recentDuplicate[0],
        procedures: recentDuplicate,
      });
    }

    // Filter prescribed medications (clinical documentation only - not linked to pharmacy or billing)
    const validMedications = (data.prescribedMedications || [])
      .filter((m) => m && typeof m.name === 'string' && m.name.trim().length > 0)
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage?.trim() || null,
        frequency: m.frequency?.trim() || null,
        duration: m.duration?.trim() || null,
        instructions: m.instructions?.trim() || null,
        notes: m.notes?.trim() || null,
      }));

    // 7. Create each procedure record
    const createdProcedures = [];
    for (const procName of procNames) {
      // Lookup procedure master if exists
      let matchedMasterId: string | null = null;
      let standardCharge = 0;

      const master = await prisma.procedureMaster.findFirst({
        where: { name: { equals: procName, mode: 'insensitive' } },
      });
      if (master) {
        matchedMasterId = master.id;
        standardCharge = master.standardCharge;
      }

      // Calculate charges
      let procCharge = standardCharge;
      if (data.charges && data.charges > 0) {
        if (procNames.length === 1) {
          procCharge = data.charges;
        } else if (standardCharge > 0) {
          procCharge = standardCharge;
        } else {
          procCharge = Math.round(data.charges / procNames.length);
        }
      }

      const procedureCode = await generateProcedureCode();

      const created = await prisma.procedure.create({
        data: {
          procedureCode,
          patientId: patient.id,
          doctorId: resolvedDoctorId,
          dentistName: resolvedDentistName,
          procedureMasterId: matchedMasterId,
          procedureName: procName,
          toothNumber: data.toothNumber?.trim() || null,
          procedureDate: parsedDate,
          charges: procCharge,
          clinicalNotes,
          clinicalNoteId: data.clinicalNoteId?.trim() || null,
          status: normalizedStatus,
          prescribedMedications: validMedications.length > 0 ? (validMedications as any) : undefined,
        },
        include: {
          patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          procedureMaster: true,
        },
      });

      emitRealtimeEvent('procedure:scheduled', created);
      emitRealtimeEvent('procedure:created', created);
      createdProcedures.push(created);
    }

    res.status(201).json({
      success: true,
      message:
        createdProcedures.length === 1
          ? 'Procedure created successfully'
          : `${createdProcedures.length} procedures created successfully`,
      procedure: createdProcedures[0],
      procedures: createdProcedures,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, errors: err.errors });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/procedures/:id/status - Update procedure status (e.g. mark COMPLETED and send to billing queue)
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const rawStatus = (status || 'COMPLETED').toUpperCase().replace(/[\s-]+/g, '_');
    let targetStatus: ProcedureStatus = ProcedureStatus.COMPLETED;
    if (rawStatus === 'IN_PROGRESS') targetStatus = ProcedureStatus.IN_PROGRESS;
    else if (rawStatus === 'PLANNED') targetStatus = ProcedureStatus.PLANNED;
    else if (rawStatus === 'CANCELLED') targetStatus = ProcedureStatus.CANCELLED;
    else if (rawStatus === 'SCHEDULED') targetStatus = ProcedureStatus.SCHEDULED;
    else targetStatus = ProcedureStatus.COMPLETED;

    const proc = await prisma.procedure.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
        doctor: { include: { user: { select: { fullName: true } } } },
        procedureMaster: true,
        operationInvoice: true,
      },
    });

    // If procedure marked COMPLETED, automatically complete any matching scheduled/in-progress appointment for this patient on this day
    if (targetStatus === ProcedureStatus.COMPLETED && proc.patientId) {
      try {
        const procDate = new Date(proc.procedureDate);
        const startOfDay = new Date(procDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(procDate);
        endOfDay.setHours(23, 59, 59, 999);

        const matchingApt = await prisma.appointment.findFirst({
          where: {
            patientId: proc.patientId,
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] },
            appointmentDate: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (matchingApt) {
          const updatedApt = await prisma.appointment.update({
            where: { id: matchingApt.id },
            data: { status: AppointmentStatus.COMPLETED },
            include: {
              patient: true,
              doctor: { include: { user: { select: { fullName: true } } } },
            },
          });
          emitRealtimeEvent('appointment:updated', updatedApt);
          emitRealtimeEvent('appointment:completed', updatedApt);
        }
      } catch (aptErr) {
        console.error('Error auto-completing linked procedure appointment:', aptErr);
      }
    }

    emitRealtimeEvent('procedure:completed', proc);
    emitRealtimeEvent('procedure:updated', proc);

    res.json({
      success: true,
      message: `Procedure ${proc.procedureCode} status updated to ${proc.status} and sent to Billing queue`,
      procedure: proc,
    });
  } catch (err: any) {
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

      // Also automatically mark the linked appointment as COMPLETED so it doesn't stay IN_PROGRESS
      // Guard strictly by date and appointment ID to NEVER complete future scheduled appointments!
      const procDate = new Date(proc.procedureDate);
      const startOfDay = new Date(procDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(procDate);
      endOfDay.setHours(23, 59, 59, 999);

      const matchingApt = await tx.appointment.findFirst({
        where: {
          patientId: proc.patientId,
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] },
          appointmentDate: { gte: startOfDay, lte: endOfDay },
          OR: [
            { visitType: VisitType.PROCEDURE },
            ...(proc.procedureName ? [{ procedureName: proc.procedureName }] : []),
          ],
        },
        orderBy: { appointmentDate: 'asc' },
      });

      let updatedApt = null;
      if (matchingApt && matchingApt.status !== AppointmentStatus.COMPLETED) {
        updatedApt = await tx.appointment.update({
          where: { id: matchingApt.id },
          data: { status: AppointmentStatus.COMPLETED },
          include: {
            patient: true,
            doctor: { include: { user: { select: { fullName: true } } } },
          },
        });
      }

      // Also ensure any other scheduled/in-progress procedure appointment FOR TODAY ONLY is completed
      await tx.appointment.updateMany({
        where: {
          patientId: proc.patientId,
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] },
          appointmentDate: { gte: startOfDay, lte: endOfDay },
          OR: [
            { visitType: VisitType.PROCEDURE },
            ...(proc.procedureName ? [{ procedureName: proc.procedureName }] : []),
          ],
        },
        data: { status: AppointmentStatus.COMPLETED },
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

      return { updatedProc, bill, receipt, updatedApt };
    });

    emitRealtimeEvent('procedure:completed', result);
    if (result.updatedApt) {
      emitRealtimeEvent('appointment:updated', result.updatedApt);
      emitRealtimeEvent('appointment:completed', result.updatedApt);
    }

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
