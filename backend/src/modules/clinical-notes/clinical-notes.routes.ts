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

// GET /api/clinical-notes - List notes (with optional ?patientId=...)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;
    const where: any = {};
    if (patientId) where.patientId = String(patientId);

    const notes = await prisma.clinicalNote.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true, age: true, gender: true } },
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        appointment: true,
        procedures: true,
      },
      orderBy: { consultationDate: 'desc' },
    });

    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
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
    console.error('Error saving clinical examination:', err);
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to save clinical examination note' });
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
    console.error('Error saving clinical examination:', err);
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to save clinical examination note' });
  }
});

// Enhanced Clinical Examination Schema (Sub-module 1)
const selectedToothItemSchema = z.any();

const clinicalFindingItemSchema = z.object({
  finding: z.string().optional().nullable(),
  toothNumber: z.any().optional().nullable(),
  selectedTeeth: z.any().optional().nullable(),
  teeth: z.any().optional().nullable(),
  chartType: z.any().optional().nullable(),
  severity: z.string().optional().nullable(), // 'Mild' | 'Moderate' | 'Severe'
  details: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
}).passthrough();

const recommendedTreatmentItemSchema = z.object({
  treatment: z.string().optional().nullable(),
  priority: z.string().optional().nullable(), // 'Immediate' | 'High' | 'Normal' | 'Low'
  advice: z.string().optional().nullable(),
  plannedDate: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
}).passthrough();

const examinationNoteSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentId: z.string().optional().nullable(),
  consultationDate: z.string().optional().nullable(),
  chiefComplaints: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  durationOfComplaint: z.string().optional().nullable(),
  patientDescription: z.string().optional().nullable(),
  clinicalFindings: z.array(clinicalFindingItemSchema).optional().nullable(),
  recommendedTreatments: z.array(recommendedTreatmentItemSchema).optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  advice: z.string().optional().nullable(),
}).passthrough();

// POST /api/clinical-notes/examination
router.post('/examination', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = examinationNoteSchema.parse(req.body);

    // 1. Verify Patient
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id: data.patientId }, { patientCode: data.patientId }],
      },
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Selected patient not found' });
    }

    // 2. Verify Doctor
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
      include: { user: { select: { fullName: true } } },
    });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Consulting doctor not found' });
    }

    // 3. Format Chief Complaints string for backward compatibility
    let formattedComplaints = '';
    if (Array.isArray(data.chiefComplaints)) {
      formattedComplaints = data.chiefComplaints.map((c) => c.trim()).filter(Boolean).join(', ');
    } else if (typeof data.chiefComplaints === 'string') {
      formattedComplaints = data.chiefComplaints.trim();
    }
    if (!formattedComplaints) {
      formattedComplaints = 'Routine Dental Evaluation';
    }

    // 4. Format Diagnosis string from Clinical Findings
    let formattedDiagnosis = '';
    const findingsList = data.clinicalFindings || [];
    if (findingsList.length > 0) {
      formattedDiagnosis = findingsList
        .map((f) => {
          let str = f.finding;
          const extras: string[] = [];
          if (f.toothNumber && f.toothNumber.trim()) extras.push(`Tooth #${f.toothNumber.trim()}`);
          if (f.severity && f.severity.trim()) extras.push(f.severity.trim());
          if (extras.length > 0) str += ` (${extras.join(', ')})`;
          return str;
        })
        .join('; ');
    } else {
      formattedDiagnosis = 'Clinical Examination Completed - No Acute Pathology Observed';
    }

    // 5. Format Treatment Recommendations string
    let formattedRecs = '';
    const recsList = data.recommendedTreatments || [];
    if (recsList.length > 0) {
      formattedRecs = recsList
        .map((r) => {
          let str = r.treatment;
          if (r.priority && r.priority.trim()) str += ` [Priority: ${r.priority.trim()}]`;
          if (r.advice && r.advice.trim()) str += ` - ${r.advice.trim()}`;
          return str;
        })
        .join('; ');
    }

    // 6. Format Detailed Medical History / Patient words
    const historyParts: string[] = [];
    if (data.durationOfComplaint && data.durationOfComplaint.trim()) {
      historyParts.push(`Duration: ${data.durationOfComplaint.trim()}`);
    }
    if (data.patientDescription && data.patientDescription.trim()) {
      historyParts.push(`Patient's Description: "${data.patientDescription.trim()}"`);
    }
    const formattedHistory = historyParts.length > 0 ? historyParts.join('\n') : null;

    // 7. Format Observations from findings details
    const obsParts: string[] = [];
    findingsList.forEach((f) => {
      const parts = [];
      if (f.details && f.details.trim()) parts.push(f.details.trim());
      if (f.observations && f.observations.trim()) parts.push(f.observations.trim());
      if (parts.length > 0) {
        obsParts.push(`${f.finding}${f.toothNumber ? ` (#${f.toothNumber})` : ''}: ${parts.join(' - ')}`);
      }
    });
    const formattedObservations = obsParts.length > 0 ? obsParts.join('\n') : null;

    // 8. Format Advice
    const adviceParts: string[] = [];
    if (data.advice && data.advice.trim()) adviceParts.push(data.advice.trim());
    if (data.followUpDate && data.followUpDate.trim()) {
      adviceParts.push(`Recommended Follow-up: ${data.followUpDate.trim()}`);
    }
    const formattedAdvice = adviceParts.length > 0 ? adviceParts.join('\n') : null;

    const parsedConsultationDate = data.consultationDate ? new Date(data.consultationDate) : new Date();
    const parsedFollowUpDate = data.followUpDate ? new Date(data.followUpDate) : null;

    // 9. Persist into database
    const createdNote = await prisma.clinicalNote.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: data.appointmentId || null,
        consultationDate: isNaN(parsedConsultationDate.getTime()) ? new Date() : parsedConsultationDate,
        chiefComplaints: formattedComplaints,
        detailedMedicalHistory: formattedHistory,
        observations: formattedObservations,
        diagnosis: formattedDiagnosis,
        treatmentRecommendations: formattedRecs || null,
        notes: data.notes?.trim() || null,
        advice: formattedAdvice,
        durationOfComplaint: data.durationOfComplaint?.trim() || null,
        patientDescription: data.patientDescription?.trim() || null,
        clinicalFindings: findingsList.length > 0 ? (findingsList as any) : undefined,
        recommendedTreatments: recsList.length > 0 ? (recsList as any) : undefined,
        followUpDate: parsedFollowUpDate && !isNaN(parsedFollowUpDate.getTime()) ? parsedFollowUpDate : null,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
        procedures: true,
      },
    });

    // If tied to an appointment, auto-mark appointment as COMPLETED
    if (data.appointmentId) {
      await prisma.appointment
        .update({
          where: { id: data.appointmentId },
          data: { status: AppointmentStatus.COMPLETED },
        })
        .catch(() => null);
    }

    emitRealtimeEvent('clinical-note:saved', createdNote);
    emitRealtimeEvent('examination:created', createdNote);

    res.status(201).json({
      success: true,
      message: 'Clinical examination and notes recorded successfully',
      note: createdNote,
    });
  } catch (err: any) {
    console.error('Error saving clinical examination:', err);
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, message: msg, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to save clinical examination note' });
  }
});

export default router;
