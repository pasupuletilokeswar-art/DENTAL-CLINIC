import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { AppointmentStatus, VisitType, Specialization } from '@prisma/client';
import {
  getTomorrowAppointments,
  sendAppointmentReminder,
  dispatchTomorrowReminders,
  getTomorrowDateRange,
} from '../../services/reminderScheduler';

const router = Router();

const visitTypeSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const upper = val.toUpperCase().trim();
      if (['NEW_VISIT', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP', 'PROCEDURE'].includes(upper)) {
        return upper;
      }
    }
    return val;
  },
  z.enum(['NEW_VISIT', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP', 'PROCEDURE']).default('NEW_VISIT')
);

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  specialization: z.nativeEnum(Specialization),
  appointmentDate: z.string().min(1, 'Appointment date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  durationMinutes: z.number().int().min(10).default(30),
  visitType: visitTypeSchema,
  procedureName: z.string().optional(),
  reasonForVisit: z.string().optional(),
});

// Helper to parse pure calendar date into UTC midnight
function parseCalendarDateUTC(dateStr: string): { start: Date; end: Date; exact: Date } {
  let year: number, month: number, day: number;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const d = new Date(dateStr);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }
  const exact = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  return { start, end, exact };
}

// Auto generate appointment code: APT-2026-00001
async function generateAppointmentCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `APT-${currentYear}-`;
  const lastApt = await prisma.appointment.findFirst({
    where: { appointmentCode: { startsWith: prefix } },
    orderBy: { appointmentCode: 'desc' },
  });

  if (!lastApt) return `${prefix}00001`;
  const seq = parseInt(lastApt.appointmentCode.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

// GET /api/appointments/patient-active/:patientId - Check if patient already has an active appointment or previous consulting doctor
router.get('/patient-active/:patientId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const activeAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patient: { select: { id: true, name: true, patientCode: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    const latestAppointment = await prisma.appointment.findFirst({
      where: { patientId },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patient: { select: { id: true, name: true, patientCode: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    const doctorId = activeAppointment?.doctorId || latestAppointment?.doctorId || null;
    const doctor = activeAppointment?.doctor || latestAppointment?.doctor || null;

    res.json({
      success: true,
      hasActiveAppointment: !!activeAppointment,
      activeAppointment: activeAppointment || null,
      latestAppointment: latestAppointment || null,
      doctorId,
      doctor,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/calendar-summary - Summary counts per day for month calendar view
router.get('/calendar-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { month, doctorId, specialization } = req.query; // format: YYYY-MM
    let startDate: Date;
    let endDate: Date;

    if (month && typeof month === 'string' && month.includes('-')) {
      const [year, m] = month.split('-').map(Number);
      startDate = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0));
    }

    const where: any = {
      appointmentDate: { gte: startDate, lt: endDate },
      status: { notIn: [AppointmentStatus.CANCELLED] },
    };

    if (doctorId && typeof doctorId === 'string') {
      where.doctorId = doctorId;
    }
    if (specialization && typeof specialization === 'string') {
      where.specialization = specialization;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      select: {
        appointmentDate: true,
        specialization: true,
        status: true,
      },
    });

    const summary: Record<string, { total: number; dental: number; ortho: number; completed: number }> = {};

    for (const apt of appointments) {
      const year = apt.appointmentDate.getUTCFullYear();
      const month = String(apt.appointmentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(apt.appointmentDate.getUTCDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      if (!summary[key]) {
        summary[key] = { total: 0, dental: 0, ortho: 0, completed: 0 };
      }
      summary[key].total += 1;
      if (apt.specialization === Specialization.DENTAL) summary[key].dental += 1;
      if (apt.specialization === Specialization.ORTHOPEDIC) summary[key].ortho += 1;
      if (apt.status === AppointmentStatus.COMPLETED) summary[key].completed += 1;
    }

    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/busy-slots - Get booked time slots for a specific doctor and date
router.get('/busy-slots', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || typeof doctorId !== 'string' || !date || typeof date !== 'string') {
      return res.status(400).json({ success: false, message: 'doctorId and date are required' });
    }

    const { start, end } = parseCalendarDateUTC(date);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: start, lt: end },
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
      select: {
        id: true,
        appointmentCode: true,
        startTime: true,
        endTime: true,
        durationMinutes: true,
        patient: { select: { name: true, patientCode: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, busySlots: appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments - List appointments with filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date, doctorId, status, specialization, patientId } = req.query;

    const where: any = {};
    if (patientId && typeof patientId === 'string') {
      where.patientId = patientId;
    }
    if (doctorId && typeof doctorId === 'string') {
      where.doctorId = doctorId;
    }
    if (specialization && typeof specialization === 'string') {
      where.specialization = specialization;
    }
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (date && typeof date === 'string') {
      const { start, end } = parseCalendarDateUTC(date);
      where.appointmentDate = { gte: start, lt: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, mobile: true, gender: true, age: true } },
        doctor: {
          include: {
            user: { select: { fullName: true } },
          },
        },
        consultationBill: true,
        clinicalNote: { select: { id: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Enforce real-time operation / procedure billing detection:
    // If appointment is a PROCEDURE slot, fetch and attach its latest operationBill
    const patientIds = Array.from(new Set(appointments.map((a) => a.patientId)));
    const opBills = await prisma.operationBill.findMany({
      where: {
        procedure: {
          patientId: { in: patientIds },
        },
      },
      include: {
        procedure: {
          include: { procedureMaster: true },
        },
      },
      orderBy: { billDate: 'desc' },
    });

    const enrichedAppointments = appointments.map((apt) => {
      let linkedOpBill = null;
      if (apt.visitType === VisitType.PROCEDURE) {
        linkedOpBill =
          opBills.find(
            (ob) =>
              ob.procedure?.patientId === apt.patientId &&
              (!apt.procedureName ||
                ob.procedure?.procedureMaster?.name?.toLowerCase() === apt.procedureName.toLowerCase())
          ) ||
          opBills.find((ob) => ob.procedure?.patientId === apt.patientId) ||
          null;
      }
      return {
        ...apt,
        operationBill: linkedOpBill,
      };
    });

    res.json({ success: true, appointments: enrichedAppointments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments - Book new appointment with duplicate prevention and overlap conflict check
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = appointmentSchema.parse(req.body);

    const { start: dayStart, end: dayEnd, exact: aptDate } = parseCalendarDateUTC(data.appointmentDate);

    // 1. Prevent duplicate active appointments for the same patient on the same date
    const activeAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: data.patientId,
        appointmentDate: { gte: dayStart, lt: dayEnd },
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      },
      include: {
        doctor: { include: { user: { select: { fullName: true } } } },
        patient: { select: { name: true, patientCode: true } },
      },
    });

    if (activeAppointment) {
      // If the booking request is for a procedure or treatment, seamlessly link the procedure to the active appointment
      if (data.visitType === 'PROCEDURE' || data.procedureName) {
        const updated = await prisma.appointment.update({
          where: { id: activeAppointment.id },
          data: {
            procedureName: data.procedureName || activeAppointment.procedureName,
            reasonForVisit: data.reasonForVisit || activeAppointment.reasonForVisit,
          },
          include: {
            patient: true,
            doctor: { include: { user: { select: { fullName: true } } } },
          },
        });
        emitRealtimeEvent('appointment:created', updated);
        emitRealtimeEvent('appointment:updated', updated);
        return res.status(200).json({
          success: true,
          message: `Procedure slot linked to patient's active appointment (${updated.appointmentCode}) for today`,
          appointment: updated,
        });
      }

      const aptDateFormatted = activeAppointment.appointmentDate.toISOString().substring(0, 10);
      const aptTimeFormatted = new Date(activeAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return res.status(409).json({
        success: false,
        code: 'ACTIVE_APPOINTMENT_EXISTS',
        activeAppointment,
        message: `Patient ${activeAppointment.patient.name} already has an active appointment (${activeAppointment.appointmentCode}) on ${aptDateFormatted} at ${aptTimeFormatted} with Dr. ${activeAppointment.doctor.user.fullName}. Please reschedule instead of booking a duplicate.`,
      });
    }

    const startDateTime = new Date(data.startTime);
    const endDateTime = new Date(startDateTime.getTime() + data.durationMinutes * 60 * 1000);

    // 2. Overlap conflict detection for the doctor
    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        status: { notIn: [AppointmentStatus.CANCELLED] },
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
      include: {
        patient: { select: { name: true } },
      },
    });

    if (overlappingAppointment) {
      return res.status(409).json({
        success: false,
        code: 'DOCTOR_SLOT_CONFLICT',
        message: `Doctor already has an overlapping appointment with ${overlappingAppointment.patient.name} from ${new Date(
          overlappingAppointment.startTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(
          overlappingAppointment.endTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    }

    const appointmentCode = await generateAppointmentCode();

    const appointment = await prisma.appointment.create({
      data: {
        appointmentCode,
        patientId: data.patientId,
        doctorId: data.doctorId,
        specialization: data.specialization,
        appointmentDate: aptDate,
        startTime: startDateTime,
        endTime: endDateTime,
        durationMinutes: data.durationMinutes,
        visitType: data.visitType as any,
        procedureName: data.procedureName || null,
        reasonForVisit: data.reasonForVisit || null,
        status: AppointmentStatus.SCHEDULED,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
      },
    });

    // New appointments for tomorrow start as reminderSent: false
    // so front desk staff can review and send via WhatsApp.

    emitRealtimeEvent('appointment:created', appointment);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/appointments/:id/reschedule - Reschedule an existing appointment
router.patch('/:id/reschedule', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, durationMinutes = 30, reason } = req.body;

    if (!appointmentDate || !startTime) {
      return res.status(400).json({ success: false, message: 'appointmentDate and startTime are required' });
    }

    const existingApt = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: { include: { user: { select: { fullName: true } } } } },
    });

    if (!existingApt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
    const { exact: aptDate } = parseCalendarDateUTC(appointmentDate);

    // Overlap conflict detection for the doctor (excluding this appointment)
    const overlapping = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        doctorId: existingApt.doctorId,
        status: { notIn: [AppointmentStatus.CANCELLED] },
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
      include: {
        patient: { select: { name: true } },
      },
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: `Doctor already has an overlapping appointment with ${overlapping.patient.name} from ${new Date(
          overlapping.startTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(
          overlapping.endTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: aptDate,
        startTime: startDateTime,
        endTime: endDateTime,
        durationMinutes,
        status: AppointmentStatus.SCHEDULED,
        reasonForVisit: reason ? `${existingApt.reasonForVisit || ''} [Rescheduled: ${reason}]`.trim() : existingApt.reasonForVisit,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
      },
    });

    emitRealtimeEvent('appointment:updated', updated);
    emitRealtimeEvent('appointment:rescheduled', updated);

    res.json({
      success: true,
      message: `Appointment ${updated.appointmentCode} successfully rescheduled to ${appointmentDate}`,
      appointment: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/appointments/:id/status - Update status (e.g., CONFIRMED, COMPLETED, CANCELLED)
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        cancellationReason: status === AppointmentStatus.CANCELLED ? cancellationReason : undefined,
      },
      include: {
        patient: true,
        doctor: { include: { user: { select: { fullName: true } } } },
      },
    });

    emitRealtimeEvent('appointment:updated', appointment);

    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/reminders/tomorrow - Summary and list of tomorrow's appointments
router.get('/reminders/tomorrow', authenticateToken, async (req: Request, res: Response) => {
  try {
    const summary = await getTomorrowAppointments();
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/reminders/send-tomorrow - Trigger batch reminders for all tomorrow's pending appointments
router.post('/reminders/send-tomorrow', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await dispatchTomorrowReminders();
    res.json({
      success: true,
      message: `Successfully processed reminders for tomorrow: ${result.dispatchedCount} dispatched.`,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/:id/send-reminder - Manually send/re-send 1-day reminder for a specific appointment
router.post('/:id/send-reminder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await sendAppointmentReminder(id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
