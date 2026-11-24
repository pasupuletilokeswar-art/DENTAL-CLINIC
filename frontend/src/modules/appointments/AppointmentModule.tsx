import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ArrowRight,
  UserPlus,
  FileText,
  CreditCard,
  MessageSquare,
  RotateCcw,
  CalendarDays,
  Filter,
  Eye,
  Check,
  X,
  Sparkles,
  User,
  Phone,
  Activity,
  LayoutGrid,
  List,
  Receipt,
  Bell,
  BellRing,
  Send,
  Pill,
  Scissors,
} from 'lucide-react';
import api from '../../services/api';
import { Appointment, Doctor, Patient } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { isSlotPast } from '../../services/timeUtils';
import {
  sendWhatsAppMessage,
  createAppointmentReminderMessage,
  sendAppointmentReminderWhatsApp,
} from '../../services/whatsappService';

interface AppointmentModuleProps {
  onNavigateToNotes?: (patientId?: string) => void;
  onNavigateToBilling?: (appointmentOrPatient?: any) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToPharmacy?: (patientId?: string) => void;
  onNavigateToProcedures?: (patientId?: string) => void;
}

// Clean helper to format doctor name and avoid "Dr. Dr. ..."
export const formatDoctorName = (name?: string): string => {
  if (!name) return 'Clinic Specialist';
  const clean = name.trim();
  if (clean.toLowerCase().startsWith('dr.') || clean.toLowerCase().startsWith('dr ')) {
    return clean;
  }
  return `Dr. ${clean}`;
};

// Pure local calendar date formatter (prevents UTC timezone shift bug)
export const formatLocalDateKey = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const getLocalTodayStr = (): string => {
  const now = new Date();
  return formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate());
};

export const formatDisplayDate = (dateVal: string | Date | undefined): string => {
  if (!dateVal) return '';
  const str = typeof dateVal === 'string' ? dateVal.substring(0, 10) : dateVal.toISOString().substring(0, 10);
  if (!str.includes('-')) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Standard clinic time slots (30 min increments)
const CLINIC_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
];

// Clinical symptoms matching uploaded clinic questionnaire
export const CLINICAL_SYMPTOMS = [
  'Tooth pain',
  'Sensitivity',
  'Swelling',
  'Food lodgement',
  'Bleeding gums',
  'Difficulty chewing',
  'Broken tooth',
  'Jaw pain',
  'Other',
];

// Quick procedure templates
export const PROCEDURE_TEMPLATES = [
  'Root Canal Treatment (RCT)',
  'Scaling & Ultrasonic Cleaning',
  'Tooth Extraction / Wisdom Tooth',
  'Composite Tooth Filling',
  'Dental Crown & Bridge Fitting',
  'Braces Wire / Aligners Check',
  'Dental Implant Consultation',
  'Complete Denture Assessment',
  'Orthopedic Knee / Joint Evaluation',
  'Routine Clinical Checkup',
];

export const AppointmentModule: React.FC<AppointmentModuleProps> = ({
  onNavigateToNotes,
  onNavigateToBilling,
  onNavigateToPatient,
  onNavigateToPharmacy,
  onNavigateToProcedures,
}) => {
  // View mode: 'today' (live queue), 'calendar' (interactive month), 'upcoming' (future schedule)
  const [viewMode, setViewMode] = useState<'today' | 'calendar' | 'upcoming'>('today');

  const todayStr = useMemo(() => getLocalTodayStr(), []);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [doctorFilter, setDoctorFilter] = useState<string>('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'waiting' | 'completed'>('all');
  const [appointmentLayout, setAppointmentLayout] = useState<'cards' | 'table'>('cards');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [calendarSummary, setCalendarSummary] = useState<
    Record<string, { total: number; dental: number; ortho: number; completed: number }>
  >({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Automated 1-Day Prior Reminders State
  const [tomorrowReminders, setTomorrowReminders] = useState<{
    tomorrowDateKey: string;
    tomorrowDisplayDate: string;
    totalAppointments: number;
    pendingReminders: number;
    sentReminders: number;
    appointments: any[];
  } | null>(null);
  const [loadingTomorrowReminders, setLoadingTomorrowReminders] = useState(false);
  const [dispatchingTomorrowReminders, setDispatchingTomorrowReminders] = useState(false);
  const [showTomorrowDrawer, setShowTomorrowDrawer] = useState(false);

  // Only appointments that NEED a reminder (filter out already-notified patients and consultation-done/in-progress patients)
  const pendingTomorrowList = useMemo(() => {
    if (!tomorrowReminders?.appointments) return [];
    return tomorrowReminders.appointments.filter(
      (apt: any) => !apt.reminderSent && (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED')
    );
  }, [tomorrowReminders]);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activePatientAppointment, setActivePatientAppointment] = useState<any | null>(null);
  const [checkingActiveAppointment, setCheckingActiveAppointment] = useState(false);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);

  // Real-time booking alert banner (when appointment is booked anywhere: OP, Procedures, or Reception)
  const [realtimeAlert, setRealtimeAlert] = useState<{
    id: string;
    code: string;
    patientName: string;
    patientCode?: string;
    doctorName?: string;
    date: string;
    time: string;
    visitType: string;
    procedureName?: string;
  } | null>(null);

  const [bookingData, setBookingData] = useState({
    doctorId: '',
    specialization: 'DENTAL',
    appointmentDate: todayStr,
    timeSlot: '10:00',
    durationMinutes: 30,
    visitType: 'NEW_VISIT',
    procedureName: '',
    reasonForVisit: '',
  });

  // Toggle clinical symptom or procedure in procedureName string
  const toggleClinicalReason = (item: string) => {
    const current = bookingData.procedureName
      ? bookingData.procedureName
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    let updated: string[];
    if (current.some((s) => s.toLowerCase() === item.toLowerCase())) {
      updated = current.filter((s) => s.toLowerCase() !== item.toLowerCase());
    } else {
      updated = [...current, item];
    }
    setBookingData((prev) => ({ ...prev, procedureName: updated.join(', ') }));
  };
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingBusySlots, setLoadingBusySlots] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      const res = await api.get('/reports/doctors');
      if (res.data.success) {
        setDoctors(res.data.doctors);
        if (res.data.doctors.length > 0 && !bookingData.doctorId) {
          setBookingData((prev) => ({
            ...prev,
            doctorId: res.data.doctors[0].id,
            specialization: res.data.doctors[0].specialization,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  // Fetch appointments for current filter/view
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (viewMode === 'today' || viewMode === 'calendar') {
        params.date = selectedDate || todayStr;
      }
      // 'upcoming' does not send date, filters client/backend

      if (doctorFilter) params.doctorId = doctorFilter;
      if (specializationFilter) params.specialization = specializationFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/appointments', { params });
      if (res.data.success) {
        let list: Appointment[] = res.data.appointments;
        if (viewMode === 'upcoming') {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          // Strictly show only future/booked appointments (never show completed or cancelled in Upcoming tab)
          list = list.filter((a) => {
            const aptDate = new Date(a.appointmentDate);
            const isFuture = aptDate >= now;
            const isBooked = a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS';
            return isFuture && isBooked;
          });
        }
        setAppointments(list);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch month calendar summary
  const fetchCalendarSummary = async () => {
    try {
      setLoadingSummary(true);
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const params: any = { month: monthStr };
      if (doctorFilter) params.doctorId = doctorFilter;
      if (specializationFilter) params.specialization = specializationFilter;

      const res = await api.get('/appointments/calendar-summary', { params });
      if (res.data.success) {
        setCalendarSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load calendar summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch doctor's busy slots for the chosen date in booking modal
  const fetchBusySlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    try {
      setLoadingBusySlots(true);
      const res = await api.get('/appointments/busy-slots', {
        params: { doctorId, date },
      });
      if (res.data.success) {
        setBusySlots(res.data.busySlots);
      }
    } catch (err) {
      console.error('Failed to load busy slots:', err);
    } finally {
      setLoadingBusySlots(false);
    }
  };

  // Fetch tomorrow's appointments reminder summary
  const fetchTomorrowReminders = async () => {
    try {
      setLoadingTomorrowReminders(true);
      const res = await api.get('/appointments/reminders/tomorrow');
      if (res.data.success) {
        setTomorrowReminders({
          tomorrowDateKey: res.data.tomorrowDateKey,
          tomorrowDisplayDate: res.data.tomorrowDisplayDate,
          totalAppointments: res.data.totalAppointments,
          pendingReminders: res.data.pendingReminders,
          sentReminders: res.data.sentReminders,
          appointments: res.data.appointments,
        });
      }
    } catch (err) {
      console.error('Failed to load tomorrow reminders:', err);
    } finally {
      setLoadingTomorrowReminders(false);
    }
  };

  // Dispatch all pending reminders for tomorrow
  const handleDispatchAllTomorrowReminders = async () => {
    try {
      setDispatchingTomorrowReminders(true);
      const res = await api.post('/appointments/reminders/send-tomorrow');
      if (res.data.success) {
        alert(`Success: ${res.data.dispatchedCount} 1-day prior reminder(s) dispatched for tomorrow.`);
        fetchTomorrowReminders();
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sending tomorrow reminders');
    } finally {
      setDispatchingTomorrowReminders(false);
    }
  };

  // Dispatch reminder for a single appointment (backend sync + WhatsApp trigger)
  const handleSendSingleReminder = async (apt: Appointment) => {
    try {
      const res = await api.post(`/appointments/${apt.id}/send-reminder`);
      if (res.data.success) {
        sendAppointmentReminderWhatsApp(apt);
        fetchTomorrowReminders();
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sending appointment reminder');
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchTomorrowReminders();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [viewMode, selectedDate, doctorFilter, specializationFilter, statusFilter]);

  useEffect(() => {
    fetchCalendarSummary();
  }, [currentMonth, doctorFilter, specializationFilter]);

  useEffect(() => {
    if (showBookingModal && bookingData.doctorId && bookingData.appointmentDate) {
      fetchBusySlots(bookingData.doctorId, bookingData.appointmentDate);
    }
  }, [showBookingModal, bookingData.doctorId, bookingData.appointmentDate]);

  // Auto-adjust time slot to first future unbooked slot when date changes or opens
  useEffect(() => {
    if (showBookingModal) {
      const visible = CLINIC_TIME_SLOTS.filter((s) => !isSlotPast(s, bookingData.appointmentDate));
      if (!bookingData.timeSlot || isSlotPast(bookingData.timeSlot, bookingData.appointmentDate)) {
        const firstFree = visible.find((s) => !isSlotBooked(s)) || visible[0] || '';
        if (firstFree && firstFree !== bookingData.timeSlot) {
          setBookingData((prev) => ({ ...prev, timeSlot: firstFree }));
        }
      }
    }
  }, [bookingData.appointmentDate, showBookingModal, busySlots]);

  // Real-time socket event listener
  useEffect(() => {
    const socket = getSocket();
    const handleRefresh = () => {
      fetchAppointments();
      fetchCalendarSummary();
      if (showBookingModal && bookingData.doctorId && bookingData.appointmentDate) {
        fetchBusySlots(bookingData.doctorId, bookingData.appointmentDate);
      }
    };

    const handleCreated = (newApt: any) => {
      fetchAppointments();
      fetchCalendarSummary();
      if (showBookingModal && bookingData.doctorId && bookingData.appointmentDate) {
        fetchBusySlots(bookingData.doctorId, bookingData.appointmentDate);
      }
      if (newApt && newApt.appointmentCode) {
        const aptDateStr = newApt.appointmentDate
          ? new Date(newApt.appointmentDate).toISOString().substring(0, 10)
          : todayStr;
        const aptTimeStr = newApt.startTime
          ? new Date(newApt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        setRealtimeAlert({
          id: newApt.id || String(Date.now()),
          code: newApt.appointmentCode,
          patientName: newApt.patient?.name || 'Patient',
          patientCode: newApt.patient?.patientCode || '',
          doctorName: newApt.doctor?.user?.fullName || '',
          date: aptDateStr,
          time: aptTimeStr,
          visitType: newApt.visitType || 'NEW_VISIT',
          procedureName: newApt.procedureName || '',
        });
      }
    };

    socket.on('appointment:created', handleCreated);
    socket.on('appointment:updated', handleRefresh);
    socket.on('appointment:rescheduled', handleRefresh);
    socket.on('billing:consultation-created', handleRefresh);
    socket.on('billing:payment-received', handleRefresh);
    socket.on('appointment:reminder_sent', () => {
      fetchAppointments();
      fetchTomorrowReminders();
    });

    return () => {
      socket.off('appointment:created', handleCreated);
      socket.off('appointment:updated', handleRefresh);
      socket.off('appointment:rescheduled', handleRefresh);
      socket.off('billing:consultation-created', handleRefresh);
      socket.off('billing:payment-received', handleRefresh);
      socket.off('appointment:reminder_sent');
    };
  }, [viewMode, selectedDate, doctorFilter, specializationFilter, showBookingModal, bookingData]);

  // Handle patient selection and immediately check for active appointment
  const handleSelectPatient = async (p: Patient | null) => {
    setSelectedPatient(p);
    setActivePatientAppointment(null);
    setIsRescheduleMode(false);
    setRescheduleAppointmentId(null);
    setBookingError('');
    if (!p) return;

    try {
      setCheckingActiveAppointment(true);
      const res = await api.get(`/appointments/patient-active/${p.id}`);
      if (res.data.success && res.data.hasActiveAppointment) {
        setActivePatientAppointment(res.data.activeAppointment);
      }
    } catch (err) {
      console.error('Failed to check patient active appointment:', err);
    } finally {
      setCheckingActiveAppointment(false);
    }
  };

  // Check if a specific time slot is already booked for the selected doctor
  const isSlotBooked = (time: string) => {
    if (!busySlots || busySlots.length === 0) return false;
    const targetMinutes = parseInt(time.split(':')[0], 10) * 60 + parseInt(time.split(':')[1], 10);
    return busySlots.some((slot) => {
      const s = new Date(slot.startTime);
      const e = new Date(slot.endTime);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const endMin = e.getHours() * 60 + e.getMinutes();
      return targetMinutes >= startMin && targetMinutes < endMin;
    });
  };

  const getSlotOccupant = (time: string) => {
    if (!busySlots || busySlots.length === 0) return null;
    const targetMinutes = parseInt(time.split(':')[0], 10) * 60 + parseInt(time.split(':')[1], 10);
    return busySlots.find((slot) => {
      const s = new Date(slot.startTime);
      const e = new Date(slot.endTime);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const endMin = e.getHours() * 60 + e.getMinutes();
      return targetMinutes >= startMin && targetMinutes < endMin;
    });
  };

  // Open Follow-up booking for an existing patient
  const handleOpenFollowUpBooking = (apt: Appointment, daysAhead = 7) => {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + daysAhead);
    const dateStr = followUpDate.toISOString().substring(0, 10);

    setSelectedPatient(apt.patient as any);
    setBookingData({
      doctorId: apt.doctorId,
      specialization: apt.specialization,
      appointmentDate: dateStr,
      timeSlot: '11:00',
      durationMinutes: 30,
      visitType: 'FOLLOW_UP',
      procedureName: apt.procedureName ? `Follow-up: ${apt.procedureName}` : 'Routine Follow-Up',
      reasonForVisit: `Follow-up evaluation for ${apt.procedureName || apt.reasonForVisit || 'treatment'}`,
    });
    setBookingError('');
    setBookingSuccess('');
    setShowBookingModal(true);
  };

  // Submit appointment booking or reschedule
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setBookingError('Please search and select a patient first.');
      return;
    }

    if (isSlotBooked(bookingData.timeSlot)) {
      setBookingError(`Time slot ${bookingData.timeSlot} is already booked! Please select an available slot.`);
      return;
    }

    // Guard: Prevent duplicate booking ONLY if the selected time slot directly overlaps with the patient's existing active appointment
    if (activePatientAppointment && !isRescheduleMode) {
      const aptDateStr = activePatientAppointment.appointmentDate
        ? String(activePatientAppointment.appointmentDate).substring(0, 10)
        : '';
      if (aptDateStr === bookingData.appointmentDate) {
        const newStart = new Date(`${bookingData.appointmentDate}T${bookingData.timeSlot}:00`).getTime();
        const newEnd = newStart + (bookingData.durationMinutes || 30) * 60 * 1000;
        const existingStart = new Date(activePatientAppointment.startTime).getTime();
        const existingEnd = activePatientAppointment.endTime
          ? new Date(activePatientAppointment.endTime).getTime()
          : existingStart + (activePatientAppointment.durationMinutes || 30) * 60 * 1000;

        if (newStart < existingEnd && newEnd > existingStart) {
          setBookingError(`Patient already has an active appointment (${activePatientAppointment.appointmentCode}) scheduled at this overlapping time (${new Date(existingStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Please select a different time slot or click 'Reschedule'.`);
          return;
        }
      }
    }

    setBookingError('');
    setSubmitting(true);

    try {
      const startDateTime = new Date(`${bookingData.appointmentDate}T${bookingData.timeSlot}:00`);

      // 1. Reschedule existing appointment
      if (isRescheduleMode && rescheduleAppointmentId) {
        const payload = {
          appointmentDate: bookingData.appointmentDate,
          startTime: startDateTime.toISOString(),
          durationMinutes: parseInt(bookingData.durationMinutes.toString(), 10),
          reason: bookingData.reasonForVisit || 'Rescheduled via clinic portal',
        };

        const res = await api.patch(`/appointments/${rescheduleAppointmentId}/reschedule`, payload);
        if (res.data.success) {
          setBookingSuccess(`Appointment rescheduled successfully to ${bookingData.appointmentDate} at ${bookingData.timeSlot}!`);
          setTimeout(() => {
            setShowBookingModal(false);
            setSelectedPatient(null);
            setIsRescheduleMode(false);
            setRescheduleAppointmentId(null);
            setActivePatientAppointment(null);
            setBookingSuccess('');
            fetchAppointments();
            fetchCalendarSummary();
          }, 1200);
        }
        return;
      }

      // 2. Book new appointment
      const payload = {
        patientId: selectedPatient.id,
        doctorId: bookingData.doctorId,
        specialization: bookingData.specialization,
        appointmentDate: bookingData.appointmentDate,
        startTime: startDateTime.toISOString(),
        durationMinutes: parseInt(bookingData.durationMinutes.toString(), 10),
        visitType: bookingData.visitType,
        procedureName: bookingData.procedureName || undefined,
        reasonForVisit: bookingData.reasonForVisit || undefined,
      };

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        setSelectedDate(bookingData.appointmentDate);
        fetchAppointments();
        fetchCalendarSummary();
        fetchTomorrowReminders();
        setBookingSuccess(`Appointment ${res.data.appointment.appointmentCode} confirmed!`);
        setTimeout(() => {
          setShowBookingModal(false);
          setSelectedPatient(null);
          setIsRescheduleMode(false);
          setRescheduleAppointmentId(null);
          setActivePatientAppointment(null);
          setBookingSuccess('');
        }, 1200);
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'ACTIVE_APPOINTMENT_EXISTS') {
        setActivePatientAppointment(err.response.data.activeAppointment);
        setBookingError(err.response.data.message);
      } else {
        setBookingError(err.response?.data?.message || 'Error booking appointment slot. Please verify slot availability.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      fetchAppointments();
      fetchCalendarSummary();
      if (bookingData.doctorId && bookingData.appointmentDate) {
        fetchBusySlots(bookingData.doctorId, bookingData.appointmentDate);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  // Send 100% Free WhatsApp Reminder Directly to Patient
  const handleSendWhatsAppReminder = async (apt: Appointment) => {
    const tomorrowStr = tomorrowReminders?.tomorrowDateKey || '';
    const aptDateStr = typeof apt.appointmentDate === 'string'
      ? apt.appointmentDate.substring(0, 10)
      : new Date(apt.appointmentDate).toISOString().substring(0, 10);
    const isTomorrow = aptDateStr === tomorrowStr;

    const timeFormatted = `${new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const dateFormatted = new Date(apt.appointmentDate).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const msg = `*HospAI Dental & Orthopedic Clinic*
*${isTomorrow ? 'Patient Appointment Reminder: Scheduled for Tomorrow' : 'Appointment Confirmation'}*
----------------------------------------
Dear ${apt.patient?.name || 'Valued Patient'},

${isTomorrow 
  ? `This is a reminder for your scheduled dental consultation tomorrow (${dateFormatted}).` 
  : `Your appointment has been confirmed for ${dateFormatted}.`}

• Doctor: Dr. ${apt.doctor?.user?.fullName || 'Clinic Specialist'} (${apt.specialization})
• Date: ${dateFormatted}
• Time Slot: ${timeFormatted}
• Appointment Code: ${apt.appointmentCode}
${apt.procedureName ? `• Procedure / Reason: ${apt.procedureName}\n` : ''}----------------------------------------
Please arrive 10 minutes prior to your time slot for registration.
For inquiries, directions, or rescheduling, reply directly to this message or call +91 98765 43210.
We look forward to seeing you!`;

    sendWhatsAppMessage(apt.patient?.mobile || '', msg);

    // Sync status to database so the badge turns green immediately
    try {
      await api.post(`/appointments/${apt.id}/send-reminder`);
      fetchAppointments();
      fetchTomorrowReminders();
    } catch (e) {
      // background sync
    }
  };

  // Calendar Grid Generation (Local-date deterministic, zero UTC midnight offset bugs)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = formatLocalDateKey(prevYear, prevMonth, dayNum);
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        summary: calendarSummary[dateStr],
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = formatLocalDateKey(year, month, dayNum);
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        summary: calendarSummary[dateStr],
      });
    }

    // Remaining slots to fill 35 or 42 cells (7 columns)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = formatLocalDateKey(nextYear, nextMonth, i);
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        summary: calendarSummary[dateStr],
      });
    }

    return days;
  }, [currentMonth, calendarSummary, selectedDate, todayStr]);

  // Month totals across calendar summary
  const monthStats = useMemo(() => {
    let total = 0;
    let dental = 0;
    let ortho = 0;
    let completed = 0;
    Object.values(calendarSummary).forEach((item) => {
      total += item.total || 0;
      dental += item.dental || 0;
      ortho += item.ortho || 0;
      completed += item.completed || 0;
    });
    return { total, dental, ortho, completed };
  }, [calendarSummary]);

  // Today's / Selected Date's metrics (active queue vs completed)
  const todayCounts = useMemo(() => {
    const list = appointments;
    const scheduled = list.filter((a) => a.status === 'SCHEDULED').length;
    const inProgress = list.filter((a) => a.status === 'IN_PROGRESS').length;
    const completed = list.filter((a) => a.status === 'COMPLETED').length;
    return {
      total: list.length,
      scheduled,
      inProgress,
      completed,
      activeWaiting: scheduled + inProgress,
    };
  }, [appointments]);

  // Filtered Appointments list with search & queue filter
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (viewMode === 'today' || viewMode === 'calendar') {
      if (queueFilter === 'waiting') {
        list = list.filter((a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS');
      } else if (queueFilter === 'completed') {
        list = list.filter((a) => a.status === 'COMPLETED');
      }
    } else if (viewMode === 'upcoming') {
      // In upcoming visits tab, only show next/booked appointments, never completed ones
      list = list.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS');
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (a) =>
        a.patient.name.toLowerCase().includes(q) ||
        a.patient.patientCode.toLowerCase().includes(q) ||
        a.appointmentCode.toLowerCase().includes(q) ||
        a.doctor.user.fullName.toLowerCase().includes(q) ||
        (a.procedureName && a.procedureName.toLowerCase().includes(q))
    );
  }, [appointments, searchQuery, viewMode, queueFilter]);

  return (
    <div className="space-y-6 w-full pb-10 font-sans">
      {/* 1. TOP HEADER & VIEW MODE SELECTOR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Appointments & Scheduling Hub</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-sky-50 text-[#0090e7] border border-sky-200 rounded-full uppercase tracking-wider">
              Zero-Conflict Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time appointment queue with automated doctor conflict checks, clinical notes link, and billing integration.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 border border-slate-200 rounded-xl">
            <button
              onClick={() => {
                setViewMode('today');
                setSelectedDate(todayStr);
                setQueueFilter('all');
              }}
              className={`px-3 py-1.5 text-xs font-bold transition rounded-lg cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'today'
                  ? 'bg-[#0090e7] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{selectedDate === todayStr ? "Today's Queue" : `Queue (${formatDisplayDate(selectedDate)})`}</span>
              {viewMode === 'today' && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    todayCounts.activeWaiting > 0
                      ? 'bg-amber-100 text-amber-900'
                      : todayCounts.total > 0
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-white text-slate-700'
                  }`}
                >
                  {todayCounts.activeWaiting > 0
                    ? `${todayCounts.activeWaiting} Waiting`
                    : todayCounts.total > 0
                    ? `✓ 0 Waiting (${todayCounts.completed} Done)`
                    : '0'}
                </span>
              )}
            </button>

            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Reset view back to today"
              >
                <span>Jump to Today</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-bold transition rounded-lg cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-[#0090e7] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Interactive Calendar</span>
            </button>

            <button
              onClick={() => setViewMode('upcoming')}
              className={`px-3 py-1.5 text-xs font-bold transition rounded-lg cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'upcoming'
                  ? 'bg-[#0090e7] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Upcoming Visits</span>
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedPatient(null);
              setBookingData({
                doctorId: doctors[0]?.id || '',
                specialization: doctors[0]?.specialization || 'DENTAL',
                appointmentDate: selectedDate || todayStr,
                timeSlot: '10:00',
                durationMinutes: 30,
                visitType: 'NEW_VISIT',
                procedureName: '',
                reasonForVisit: '',
              });
              setBookingError('');
              setBookingSuccess('');
              setShowBookingModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0090e7] hover:bg-[#0077b6] text-white text-xs font-bold rounded-xl shadow-sm transition uppercase tracking-wider cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* REAL-TIME APPOINTMENT CREATED ALERT (e.g. from OP or Procedures) */}
      {realtimeAlert && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-400 rounded-2xl shadow-sm flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                  New Appointment Booked
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {realtimeAlert.code}
                </span>
                {realtimeAlert.visitType === 'PROCEDURE' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Procedure Slot
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                Patient <strong className="text-emerald-950 font-bold">{realtimeAlert.patientName}</strong> {realtimeAlert.patientCode ? `(${realtimeAlert.patientCode})` : ''} scheduled for{' '}
                <strong className="text-sky-900 font-bold">{realtimeAlert.date} at {realtimeAlert.time}</strong> with Dr. {realtimeAlert.doctorName || 'Doctor'}.
                {realtimeAlert.procedureName && <span className="text-slate-600 font-medium"> • Procedure: {realtimeAlert.procedureName}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(realtimeAlert.date);
                setViewMode('calendar');
                setRealtimeAlert(null);
              }}
              className="px-3.5 py-1.5 bg-[#0090e7] hover:bg-[#0077b6] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Date ({realtimeAlert.date})</span>
            </button>
            <button
              type="button"
              onClick={() => setRealtimeAlert(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1-DAY PRIOR PATIENT WHATSAPP REMINDERS BANNER (ONLY SHOWN WHEN AT LEAST 1 PATIENT NEEDS TO BE REMINDED) */}
      {pendingTomorrowList.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-indigo-500/30 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/30 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                    <span>1-Day Prior Patient WhatsApp Reminders</span>
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 animate-pulse">
                    {pendingTomorrowList.length} Need Reminder
                  </span>
                </div>
                <p className="text-xs text-sky-200/80 mt-0.5">
                  Showing only patients scheduled for tomorrow who still need a reminder ({pendingTomorrowList.length} pending). Once sent, they are automatically removed.
                  <br />
                  Tomorrow ({tomorrowReminders?.tomorrowDisplayDate || 'Upcoming'}):{' '}
                  <strong className="text-white font-bold">{tomorrowReminders?.totalAppointments || 0} Total Patients</strong> •{' '}
                  <span className="text-emerald-300 font-bold">{tomorrowReminders?.sentReminders || 0} Already Notified</span> •{' '}
                  <span className="text-amber-300 font-bold">{pendingTomorrowList.length} Need to Send</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <button
                onClick={() => setShowTomorrowDrawer(!showTomorrowDrawer)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-500/20"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {showTomorrowDrawer ? 'Hide List' : `Send Needed Reminders (${pendingTomorrowList.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Expandable Tomorrow Appointments Quick Drawer - ONLY SHOWS NEEDED REMINDERS */}
          {showTomorrowDrawer && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-200 mb-2.5">
                Patients Needing 1-Day Prior Reminder ({tomorrowReminders?.tomorrowDisplayDate})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {pendingTomorrowList.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="p-2.5 rounded-xl bg-white/10 border border-white/10 hover:border-emerald-400/50 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">{apt.patient?.name}</span>
                        <span className="text-[10px] font-mono text-sky-300">({apt.patient?.mobile})</span>
                      </div>
                      <div className="text-[11px] text-sky-200/80 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>
                          {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Dr. {apt.doctor?.user?.fullName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSendWhatsAppReminder(apt)}
                        className="px-2.5 py-1 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                        title={`Open WhatsApp reminder for patient ${apt.patient?.name} (${apt.patient?.mobile})`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TODAY'S QUICK METRICS (Clickable Filter Tiles) */}
      {viewMode === 'today' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setQueueFilter('all')}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
              queueFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${queueFilter === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
              Today's Total
            </span>
            <div className={`text-2xl font-black mt-1 ${queueFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>{todayCounts.total}</div>
            <div className={`text-[11px] mt-1 ${queueFilter === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>{new Date().toDateString()}</div>
          </div>

          <div
            onClick={() => setQueueFilter('waiting')}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
              queueFilter === 'waiting'
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/20'
                : 'bg-white border-slate-200 hover:border-sky-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
              Scheduled / Waiting
            </span>
            <div className="text-2xl font-black text-[#0090e7] mt-1">{todayCounts.scheduled}</div>
            <div className="text-[11px] text-sky-600 mt-1">Ready for consultation</div>
          </div>

          <div
            onClick={() => setQueueFilter('waiting')}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
              queueFilter === 'waiting' && todayCounts.inProgress > 0
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              In Chair / In-Progress
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{todayCounts.inProgress}</div>
            <div className="text-[11px] text-amber-600 mt-1">With Doctor</div>
          </div>

          <div
            onClick={() => setQueueFilter('completed')}
            className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs ${
              queueFilter === 'completed'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Completed Visits</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{todayCounts.completed}</div>
            <div className="text-[11px] text-emerald-600 mt-1">Consultation & bill done</div>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-gradient-to-b from-white via-white to-slate-50/60 p-6 border border-slate-200/90 rounded-3xl shadow-sm">
          {/* Calendar Month Navigation Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-5 mb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0090e7] via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-sky-500/25 shrink-0">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Schedule Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Click any day card to view queue or reserve patient appointment slot</p>
              </div>
            </div>

            {/* Quick Month Metrics & Nav Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Monthly stats pills */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
                  {monthStats.total} Bookings
                </span>
                {monthStats.completed > 0 && (
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{monthStats.completed} Completed</span>
                  </span>
                )}
              </div>

              {/* Jump to Today */}
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  setSelectedDate(todayStr);
                }}
                className="px-4 py-2 text-xs font-black bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-white" />
                <span>Jump to Today</span>
              </button>

              {/* Previous / Next Month Switcher */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                <button
                  onClick={() => {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
                  }}
                  className="p-2 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-black text-slate-800 font-mono">
                  {currentMonth.toLocaleDateString(undefined, { month: 'short' })}
                </span>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
                  }}
                  className="p-2 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Legend and Active Selected Indicator */}
          <div className="flex items-center justify-between pb-3.5 text-xs text-slate-500 font-medium border-b border-slate-100 mb-3.5">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0090e7]"></span> Dental Visits ({monthStats.dental})
              </span>
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Orthopedic Visits ({monthStats.ortho})
              </span>
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed (✓)
              </span>
            </div>
            <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              Selected Day: <strong className="text-slate-900 font-mono font-extrabold">{selectedDate || 'None'}</strong>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2.5 text-center mb-2.5">
            {[
              { label: 'Sun', weekend: true },
              { label: 'Mon', weekend: false },
              { label: 'Tue', weekend: false },
              { label: 'Wed', weekend: false },
              { label: 'Thu', weekend: false },
              { label: 'Fri', weekend: false },
              { label: 'Sat', weekend: true },
            ].map((d) => (
              <div
                key={d.label}
                className={`py-2.5 rounded-xl uppercase tracking-wider text-xs font-black border shadow-2xs ${
                  d.weekend
                    ? 'bg-rose-100/70 text-rose-700 border-rose-200'
                    : 'bg-slate-100/80 text-slate-700 border-slate-200'
                }`}
              >
                {d.label}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-2.5">
            {calendarDays.map((cell, idx) => {
              const hasAppointments = cell.summary && cell.summary.total > 0;
              const isCellSelected = cell.dateStr === selectedDate;
              const bookedCount = cell.summary?.total || 0;
              const availableCount = Math.max(0, 18 - bookedCount);
              const isFullyBooked = bookedCount >= 18;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  onDoubleClick={() => {
                    setSelectedDate(cell.dateStr);
                    setViewMode('today');
                  }}
                  className={`min-h-[135px] p-3 rounded-2xl border flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
                    !cell.isCurrentMonth
                      ? 'opacity-30 bg-slate-50/40 border-slate-100 hover:opacity-60'
                      : 'bg-white border-slate-200/90 hover:border-[#0090e7] hover:shadow-md hover:-translate-y-0.5'
                  } ${
                    cell.isToday
                      ? 'border-2 border-[#0090e7] bg-gradient-to-b from-sky-50 via-white to-sky-50/50 shadow-md ring-4 ring-sky-200/50'
                      : ''
                  } ${
                    isCellSelected && !cell.isToday
                      ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30 shadow-sm'
                      : ''
                  }`}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-8 h-8 text-xs font-black flex items-center justify-center rounded-xl transition ${
                        cell.isToday
                          ? 'bg-gradient-to-tr from-[#0090e7] via-blue-600 to-indigo-600 text-white shadow-md shadow-sky-500/30'
                          : isCellSelected
                          ? 'bg-[#0090e7] text-white font-extrabold shadow-sm'
                          : 'text-slate-800 group-hover:bg-slate-100'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    <div className="flex items-center gap-1">
                      {cell.isToday && (
                        <span className="text-[9px] font-black tracking-wider text-white bg-gradient-to-r from-sky-500 to-blue-600 px-2 py-0.5 rounded-md shadow-2xs">
                          TODAY
                        </span>
                      )}
                      {isFullyBooked && (
                        <span className="text-[9px] font-black uppercase text-white bg-rose-600 px-1.5 py-0.5 rounded-md shadow-2xs">
                          FULL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Appointment Load Indicator */}
                  <div className="mt-1 space-y-1">
                    {hasAppointments ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-black p-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50/70 text-sky-950 border border-sky-200/90 flex items-center justify-between shadow-2xs">
                          <span>{cell.summary.total} {cell.summary.total === 1 ? 'visit' : 'visits'}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                            isFullyBooked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isFullyBooked ? '0 Left' : `${availableCount} open`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold">
                          {cell.summary.dental > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white font-black shadow-2xs">
                              {cell.summary.dental} Dent
                            </span>
                          )}
                          {cell.summary.ortho > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white font-black shadow-2xs">
                              {cell.summary.ortho} Ortho
                            </span>
                          )}
                          {cell.summary.completed > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-black shadow-2xs">
                              ✓{cell.summary.completed}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium group-hover:text-slate-600 transition flex items-center justify-between">
                        <span>No bookings</span>
                        <span className="text-[10px] text-emerald-600 font-bold">18 open</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons on Hover */}
                  <div className="text-right pt-1 flex justify-end">
                    {hasAppointments ? (
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateStr);
                            setViewMode('today');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Open full visit queue for this date"
                        >
                          <Eye className="w-3 h-3 text-slate-600" />
                          <span>View ({bookedCount})</span>
                        </button>
                        {!isFullyBooked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.dateStr);
                              setSelectedPatient(null);
                              setBookingData({
                                doctorId: doctors[0]?.id || '',
                                specialization: doctors[0]?.specialization || 'DENTAL',
                                appointmentDate: cell.dateStr,
                                timeSlot: '10:00',
                                durationMinutes: 30,
                                visitType: 'NEW_VISIT',
                                procedureName: '',
                                reasonForVisit: '',
                              });
                              setBookingError('');
                              setShowBookingModal(true);
                            }}
                            className="px-2 py-1 bg-[#0090e7] hover:bg-[#0070c9] text-white text-[10px] font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                            title={`Book an appointment on this date (${availableCount} slots available)`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Slot</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          setSelectedPatient(null);
                          setBookingData({
                            doctorId: doctors[0]?.id || '',
                            specialization: doctors[0]?.specialization || 'DENTAL',
                            appointmentDate: cell.dateStr,
                            timeSlot: '10:00',
                            durationMinutes: 30,
                            visitType: 'NEW_VISIT',
                            procedureName: '',
                            reasonForVisit: '',
                          });
                          setBookingError('');
                          setShowBookingModal(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 bg-gradient-to-r from-[#0090e7] to-blue-600 hover:from-[#0070c9] hover:to-blue-700 text-white text-[10px] font-black rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Book an appointment slot on this date"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>Book Slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Active Date Selector (if in calendar or today mode) */}
          {viewMode !== 'upcoming' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Schedule Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Specialization</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
            >
              <option value="">All Specializations</option>
              <option value="DENTAL">Dental</option>
              <option value="ORTHOPEDIC">Orthopedic</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Doctor</label>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user.fullName} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, code, or symptoms..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
          />
        </div>
      </div>

      {/* 5. APPOINTMENT QUEUE & SCHEDULE LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>
                {viewMode === 'today'
                  ? (selectedDate === todayStr ? `Today's Appointments (${filteredAppointments.length})` : `Appointments for ${formatDisplayDate(selectedDate)} (${filteredAppointments.length})`)
                  : viewMode === 'calendar'
                  ? `Appointments for ${formatDisplayDate(selectedDate)} (${filteredAppointments.length} Booked • ${Math.max(0, 18 - filteredAppointments.length)} Open Slots)`
                  : `All Upcoming Scheduled Visits (${filteredAppointments.length})`}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Real-time queue synchronization active • Conflict check verified
            </span>
          </div>

          {/* Today's Queue Sub-filter Tabs */}
          {viewMode === 'today' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  queueFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({todayCounts.total})
              </button>
              <button
                onClick={() => setQueueFilter('waiting')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  queueFilter === 'waiting'
                    ? 'bg-[#0090e7] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Waiting Queue ({todayCounts.activeWaiting})</span>
              </button>
              <button
                onClick={() => setQueueFilter('completed')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  queueFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Completed ({todayCounts.completed})</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setAppointmentLayout('cards')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  appointmentLayout === 'cards'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Elevated Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setAppointmentLayout('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  appointmentLayout === 'table'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tabular View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedPatient(null);
                setBookingData({
                  doctorId: doctors[0]?.id || '',
                  specialization: doctors[0]?.specialization || 'DENTAL',
                  appointmentDate: selectedDate || todayStr,
                  timeSlot: '11:00',
                  durationMinutes: 30,
                  visitType: 'NEW_VISIT',
                  procedureName: '',
                  reasonForVisit: '',
                });
                setBookingError('');
                setShowBookingModal(true);
              }}
              className="px-3.5 py-1.5 bg-[#0090e7] hover:bg-[#0070c9] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Slot</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {viewMode === 'today' && queueFilter === 'waiting' && todayCounts.completed > 0 ? (
              <div className="space-y-2">
                <div className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All scheduled patients in today's waiting queue have been completed!</span>
                </div>
                <p className="text-slate-500 text-xs">
                  {todayCounts.completed} consultations finished today.
                </p>
                <button
                  onClick={() => setQueueFilter('all')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                >
                  View All {todayCounts.total} Appointments
                </button>
              </div>
            ) : (
              <div>
                No appointments found for the selected view and filters.
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      setBookingData({
                        doctorId: doctors[0]?.id || '',
                        specialization: doctors[0]?.specialization || 'DENTAL',
                        appointmentDate: selectedDate || todayStr,
                        timeSlot: '10:00',
                        durationMinutes: 30,
                        visitType: 'NEW_VISIT',
                        procedureName: '',
                        reasonForVisit: '',
                      });
                      setShowBookingModal(true);
                    }}
                    className="text-xs font-bold text-[#0090e7] hover:underline cursor-pointer"
                  >
                    + Book an appointment for this day
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : appointmentLayout === 'cards' ? (
          /* MODERN COMPACT APPOINTMENT CARDS (REDUCED HEIGHT, RICH FLOW) */
          <div className="p-3 md:p-4 bg-slate-50/60 space-y-2.5">
            {filteredAppointments.map((apt) => {
              const isBilled = !!apt.consultationBill;
              const isBillPaid = isBilled && (apt.consultationBill?.paymentStatus === 'PAID' || (apt.consultationBill?.pendingBalance || 0) <= 0);
              const isProcedureSlot = apt.visitType === 'PROCEDURE';

              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-xl border border-slate-200/90 hover:border-sky-300 shadow-2xs hover:shadow-md transition-all duration-150 p-3.5 flex flex-col gap-2 relative overflow-hidden ${
                    apt.status === 'COMPLETED'
                      ? 'border-l-[5px] border-l-emerald-500'
                      : apt.status === 'IN_PROGRESS'
                      ? 'border-l-[5px] border-l-amber-500'
                      : apt.status === 'CANCELLED'
                      ? 'border-l-[5px] border-l-rose-500'
                      : 'border-l-[5px] border-l-[#0090e7]'
                  }`}
                >
                  {/* Row 1: Clinical Info Strip (Time, Code, Patient, Doctor, Symptoms, Billing Status, Status Badge) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left block: Time, Code, Patient */}
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      {/* Time slot */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-lg shadow-2xs text-xs font-black shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[#00d2ff]" />
                        <span>
                          {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Code */}
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {apt.appointmentCode}
                      </span>

                      {viewMode === 'upcoming' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 shrink-0">
                          <CalendarIcon className="w-3 h-3 text-teal-600" />
                          <span>{new Date(apt.appointmentDate).toDateString()}</span>
                        </span>
                      )}

                      {/* Patient Avatar + Name + DOC Code + Demographics */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                          {apt.patient?.name ? apt.patient.name.substring(0, 2) : 'PT'}
                        </div>
                        <span className="font-black text-sm text-slate-900 truncate">
                          {apt.patient?.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                          {apt.patient?.patientCode}
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                          {apt.patient?.mobile}
                        </span>
                        <span className="text-xs text-slate-400 hidden md:inline capitalize">
                          ({apt.patient?.gender?.toLowerCase()}, {apt.patient?.age}y)
                        </span>
                      </div>

                      {/* Doctor info */}
                      <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-800 pl-2 border-l border-slate-200">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0090e7]" />
                        <span>{formatDoctorName(apt.doctor?.user?.fullName)}</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded uppercase ${
                            apt.specialization === 'DENTAL'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {apt.specialization}
                        </span>
                      </div>

                      {/* Visit Type Badge & Procedure / Symptoms */}
                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        {apt.visitType === 'PROCEDURE' ? (
                          <span className="text-[10px] font-black text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Procedure Slot
                          </span>
                        ) : apt.visitType === 'FOLLOW_UP' ? (
                          <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Follow-Up
                          </span>
                        ) : null}

                        {apt.procedureName && (
                          <div className="hidden xl:flex items-center gap-1">
                            {apt.procedureName.split(',').slice(0, 2).map((symptom, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  apt.visitType === 'PROCEDURE'
                                    ? 'text-purple-950 bg-purple-50 border border-purple-200'
                                    : 'text-sky-900 bg-sky-50 border border-sky-200'
                                }`}
                              >
                                {symptom.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right block: Billing Done badge + Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* If Consultation Completed and Billing Done (Only for non-procedure visits) */}
                      {apt.status === 'COMPLETED' && !isProcedureSlot && (
                        isBillPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ Billing Done</span>
                          </span>
                        ) : isBilled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Bill Pending (₹{apt.consultationBill?.pendingBalance})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                            <span>Unbilled</span>
                          </span>
                        )
                      )}

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-2xs ${
                          apt.status === 'COMPLETED'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-500 text-white'
                            : apt.status === 'IN_PROGRESS'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white animate-pulse'
                            : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white'
                        }`}
                      >
                        {apt.status === 'COMPLETED' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isProcedureSlot ? 'Procedure Done' : 'Consultation Done'}</span>
                          </>
                        ) : apt.status === 'IN_PROGRESS' ? (
                          <>
                            <Activity className="w-3.5 h-3.5" />
                            <span>In Chair</span>
                          </>
                        ) : apt.status === 'CANCELLED' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancelled</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Scheduled</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Compact Action Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    {/* Left: WhatsApp + Billing invoice snippet if available */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Reminders are strictly for upcoming visits (SCHEDULED or CONFIRMED), NEVER for in-chair, completed, or cancelled visits */}
                      {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                        apt.reminderSent ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Reminder Sent</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendWhatsAppReminder(apt)}
                            title={`Send 1-day prior WhatsApp reminder to patient ${apt.patient?.name} (${apt.patient?.mobile})`}
                            className="px-2.5 py-1 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Send WhatsApp Reminder</span>
                          </button>
                        )
                      )}

                      {apt.consultationBill && (
                        <span className="text-[11px] font-mono text-slate-500 font-medium">
                          Inv: #{apt.consultationBill.invoiceNumber} • ₹{apt.consultationBill.totalAmount}
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                        {apt.visitType}
                      </span>

                      {apt.patient?.medicalAlerts && apt.patient.medicalAlerts !== 'None' && (
                        <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>{apt.patient.medicalAlerts}</span>
                        </span>
                      )}
                    </div>

                    {/* Right: Compact Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* SCHEDULED */}
                      {apt.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPatient(apt.patient as any);
                              setIsRescheduleMode(true);
                              setRescheduleAppointmentId(apt.id);
                              setActivePatientAppointment(apt);
                              const dateFormatted = apt.appointmentDate ? String(apt.appointmentDate).substring(0, 10) : todayStr;
                              const timeFormatted = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                              setBookingData({
                                doctorId: apt.doctorId,
                                specialization: apt.specialization,
                                appointmentDate: dateFormatted,
                                timeSlot: timeFormatted.length === 5 ? timeFormatted : '10:00',
                                durationMinutes: apt.durationMinutes || 30,
                                visitType: apt.visitType || 'FOLLOW_UP',
                                procedureName: apt.procedureName || '',
                                reasonForVisit: apt.reasonForVisit || '',
                              });
                              setBookingError('');
                              setBookingSuccess('');
                              setShowBookingModal(true);
                            }}
                            title="Reschedule to another date or slot"
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Reschedule</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="Mark patient as In-Chair with doctor"
                          >
                            <span>Start</span>
                          </button>

                          {onNavigateToNotes && (
                            <button
                              onClick={() => {
                                handleStatusChange(apt.id, 'IN_PROGRESS');
                                onNavigateToNotes(apt.patientId);
                              }}
                              title="Open doctor clinical notes & prescription"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Notes</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              await handleStatusChange(apt.id, 'COMPLETED');
                              if (!isProcedureSlot && onNavigateToBilling) {
                                onNavigateToBilling(apt);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            title={isProcedureSlot ? "Complete procedure" : "Complete visit and immediately open billing"}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{isProcedureSlot ? 'Done' : 'Done & Bill'}</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition cursor-pointer"
                            title="Cancel Appointment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* IN_PROGRESS */}
                      {apt.status === 'IN_PROGRESS' && (
                        <>
                          {onNavigateToNotes && (
                            <button
                              onClick={() => onNavigateToNotes(apt.patientId)}
                              title="Open doctor clinical notes & prescription"
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Notes</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              await handleStatusChange(apt.id, 'COMPLETED');
                              if (!isProcedureSlot && onNavigateToBilling) {
                                onNavigateToBilling(apt);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            title={isProcedureSlot ? "Complete procedure" : "Complete visit and immediately open billing"}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{isProcedureSlot ? 'Done' : 'Done & Bill'}</span>
                          </button>
                        </>
                      )}

                      {/* COMPLETED: After Visit */}
                      {apt.status === 'COMPLETED' && (
                        <>
                          {/* If not billed yet, show Bill / Collect for normal consultations only. Procedure slots are not billed through consultation bills! */}
                          {onNavigateToBilling && !isBillPaid && !isProcedureSlot && (
                            <button
                              onClick={() => onNavigateToBilling(apt)}
                              title="Collect Consultation Fee"
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-white" />
                              <span>Bill / Collect</span>
                            </button>
                          )}

                          {/* When Billed & Paid: Never show "Bill / Collect" anymore! Show verified indicator */}
                          {isBillPaid && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ Billed</span>
                            </span>
                          )}

                          {/* Post-Consultation Step 1: Doctor wrote medicines -> Sell / Dispense Meds */}
                          {onNavigateToPharmacy && (
                            <button
                              onClick={() => onNavigateToPharmacy(apt.patientId)}
                              title="Patient has prescription? Dispense / Sell Medicines"
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Pill className="w-3 h-3 text-amber-600" />
                              <span>Meds / Pharmacy</span>
                            </button>
                          )}

                          {/* Post-Consultation Step 2: Doctor wrote findings/problem -> Save in Clinical Notes & 3D Chart */}
                          {onNavigateToNotes && (
                            <button
                              onClick={() => onNavigateToNotes(apt.patientId)}
                              title="Doctor wrote diagnosis/findings? Enter in Clinical Notes & 3D Chart"
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Clinical Notes</span>
                            </button>
                          )}

                          {/* Post-Consultation Step 3: Procedure needed today or planned -> Enter Procedure details */}
                          {onNavigateToProcedures && (
                            <button
                              onClick={() => onNavigateToProcedures(apt.patientId)}
                              title="Procedure needed today or planned? Record Procedure Details"
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Scissors className="w-3 h-3 text-rose-600" />
                              <span>Procedure</span>
                            </button>
                          )}

                          {/* Post-Consultation Step 4: Doctor asks to come another date -> Book Follow-Up */}
                          <button
                            onClick={() => handleOpenFollowUpBooking(apt, 7)}
                            title="Schedule patient's follow-up visit"
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0090e7] border border-sky-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Follow-Up</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABULAR VIEW FALLBACK */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-5">Time Slot & Code</th>
                  <th className="p-3.5">Patient</th>
                  <th className="p-3.5">Doctor & Department</th>
                  <th className="p-3.5">Symptoms / Visit Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => {
                  const isBilled = !!apt.consultationBill;
                  const isBillPaid = isBilled && (apt.consultationBill?.paymentStatus === 'PAID' || (apt.consultationBill?.pendingBalance || 0) <= 0);
                  const isProcedureSlot = apt.visitType === 'PROCEDURE';

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                      {/* Time Slot & Code */}
                      <td className="p-3.5 pl-5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-[#0090e7]" />
                          <span>
                            {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{apt.appointmentCode}</div>
                        {viewMode === 'upcoming' && (
                          <div className="text-[10px] text-teal-700 font-bold mt-0.5">
                            {new Date(apt.appointmentDate).toDateString()}
                          </div>
                        )}
                      </td>

                      {/* Patient */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{apt.patient?.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-mono border border-slate-200">
                            {apt.patient?.patientCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {apt.patient?.mobile} • {apt.patient?.gender}, {apt.patient?.age} yrs
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{formatDoctorName(apt.doctor?.user?.fullName)}</div>
                        <div className="text-[10px] text-[#0090e7] font-bold uppercase tracking-wider">
                          {apt.specialization}
                        </div>
                      </td>

                    {/* Symptoms / Visit Reason */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-[11px] block ${
                          apt.visitType === 'PROCEDURE' ? 'text-purple-700' : apt.visitType === 'FOLLOW_UP' ? 'text-amber-700' : 'text-slate-800'
                        }`}>
                          {apt.visitType}
                        </span>
                        {apt.visitType === 'PROCEDURE' && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            Procedure Slot
                          </span>
                        )}
                      </div>
                      {apt.procedureName && (
                        <div className={`text-[11px] font-medium px-2 py-0.5 rounded border inline-block mt-0.5 ${
                          apt.visitType === 'PROCEDURE'
                            ? 'text-purple-900 bg-purple-50 border-purple-200'
                            : 'text-sky-800 bg-sky-50 border-sky-100'
                        }`}>
                          {apt.procedureName}
                        </div>
                      )}
                      {apt.reasonForVisit && (
                        <div className="text-[10px] text-slate-400 italic truncate max-w-xs mt-0.5">{apt.reasonForVisit}</div>
                      )}
                    </td>

                    {/* Status Chip */}
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-300'
                            : apt.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                            : 'bg-sky-50 text-[#0090e7] border border-sky-300'
                        }`}
                      >
                        {apt.status === 'COMPLETED' ? (isProcedureSlot ? '✓ Procedure Done' : '✓ Completed') : apt.status}
                      </span>
                    </td>

                    {/* Clinical Actions */}
                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Only show appointment reminder actions for upcoming SCHEDULED or CONFIRMED visits */}
                        {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleSendWhatsAppReminder(apt)}
                            title="Send WhatsApp confirmation / reminder to patient"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                          apt.reminderSent && (
                            <span
                              title={`1-Day prior appointment reminder has already been sent to patient ${apt.patient?.name} (${apt.patient?.mobile})`}
                              className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </span>
                          )
                        )}

                        {apt.status === 'SCHEDULED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Start Consultation"
                            >
                              Start
                            </button>

                            <button
                              onClick={async () => {
                                await handleStatusChange(apt.id, 'COMPLETED');
                                if (!isProcedureSlot && onNavigateToBilling) {
                                  onNavigateToBilling(apt);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title={isProcedureSlot ? "Complete procedure" : "Mark Completed and Open Billing"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{isProcedureSlot ? 'Done' : 'Done & Bill'}</span>
                            </button>

                            {onNavigateToNotes && (
                              <button
                                onClick={() => {
                                  handleStatusChange(apt.id, 'IN_PROGRESS');
                                  onNavigateToNotes(apt.patientId);
                                }}
                                title="Open doctor clinical notes & prescription"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Notes</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedPatient(apt.patient as any);
                                setIsRescheduleMode(true);
                                setRescheduleAppointmentId(apt.id);
                                setActivePatientAppointment(apt);
                                const dateFormatted = apt.appointmentDate ? String(apt.appointmentDate).substring(0, 10) : todayStr;
                                const timeFormatted = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                setBookingData({
                                  doctorId: apt.doctorId,
                                  specialization: apt.specialization,
                                  appointmentDate: dateFormatted,
                                  timeSlot: timeFormatted.length === 5 ? timeFormatted : '10:00',
                                  durationMinutes: apt.durationMinutes || 30,
                                  visitType: apt.visitType || 'FOLLOW_UP',
                                  procedureName: apt.procedureName || '',
                                  reasonForVisit: apt.reasonForVisit || '',
                                });
                                setBookingError('');
                                setBookingSuccess('');
                                setShowBookingModal(true);
                              }}
                              title="Reschedule Appointment to Another Date/Slot"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            <button
                              onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition cursor-pointer"
                              title="Cancel Appointment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {apt.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              onClick={async () => {
                                await handleStatusChange(apt.id, 'COMPLETED');
                                if (!isProcedureSlot && onNavigateToBilling) {
                                  onNavigateToBilling(apt);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title={isProcedureSlot ? "Complete procedure" : "Mark Completed and Open Billing"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{isProcedureSlot ? 'Done' : 'Done & Bill'}</span>
                            </button>

                            {onNavigateToNotes && (
                              <button
                                onClick={() => onNavigateToNotes(apt.patientId)}
                                title="Open doctor clinical notes & prescription"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Notes</span>
                              </button>
                            )}
                          </>
                        )}

                        {apt.status === 'COMPLETED' && (
                          <>
                            {onNavigateToBilling && !isBillPaid && !isProcedureSlot && (
                              <button
                                onClick={() => onNavigateToBilling(apt)}
                                title="Collect Consultation Fee"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-white" />
                                <span>Bill / Collect</span>
                              </button>
                            )}

                            {isBillPaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-black">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>✓ Billed</span>
                              </span>
                            )}

                            {onNavigateToPharmacy && (
                              <button
                                onClick={() => onNavigateToPharmacy(apt.patientId)}
                                title="Dispense / Sell Medicines"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Pill className="w-3 h-3 text-amber-600" />
                                <span>Meds</span>
                              </button>
                            )}

                            {onNavigateToNotes && (
                              <button
                                onClick={() => onNavigateToNotes(apt.patientId)}
                                title="View Doctor Clinical Notes"
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>Notes</span>
                              </button>
                            )}

                            {onNavigateToProcedures && (
                              <button
                                onClick={() => onNavigateToProcedures(apt.patientId)}
                                title="Record Performed Procedure"
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Scissors className="w-3 h-3 text-rose-600" />
                                <span>Procedure</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenFollowUpBooking(apt, 7)}
                              title="Schedule patient's follow-up visit"
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#0090e7] border border-sky-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Follow-Up</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. BOOK / RESCHEDULE APPOINTMENT MODAL */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${isRescheduleMode ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-[#0090e7]'}`}>
                  {isRescheduleMode ? <RotateCcw className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span>
                      {isRescheduleMode
                        ? 'Reschedule Appointment'
                        : bookingData.visitType === 'FOLLOW_UP'
                        ? 'Book Follow-Up Appointment'
                        : 'Book New Appointment'}
                    </span>
                    {isRescheduleMode && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                        Reschedule Mode
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRescheduleMode
                      ? 'Change appointment date and time slot without creating duplicate records'
                      : 'Schedule patient visit with automated doctor conflict & duplicate check'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setIsRescheduleMode(false);
                  setRescheduleAppointmentId(null);
                  setActivePatientAppointment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Appointment Warning Banner & Reschedule Prompt */}
            {activePatientAppointment && !isRescheduleMode && (
              <div className="mt-4 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-none text-xs text-amber-900 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Patient Already Has an Active Appointment!</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black uppercase font-mono">
                    {activePatientAppointment.appointmentCode}
                  </span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  <strong>{activePatientAppointment.patient?.name || selectedPatient?.name}</strong> has a scheduled visit on{' '}
                  <strong className="text-slate-900">{formatDisplayDate(activePatientAppointment.appointmentDate)}</strong> at{' '}
                  <strong className="text-slate-900">
                    {new Date(activePatientAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>{' '}
                  with <strong>Dr. {activePatientAppointment.doctor?.user?.fullName}</strong> ({activePatientAppointment.specialization}).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRescheduleMode(true);
                      setRescheduleAppointmentId(activePatientAppointment.id);
                      const aptDateStr = activePatientAppointment.appointmentDate
                        ? String(activePatientAppointment.appointmentDate).substring(0, 10)
                        : todayStr;
                      const timeStr = new Date(activePatientAppointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                      setBookingData({
                        ...bookingData,
                        doctorId: activePatientAppointment.doctorId,
                        specialization: activePatientAppointment.specialization,
                        appointmentDate: aptDateStr,
                        timeSlot: timeStr.length === 5 ? timeStr : '10:00',
                        procedureName: activePatientAppointment.procedureName || '',
                        reasonForVisit: activePatientAppointment.reasonForVisit || '',
                      });
                      setBookingError('');
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reschedule Existing Appointment</span>
                  </button>
                  <span className="text-[11px] text-amber-800 font-medium">
                    • or select another slot below to book an additional appointment on this day
                  </span>
                </div>
              </div>
            )}

            {/* Reschedule Active Banner */}
            {isRescheduleMode && (
              <div className="mt-4 p-3 bg-sky-50 border-l-4 border-[#0090e7] rounded-none text-xs text-sky-900 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <RotateCcw className="w-4 h-4 text-[#0090e7]" />
                  <span>
                    Rescheduling: {activePatientAppointment?.appointmentCode || 'Existing Visit'} • Pick new Date & Time slot below
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRescheduleMode(false);
                    setRescheduleAppointmentId(null);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Switch to New Booking
                </button>
              </div>
            )}

            {/* Success Message */}
            {bookingSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{bookingSuccess}</span>
              </div>
            )}

            {/* Error Alert */}
            {bookingError && (
              <div className="mt-4 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="mt-4 space-y-4">
              {/* Patient Search & Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Select Patient *</span>
                  {checkingActiveAppointment && (
                    <span className="text-[10px] text-sky-600 font-normal">Checking active appointments...</span>
                  )}
                </label>
                <PatientSearchSelect
                  selectedPatient={selectedPatient}
                  onSelect={handleSelectPatient}
                  placeholder="Search registered patient by Name, Mobile, or DOC Code..."
                  required
                />
              </div>

              {/* Specialization & Doctor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Specialization *
                  </label>
                  <select
                    value={bookingData.specialization}
                    onChange={(e) => {
                      const spec = e.target.value;
                      const matchingDoctor = doctors.find((d) => d.specialization === spec);
                      setBookingData({
                        ...bookingData,
                        specialization: spec,
                        doctorId: matchingDoctor ? matchingDoctor.id : bookingData.doctorId,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    <option value="DENTAL">Dental</option>
                    <option value="ORTHOPEDIC">Orthopedic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Doctor *
                  </label>
                  <select
                    required
                    value={bookingData.doctorId}
                    onChange={(e) => {
                      const docId = e.target.value;
                      const doc = doctors.find((d) => d.id === docId);
                      setBookingData({
                        ...bookingData,
                        doctorId: docId,
                        specialization: doc ? doc.specialization : bookingData.specialization,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    {doctors
                      .filter((d) => d.specialization === bookingData.specialization)
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.user.fullName} (Fee: ₹{doc.consultationFee})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date & Follow-Up Quick Jump Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Appointment Date *
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">Quick Jump:</span>
                    <button
                      type="button"
                      onClick={() => setBookingData({ ...bookingData, appointmentDate: todayStr })}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-none border transition cursor-pointer ${
                        bookingData.appointmentDate === todayStr
                          ? 'bg-[#0090e7] text-white border-[#0090e7]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        now.setDate(now.getDate() + 3);
                        const dStr = formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate());
                        setBookingData({ ...bookingData, appointmentDate: dStr });
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-none border border-slate-200 cursor-pointer"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        now.setDate(now.getDate() + 7);
                        const dStr = formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate());
                        setBookingData({ ...bookingData, appointmentDate: dStr });
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-none border border-slate-200 cursor-pointer"
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        now.setDate(now.getDate() + 14);
                        const dStr = formatLocalDateKey(now.getFullYear(), now.getMonth(), now.getDate());
                        setBookingData({ ...bookingData, appointmentDate: dStr });
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-none border border-slate-200 cursor-pointer"
                    >
                      +2 Weeks
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={bookingData.appointmentDate}
                  onChange={(e) => setBookingData({ ...bookingData, appointmentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                />
              </div>

              {/* REAL-TIME TIME-SLOT MATRIX (Zero Double-Booking & No Past Slots) */}
              {(() => {
                const visibleClinicSlots = CLINIC_TIME_SLOTS.filter(
                  (s) => !isSlotPast(s, bookingData.appointmentDate)
                );
                return (
                  <div className="border border-slate-200 p-3.5 bg-slate-50/70">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0090e7]" />
                        <span>Select Time Slot</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          {visibleClinicSlots.filter((s) => !isSlotBooked(s)).length} Available
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          {visibleClinicSlots.filter((s) => isSlotBooked(s)).length} Booked
                        </span>
                        {loadingBusySlots && <span className="text-[10px] text-slate-400 ml-1">Checking...</span>}
                      </div>
                    </div>

                    {visibleClinicSlots.length === 0 ? (
                      <div className="p-3 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 font-semibold">
                        All clinic time slots for today have already concluded. Please select tomorrow or an upcoming date above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {visibleClinicSlots.map((slot) => {
                          const booked = isSlotBooked(slot);
                          const occupant = getSlotOccupant(slot);
                          const isSelected = bookingData.timeSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={booked}
                              onClick={() => setBookingData({ ...bookingData, timeSlot: slot })}
                              className={`py-2 px-1 text-center text-xs font-bold rounded-none transition border cursor-pointer relative ${
                                booked
                                  ? 'bg-rose-50 text-rose-500 border-rose-200 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#0090e7] text-white border-[#0090e7] shadow-xs'
                                  : 'bg-white text-slate-800 border-slate-200 hover:border-[#0090e7] hover:bg-sky-50/40'
                              }`}
                              title={booked ? `Already booked with ${occupant?.patient?.name}` : 'Click to select slot'}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${booked ? 'bg-rose-500' : isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                <span>{slot}</span>
                              </div>
                              <div className="text-[9px] font-normal uppercase mt-0.5">
                                {booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Visit Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Visit Type
                </label>
                <select
                  value={bookingData.visitType}
                  onChange={(e) => setBookingData({ ...bookingData, visitType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7]"
                >
                  <option value="NEW_VISIT">New Visit (Initial Consultation)</option>
                  <option value="FOLLOW_UP">Follow Up (Repeat / Check-up)</option>
                  <option value="EMERGENCY">Emergency (Acute Pain / Trauma)</option>
                  <option value="ROUTINE_CHECKUP">Routine Clinical Checkup</option>
                  <option value="PROCEDURE">Procedure / Treatment Slot</option>
                </select>
              </div>

              {/* Chief Complaints / Symptoms (Typing + Checkboxes, procedure field removed) */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                      Chief Complaints / Symptoms <span className="text-slate-400 font-normal lowercase">(type or click checkboxes below)</span>
                    </label>
                    {bookingData.procedureName && (
                      <button
                        type="button"
                        onClick={() => setBookingData((prev) => ({ ...prev, procedureName: '' }))}
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={bookingData.procedureName}
                    onChange={(e) => setBookingData({ ...bookingData, procedureName: e.target.value })}
                    placeholder="Type symptoms (e.g. Sharp pain in lower molar, swelling...) or select below"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0090e7]/30 focus:border-[#0090e7] shadow-2xs"
                  />
                </div>

                {/* 2-Column Symptom Checkboxes matching clinic questionnaire */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Common Dental Complaints Checklist:
                    </span>
                    <span className="text-[10px] text-slate-400">Select all that apply</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CLINICAL_SYMPTOMS.map((symptom) => {
                      const isChecked = (bookingData.procedureName || '')
                        .toLowerCase()
                        .includes(symptom.toLowerCase());

                      return (
                        <label
                          key={symptom}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-sky-50/80 border-[#0090e7] text-slate-900 shadow-2xs ring-1 ring-[#0090e7]/30'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleClinicalReason(symptom)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                              isChecked
                                ? 'bg-[#0090e7] border-[#0090e7] text-white shadow-2xs'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span className={isChecked ? 'text-slate-900 font-bold' : 'text-slate-700'}>
                            {symptom}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Automated Patient Reminder Information */}
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-sky-950">
                <BellRing className="w-5 h-5 text-sky-600 shrink-0 animate-pulse" />
                <div>
                  <span className="font-extrabold text-sky-900 block text-[11px] uppercase tracking-wider">
                    Automated Patient Reminder Active
                  </span>
                  <span className="text-slate-600 text-xs mt-0.5 block">
                    The system will automatically send an appointment reminder message to patient{' '}
                    <strong className="text-slate-900">{selectedPatient?.name || 'the patient'}</strong> at mobile{' '}
                    <strong className="font-mono text-slate-900">{selectedPatient?.mobile || 'their phone'}</strong> 1 day before their scheduled visit time ({bookingData.timeSlot}).
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setIsRescheduleMode(false);
                    setRescheduleAppointmentId(null);
                    setActivePatientAppointment(null);
                  }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${
                    isRescheduleMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0090e7] hover:bg-[#0077b6]'
                  }`}
                >
                  {submitting
                    ? 'Processing...'
                    : isRescheduleMode
                    ? 'Confirm Reschedule'
                    : 'Confirm & Reserve Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
