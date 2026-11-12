import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { AppointmentStatus } from '@prisma/client';

const router = Router();

// Zod schema enforcing the 9 fields
const clinicalNotesSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentId: z.string().optional().nullable(),
  consultationDate: z.string().optional(),
  
  // The 9 fields:
  chiefComplaints: z.string().min(1, 'Chief Complaints is required'),
  detailedMedicalHistory: z.string().optional().nullable(),
  teethChart: z.any().optional().nullable(), // Dental teeth condition JSON
  observations: z.string().optional().nullable(),
  investigations: z.string().optional().nullable(),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  treatmentRecommendations: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
});

// GET /api/clinical-notes/patient/:patientId
router.get('/patient/:patientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const notes = await prisma.clinicalNote.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        appointment: true,
      },
      orderBy: { consultationDate: 'desc' },
    });

    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/clinical-notes/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const note = await prisma.clinicalNote.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        appointment: true,
      },
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Clinical note not found' });
    }

    res.json({ success: true, note });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/clinical-notes - Receptionist records doctor paper prescription notes
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = clinicalNotesSchema.parse(req.body);

    const note = await prisma.$transaction(async (tx) => {
      const createdNote = await tx.clinicalNote.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          appointmentId: data.appointmentId || null,
          consultationDate: data.consultationDate ? new Date(data.consultationDate) : new Date(),
          chiefComplaints: data.chiefComplaints,
          detailedMedicalHistory: data.detailedMedicalHistory || null,
          teethChart: data.teethChart || null,
          observations: data.observations || null,
          investigations: data.investigations || null,
          diagnosis: data.diagnosis,
          treatmentRecommendations: data.treatmentRecommendations || null,
          notes: data.notes || null,
          advice: data.advice || null,
        },
        include: {
          patient: true,
          doctor: { include: { user: { select: { fullName: true } } } },
        },
      });

      // If tied to an appointment, auto-mark appointment as COMPLETED or IN_PROGRESS
      if (data.appointmentId) {
        await tx.appointment.update({
          where: { id: data.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        });
      }

      return createdNote;
    });

    emitRealtimeEvent('clinical-note:saved', note);

    res.status(201).json({
      success: true,
      message: 'Clinical notes saved successfully',
      note,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/clinical-notes/:id - Edit clinical note
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = clinicalNotesSchema.parse(req.body);

    const existing = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Clinical note not found' });
    }

    if (existing.isLocked) {
      return res.status(403).json({ success: false, message: 'This note is locked and cannot be edited' });
    }

    const updated = await prisma.clinicalNote.update({
      where: { id },
      data: {
        chiefComplaints: data.chiefComplaints,
        detailedMedicalHistory: data.detailedMedicalHistory || null,
        teethChart: data.teethChart || null,
        observations: data.observations || null,
        investigations: data.investigations || null,
        diagnosis: data.diagnosis,
        treatmentRecommendations: data.treatmentRecommendations || null,
        notes: data.notes || null,
        advice: data.advice || null,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
      },
    });

    emitRealtimeEvent('clinical-note:updated', updated);

    res.json({
      success: true,
      message: 'Clinical notes updated',
      note: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
