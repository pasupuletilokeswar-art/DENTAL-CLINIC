import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

const createFindingSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  consultationId: z.string().optional().nullable(),
  toothNumber: z.number().int().min(11, 'Valid FDI tooth number required'),
  dentitionType: z.enum(['ADULT', 'PEDIATRIC']).default('ADULT'),
  toothName: z.string().min(1, 'Tooth name is required'),
  surface: z.string().min(1, 'Tooth surface is required'),
  condition: z.string().min(1, 'Clinical condition is required'),
  severity: z.enum(['Mild', 'Moderate', 'Severe', 'Critical', 'N/A']).default('Moderate'),
  treatment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().default('ACTIVE'),
});

const updateFindingSchema = z.object({
  surface: z.string().optional(),
  condition: z.string().optional(),
  severity: z.enum(['Mild', 'Moderate', 'Severe', 'Critical', 'N/A']).optional(),
  treatment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
});

// GET /api/dental-chart/patient/:patientId - Fetch complete dental chart for a patient
router.get('/patient/:patientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, patientCode: true, age: true, gender: true },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const findings = await prisma.dentalFinding.findMany({
      where: { patientId },
      orderBy: [{ toothNumber: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      patient,
      findings,
      totalFindings: findings.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dental-chart/patient/:patientId/tooth/:toothNumber - Fetch history for specific tooth
router.get('/patient/:patientId/tooth/:toothNumber', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId, toothNumber } = req.params;
    const toothNum = parseInt(toothNumber, 10);

    if (isNaN(toothNum)) {
      return res.status(400).json({ success: false, message: 'Invalid tooth number' });
    }

    const findings = await prisma.dentalFinding.findMany({
      where: {
        patientId,
        toothNumber: toothNum,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      toothNumber: toothNum,
      history: findings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dental-chart - Record a new clinical finding
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = createFindingSchema.parse(req.body);
    const userId = (req as any).user?.userId || null;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Check for duplicate identical finding on same tooth, surface and condition
    const duplicate = await prisma.dentalFinding.findFirst({
      where: {
        patientId: data.patientId,
        toothNumber: data.toothNumber,
        surface: data.surface,
        condition: data.condition,
        status: 'ACTIVE',
      },
    });

    if (duplicate) {
      // Update existing finding with new notes/severity rather than crashing or creating redundant entries
      const updated = await prisma.dentalFinding.update({
        where: { id: duplicate.id },
        data: {
          severity: data.severity,
          treatment: data.treatment || duplicate.treatment,
          notes: data.notes || duplicate.notes,
          updatedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        finding: updated,
        message: `Updated existing active finding on Tooth ${data.toothNumber} (${data.surface})`,
      });
    }

    const finding = await prisma.dentalFinding.create({
      data: {
        patientId: data.patientId,
        consultationId: data.consultationId || null,
        toothNumber: data.toothNumber,
        dentitionType: data.dentitionType,
        toothName: data.toothName,
        surface: data.surface,
        condition: data.condition,
        severity: data.severity,
        treatment: data.treatment || null,
        notes: data.notes || null,
        status: data.status || 'ACTIVE',
        createdById: userId,
      },
    });

    res.status(201).json({
      success: true,
      finding,
      message: `Finding recorded successfully on Tooth ${data.toothNumber} (${data.surface})`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/dental-chart/:id - Update an existing finding
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateFindingSchema.parse(req.body);

    const existing = await prisma.dentalFinding.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dental finding not found' });
    }

    const updated = await prisma.dentalFinding.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      finding: updated,
      message: 'Finding updated successfully',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/dental-chart/:id - Remove a finding
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dentalFinding.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dental finding not found' });
    }

    await prisma.dentalFinding.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Finding on Tooth ${existing.toothNumber} removed successfully`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
