import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  User,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  Activity,
  Layers,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Printer,
  Copy,
  Check,
  X,
  Stethoscope,
  BookmarkCheck,
  History,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Doctor, ClinicalFinding, RecommendedTreatment, ClinicalNote, DentitionType } from '../../types';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { isSlotPast } from '../../services/timeUtils';
import { ToothQuadrantSelector, SelectedTooth, parseToothValue } from '../../components/ToothQuadrantSelector';
import {
  ADULT_TEETH,
  DentalFindingItem,
  ToothSurface,
  getToothByFDI,
} from '../dental-chart/types/dentalChart.types';
import { dentalChartService } from '../dental-chart/services/dentalChartService';
import { DentalModelViewer } from '../dental-chart/components/DentalModelViewer';
import { DentalChart2D } from '../dental-chart/components/DentalChart2D';
import { ToothInspectionPanel } from '../dental-chart/components/ToothInspectionPanel';
import { DentalChartSummary } from '../dental-chart/components/DentalChartSummary';
import { FindingsLegend } from '../dental-chart/components/FindingsLegend';
import { ClinicalFindingsSelector } from '../dental-chart/components/ClinicalFindingsSelector';

interface ClinicalExaminationSubModuleProps {
  initialPatient?: Patient | null;
  initialNote?: ClinicalNote | null;
  onNavigateToProcedures?: (patient: Patient) => void;
  onNavigateToHistory?: (patient: Patient) => void;
  onNavigateToAppointments?: (patientId?: string) => void;
}

export const COMMON_COMPLAINTS = [
  'Tooth Pain',
  'Pain in Upper Jaw',
  'Pain in Lower Jaw',
  'Tooth Sensitivity',
  'Swelling',
  'Food Lodgement',
  'Bleeding Gums',
  'Difficulty Chewing',
  'Broken Tooth',
  'Jaw Pain',
  'Other',
];

export const COMMON_FINDINGS = [
  'Dental Caries',
  'Gingivitis',
  'Calculus',
  'Tooth Mobility',
  'Impacted Tooth',
  'Tooth Fracture',
  'Pericoronitis',
  'Bruxism',
  'Missing Tooth',
  'Pulpitis',
  'Periodontal Problems',
  'Other',
];

export const COMMON_TREATMENTS = [
  'Root Canal Treatment (RCT)',
  'Dental Filling',
  'GIC Restoration',
  'Composite Restoration',
  'Tooth Extraction',
  'Surgical Extraction',
  'Dental Scaling',
  'Polishing',
  'Crown Placement',
  'Bridge Placement',
  'Orthodontic Treatment',
  'Denture Treatment',
  'Soft Splint',
  'Other',
];

const TIME_SLOTS = [
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
];

function formatLocalDateKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseSlotToTimestamp(dateStr: string, slotStr: string): { start: number; end: number } {
  const [timePart, modifier] = (slotStr || '09:00 AM').trim().split(' ');
  let [hours, minutes] = (timePart || '09:00').split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, hours, minutes, 0).getTime();
  const end = start + 30 * 60 * 1000;
  return { start, end };
}

function isSlotConflictingWithAppointment(
  dateStr: string,
  slotStr: string,
  appointment: any,
  ignoreAppointmentId?: string | null
): boolean {
  if (!appointment || appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') return false;
  if (ignoreAppointmentId && appointment.id === ignoreAppointmentId) return false;
  const { start: slotStart, end: slotEnd } = parseSlotToTimestamp(dateStr, slotStr);
  const aptStart = new Date(appointment.startTime).getTime();
  let aptEnd = appointment.endTime ? new Date(appointment.endTime).getTime() : 0;
  if (!aptEnd || isNaN(aptEnd)) {
    const dur = appointment.durationMinutes || 30;
    aptEnd = aptStart + dur * 60 * 1000;
  }
  return slotStart < aptEnd && slotEnd > aptStart;
}

function formatSlotTimeString(dateVal: any): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${modifier}`;
}

export const ClinicalExaminationSubModule: React.FC<ClinicalExaminationSubModuleProps> = ({
  initialPatient = null,
  initialNote = null,
  onNavigateToProcedures,
  onNavigateToHistory,
  onNavigateToAppointments,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sub-Navigation Tabs: New Examination Form vs Previous Notes Archive
  const [activeSubTab, setActiveSubTab] = useState<'NEW_EXAM' | 'PREVIOUS_NOTES'>('NEW_EXAM');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(initialNote?.id || null);

  // ==========================================
  // SECTION 1: Patient Complaint
  // ==========================================
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [customComplaint, setCustomComplaint] = useState('');
  const [durationOfComplaint, setDurationOfComplaint] = useState('');
  const [patientDescription, setPatientDescription] = useState('');

  // ==========================================
  // SECTION 2: Consulting Doctor
  // ==========================================
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(initialNote?.appointmentId || null);
  const [consultationDate, setConsultationDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [patientDoctorNotice, setPatientDoctorNotice] = useState<string | null>(null);

  // Auto-fetch consulting doctor for patient
  const handlePatientSelect = async (patient: Patient | null) => {
    setSelectedPatient(patient);
    setPatientDoctorNotice(null);
    setActiveAppointmentId(null);
    if (!patient) return;
    try {
      const res = await api.get(`/appointments/patient-active/${patient.id}`);
      if (res.data.success) {
        if (res.data.doctorId) setSelectedDoctorId(res.data.doctorId);
        if (res.data.activeAppointment?.id) setActiveAppointmentId(res.data.activeAppointment.id);
        const docName = res.data.doctor?.user?.fullName;
        if (docName) {
          setPatientDoctorNotice(`Doctor auto-assigned: Dr. ${docName}`);
        }
      }
    } catch (err) {
      console.error('Failed to auto-fetch patient doctor:', err);
    }
  };

  useEffect(() => {
    if (selectedPatient?.id && !selectedDoctorId) {
      api.get(`/appointments/patient-active/${selectedPatient.id}`)
        .then((res) => {
          if (res.data.success) {
            if (res.data.doctorId) setSelectedDoctorId(res.data.doctorId);
            if (res.data.activeAppointment?.id) setActiveAppointmentId(res.data.activeAppointment.id);
            const docName = res.data.doctor?.user?.fullName;
            if (docName) {
              setPatientDoctorNotice(`Doctor auto-assigned: Dr. ${docName}`);
            }
          }
        })
        .catch((err) => console.error('Error auto-fetching doctor for patient:', err));
    }
  }, [selectedPatient?.id, selectedDoctorId]);

  // ==========================================
  // SECTION 3: Clinical Examination & Findings
  // ==========================================
  const [findingsList, setFindingsList] = useState<ClinicalFinding[]>([]);
  const [customFindingInput, setCustomFindingInput] = useState('');

  // 3D Dental Charting State
  const [chartViewMode, setChartViewMode] = useState<'3D' | '2D'>('3D');
  const [selectedChartFDI, setSelectedChartFDI] = useState<number>(16);
  const [selectedCondition, setSelectedCondition] = useState<string>('Dental Caries');
  const [chartFindings, setChartFindings] = useState<DentalFindingItem[]>([]);
  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [toothHistory, setToothHistory] = useState<DentalFindingItem[]>([]);
  const [loadingToothHistory, setLoadingToothHistory] = useState<boolean>(false);
  const [activeFindingTool, setActiveFindingTool] = useState<'chart' | 'classic'>('chart');
  const [toothSavedAlert, setToothSavedAlert] = useState<{ toothNumber: number; condition: string } | null>(null);

  // ==========================================
  // SECTION 4: Recommended Treatment
  // ==========================================
  const [treatmentsList, setTreatmentsList] = useState<RecommendedTreatment[]>([]);
  const [customTreatmentInput, setCustomTreatmentInput] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00 AM');

  // ==========================================
  // INTERACTIVE CALENDAR MODAL STATE
  // ==========================================
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'followUp' | { type: 'treatment'; index: number }>('followUp');
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState<Date>(new Date());
  const [calendarPickedDate, setCalendarPickedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [calendarPickedTime, setCalendarPickedTime] = useState<string>('10:00 AM');
  const [autoBookAppointment, setAutoBookAppointment] = useState(true);
  const [bookingAppointmentLoading, setBookingAppointmentLoading] = useState(false);
  const [bookingAppointmentSuccess, setBookingAppointmentSuccess] = useState<string | null>(null);
  const [bookedAppointmentCode, setBookedAppointmentCode] = useState<string | null>(null);

  // Live Main Calendar Synchronization
  const [calendarSummary, setCalendarSummary] = useState<Record<string, { total: number; dental: number; ortho: number; completed: number }>>({});
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [loadingDayAppointments, setLoadingDayAppointments] = useState(false);

  // Fetch live month summary whenever calendarCurrentMonth changes
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const y = calendarCurrentMonth.getFullYear();
        const m = calendarCurrentMonth.getMonth() + 1;
        const monthKey = `${y}-${String(m).padStart(2, '0')}`;
        const res = await api.get('/appointments/calendar-summary', {
          params: {
            month: monthKey,
            doctorId: selectedDoctorId || undefined,
          },
        });
        if (res.data.success) {
          setCalendarSummary(res.data.summary || {});
        }
      } catch (e) {
        // background sync
      }
    };
    if (showCalendarModal) {
      fetchSummary();
    }
  }, [calendarCurrentMonth, showCalendarModal, selectedDoctorId]);

  // Fetch day's booked appointments whenever calendarPickedDate changes
  useEffect(() => {
    const fetchDayApts = async () => {
      if (!calendarPickedDate) return;
      try {
        setLoadingDayAppointments(true);
        const res = await api.get('/appointments', {
          params: {
            date: calendarPickedDate,
            doctorId: selectedDoctorId || undefined,
          },
        });
        if (res.data.success) {
          setDayAppointments(res.data.appointments || []);
        }
      } catch (e) {
        // background sync
      } finally {
        setLoadingDayAppointments(false);
      }
    };
    if (showCalendarModal) {
      fetchDayApts();
    }
  }, [calendarPickedDate, showCalendarModal, selectedDoctorId]);

  // Auto-adjust calendarPickedTime to first upcoming slot on today
  useEffect(() => {
    if (showCalendarModal) {
      const currentTreatmentAptId =
        typeof calendarTarget === 'object' && calendarTarget.type === 'treatment'
          ? treatmentsList[calendarTarget.index]?.appointmentId
          : null;
      const visible = TIME_SLOTS.filter(
        (s) =>
          !isSlotPast(s, calendarPickedDate) &&
          !dayAppointments.some((a) => isSlotConflictingWithAppointment(calendarPickedDate, s, a, currentTreatmentAptId))
      );
      if (!calendarPickedTime || isSlotPast(calendarPickedTime, calendarPickedDate)) {
        const firstFree = visible[0] || '';
        if (firstFree && firstFree !== calendarPickedTime) {
          setCalendarPickedTime(firstFree);
        }
      }
    }
  }, [calendarPickedDate, showCalendarModal, dayAppointments]);

  // Synchronize treatment plan with live appointment records
  useEffect(() => {
    if (!selectedPatient?.id) return;

    let isMounted = true;
    const syncWithAppointments = async () => {
      try {
        const res = await api.get('/appointments', {
          params: { patientId: selectedPatient.id, limit: 100 },
        });
        const appointments: any[] = res.data?.appointments || (Array.isArray(res.data) ? res.data : []);
        if (!appointments || appointments.length === 0 || !isMounted) return;

        setTreatmentsList((prevList) => {
          let hasChange = false;
          const updated = prevList.map((t) => {
            const matchingApt = appointments.find((a) => {
              if (a.status === 'CANCELLED') return false;
              if (t.appointmentId && a.id === t.appointmentId) return true;
              if (
                a.procedureName &&
                t.treatment &&
                a.procedureName.toLowerCase().trim() === t.treatment.toLowerCase().trim()
              ) {
                return true;
              }
              return false;
            });

            if (!matchingApt) return t;

            const aptDateStr = matchingApt.appointmentDate
              ? String(matchingApt.appointmentDate).substring(0, 10)
              : matchingApt.startTime
              ? String(matchingApt.startTime).substring(0, 10)
              : '';
            const slotStr = formatSlotTimeString(matchingApt.startTime);

            let newAdvice = t.advice || '';
            if (slotStr) {
              if (newAdvice.includes('(Slot:')) {
                newAdvice = newAdvice.replace(/\(Slot:\s*[^)]+\)/, `(Slot: ${slotStr})`);
              } else if (newAdvice.includes('Slot:')) {
                newAdvice = newAdvice.replace(/Slot:\s*[^;\n)]+/, `Slot: ${slotStr}`);
              } else {
                newAdvice = newAdvice ? `${newAdvice} (Slot: ${slotStr})` : `Slot: ${slotStr}`;
              }
            }

            const newPlannedDate = aptDateStr || t.plannedDate;
            const newAppointmentId = matchingApt.id || t.appointmentId;
            const newTimeSlot = slotStr || t.timeSlot;

            if (
              newPlannedDate !== t.plannedDate ||
              newAdvice !== t.advice ||
              newAppointmentId !== t.appointmentId ||
              newTimeSlot !== t.timeSlot
            ) {
              hasChange = true;
              return {
                ...t,
                plannedDate: newPlannedDate,
                advice: newAdvice,
                appointmentId: newAppointmentId,
                timeSlot: newTimeSlot,
              };
            }
            return t;
          });

          return hasChange ? updated : prevList;
        });
      } catch (err) {
        console.warn('Could not sync appointments with treatments plan:', err);
      }
    };

    syncWithAppointments();
    return () => {
      isMounted = false;
    };
  }, [selectedPatient?.id]);

  // ==========================================
  // PREVIOUS CLINICAL NOTES ARCHIVE STATE
  // ==========================================
  const [previousNotes, setPreviousNotes] = useState<any[]>([]);
  const [loadingPrevNotes, setLoadingPrevNotes] = useState(false);
  const [notesSearch, setNotesSearch] = useState('');
  const [notesDoctorFilter, setNotesDoctorFilter] = useState('ALL');
  const [notesDateFilter, setNotesDateFilter] = useState('ALL');
  const [notesPatientFilterOnly, setNotesPatientFilterOnly] = useState(false);
  const [selectedNoteDetail, setSelectedNoteDetail] = useState<any | null>(null);

  // UI / Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<any | null>(null);

  // Fetch doctors list
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/reports/doctors');
        if (res.data.success && res.data.doctors.length > 0) {
          setDoctors(res.data.doctors);
          setSelectedDoctorId((prev) => prev || res.data.doctors[0].id);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch Previous Notes Archive
  const fetchPreviousNotes = async () => {
    try {
      setLoadingPrevNotes(true);
      const res = await api.get('/clinical-notes');
      if (res.data.success) {
        setPreviousNotes(res.data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load previous notes:', err);
    } finally {
      setLoadingPrevNotes(false);
    }
  };

  useEffect(() => {
    fetchPreviousNotes();
  }, []);

  // Update selected patient when prop changes
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  // Load existing clinical note when editing
  useEffect(() => {
    if (initialNote) {
      setEditingNoteId(initialNote.id || null);
      if (initialNote.patient) setSelectedPatient(initialNote.patient);
      if (initialNote.consultationDate) {
        const d = new Date(initialNote.consultationDate);
        if (!isNaN(d.getTime())) {
          setVisitDate(d.toISOString().substring(0, 10));
          setConsultationDate(d.toISOString().substring(0, 10));
        }
      }
      if (initialNote.doctorId) setSelectedDoctorId(initialNote.doctorId);
      if (initialNote.durationOfComplaint) setDurationOfComplaint(initialNote.durationOfComplaint);
      if (initialNote.patientDescription) setPatientDescription(initialNote.patientDescription);
      if (initialNote.notes) setGeneralNotes(initialNote.notes);
      if (initialNote.followUpDate) {
        const fd = new Date(initialNote.followUpDate);
        if (!isNaN(fd.getTime())) {
          setFollowUpDate(fd.toISOString().substring(0, 10));
        }
      }
      if (initialNote.chiefComplaints) {
        const complaints = initialNote.chiefComplaints.split(',').map((c) => c.trim()).filter(Boolean);
        setSelectedComplaints(complaints);
      }
      if (initialNote.clinicalFindings && Array.isArray(initialNote.clinicalFindings)) {
        setFindingsList(
          initialNote.clinicalFindings.map((f: any) => ({
            ...f,
            selectedTeeth: f.selectedTeeth || parseToothValue(f.toothNumber),
            toothNumber: f.toothNumber || '',
          }))
        );
      }
      if (initialNote.recommendedTreatments) {
        let recs = initialNote.recommendedTreatments;
        if (typeof recs === 'string') {
          try {
            recs = JSON.parse(recs);
          } catch {
            recs = [];
          }
        }
        if (Array.isArray(recs)) {
          setTreatmentsList(
            recs.map((t: any) => ({
              ...t,
              plannedDate: t.plannedDate ? String(t.plannedDate).substring(0, 10) : '',
              followUpDate: t.followUpDate ? String(t.followUpDate).substring(0, 10) : '',
              appointmentId: t.appointmentId || null,
              timeSlot: t.timeSlot || null,
            }))
          );
        }
      }
    }
  }, [initialNote]);

  // Selected doctor object
  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // SECTION 1 Handlers: Chief Complaints
  const toggleComplaint = (complaint: string) => {
    if (selectedComplaints.includes(complaint)) {
      setSelectedComplaints(selectedComplaints.filter((c) => c !== complaint));
    } else {
      setSelectedComplaints([...selectedComplaints, complaint]);
    }
  };

  const handleAddCustomComplaint = () => {
    const trimmed = customComplaint.trim();
    if (trimmed && !selectedComplaints.includes(trimmed)) {
      setSelectedComplaints([...selectedComplaints, trimmed]);
      setCustomComplaint('');
    }
  };

  // SECTION 3 Handlers: Findings
  const addFinding = (name: string = '') => {
    setFindingsList([
      ...findingsList,
      {
        finding: name,
        toothNumber: '',
        selectedTeeth: [],
        teeth: [],
        severity: 'Moderate',
        details: '',
        observations: '',
      },
    ]);
  };

  const updateFinding = (index: number, field: keyof ClinicalFinding, value: any) => {
    const updated = [...findingsList];
    updated[index] = { ...updated[index], [field]: value };
    setFindingsList(updated);
  };

  const handleToothSelectionChange = (
    idx: number,
    selectedTeeth: SelectedTooth[],
    fdiString: string,
    chartType: DentitionType
  ) => {
    const updated = [...findingsList];
    updated[idx] = {
      ...updated[idx],
      selectedTeeth,
      toothNumber: fdiString,
      teeth: selectedTeeth.map((t) => t.fdi),
      chartType,
    };
    setFindingsList(updated);
  };

  const removeFinding = (index: number) => {
    setFindingsList(findingsList.filter((_, i) => i !== index));
  };

  // 3D Dental Charting: Fetch patient chart findings
  const loadChartData = React.useCallback(async () => {
    if (!selectedPatient?.id) {
      setChartFindings([]);
      return;
    }
    try {
      setLoadingChart(true);
      const data = await dentalChartService.getPatientChart(selectedPatient.id);
      if (data.success) {
        setChartFindings(data.findings);
      }
    } catch (err) {
      console.error('Failed to fetch patient dental chart:', err);
    } finally {
      setLoadingChart(false);
    }
  }, [selectedPatient?.id]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // Fetch tooth history whenever selectedChartFDI or chartFindings change
  useEffect(() => {
    if (!selectedPatient?.id || !selectedChartFDI) return;
    const fetchHistory = async () => {
      try {
        setLoadingToothHistory(true);
        const history = await dentalChartService.getToothHistory(selectedPatient.id, selectedChartFDI);
        setToothHistory(history);
      } catch (err) {
        console.error('Failed to fetch tooth history:', err);
      } finally {
        setLoadingToothHistory(false);
      }
    };
    fetchHistory();
  }, [selectedPatient?.id, selectedChartFDI, chartFindings]);

  // Global tooth selection listener for 3D model clicks
  useEffect(() => {
    (window as unknown as { __selectToothFDI?: (fdi: number) => void }).__selectToothFDI = (fdi: number) => {
      setSelectedChartFDI(fdi);
    };
    return () => {
      delete (window as unknown as { __selectToothFDI?: unknown }).__selectToothFDI;
    };
  }, []);

  const selectedToothObj = getToothByFDI(selectedChartFDI) || ADULT_TEETH[2];

  // Save 3D Dental Finding Handler
  const handleSaveChartFinding = async (findingData: {
    toothNumber: number;
    toothName: string;
    surface: ToothSurface;
    condition: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical' | 'N/A';
    treatment?: string;
    notes?: string;
  }) => {
    if (!selectedPatient?.id) {
      alert('Please select a patient in Section 1 before saving tooth findings.');
      return;
    }

    try {
      await dentalChartService.saveFinding({
        patientId: selectedPatient.id,
        toothNumber: findingData.toothNumber,
        dentitionType: 'ADULT',
        toothName: findingData.toothName,
        surface: findingData.surface,
        condition: findingData.condition,
        severity: findingData.severity,
        treatment: findingData.treatment,
        notes: findingData.notes,
      });

      // Reload chart findings to update 3D tooth colors and summary table
      await loadChartData();

      // Show alert badge
      setToothSavedAlert({ toothNumber: findingData.toothNumber, condition: findingData.condition });
      setTimeout(() => setToothSavedAlert(null), 3500);

      // Automatically sync into the Clinical Examination findings list
      const existingIdx = findingsList.findIndex(
        (f) => f.toothNumber === String(findingData.toothNumber) && f.finding === findingData.condition
      );
      if (existingIdx === -1) {
        setFindingsList((prev) => [
          ...prev,
          {
            finding: findingData.condition,
            toothNumber: String(findingData.toothNumber),
            teeth: [findingData.toothNumber],
            selectedTeeth: [
              {
                fdi: findingData.toothNumber,
                surface: findingData.surface,
                arch: findingData.toothNumber < 30 ? 'UPPER' : 'LOWER',
                side: [1, 4].includes(Math.floor(findingData.toothNumber / 10)) ? 'RIGHT' : 'LEFT',
                type: 'PERMANENT',
              } as any,
            ],
            severity: (findingData.severity as any) || 'Moderate',
            details: findingData.notes || '',
            observations: `Surface: ${findingData.surface}`,
          },
        ]);
      }

      // If treatment is recommended, sync into treatmentsList if not already present
      if (
        findingData.treatment &&
        findingData.treatment.trim() &&
        !findingData.treatment.includes('Observation Only') &&
        !findingData.treatment.includes('No Treatment')
      ) {
        const treatName = findingData.treatment.trim();
        const existingTreat = treatmentsList.find(
          (t) =>
            t.treatment.toLowerCase() === treatName.toLowerCase() &&
            t.advice?.includes(`Tooth #${findingData.toothNumber}`)
        );
        if (!existingTreat) {
          setTreatmentsList((prev) => [
            ...prev,
            {
              treatment: treatName,
              priority: findingData.severity === 'Critical' || findingData.severity === 'Severe' ? 'High' : 'Normal',
              advice: `For Tooth #${findingData.toothNumber} (${findingData.condition})`,
              plannedDate: '',
              followUpDate: '',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to save dental chart finding:', err);
    }
  };

  const handleDeleteChartFinding = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this dental finding?')) return;
    try {
      await dentalChartService.deleteFinding(id);
      await loadChartData();
    } catch (err) {
      console.error('Failed to delete dental finding:', err);
    }
  };

  // SECTION 4 Handlers: Recommended Treatments
  const addTreatment = (name: string) => {
    setTreatmentsList((prev) => [
      ...prev,
      {
        treatment: name,
        priority: 'Normal',
        advice: '',
        plannedDate: '',
        followUpDate: '',
        appointmentId: null,
        timeSlot: null,
      },
    ]);
  };

  const updateTreatment = (index: number, field: keyof RecommendedTreatment, value: any) => {
    setTreatmentsList((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const removeTreatment = (index: number) => {
    setTreatmentsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset Form
  const handleResetForm = () => {
    if (window.confirm('Reset all fields in this clinical examination form?')) {
      setEditingNoteId(null);
      setSelectedPatient(null);
      setVisitDate(new Date().toISOString().substring(0, 10));
      setSelectedComplaints([]);
      setCustomComplaint('');
      setDurationOfComplaint('');
      setPatientDescription('');
      setSelectedDoctorId('');
      setConsultationDate(new Date().toISOString().substring(0, 10));
      setFindingsList([]);
      setTreatmentsList([]);
      setGeneralNotes('');
      setFollowUpDate('');
      setFollowUpTime('10:00 AM');
      setFormError(null);
      setSavedSuccess(null);
    }
  };

  // ==========================================
  // INTERACTIVE CALENDAR MODAL HELPERS
  // ==========================================
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  const calendarDays = useMemo(() => {
    const year = calendarCurrentMonth.getFullYear();
    const month = calendarCurrentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month days
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
        isSelected: dateStr === calendarPickedDate,
        summary: calendarSummary[dateStr],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = formatLocalDateKey(year, month, dayNum);
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === calendarPickedDate,
        summary: calendarSummary[dateStr],
      });
    }

    // Next month days
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
        isSelected: dateStr === calendarPickedDate,
        summary: calendarSummary[dateStr],
      });
    }

    return days;
  }, [calendarCurrentMonth, calendarPickedDate, todayStr, calendarSummary]);

  const applyCalendarDatePreset = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const dateStr = target.toISOString().substring(0, 10);
    setCalendarCurrentMonth(target);
    setCalendarPickedDate(dateStr);
  };

  const handleConfirmCalendarSelection = async () => {
    if (!calendarPickedDate) return;

    // Apply date to the targeted field
    if (calendarTarget === 'followUp') {
      setFollowUpDate(calendarPickedDate);
      setFollowUpTime(calendarPickedTime);
    } else if (typeof calendarTarget === 'object' && calendarTarget.type === 'treatment') {
      const targetIndex = calendarTarget.index;
      setTreatmentsList((prev) => {
        const updated = [...prev];
        if (updated[targetIndex]) {
          const cur = updated[targetIndex];
          let updatedAdvice = cur.advice || '';
          if (calendarPickedTime) {
            if (updatedAdvice.includes('(Slot:')) {
              updatedAdvice = updatedAdvice.replace(/\(Slot:\s*[^)]+\)/, `(Slot: ${calendarPickedTime})`);
            } else if (updatedAdvice.includes('Slot:')) {
              updatedAdvice = updatedAdvice.replace(/Slot:\s*[^;\n)]+/, `Slot: ${calendarPickedTime}`);
            } else {
              updatedAdvice = updatedAdvice ? `${updatedAdvice} (Slot: ${calendarPickedTime})` : `Slot: ${calendarPickedTime}`;
            }
          }
          updated[targetIndex] = {
            ...cur,
            plannedDate: calendarPickedDate,
            advice: updatedAdvice,
            timeSlot: calendarPickedTime || cur.timeSlot,
          };
        }
        return updated;
      });
    }

    // Optional direct appointment creation if toggled
    const doctorIdToUse = selectedDoctorId || (doctors.length > 0 ? doctors[0].id : null);
    if (autoBookAppointment && selectedPatient) {
      if (!doctorIdToUse) {
        alert('Please assign or select a doctor before booking this appointment slot.');
        setShowCalendarModal(false);
        return;
      }
      try {
        setBookingAppointmentLoading(true);
        const activeDoctor = doctors.find((d) => d.id === doctorIdToUse) || currentDoctor;
        const spec = activeDoctor?.specialization || 'DENTAL';

        // Parse time into startTime ISO
        const [timePart, modifier] = calendarPickedTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const [y, m, d] = calendarPickedDate.split('-').map(Number);
        const startDate = new Date(y, m - 1, d, hours, minutes, 0);

        const isProcedureTarget = typeof calendarTarget === 'object' && calendarTarget.type === 'treatment';
        const aptPayload = {
          patientId: selectedPatient.id,
          doctorId: doctorIdToUse,
          specialization: spec,
          appointmentDate: calendarPickedDate,
          startTime: startDate.toISOString(),
          durationMinutes: 30,
          visitType: isProcedureTarget ? 'PROCEDURE' : 'FOLLOW_UP',
          procedureName: isProcedureTarget
            ? treatmentsList[calendarTarget.index]?.treatment || 'Follow-Up Treatment'
            : 'Clinical Follow-Up Consultation',
          reasonForVisit: isProcedureTarget
            ? `Procedure Planned: ${treatmentsList[calendarTarget.index]?.treatment || 'Dental Procedure'}`
            : 'Scheduled during clinical examination & treatment planning',
        };

        const res = await api.post('/appointments', aptPayload);
        if (res.data.success) {
          const bookedApt = res.data.appointment;
          const aptCode = bookedApt?.appointmentCode || 'APT-SCHEDULED';
          setBookedAppointmentCode(aptCode);
          setBookingAppointmentSuccess(
            `Appointment (${aptCode}) successfully booked for ${selectedPatient.name} on ${calendarPickedDate} at ${calendarPickedTime} with Dr. ${activeDoctor?.user?.fullName || 'Doctor'}! It immediately reflects in the Appointments Module.`
          );
          setTimeout(() => setBookingAppointmentSuccess(null), 7000);

          if (isProcedureTarget && bookedApt?.id) {
            const targetIndex = calendarTarget.index;
            setTreatmentsList((prev) => {
              const updated = [...prev];
              if (updated[targetIndex]) {
                updated[targetIndex] = {
                  ...updated[targetIndex],
                  appointmentId: bookedApt.id,
                };
              }
              return updated;
            });
          }
        }
      } catch (err: any) {
        console.error('Error creating appointment from calendar picker:', err);
        alert(err.response?.data?.message || 'Could not automatically schedule appointment slot.');
      } finally {
        setBookingAppointmentLoading(false);
      }
    }

    setShowCalendarModal(false);
  };

  // ==========================================
  // SAVE CLINICAL NOTES & EXAMINATION
  // ==========================================
  const handleSaveExamination = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPatient) {
      setFormError('Please select a registered patient before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedDoctorId) {
      setFormError('Please select the consulting doctor.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedComplaints.length === 0 && !patientDescription.trim()) {
      setFormError('Please select or specify at least one patient complaint.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: editingNoteId || undefined,
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        appointmentId: activeAppointmentId || initialNote?.appointmentId || null,
        consultationDate: visitDate || consultationDate,
        chiefComplaints: selectedComplaints.length > 0 ? selectedComplaints : ['Routine Evaluation'],
        durationOfComplaint: durationOfComplaint.trim() || null,
        patientDescription: patientDescription.trim() || null,
        clinicalFindings: findingsList
          .filter((f) => f.finding.trim())
          .map((f) => ({
            finding: f.finding.trim(),
            toothNumber: f.toothNumber?.trim() || null,
            selectedTeeth: f.selectedTeeth && f.selectedTeeth.length > 0 ? f.selectedTeeth : null,
            teeth: f.selectedTeeth && f.selectedTeeth.length > 0 ? f.selectedTeeth.map((t) => t.fdi) : null,
            chartType: f.chartType || null,
            severity: f.severity || 'Moderate',
            details: f.details?.trim() || null,
            observations: f.observations?.trim() || null,
          })),
        recommendedTreatments: treatmentsList
          .filter((t) => t.treatment.trim())
          .map((t) => ({
            treatment: t.treatment.trim(),
            priority: t.priority || 'Normal',
            advice: t.advice?.trim() || null,
            plannedDate: t.plannedDate ? String(t.plannedDate).substring(0, 10) : null,
            followUpDate: t.followUpDate ? String(t.followUpDate).substring(0, 10) : null,
            appointmentId: t.appointmentId || null,
            timeSlot: t.timeSlot || null,
          })),
        followUpDate: null,
        notes: generalNotes.trim() || null,
        advice: treatmentsList.map((t) => t.advice).filter(Boolean).join('; ') || null,
      };

      const res = await api.post('/clinical-notes/examination', payload);

      if (res.data.success) {
        if (res.data.note?.id) {
          setEditingNoteId(res.data.note.id);
        }
        setSavedSuccess({
          note: res.data.note,
          patient: selectedPatient,
          timestamp: new Date().toLocaleTimeString(),
        });

        // Refresh Previous Notes list so it immediately appears in Tab 2!
        await fetchPreviousNotes();

        // Reset all clinical note fields to default initial state
        setSelectedPatient(null);
        setVisitDate(new Date().toISOString().substring(0, 10));
        setSelectedComplaints([]);
        setCustomComplaint('');
        setDurationOfComplaint('');
        setPatientDescription('');
        setSelectedDoctorId('');
        setConsultationDate(new Date().toISOString().substring(0, 10));
        setFindingsList([]);
        setCustomFindingInput('');
        setTreatmentsList([]);
        setCustomTreatmentInput('');
        setGeneralNotes('');
        setFollowUpDate('');
        setFollowUpTime('10:00 AM');
        setFormError(null);

        // Move to top
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
          mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err: any) {
      console.error(err);
      const errData = err.response?.data;
      const errorMsg =
        errData?.message ||
        (Array.isArray(errData?.errors) && errData.errors[0]?.message) ||
        'Failed to save clinical examination record.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Load a historical note back into the active form
  const handleLoadNoteIntoForm = (note: any) => {
    if (note.id) setEditingNoteId(note.id);
    if (note.patient) setSelectedPatient(note.patient);
    if (note.consultationDate) {
      const d = new Date(note.consultationDate);
      if (!isNaN(d.getTime())) {
        setVisitDate(d.toISOString().substring(0, 10));
        setConsultationDate(d.toISOString().substring(0, 10));
      }
    }
    if (note.doctorId) setSelectedDoctorId(note.doctorId);
    if (note.durationOfComplaint) setDurationOfComplaint(note.durationOfComplaint);
    if (note.patientDescription) setPatientDescription(note.patientDescription);
    if (note.notes) setGeneralNotes(note.notes);
    if (note.followUpDate) {
      const fd = new Date(note.followUpDate);
      if (!isNaN(fd.getTime())) {
        setFollowUpDate(fd.toISOString().substring(0, 10));
      }
    }
    if (note.chiefComplaints) {
      const complaints = note.chiefComplaints.split(',').map((c: string) => c.trim()).filter(Boolean);
      setSelectedComplaints(complaints);
    }
    if (note.clinicalFindings && Array.isArray(note.clinicalFindings)) {
      setFindingsList(
        note.clinicalFindings.map((f: any) => ({
          ...f,
          selectedTeeth: f.selectedTeeth || parseToothValue(f.toothNumber),
          toothNumber: f.toothNumber || '',
        }))
      );
    }
    if (note.recommendedTreatments) {
      let recs = note.recommendedTreatments;
      if (typeof recs === 'string') {
        try {
          recs = JSON.parse(recs);
        } catch {
          recs = [];
        }
      }
      if (Array.isArray(recs)) {
        setTreatmentsList(
          recs.map((t: any) => ({
            ...t,
            plannedDate: t.plannedDate ? String(t.plannedDate).substring(0, 10) : '',
            followUpDate: t.followUpDate ? String(t.followUpDate).substring(0, 10) : '',
            appointmentId: t.appointmentId || null,
            timeSlot: t.timeSlot || null,
          }))
        );
      }
    }

    setActiveSubTab('NEW_EXAM');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered Previous Notes
  const filteredPreviousNotes = useMemo(() => {
    return previousNotes.filter((note) => {
      const q = notesSearch.toLowerCase().trim();
      const patientName = (note.patient?.name || '').toLowerCase();
      const patientCode = (note.patient?.patientCode || '').toLowerCase();
      const mobile = (note.patient?.mobile || '').toLowerCase();
      const doctorName = (note.doctor?.user?.fullName || '').toLowerCase();
      const complaints = (note.chiefComplaints || '').toLowerCase();
      const diagnosis = (note.diagnosis || '').toLowerCase();

      const matchQuery =
        !q ||
        patientName.includes(q) ||
        patientCode.includes(q) ||
        mobile.includes(q) ||
        doctorName.includes(q) ||
        complaints.includes(q) ||
        diagnosis.includes(q);

      const matchDoctor = notesDoctorFilter === 'ALL' || note.doctorId === notesDoctorFilter;

      let matchPatient = true;
      if (notesPatientFilterOnly && selectedPatient) {
        matchPatient = note.patientId === selectedPatient.id;
      }

      let matchDate = true;
      if (notesDateFilter !== 'ALL' && note.consultationDate) {
        const noteDate = new Date(note.consultationDate);
        const now = new Date();
        if (notesDateFilter === 'TODAY') {
          matchDate = noteDate.toDateString() === now.toDateString();
        } else if (notesDateFilter === 'WEEK') {
          const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
          matchDate = noteDate >= oneWeekAgo;
        } else if (notesDateFilter === 'MONTH') {
          const oneMonthAgo = new Date(Date.now() - 30 * 86400000);
          matchDate = noteDate >= oneMonthAgo;
        }
      }

      return matchQuery && matchDoctor && matchPatient && matchDate;
    });
  }, [previousNotes, notesSearch, notesDoctorFilter, notesDateFilter, notesPatientFilterOnly, selectedPatient]);

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Notes & Examination</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase tracking-wider">
              3D Chart & Calendar Integrated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record patient-reported complaints, consulting doctor, interactive 3D teeth findings, recommended treatments, and review previous notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'NEW_EXAM' && (
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs: 1) New Examination Form vs 2) Previous Clinical Notes Archive */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('NEW_EXAM')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'NEW_EXAM'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>New Examination & Clinical Notes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('PREVIOUS_NOTES');
            fetchPreviousNotes();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'PREVIOUS_NOTES'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Previous Clinical Notes Archive</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeSubTab === 'PREVIOUS_NOTES' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {previousNotes.length}
          </span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Clinical Examination Record Saved for {savedSuccess.patient.name} ({savedSuccess.patient.patientCode})
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Examination findings, complaints, and treatment recommendations successfully recorded at {savedSuccess.timestamp}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('PREVIOUS_NOTES');
                  fetchPreviousNotes();
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>View in Previous Notes Archive</span>
              </button>

              {onNavigateToProcedures && (
                <button
                  type="button"
                  onClick={() => onNavigateToProcedures(savedSuccess.patient)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Record Procedure Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tooth Saved Feedback Toast */}
      {toothSavedAlert && (
        <div className="p-3 bg-teal-50 border border-teal-300 rounded-xl text-teal-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>
              <strong>Tooth #{toothSavedAlert.toothNumber} Finding Saved:</strong> {toothSavedAlert.condition} has been saved to the chart and synced into the Recommended Treatment plan below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToothSavedAlert(null)}
            className="text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Appointment Created Feedback Toast */}
      {bookingAppointmentSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bookingAppointmentSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setBookingAppointmentSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 1: NEW EXAMINATION & CLINICAL NOTES FORM                */}
      {/* ============================================================== */}
      {activeSubTab === 'NEW_EXAM' && (
        <form onSubmit={handleSaveExamination} className="space-y-6">
          {/* ======================================================== */}
          {/* SECTION 1: PATIENT COMPLAINT                             */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Patient Complaint</h3>
                  <p className="text-[11px] text-slate-500">Select patient and record primary presenting symptoms.</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-full">
                Receptionist Intake
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Patient *</label>
                  <PatientSearchSelect
                    selectedPatient={selectedPatient}
                    onSelect={(p) => handlePatientSelect(p)}
                    placeholder="Search patient by name, ID, or phone..."
                    required
                  />
                  {patientDoctorNotice && (
                    <div className="mt-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{patientDoctorNotice}</span>
                    </div>
                  )}
                  {selectedPatient && (
                    <div className="mt-2 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-blue-900">{selectedPatient.name}</span>
                        <span className="text-blue-700 ml-2 font-mono">({selectedPatient.patientCode})</span>
                        <span className="text-slate-500 ml-2">
                          {selectedPatient.gender}, {selectedPatient.age} yrs • {selectedPatient.mobile}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Registered
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Visit</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Chief Complaints Multi-Select Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chief Complaints * <span className="font-normal text-slate-400">(Select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_COMPLAINTS.map((complaint) => {
                    const isSelected = selectedComplaints.includes(complaint);
                    return (
                      <button
                        type="button"
                        key={complaint}
                        onClick={() => toggleComplaint(complaint)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {complaint}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Complaint Input */}
                <div className="mt-3 flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Other specific complaint..."
                    value={customComplaint}
                    onChange={(e) => setCustomComplaint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomComplaint();
                      }
                    }}
                    className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomComplaint}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Duration & Patient's Own Words */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Duration of Complaint</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 days, since yesterday, 2 weeks..."
                    value={durationOfComplaint}
                    onChange={(e) => setDurationOfComplaint(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Description <span className="font-normal text-slate-400">(In patient's own words)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharp pain when drinking cold water, throbbing at night..."
                    value={patientDescription}
                    onChange={(e) => setPatientDescription(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: CONSULTING DOCTOR                             */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Consulting Doctor</h3>
                  <p className="text-[11px] text-slate-500">Select the doctor who examined the patient.</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2.5 py-1 rounded-full">
                Attending Practitioner
              </span>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Consulting Doctor *</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    required
                  >
                    <option value="">-- Choose Consulting Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user?.fullName || 'Doctor'} ({doc.specialization}) - Consultation: ₹{doc.consultationFee}
                      </option>
                    ))}
                  </select>

                  {currentDoctor && (
                    <div className="mt-2 p-2.5 bg-purple-50/70 rounded-xl border border-purple-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-purple-900">Dr. {currentDoctor.user?.fullName}</span>
                        <span className="text-purple-700 ml-2">Department: {currentDoctor.specialization}</span>
                      </div>
                      <span className="text-[11px] font-bold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                        Standard Fee: ₹{currentDoctor.consultationFee}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Consultation Date</label>
                  <input
                    type="date"
                    value={consultationDate}
                    onChange={(e) => setConsultationDate(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: CLINICAL EXAMINATION & 3D DENTAL CHARTING      */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-black flex items-center justify-center">
                  3
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Clinical Examination & 3D Dental Charting
                    </h3>
                    <span className="px-2 py-0.5 bg-teal-500/10 text-teal-700 border border-teal-300 text-[10px] font-black rounded-full uppercase tracking-wider">
                      Interactive Odontogram
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Interact directly with the 3D dental model or 2D chart, inspect individual teeth, and document clinical findings.
                  </p>
                </div>
              </div>

              {/* Tool Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveFindingTool('chart')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeFindingTool === 'chart'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>3D/2D Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFindingTool('classic')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeFindingTool === 'classic'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Quick List</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* TOOL A: 3D DENTAL CHARTING ENGINE */}
              {activeFindingTool === 'chart' && (
                <div className="space-y-4">
                  {/* Notice if patient is not yet chosen */}
                  {!selectedPatient ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Patient Required:</strong> Please select a patient in Section 1 to link and save findings to their permanent dental chart.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl text-teal-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>
                          Active Dental Chart for <strong>{selectedPatient.name}</strong> ({selectedPatient.patientCode}).
                          Tooth findings saved here update 3D colors and sync automatically into Recommended Treatments.
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-200/60 px-2.5 py-0.5 rounded-full">
                        {chartFindings.length} Chart Findings
                      </span>
                    </div>
                  )}

                  {/* 3D Model / 2D Switcher Bar */}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">View Mode:</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setChartViewMode('3D')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                            chartViewMode === '3D' ? 'bg-[#0090e7] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          3D Interactive Mouth
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartViewMode('2D')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                            chartViewMode === '2D' ? 'bg-[#0090e7] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          2D Odontogram
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Selected Tooth:{' '}
                      <strong className="text-teal-700 font-mono">
                        #{selectedChartFDI} - {selectedToothObj.name}
                      </strong>
                    </div>
                  </div>

                  {/* Visualizer & Inspection Panel Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Visualizer Area (3D or 2D) & Clinical Findings Selector */}
                    <div className="lg:col-span-7 flex flex-col gap-3">
                      {chartViewMode === '3D' ? (
                        <DentalModelViewer
                          selectedFDI={selectedChartFDI}
                          onSelectTooth={(fdi) => setSelectedChartFDI(fdi)}
                          findings={chartFindings}
                          showMiniArchSelector={false}
                          className="h-[430px]"
                        />
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
                          <DentalChart2D
                            selectedFDI={selectedChartFDI}
                            onSelectTooth={(fdi) => setSelectedChartFDI(fdi)}
                            findings={chartFindings}
                          />
                        </div>
                      )}

                      {/* Findings Legend */}
                      <FindingsLegend />

                      {/* Clinical Findings Search & Selector covering the remaining space */}
                      <ClinicalFindingsSelector
                        selectedCondition={selectedCondition}
                        onSelectCondition={(cond) => setSelectedCondition(cond)}
                      />
                    </div>

                    {/* Tooth Inspection & Finding Form */}
                    <div className="lg:col-span-5 self-start h-fit">
                      <ToothInspectionPanel
                        tooth={selectedToothObj}
                        onSelectTooth={(fdi) => setSelectedChartFDI(fdi)}
                        onClose={() => {}}
                        patientId={selectedPatient?.id || ''}
                        onSaveFinding={handleSaveChartFinding}
                        toothHistory={toothHistory}
                        isLoadingHistory={loadingToothHistory}
                        selectedCondition={selectedCondition}
                        onSelectCondition={(cond) => setSelectedCondition(cond)}
                      />
                    </div>
                  </div>

                  {/* Findings Summary Table */}
                  <div className="space-y-4 pt-2">
                    <DentalChartSummary
                      findings={chartFindings}
                      onSelectTooth={(fdi) => {
                        setSelectedChartFDI(fdi);
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      onDeleteFinding={handleDeleteChartFinding}
                    />
                  </div>
                </div>
              )}

              {/* TOOL B: CLASSIC MANUAL FINDINGS LIST */}
              {activeFindingTool === 'classic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Quick Add Common Findings
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {COMMON_FINDINGS.map((f) => (
                        <button
                          type="button"
                          key={f}
                          onClick={() => addFinding(f)}
                          className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 border border-slate-200 rounded-lg font-medium transition cursor-pointer"
                        >
                          + {f}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        placeholder="Enter custom clinical finding..."
                        value={customFindingInput}
                        onChange={(e) => setCustomFindingInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customFindingInput.trim()) {
                              addFinding(customFindingInput.trim());
                              setCustomFindingInput('');
                            }
                          }
                        }}
                        className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customFindingInput.trim()) {
                            addFinding(customFindingInput.trim());
                            setCustomFindingInput('');
                          }
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                      >
                        + Add Finding
                      </button>
                    </div>
                  </div>

                  {/* Findings Rows */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Recorded Clinical Findings ({findingsList.length})
                    </label>

                    {findingsList.length === 0 ? (
                      <div className="p-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center">
                        <p className="text-xs font-semibold text-slate-600">No clinical findings recorded yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Use the 3D Dental Chart or quick add chips above.</p>
                      </div>
                    ) : (
                      findingsList.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative transition hover:border-slate-300"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={f.finding}
                                onChange={(e) => updateFinding(idx, 'finding', e.target.value)}
                                placeholder="Finding Name (e.g. Dental Caries)"
                                className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 w-64"
                                required
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFinding(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Remove finding"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Tooth / Quadrant Selection
                              </label>
                              <ToothQuadrantSelector
                                value={f.selectedTeeth && f.selectedTeeth.length > 0 ? f.selectedTeeth : f.toothNumber}
                                patientAge={selectedPatient?.age}
                                onChange={(selectedTeeth, fdiString, chartType) =>
                                  handleToothSelectionChange(idx, selectedTeeth, fdiString, chartType)
                                }
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Severity</label>
                              <select
                                value={f.severity || 'Moderate'}
                                onChange={(e) => updateFinding(idx, 'severity', e.target.value)}
                                className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                              >
                                <option value="Mild">Mild</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Severe">Severe</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Observations / Notes</label>
                              <input
                                type="text"
                                placeholder="e.g. Occlusal pit caries..."
                                value={f.observations || ''}
                                onChange={(e) => updateFinding(idx, 'observations', e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: RECOMMENDED TREATMENT                         */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recommended Treatment</h3>
                  <p className="text-[11px] text-slate-500">
                    Doctor's treatment recommendations, planned treatments, instructions, and review appointment.
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-full">
                Treatment Plan & Scheduling
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Structured Treatments List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Recommended Treatments Plan ({treatmentsList.length})
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Populated from Tooth Inspection & Findings
                  </span>
                </div>

                {treatmentsList.length === 0 ? (
                  <div className="p-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-semibold text-slate-600">No recommended treatments added yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select a Recommended Treatment in the Tooth Inspection Panel above when saving tooth findings to automatically populate this plan.
                    </p>
                  </div>
                ) : (
                  treatmentsList.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={t.treatment}
                            onChange={(e) => updateTreatment(idx, 'treatment', e.target.value)}
                            placeholder="Treatment Name"
                            className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 w-64"
                            required
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeTreatment(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remove treatment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
                          <select
                            value={t.priority || 'Normal'}
                            onChange={(e) => updateTreatment(idx, 'priority', e.target.value)}
                            className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                          >
                            <option value="Immediate">Immediate / Urgent</option>
                            <option value="High">High Priority</option>
                            <option value="Normal">Normal</option>
                            <option value="Low">Low Priority</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Planned Date</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={t.plannedDate ? String(t.plannedDate).substring(0, 10) : ''}
                              onChange={(e) => updateTreatment(idx, 'plannedDate', e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarTarget({ type: 'treatment', index: idx });
                                const pDate = t.plannedDate ? String(t.plannedDate).substring(0, 10) : todayStr;
                                setCalendarPickedDate(pDate);
                                if (t.timeSlot) {
                                  setCalendarPickedTime(t.timeSlot);
                                } else if (t.advice && t.advice.includes('Slot:')) {
                                  const match = t.advice.match(/Slot:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))/i);
                                  if (match) setCalendarPickedTime(match[1]);
                                }
                                const [py, pm, pd] = pDate.split('-').map(Number);
                                setCalendarCurrentMonth(py && pm ? new Date(py, pm - 1, pd || 1) : new Date());
                                setShowCalendarModal(true);
                              }}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition cursor-pointer shrink-0"
                              title="Select from Interactive Calendar"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Treatment Advice & Instructions
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Schedule root canal therapy; start antibiotics and analgesics..."
                            value={t.advice || ''}
                            onChange={(e) => updateTreatment(idx, 'advice', e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => addTreatment('')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Recommended Treatment</span>
              </button>

              {/* General Clinical Notes & Remarks */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">General Clinical Notes & Remarks</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Patient agreed with treatment plan; explained post-procedure care; prescribed analgesics as required..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Clinical Workflow Note:</strong> Recommended treatments document the doctor's plan. When actual procedures are performed, they are documented and completed in the <em>Procedures & Treatments</em> sub-module.
                </span>
              </div>
            </div>
          </div>

          {/* Submit Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel / Clear
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <span>Saving Clinical Record...</span>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Save Clinical Notes & Examination</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: PREVIOUS CLINICAL NOTES ARCHIVE                      */}
      {/* ============================================================== */}
      {activeSubTab === 'PREVIOUS_NOTES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={notesSearch}
                  onChange={(e) => setNotesSearch(e.target.value)}
                  placeholder="Search notes by patient, code, doctor, complaint..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Doctor filter */}
              <select
                value={notesDoctorFilter}
                onChange={(e) => setNotesDoctorFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="ALL">All Consulting Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.user?.fullName}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <select
                value={notesDateFilter}
                onChange={(e) => setNotesDateFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="WEEK">Past 7 Days</option>
                <option value="MONTH">Past 30 Days</option>
              </select>

              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => setNotesPatientFilterOnly(!notesPatientFilterOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    notesPatientFilterOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {notesPatientFilterOnly ? `Only ${selectedPatient.name}` : `Filter by ${selectedPatient.name}`}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredPreviousNotes.length}</strong> of {previousNotes.length} notes
              </span>
              <button
                type="button"
                onClick={fetchPreviousNotes}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Refresh notes list"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notes Archive Table / Cards */}
          {loadingPrevNotes ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading previous clinical records...</div>
          ) : filteredPreviousNotes.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No previous clinical examination notes found</p>
              <p className="text-slate-400 text-[11px] mt-1">
                Completed examinations saved in Tab 1 will be stored and listed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-6">Date & Consultation</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Consulting Doctor</th>
                    <th className="p-3.5">Chief Complaints</th>
                    <th className="p-3.5">Clinical Findings</th>
                    <th className="p-3.5">Recommended Treatments</th>
                    <th className="p-3.5">Follow-Up</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviousNotes.map((note) => {
                    const noteDate = note.consultationDate
                      ? new Date(note.consultationDate).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—';

                    const findingsCount = Array.isArray(note.clinicalFindings) ? note.clinicalFindings.length : 0;
                    const treatmentsCount = Array.isArray(note.recommendedTreatments) ? note.recommendedTreatments.length : 0;

                    return (
                      <tr key={note.id} className="hover:bg-indigo-50/20 transition">
                        {/* Date */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-900">{noteDate}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{note.patient?.name || 'Patient'}</div>
                          <div className="text-[10px] font-mono text-blue-700">
                            {note.patient?.patientCode || ''} • {note.patient?.mobile || ''}
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">
                            Dr. {note.doctor?.user?.fullName || 'Doctor'}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {note.doctor?.specialization || 'Clinical'}
                          </span>
                        </td>

                        {/* Complaints */}
                        <td className="p-3.5">
                          <div className="max-w-xs">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold line-clamp-2">
                              {note.chiefComplaints || 'Routine Evaluation'}
                            </span>
                          </div>
                        </td>

                        {/* Clinical Findings */}
                        <td className="p-3.5">
                          {findingsCount > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md text-[10px] font-bold">
                                🦷 {findingsCount} Findings
                              </span>
                              <div className="text-[11px] text-slate-600 truncate max-w-xs">
                                {note.clinicalFindings.map((f: any) => `${f.finding}${f.toothNumber ? ` (#${f.toothNumber})` : ''}`).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] truncate max-w-xs block">
                              {note.diagnosis || 'Evaluation Complete'}
                            </span>
                          )}
                        </td>

                        {/* Recommended Treatments */}
                        <td className="p-3.5">
                          {treatmentsCount > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-bold">
                                💊 {treatmentsCount} Planned
                              </span>
                              <div className="text-[11px] text-slate-600 truncate max-w-xs">
                                {note.recommendedTreatments.map((t: any) => t.treatment).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Follow-up */}
                        <td className="p-3.5">
                          {note.followUpDate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              📅 {new Date(note.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedNoteDetail(note)}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                              title="View Full Note Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadNoteIntoForm(note)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                              title="Copy / Continue in Form"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE CALENDAR MODAL                                     */}
      {/* ============================================================== */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto font-sans animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Interactive Calendar Date Picker</h3>
                  <p className="text-xs text-slate-400">
                    {calendarTarget === 'followUp' ? 'Select patient review / follow-up appointment date' : 'Select planned treatment date'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Select:</span>
              <button
                type="button"
                onClick={() => applyCalendarDatePreset(1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => applyCalendarDatePreset(3)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => applyCalendarDatePreset(7)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => applyCalendarDatePreset(14)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => applyCalendarDatePreset(30)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
              >
                +1 Month
              </button>
            </div>

            {/* Month Navigation */}
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800 font-sans">
                    {calendarCurrentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCalendarCurrentMonth(now);
                      setCalendarPickedDate(todayStr);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarCurrentMonth(new Date(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth() - 1, 1));
                    }}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarCurrentMonth(new Date(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth() + 1, 1));
                    }}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-black uppercase text-slate-400">
                <span className="text-rose-500">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-rose-500">Sat</span>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((cell, idx) => {
                  const isPast = cell.dateStr < todayStr;
                  const isPicked = cell.dateStr === calendarPickedDate;
                  const bookingCount = cell.summary?.total || 0;

                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCalendarPickedDate(cell.dateStr)}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition flex flex-col items-center justify-between min-h-[52px] cursor-pointer border ${
                        isPicked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                          : cell.isToday
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black'
                          : cell.isCurrentMonth
                          ? 'bg-white hover:bg-blue-50/70 text-slate-800 border-slate-200/80 hover:border-blue-300'
                          : 'bg-slate-100/50 text-slate-300 border-transparent hover:bg-slate-100'
                      } ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-bold">{cell.dayNum}</span>
                        {cell.isToday && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isPicked ? 'bg-white' : 'bg-emerald-500'}`} />
                        )}
                      </div>

                      {bookingCount > 0 && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-extrabold w-full text-center truncate ${
                            isPicked ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {bookingCount} {bookingCount === 1 ? 'appt' : 'appts'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selection & Schedule Conflict Check */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Doctor Time Slots ({calendarPickedDate})
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {dayAppointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED').length} existing booked on this date
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(() => {
                  const visibleSlots = TIME_SLOTS.filter((s) => !isSlotPast(s, calendarPickedDate));
                  if (visibleSlots.length === 0) {
                    return (
                      <div className="col-span-full p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-semibold">
                        All time slots for today have already concluded. Please choose tomorrow or an upcoming date from the calendar.
                      </div>
                    );
                  }
                  const currentTreatmentAptId =
                    typeof calendarTarget === 'object' && calendarTarget.type === 'treatment'
                      ? treatmentsList[calendarTarget.index]?.appointmentId
                      : null;

                  return visibleSlots.map((slot) => {
                    const isBooked = dayAppointments.some((a) =>
                      isSlotConflictingWithAppointment(calendarPickedDate, slot, a, currentTreatmentAptId)
                    );

                    const isSelected = calendarPickedTime === slot;

                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={isBooked}
                        onClick={() => setCalendarPickedTime(slot)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : isBooked
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                            : 'bg-white hover:bg-blue-50/60 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{slot}</span>
                        {isBooked ? (
                          <span className="text-[9px] text-rose-500 font-bold ml-1">Booked</span>
                        ) : (
                          <span className={`text-[9px] font-bold ml-1 ${isSelected ? 'text-blue-100' : 'text-emerald-600'}`}>
                            Free
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Auto Schedule Appointment Option */}
            {selectedPatient && selectedDoctorId && (
              <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="autoBookAppt"
                  checked={autoBookAppointment}
                  onChange={(e) => setAutoBookAppointment(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="autoBookAppt" className="text-xs text-blue-950 font-medium cursor-pointer">
                  <strong>Create live appointment in Appointments Hub</strong>
                  <br />
                  <span className="text-[11px] text-blue-700">
                    Immediately reserves slot with Dr. {currentDoctor?.user?.fullName || 'Doctor'} on {calendarPickedDate} at {calendarPickedTime}. Reflected across queue, calendar, and patient timeline.
                  </span>
                </label>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-700">
                Selected: <span className="text-blue-700 font-mono">{calendarPickedDate}</span> ({calendarPickedTime})
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {onNavigateToAppointments && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCalendarModal(false);
                      onNavigateToAppointments(selectedPatient?.id);
                    }}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-200"
                    title="Open Main Appointments Hub"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Open Main Hub ➔</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bookingAppointmentLoading}
                  onClick={handleConfirmCalendarSelection}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {bookingAppointmentLoading ? (
                    <span>Booking Appointment...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Book Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW FULL NOTE DETAIL MODAL                                    */}
      {/* ============================================================== */}
      {selectedNoteDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Clinical Examination Record</h3>
                  <p className="text-xs text-slate-400">
                    Patient: {selectedNoteDetail.patient?.name} ({selectedNoteDetail.patient?.patientCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoteDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Patient & Doctor metadata */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedNoteDetail.patient?.name}</div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {selectedNoteDetail.patient?.patientCode} • {selectedNoteDetail.patient?.mobile}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Consulting Doctor</span>
                  <div className="font-bold text-slate-900 text-sm">
                    Dr. {selectedNoteDetail.doctor?.user?.fullName || 'Doctor'}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {selectedNoteDetail.doctor?.specialization || 'Clinical'} Specialist • Date:{' '}
                    {new Date(selectedNoteDetail.consultationDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Chief Complaints */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Chief Complaints
                </span>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 font-medium">
                  {selectedNoteDetail.chiefComplaints}
                </div>
                {selectedNoteDetail.detailedMedicalHistory && (
                  <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line">
                    {selectedNoteDetail.detailedMedicalHistory}
                  </p>
                )}
              </div>

              {/* Clinical Findings */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Clinical Findings & Dental Teeth Findings
                </span>
                {Array.isArray(selectedNoteDetail.clinicalFindings) && selectedNoteDetail.clinicalFindings.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedNoteDetail.clinicalFindings.map((f: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center justify-between text-teal-950"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-teal-200/80 text-teal-900 font-mono font-bold rounded text-[11px]">
                            {f.toothNumber ? `Tooth #${f.toothNumber}` : 'General'}
                          </span>
                          <span className="font-bold">{f.finding}</span>
                          {f.details && <span className="text-teal-700">({f.details})</span>}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {f.severity || 'Moderate'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    {selectedNoteDetail.diagnosis || 'Clinical evaluation completed.'}
                  </div>
                )}
              </div>

              {/* Recommended Treatments */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Recommended Treatment Plan
                </span>
                {Array.isArray(selectedNoteDetail.recommendedTreatments) &&
                selectedNoteDetail.recommendedTreatments.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedNoteDetail.recommendedTreatments.map((t: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-blue-950"
                      >
                        <div>
                          <div className="font-bold">{t.treatment}</div>
                          {t.advice && <div className="text-[11px] text-blue-700">{t.advice}</div>}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded block">
                            {t.priority || 'Normal'}
                          </span>
                          {t.plannedDate && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                              📅 {t.plannedDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    {selectedNoteDetail.treatmentRecommendations || 'None recorded.'}
                  </div>
                )}
              </div>

              {/* Follow-up & Remarks */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Follow-Up Review</span>
                  <div className="font-bold text-slate-800">
                    {selectedNoteDetail.followUpDate
                      ? new Date(selectedNoteDetail.followUpDate).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not scheduled'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">General Remarks</span>
                  <div className="text-slate-700 italic">{selectedNoteDetail.notes || '—'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedNoteDetail(null);
                  handleLoadNoteIntoForm(selectedNoteDetail);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Load / Continue in Form</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNoteDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
