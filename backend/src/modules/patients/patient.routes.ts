import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { Gender } from '@prisma/client';

const router = Router();

// Validation schema
const patientSchema = z.object({
  name: z.string().min(2, 'Patient name must be at least 2 characters'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  age: z.number().int().min(0, 'Age must be non-negative'),
  gender: z.nativeEnum(Gender),
  address: z.string().optional(),
  medicalAlerts: z.string().optional(),
});

// Generate next sequential Patient ID: DOC-2026-00001
async function generatePatientCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DOC-${currentYear}-`;
  
  const lastPatient = await prisma.patient.findFirst({
    where: {
      patientCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      patientCode: 'desc',
    },
  });

  if (!lastPatient) {
    return `${prefix}00001`;
  }

  const parts = lastPatient.patientCode.split('-');
  const seq = parseInt(parts[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

// GET /api/patients - Listing & Search
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
        { patientCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { registrationDate: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      success: true,
      patients,
      total,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:id - Complete 360 Patient Profile (Phase 4)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientCode: id }],
      },
      include: {
        appointments: {
          include: {
            doctor: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: { appointmentDate: 'desc' },
        },
        clinicalNotes: {
          include: {
            doctor: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: { consultationDate: 'desc' },
        },
        consultationBills: {
          include: {
            doctor: { include: { user: { select: { fullName: true } } } },
            payments: true,
          },
          orderBy: { billDate: 'desc' },
        },
        pharmacySales: {
          include: {
            items: { include: { medicine: true } },
            payments: true,
          },
          orderBy: { saleDate: 'desc' },
        },
        procedures: {
          include: {
            doctor: { include: { user: { select: { fullName: true } } } },
            procedureMaster: true,
            operationInvoice: { include: { payments: true } },
          },
          orderBy: { procedureDate: 'desc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Calculate aggregated financial summaries for this patient
    const consultationPending = patient.consultationBills.reduce((sum, b) => sum + b.pendingBalance, 0);
    const pharmacyPending = patient.pharmacySales.reduce((sum, s) => sum + s.pendingBalance, 0);
    const operationPending = patient.procedures.reduce((sum, p) => sum + (p.operationInvoice?.pendingBalance || 0), 0);
    const totalOutstanding = consultationPending + pharmacyPending + operationPending;

    res.json({
      success: true,
      patient,
      financialSummary: {
        consultationPending,
        pharmacyPending,
        operationPending,
        totalOutstanding,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients - Register new patient
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = patientSchema.parse(req.body);

    // Check duplicate by mobile
    const existing = await prisma.patient.findFirst({
      where: { mobile: data.mobile },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Patient with mobile number ${data.mobile} is already registered (${existing.name} - ${existing.patientCode})`,
      });
    }

    const patientCode = await generatePatientCode();

    const newPatient = await prisma.patient.create({
      data: {
        patientCode,
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        dob: data.dob ? new Date(data.dob) : null,
        age: data.age,
        gender: data.gender,
        address: data.address || null,
        medicalAlerts: data.medicalAlerts || null,
        createdById: req.user?.id,
      },
    });

    // Real-time broadcast
    emitRealtimeEvent('patient:registered', newPatient);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient: newPatient,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/patients/:id - Edit patient details
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = patientSchema.parse(req.body);

    // Verify duplicate mobile for other patients
    const duplicate = await prisma.patient.findFirst({
      where: {
        mobile: data.mobile,
        NOT: { id },
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Mobile number already in use by another patient (${duplicate.name})`,
      });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        dob: data.dob ? new Date(data.dob) : null,
        age: data.age,
        gender: data.gender,
        address: data.address || null,
        medicalAlerts: data.medicalAlerts || null,
      },
    });

    emitRealtimeEvent('patient:updated', updated);

    res.json({
      success: true,
      message: 'Patient details updated',
      patient: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
