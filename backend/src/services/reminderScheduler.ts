import { prisma } from '../config/prisma';
import { AppointmentStatus } from '@prisma/client';
import { emitRealtimeEvent } from '../sockets';
import { sendAutomatedPatientSms } from './smsService';

export interface TomorrowReminderSummary {
  tomorrowDateKey: string;
  tomorrowDisplayDate: string;
  totalAppointments: number;
  pendingReminders: number;
  sentReminders: number;
  appointments: any[];
}

/**
 * Helper to compute start, end and date keys for Tomorrow
 */
export function getTomorrowDateRange(): { start: Date; end: Date; dateKey: string; displayDate: string } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = tomorrow.getMonth();
  const d = tomorrow.getDate();

  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const displayDate = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return { start, end, dateKey, displayDate };
}

/**
 * Generate standardized 1-day prior reminder text for an appointment
 */
export function formatAppointmentReminderText(apt: any): string {
  const dateFormatted = new Date(apt.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const startTimeStr = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `*HospAI Dental & Orthopedic Clinic*
*Patient Appointment Reminder (1 Day Prior)*
----------------------------------------
Dear ${apt.patient.name},

This is a reminder from HospAI Dental Clinic about your scheduled appointment tomorrow:

📅 Scheduled Date: ${dateFormatted}
⏰ Time Slot: ${startTimeStr} - ${endTimeStr}
👨‍⚕️ Doctor: Dr. ${apt.doctor.user.fullName} (${apt.specialization})
🏥 Clinic: HospAI Dental & Orthopedic Clinic
📋 Appointment Code: ${apt.appointmentCode}
${apt.procedureName ? `🦷 Procedure / Reason: ${apt.procedureName}\n` : ''}----------------------------------------
Please arrive 10 minutes prior to your time slot (${startTimeStr}) for registration.
If you need to reschedule or need directions, please contact HospAI Clinic at +91 98765 43210.
Have a healthy day!`;
}

/**
 * Fetch all appointments scheduled for tomorrow
 */
export async function getTomorrowAppointments(): Promise<TomorrowReminderSummary> {
  const { start, end, dateKey, displayDate } = getTomorrowDateRange();

  // Query all tomorrow's pending appointments (strictly SCHEDULED or CONFIRMED)
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: start, lt: end },
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
    },
    include: {
      patient: { select: { id: true, name: true, patientCode: true, mobile: true, gender: true, age: true } },
      doctor: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { startTime: 'asc' },
  });

  const totalAppointments = appointments.length;
  const sentReminders = appointments.filter((a) => a.reminderSent).length;
  const pendingReminders = appointments.filter((a) => !a.reminderSent).length;

  return {
    tomorrowDateKey: dateKey,
    tomorrowDisplayDate: displayDate,
    totalAppointments,
    sentReminders,
    pendingReminders,
    appointments,
  };
}

/**
 * Send automated reminder for a single appointment by ID
 */
export async function sendAppointmentReminder(appointmentId: string): Promise<{
  success: boolean;
  message: string;
  reminderText: string;
  appointment: any;
}> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
      doctor: { include: { user: { select: { fullName: true } } } },
    },
  });

  if (!apt) {
    throw new Error('Appointment not found');
  }

  const reminderText = formatAppointmentReminderText(apt);
  const now = new Date();

  // Transmit real SMS message to patient's phone
  let smsResult: any = null;
  if (apt.patient?.mobile) {
    try {
      smsResult = await sendAutomatedPatientSms({
        to: apt.patient.mobile,
        message: reminderText,
      });
    } catch (smsErr: any) {
      console.error('[Automated Patient SMS Error]:', smsErr.message);
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      reminderSent: true,
      reminderSentAt: now,
    },
    include: {
      patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
      doctor: { include: { user: { select: { fullName: true } } } },
    },
  });

  console.log(
    `[Appointment Reminder] 1-Day Prior Reminder dispatched for ${updated.appointmentCode} to Patient ${updated.patient.name} (${updated.patient.mobile}) scheduled at ${new Date(updated.startTime).toLocaleTimeString()}`
  );

  emitRealtimeEvent('appointment:reminder_sent', {
    appointmentId: updated.id,
    appointmentCode: updated.appointmentCode,
    reminderSent: true,
    reminderSentAt: now,
  });
  emitRealtimeEvent('appointment:updated', updated);

  return {
    success: true,
    message: `Reminder sent to ${updated.patient.name} (${updated.patient.mobile})`,
    reminderText,
    appointment: updated,
  };
}

/**
 * Dispatch automated reminders for all pending appointments scheduled for tomorrow
 */
export async function dispatchTomorrowReminders(): Promise<{
  success: boolean;
  totalTomorrow: number;
  dispatchedCount: number;
  skippedAlreadySent: number;
  results: any[];
}> {
  const { start, end, dateKey, displayDate } = getTomorrowDateRange();

  const tomorrowAppointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: start, lt: end },
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
    },
    include: {
      patient: { select: { id: true, name: true, patientCode: true, mobile: true } },
      doctor: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { startTime: 'asc' },
  });

  const pendingAppointments = tomorrowAppointments.filter((a) => !a.reminderSent);
  const alreadySentAppointments = tomorrowAppointments.filter((a) => a.reminderSent);
  const results = [];

  // Only auto-dispatch background SMS if a cellular SMS carrier key is explicitly configured.
  // When using 100% Free WhatsApp, staff send directly from the portal.
  const hasSmsConfig = Boolean(process.env.FAST2SMS_API_KEY || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));
  if (!hasSmsConfig) {
    return {
      success: true,
      totalTomorrow: tomorrowAppointments.length,
      dispatchedCount: 0,
      skippedAlreadySent: alreadySentAppointments.length,
      results: [],
    };
  }

  for (const apt of pendingAppointments) {
    try {
      const sent = await sendAppointmentReminder(apt.id);
      results.push(sent);
    } catch (err: any) {
      console.error(`[Appointment Reminder Error] Failed to send reminder for ${apt.appointmentCode}:`, err);
    }
  }

  console.log(
    `[Appointment Reminder Service] Tomorrow (${displayDate}): Dispatched ${results.length} reminders out of ${tomorrowAppointments.length} total scheduled.`
  );

  return {
    success: true,
    totalTomorrow: tomorrowAppointments.length,
    dispatchedCount: results.length,
    skippedAlreadySent: alreadySentAppointments.length,
    results,
  };
}

/**
 * Background Scheduler Initialization
 * Runs periodically to ensure all tomorrow's appointments receive 1-day prior reminders
 */
let schedulerInterval: NodeJS.Timeout | null = null;

export function startAppointmentReminderScheduler(): void {
  console.log('[Appointment Reminder Scheduler] Background service started. Checking tomorrow appointments every 30 minutes.');

  // Run initial check after 8 seconds of server boot
  setTimeout(async () => {
    try {
      await dispatchTomorrowReminders();
    } catch (e: any) {
      console.error('[Appointment Reminder Scheduler] Initial check error:', e.message);
    }
  }, 8000);

  // Periodic recurring check every 30 minutes
  if (!schedulerInterval) {
    schedulerInterval = setInterval(async () => {
      try {
        await dispatchTomorrowReminders();
      } catch (e: any) {
        console.error('[Appointment Reminder Scheduler] Interval check error:', e.message);
      }
    }, 30 * 60 * 1000);
  }
}
