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
} from 'lucide-react';
import api from '../../services/api';
import { Appointment, Doctor, Patient } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { sendWhatsAppMessage } from '../../services/whatsappService';

interface AppointmentModuleProps {
  onNavigateToNotes?: (patientId?: string) => void;
  onNavigateToBilling?: (appointmentOrPatient?: any) => void;
  onNavigateToPatient?: (patientId: string) => void;
}

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

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activePatientAppointment, setActivePatientAppointment] = useState<any | null>(null);
  const [checkingActiveAppointment, setCheckingActiveAppointment] = useState(false);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);

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

      if (viewMode === 'today') {
        params.date = todayStr;
      } else if (viewMode === 'calendar') {
        params.date = selectedDate;
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

  useEffect(() => {
    fetchDoctors();
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

    socket.on('appointment:created', handleRefresh);
    socket.on('appointment:updated', handleRefresh);
    socket.on('appointment:rescheduled', handleRefresh);

    return () => {
      socket.off('appointment:created', handleRefresh);
      socket.off('appointment:updated', handleRefresh);
      socket.off('appointment:rescheduled', handleRefresh);
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

    // Guard: Prevent duplicate booking if active appointment exists and not in reschedule mode
    if (activePatientAppointment && !isRescheduleMode) {
      setBookingError(`Patient already has an active appointment (${activePatientAppointment.appointmentCode}). Please click 'Reschedule' to change the date/time instead of creating a duplicate.`);
      return;
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
        setBookingSuccess(`Appointment ${res.data.appointment.appointmentCode} confirmed!`);
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (apt: Appointment) => {
    const timeFormatted = `${new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const msg = `*HospAI Dental & Orthopedic Clinic*
*Appointment Confirmation*
----------------------------------------
Appointment Code: ${apt.appointmentCode}
Patient: ${apt.patient.name} (${apt.patient.patientCode})
Doctor: Dr. ${apt.doctor.user.fullName} (${apt.specialization})
Date: ${new Date(apt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
Time: ${timeFormatted}
Visit Type: ${apt.visitType}
${apt.procedureName ? `Procedure: ${apt.procedureName}\n` : ''}----------------------------------------
Please arrive 10 minutes prior to your scheduled consultation.
For inquiries or rescheduling, reply directly to this message.`;

    sendWhatsAppMessage(apt.patient.mobile, msg);
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

  // Today's metrics (active queue vs completed)
  const todayCounts = useMemo(() => {
    const list = viewMode === 'today' ? appointments : [];
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
  }, [appointments, viewMode]);

  // Filtered Appointments list with search & queue filter
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (viewMode === 'today') {
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
              <span>Today's Queue</span>
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

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[125px] p-3 rounded-2xl border flex flex-col justify-between transition-all duration-200 cursor-pointer relative group ${
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
                    {cell.isToday && (
                      <span className="text-[9px] font-black tracking-wider text-white bg-gradient-to-r from-sky-500 to-blue-600 px-2 py-0.5 rounded-md shadow-2xs">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Appointment Load Indicator */}
                  <div className="mt-1 space-y-1">
                    {hasAppointments ? (
                      <div className="space-y-1">
                        <div className="text-[11px] font-black p-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50/70 text-sky-950 border border-sky-200/90 flex items-center justify-between shadow-2xs">
                          <span>{cell.summary.total} {cell.summary.total === 1 ? 'visit' : 'visits'}</span>
                          {cell.summary.completed > 0 && (
                            <span className="text-[9px] font-black text-white bg-emerald-600 px-1.5 py-0.2 rounded-md shadow-2xs">
                              ✓{cell.summary.completed}
                            </span>
                          )}
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
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 font-medium group-hover:text-slate-400 transition">
                        No bookings
                      </div>
                    )}
                  </div>

                  {/* 1-click Book Button on Hover */}
                  <div className="text-right pt-1 flex justify-end">
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
                      title="Schedule appointment on this date"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Book Slot</span>
                    </button>
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
                  ? `Today's Appointments (${filteredAppointments.length})`
                  : viewMode === 'calendar'
                  ? `Appointments for ${new Date(selectedDate).toDateString()} (${filteredAppointments.length})`
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
                        <span>Dr. {apt.doctor?.user?.fullName}</span>
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

                      {/* Symptoms */}
                      {apt.procedureName && (
                        <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-slate-200">
                          {apt.procedureName.split(',').slice(0, 2).map((symptom, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md"
                            >
                              {symptom.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right block: Billing Done badge + Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* If Consultation Completed and Billing Done */}
                      {apt.status === 'COMPLETED' && (
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
                            <span>Consultation Done</span>
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
                      <button
                        onClick={() => handleSendWhatsAppReminder(apt)}
                        title="Send WhatsApp confirmation / reminder to patient"
                        className="px-2.5 py-1 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

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
                              if (onNavigateToBilling) {
                                onNavigateToBilling(apt);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="Complete visit and immediately open billing"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Done & Bill</span>
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
                              if (onNavigateToBilling) {
                                onNavigateToBilling(apt);
                              }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="Complete visit and immediately open billing"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Done & Bill</span>
                          </button>
                        </>
                      )}

                      {/* COMPLETED */}
                      {apt.status === 'COMPLETED' && (
                        <>
                          {onNavigateToBilling && (
                            <button
                              onClick={() => onNavigateToBilling(apt)}
                              title={isBillPaid ? "View or Print Paid Consultation Bill" : "Collect Bill Payment"}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                                isBillPaid
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {isBillPaid ? (
                                <>
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>View Bill / Receipt</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 text-white" />
                                  <span>Bill / Collect</span>
                                </>
                              )}
                            </button>
                          )}

                          {onNavigateToNotes && (
                            <button
                              onClick={() => onNavigateToNotes(apt.patientId)}
                              title="View Doctor Clinical Notes"
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Notes</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenFollowUpBooking(apt, 7)}
                            title="Schedule patient's follow-up visit"
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0090e7] border border-sky-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Follow-Up</span>
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
                {filteredAppointments.map((apt) => (
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
                      <div className="font-bold text-slate-800">Dr. {apt.doctor?.user?.fullName}</div>
                      <div className="text-[10px] text-[#0090e7] font-bold uppercase tracking-wider">
                        {apt.specialization}
                      </div>
                    </td>

                    {/* Symptoms / Visit Reason */}
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 text-[11px] block">{apt.visitType}</span>
                      {apt.procedureName && (
                        <div className="text-[11px] text-sky-800 font-medium bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block mt-0.5">
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
                        {apt.status === 'COMPLETED' ? '✓ Completed' : apt.status}
                      </span>
                    </td>

                    {/* Clinical Actions */}
                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendWhatsAppReminder(apt)}
                          title="Send WhatsApp confirmation / reminder to patient"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

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
                                if (onNavigateToBilling) {
                                  onNavigateToBilling(apt);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="Mark Completed and Open Billing"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Done & Bill</span>
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
                                if (onNavigateToBilling) {
                                  onNavigateToBilling(apt);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                              title="Mark Completed and Open Billing"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Done & Bill</span>
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
                            {onNavigateToBilling && (
                              <button
                                onClick={() => onNavigateToBilling(apt)}
                                title="View or Collect Consultation Bill"
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bill / Ledger</span>
                              </button>
                            )}

                            {onNavigateToNotes && (
                              <button
                                onClick={() => onNavigateToNotes(apt.patientId)}
                                title="View Doctor Clinical Notes"
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Notes</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenFollowUpBooking(apt, 7)}
                              title="Schedule patient's follow-up visit"
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0090e7] border border-sky-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Follow-Up</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                <div className="flex items-center gap-2 pt-1">
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
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-none transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reschedule This Existing Appointment</span>
                  </button>
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
                    <option value="DENTAL">Dental (Dr. Rajesh Sharma)</option>
                    <option value="ORTHOPEDIC">Orthopedic (Dr. Ananya Roy)</option>
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

              {/* REAL-TIME TIME-SLOT MATRIX (Zero Double-Booking) */}
              <div className="border border-slate-200 p-3.5 bg-slate-50/70">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0090e7]" />
                    <span>Select Time Slot</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {CLINIC_TIME_SLOTS.filter((s) => !isSlotBooked(s)).length} Available
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                      {CLINIC_TIME_SLOTS.filter((s) => isSlotBooked(s)).length} Booked
                    </span>
                    {loadingBusySlots && <span className="text-[10px] text-slate-400 ml-1">Checking...</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {CLINIC_TIME_SLOTS.map((slot) => {
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
              </div>

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
                  disabled={submitting || (!!activePatientAppointment && !isRescheduleMode)}
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
