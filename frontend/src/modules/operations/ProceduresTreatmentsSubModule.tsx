import React, { useState, useEffect, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileCheck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  X,
  Stethoscope,
  Info,
  Check,
  Layers,
  User,
  Clock,
  Pill,
  Trash2,
  BookOpen,
  Edit2,
  Tag,
  CheckSquare,
  Sparkles,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { Procedure, ProcedureMaster, Patient, Doctor } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { isSlotPast } from '../../services/timeUtils';

export const STANDARD_PROCEDURE_CATEGORIES = [
  'Consultation & Examination',
  'Restorative Procedures',
  'Endodontic Procedures',
  'Surgical Procedures',
  'Periodontal Procedures',
  'Prosthodontic Procedures',
  'Orthodontic Procedures',
  'Other Procedures',
];

export interface ProcedureCategoryGroup {
  category: string;
  procedures: string[];
}

export const PROCEDURE_CATEGORIES: ProcedureCategoryGroup[] = [
  {
    category: 'Consultation & Examination',
    procedures: ['Consultation', 'Dental Examination', 'Oral Examination', 'Diagnosis'],
  },
  {
    category: 'Restorative Procedures',
    procedures: [
      'Dental Filling',
      'GIC Restoration',
      'Composite Restoration',
      'Amalgam Restoration',
      'Crown Placement',
      'Bridge Placement',
      'Inlay / Onlay',
    ],
  },
  {
    category: 'Endodontic Procedures',
    procedures: ['Root Canal Treatment (RCT)', 'Re-RCT', 'Pulp Capping', 'Pulpotomy'],
  },
  {
    category: 'Surgical Procedures',
    procedures: [
      'Tooth Extraction',
      'Surgical Extraction',
      'Impacted Tooth Removal',
      'Irrigation',
      'Suture Placement',
      'Sutures Removal',
      'Incision and Drainage',
    ],
  },
  {
    category: 'Periodontal Procedures',
    procedures: ['Dental Scaling', 'Polishing', 'Deep Scaling', 'Root Planing', 'Gingival Treatment'],
  },
  {
    category: 'Prosthodontic Procedures',
    procedures: [
      'Denture Placement',
      'Denture Adjustment',
      'Impression Taking',
      'Temporary Crown Placement',
    ],
  },
  {
    category: 'Orthodontic Procedures',
    procedures: [
      'Orthodontic Consultation',
      'Orthodontic Alignment',
      'Braces Placement',
      'Retainer Placement',
    ],
  },
  {
    category: 'Other Procedures',
    procedures: [
      'Fluoride Application',
      'Sealant Application',
      'Tooth Whitening',
      'Other Procedure',
    ],
  },
];

interface ProceduresTreatmentsSubModuleProps {
  initialPatient?: Patient | null;
  onNavigateToBillingProcedure?: (procedure: Procedure) => void;
  onNavigateToAppointments?: (patientId?: string) => void;
  onNavigateToHistory?: (patient: Patient) => void;
}

export const ProceduresTreatmentsSubModule: React.FC<ProceduresTreatmentsSubModuleProps> = ({
  initialPatient = null,
  onNavigateToBillingProcedure,
  onNavigateToAppointments,
  onNavigateToHistory,
}) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureMasters, setProcedureMasters] = useState<ProcedureMaster[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-module view navigation: 'list' | 'create' | 'catalogue'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'catalogue'>('list');
  const [previousViewMode, setPreviousViewMode] = useState<'list' | 'create'>('list');

  // Filters for list view
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalogue Management Filters & Search
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState('ALL');
  const [catalogueStatusFilter, setCatalogueStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal for Add / Edit Permanent Catalogue Procedure
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<ProcedureMaster | null>(null);
  const [masterFormName, setMasterFormName] = useState('');
  const [masterFormCategory, setMasterFormCategory] = useState('Consultation & Examination');
  const [masterFormDescription, setMasterFormDescription] = useState('');
  const [masterFormCharge, setMasterFormCharge] = useState<number>(500);
  const [masterFormMins, setMasterFormMins] = useState<number>(45);
  const [masterFormActive, setMasterFormActive] = useState<boolean>(true);
  const [masterModalError, setMasterModalError] = useState<string | null>(null);
  const [masterModalSubmitting, setMasterModalSubmitting] = useState(false);

  // Standard clinic time slots for procedure scheduling
  const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  ];

  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // Create Procedure Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [patientDoctorNotice, setPatientDoctorNotice] = useState<string | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().substring(0, 10));
  const [procedureTime, setProcedureTime] = useState('10:00 AM');
  const [toothNumber, setToothNumber] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [customDentistName, setCustomDentistName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Planned' | 'In Progress' | 'Completed'>('Planned');
  const [charges, setCharges] = useState(0);

  // Interactive Calendar & Slot Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState<Date>(new Date());
  const [calendarPickedDate, setCalendarPickedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [calendarPickedTime, setCalendarPickedTime] = useState<string>('10:00 AM');
  const [autoScheduleAppointment, setAutoScheduleAppointment] = useState(true);
  const [bookedAppointmentCode, setBookedAppointmentCode] = useState<string | null>(null);
  const [bookingAppointmentLoading, setBookingAppointmentLoading] = useState(false);
  const [calendarBookedNotice, setCalendarBookedNotice] = useState<string | null>(null);
  const [calendarSummary, setCalendarSummary] = useState<Record<string, { total: number; dental: number; ortho: number; completed: number }>>({});
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [loadingDayAppointments, setLoadingDayAppointments] = useState(false);

  // Auto-fetch consulting doctor when patient is selected
  const handlePatientSelect = async (patient: Patient | null) => {
    setSelectedPatient(patient);
    setPatientDoctorNotice(null);
    if (!patient) return;
    try {
      const res = await api.get(`/appointments/patient-active/${patient.id}`);
      if (res.data.success && res.data.doctorId) {
        setDoctorId(res.data.doctorId);
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
    if (selectedPatient?.id && !doctorId) {
      api.get(`/appointments/patient-active/${selectedPatient.id}`)
        .then((res) => {
          if (res.data.success && res.data.doctorId) {
            setDoctorId(res.data.doctorId);
            const docName = res.data.doctor?.user?.fullName;
            if (docName) {
              setPatientDoctorNotice(`Doctor auto-assigned: Dr. ${docName}`);
            }
          }
        })
        .catch((err) => console.error('Error auto-fetching doctor for patient in procedure:', err));
    }
  }, [selectedPatient?.id, doctorId]);

  // Calendar Presets
  const applyCalendarDatePreset = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const dateStr = target.toISOString().substring(0, 10);
    setCalendarPickedDate(dateStr);
    setCalendarCurrentMonth(target);
  };

  // Live Month Summary for Procedures Calendar
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const y = calendarCurrentMonth.getFullYear();
        const m = calendarCurrentMonth.getMonth() + 1;
        const monthKey = `${y}-${String(m).padStart(2, '0')}`;
        const res = await api.get('/appointments/calendar-summary', {
          params: {
            month: monthKey,
            doctorId: doctorId || undefined,
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
  }, [calendarCurrentMonth, showCalendarModal, doctorId]);

  // Live Day Appointments for slot availability
  useEffect(() => {
    const fetchDayApts = async () => {
      if (!calendarPickedDate) return;
      try {
        setLoadingDayAppointments(true);
        const res = await api.get('/appointments', {
          params: {
            date: calendarPickedDate,
            doctorId: doctorId || undefined,
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
  }, [calendarPickedDate, showCalendarModal, doctorId]);

  // Auto-adjust calendarPickedTime to first upcoming slot on today
  useEffect(() => {
    if (showCalendarModal) {
      const visible = TIME_SLOTS.filter((s) => !isSlotPast(s, calendarPickedDate));
      if (!calendarPickedTime || isSlotPast(calendarPickedTime, calendarPickedDate)) {
        const firstFree = visible[0] || '';
        if (firstFree && firstFree !== calendarPickedTime) {
          setCalendarPickedTime(firstFree);
        }
      }
    }
  }, [calendarPickedDate, showCalendarModal]);

  // Compute month cells for Interactive Calendar modal
  const calendarDays = useMemo(() => {
    const year = calendarCurrentMonth.getFullYear();
    const month = calendarCurrentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      summary?: { total: number; dental: number; ortho: number; completed: number };
    }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        summary: calendarSummary[dateStr],
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        summary: calendarSummary[dateStr],
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        summary: calendarSummary[dateStr],
      });
    }

    return days;
  }, [calendarCurrentMonth, todayStr, calendarSummary]);

  const handleConfirmCalendarSelection = async () => {
    if (!calendarPickedDate) return;
    setProcedureDate(calendarPickedDate);
    setProcedureTime(calendarPickedTime);

    const doctorIdToUse = doctorId || (doctors.length > 0 ? doctors[0].id : null);
    if (autoScheduleAppointment && selectedPatient && doctorIdToUse) {
      try {
        setBookingAppointmentLoading(true);
        const doc = doctors.find((d) => d.id === doctorIdToUse);
        const spec = doc?.specialization || 'DENTAL';
        const [timePart, modifier] = (calendarPickedTime || '10:00 AM').split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        const [y, m, d] = calendarPickedDate.split('-').map(Number);
        const startDate = new Date(y, m - 1, d, hours, minutes, 0);

        const procName = selectedProcedures[0] || customProcedureInput.trim() || 'Procedure Treatment';
        const aptRes = await api.post('/appointments', {
          patientId: selectedPatient.id,
          doctorId: doctorIdToUse,
          specialization: spec,
          appointmentDate: calendarPickedDate,
          startTime: startDate.toISOString(),
          durationMinutes: 30,
          visitType: 'PROCEDURE',
          procedureName: procName,
          reasonForVisit: `Procedure Slot: ${selectedProcedures.join(', ') || procName}`,
        });

        if (aptRes.data.success) {
          const aptCode = aptRes.data.appointment?.appointmentCode || 'APT-SCHEDULED';
          setBookedAppointmentCode(aptCode);
          setCalendarBookedNotice(
            `Appointment (${aptCode}) successfully booked for ${selectedPatient.name} on ${calendarPickedDate} at ${calendarPickedTime} with Dr. ${doc?.user?.fullName || 'Doctor'}! It immediately reflects in the Appointments Module.`
          );
          setTimeout(() => setCalendarBookedNotice(null), 7000);
        }
      } catch (aptErr: any) {
        console.warn('Appointment booking notice:', aptErr.response?.data?.message);
        alert(aptErr.response?.data?.message || 'Could not schedule appointment slot.');
      } finally {
        setBookingAppointmentLoading(false);
      }
    }

    setShowCalendarModal(false);
  };

  // Medications Prescribed (Clinical Notes Only - not linked to pharmacy or billing)
  const [medications, setMedications] = useState<
    Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
      notes: string;
    }>
  >([]);

  const handleAddMedicineCard = () => {
    setMedications((prev) => [
      ...prev,
      {
        id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        notes: '',
      },
    ]);
  };

  const handleUpdateMedicine = (
    id: string,
    field: 'name' | 'dosage' | 'frequency' | 'duration' | 'instructions' | 'notes',
    value: string
  ) => {
    setMedications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveMedicineCard = (id: string) => {
    setMedications((prev) => prev.filter((item) => item.id !== id));
  };

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [updatingProcId, setUpdatingProcId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // If initialPatient is passed, open create view with that patient
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  const fetchData = async () => {
    try {
      const [procRes, masterRes, docRes] = await Promise.all([
        api.get('/procedures'),
        api.get('/procedures/masters?includeInactive=true'),
        api.get('/reports/doctors'),
      ]);
      if (procRes.data.success) setProcedures(procRes.data.procedures);
      if (masterRes.data.success) setProcedureMasters(masterRes.data.masters);
      if (docRes.data.success) {
        setDoctors(docRes.data.doctors);
        if (docRes.data.doctors.length > 0 && !doctorId) {
          setDoctorId(docRes.data.doctors[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleProcUpdate = () => {
      fetchData();
    };

    socket.on('procedure:scheduled', handleProcUpdate);
    socket.on('procedure:created', handleProcUpdate);
    socket.on('procedure:completed', handleProcUpdate);

    return () => {
      socket.off('procedure:scheduled', handleProcUpdate);
      socket.off('procedure:created', handleProcUpdate);
      socket.off('procedure:completed', handleProcUpdate);
    };
  }, []);

  const calculateEstimatedCharges = (procs: string[]) => {
    let total = 0;
    procs.forEach((pName) => {
      const matched = procedureMasters.find(
        (m) => m.name.toLowerCase() === pName.toLowerCase()
      );
      if (matched) {
        total += matched.standardCharge;
      } else {
        total += 500;
      }
    });
    return total;
  };

  // 1. Prefix-based Search for Procedure Selection in Create Form
  const filteredActiveMasters = useMemo(() => {
    const q = procedureSearch.trim().toLowerCase();
    if (!q) return [];
    return procedureMasters.filter((m) => {
      if (!m.isActive) return false;
      const name = m.name.trim().toLowerCase();
      // 1. Direct name starts with query prefix
      if (name.startsWith(q)) return true;
      // 2. Acronym in parentheses starts with query prefix (e.g. "Root Canal Treatment (RCT)" -> "(rct)" starts with "rc")
      const parenMatch = name.match(/\(([^)]+)\)/);
      if (parenMatch && parenMatch[1].toLowerCase().startsWith(q)) return true;
      // 3. Any word in procedure name starts with query prefix (e.g. "Dental Scaling" -> "scaling" starts with "sc")
      const words = name.split(/[\s/_-]+/);
      if (words.some((word) => word.startsWith(q))) return true;
      return false;
    });
  }, [procedureMasters, procedureSearch]);

  // 2. Catalogue View Filtering (Search, Category, Active/Inactive Status)
  const filteredCatalogueMasters = useMemo(() => {
    return procedureMasters.filter((m) => {
      if (catalogueStatusFilter === 'ACTIVE' && !m.isActive) return false;
      if (catalogueStatusFilter === 'INACTIVE' && m.isActive) return false;
      if (catalogueCategoryFilter !== 'ALL' && m.category !== catalogueCategoryFilter) return false;
      if (catalogueSearch.trim()) {
        const q = catalogueSearch.trim().toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesCode = (m.code || '').toLowerCase().includes(q);
        const matchesCat = (m.category || '').toLowerCase().includes(q);
        const matchesDesc = (m.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCat && !matchesDesc) return false;
      }
      return true;
    });
  }, [procedureMasters, catalogueStatusFilter, catalogueCategoryFilter, catalogueSearch]);

  // Catalogue Management Handlers
  const handleOpenAddMasterModal = (prefillName = '') => {
    setEditingMaster(null);
    setMasterFormName(prefillName);
    setMasterFormCategory('Consultation & Examination');
    setMasterFormDescription('');
    setMasterFormCharge(500);
    setMasterFormMins(45);
    setMasterFormActive(true);
    setMasterModalError(null);
    setIsMasterModalOpen(true);
  };

  const handleOpenEditMasterModal = (master: ProcedureMaster) => {
    setEditingMaster(master);
    setMasterFormName(master.name);
    setMasterFormCategory(master.category || 'Consultation & Examination');
    setMasterFormDescription(master.description || '');
    setMasterFormCharge(master.standardCharge || 500);
    setMasterFormMins(master.estimatedMins || 45);
    setMasterFormActive(master.isActive);
    setMasterModalError(null);
    setIsMasterModalOpen(true);
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterModalError(null);
    const trimmedName = masterFormName.trim();
    const trimmedCat = masterFormCategory.trim();

    if (!trimmedName) {
      setMasterModalError('Procedure name is required.');
      return;
    }
    if (!trimmedCat) {
      setMasterModalError('Procedure category is required.');
      return;
    }

    // Client-side duplicate check (case-insensitive)
    const duplicate = procedureMasters.find(
      (m) =>
        m.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (!editingMaster || m.id !== editingMaster.id)
    );
    if (duplicate) {
      setMasterModalError(`A procedure with this name already exists in the catalogue (${duplicate.code}).`);
      return;
    }

    setMasterModalSubmitting(true);
    try {
      if (editingMaster) {
        const res = await api.put(`/procedures/masters/${editingMaster.id}`, {
          name: trimmedName,
          category: trimmedCat,
          description: masterFormDescription.trim() || null,
          standardCharge: Number(masterFormCharge) || 500,
          estimatedMins: Number(masterFormMins) || 45,
          isActive: masterFormActive,
        });
        if (res.data.success) {
          setActionSuccessMessage(`Procedure "${res.data.master.name}" updated successfully.`);
          setIsMasterModalOpen(false);
          fetchData();
        }
      } else {
        const res = await api.post('/procedures/masters', {
          name: trimmedName,
          category: trimmedCat,
          description: masterFormDescription.trim() || null,
          standardCharge: Number(masterFormCharge) || 500,
          estimatedMins: Number(masterFormMins) || 45,
          isActive: masterFormActive,
        });
        if (res.data.success) {
          setActionSuccessMessage(`Procedure "${res.data.master.name}" permanently added to the catalogue!`);
          setIsMasterModalOpen(false);
          fetchData();

          // If currently inside the Create Procedure form, automatically add this new procedure to selections
          if (viewMode === 'create') {
            if (!selectedProcedures.includes(res.data.master.name)) {
              const updated = [...selectedProcedures, res.data.master.name];
              setSelectedProcedures(updated);
              setCharges(calculateEstimatedCharges(updated));
            }
            setProcedureSearch('');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setMasterModalError(err.response?.data?.message || 'Failed to save procedure to catalogue.');
    } finally {
      setMasterModalSubmitting(false);
    }
  };

  const handleToggleMasterStatus = async (master: ProcedureMaster) => {
    const newStatus = !master.isActive;
    try {
      const res = await api.patch(`/procedures/masters/${master.id}/status`, {
        isActive: newStatus,
      });
      if (res.data.success) {
        setActionSuccessMessage(
          `Procedure "${master.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`
        );
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update procedure status.');
    }
  };

  const handleSendToBilling = async (proc: Procedure) => {
    setUpdatingProcId(proc.id);
    setActionSuccessMessage(null);
    try {
      const res = await api.patch(`/procedures/${proc.id}/status`, {
        status: 'COMPLETED',
      });
      if (res.data.success) {
        setActionSuccessMessage(
          `Procedure ${proc.procedureCode} (${proc.procedureName || 'Dental Procedure'}) for ${proc.patient.name} marked as Completed & sent to Billing queue!`
        );
        fetchData();
        setTimeout(() => {
          setActionSuccessMessage(null);
        }, 5000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating procedure status');
    } finally {
      setUpdatingProcId(null);
    }
  };

  const navigateToCreate = (patientToPreselect?: Patient | null) => {
    setSelectedPatient(patientToPreselect || initialPatient || null);
    setSelectedProcedures([]);
    setProcedureSearch('');
    setCustomProcedureInput('');
    setProcedureDate(new Date().toISOString().substring(0, 10));
    setToothNumber('');
    setDescription('');
    setStatus('Planned');
    setFormError(null);
    setFormSuccess(null);
    setCharges(0);
    setMedications([]);

    if (doctors.length > 0) {
      setDoctorId(doctors[0].id);
      setCustomDentistName('');
    } else {
      setDoctorId('');
      setCustomDentistName('');
    }

    setViewMode('create');
  };

  const hasUnsavedChanges = useMemo(() => {
    return (
      (selectedPatient !== null && selectedPatient !== initialPatient) ||
      toothNumber.trim() !== '' ||
      description.trim() !== '' ||
      selectedProcedures.length > 0 ||
      customDentistName.trim() !== '' ||
      medications.some((m) => m.name.trim() !== '')
    );
  }, [selectedPatient, initialPatient, toothNumber, description, selectedProcedures, customDentistName, medications]);

  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes in this procedure form. Are you sure you want to discard and return to the list?'
      );
      if (!confirmed) return;
    }
    setViewMode('list');
  };

  const toggleProcedureSelection = (procName: string) => {
    if (selectedProcedures.includes(procName)) {
      const updated = selectedProcedures.filter((p) => p !== procName);
      setSelectedProcedures(updated);
      setCharges(calculateEstimatedCharges(updated));
    } else {
      const updated = [...selectedProcedures, procName];
      setSelectedProcedures(updated);
      setCharges(calculateEstimatedCharges(updated));
    }
  };

  const handleAddCustomProcedure = () => {
    const trimmed = customProcedureInput.trim();
    if (!trimmed) return;
    if (selectedProcedures.includes(trimmed)) {
      setCustomProcedureInput('');
      return;
    }
    const updated = [...selectedProcedures, trimmed];
    setSelectedProcedures(updated);
    setCustomProcedureInput('');
    setCharges(calculateEstimatedCharges(updated));
  };

  const removeProcedureChip = (procName: string) => {
    const updated = selectedProcedures.filter((p) => p !== procName);
    setSelectedProcedures(updated);
    setCharges(calculateEstimatedCharges(updated));
  };

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedPatient) {
      setFormError('Please search and select a patient.');
      return;
    }
    if (selectedProcedures.length === 0) {
      setFormError('Please select at least one procedure.');
      return;
    }

    setSubmitting(true);
    try {
      let dentistNameToSave: string | null = null;
      if (doctorId) {
        const doc = doctors.find((d) => d.id === doctorId);
        if (doc) dentistNameToSave = `Dr. ${doc.user?.fullName}`;
      } else if (customDentistName.trim()) {
        dentistNameToSave = customDentistName.trim();
      }

      let apiStatus = 'PLANNED';
      if (status === 'In Progress') apiStatus = 'IN_PROGRESS';
      if (status === 'Completed') apiStatus = 'COMPLETED';

      // Prepare prescribed medications (strictly clinical notes - no pharmacy or billing impact)
      const validMeds = medications
        .filter((m) => m && m.name && m.name.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || null,
          frequency: m.frequency.trim() || null,
          duration: m.duration.trim() || null,
          instructions: m.instructions.trim() || null,
          notes: m.notes.trim() || null,
        }));

      const res = await api.post('/procedures', {
        patientId: selectedPatient.id,
        doctorId: doctorId || null,
        dentistName: dentistNameToSave,
        procedureNames: selectedProcedures,
        procedureName: selectedProcedures[0],
        procedureDate: procedureDate,
        toothNumber: toothNumber.trim() || null,
        charges: Number(charges) || 0,
        clinicalNotes: description.trim() || null,
        procedureDescription: description.trim() || null,
        status: apiStatus,
        prescribedMedications: validMeds.length > 0 ? validMeds : undefined,
      });

      if (res.data.success) {
        let appointmentNotice = '';
        if (bookedAppointmentCode) {
          appointmentNotice = ` & Linked to Appointment (${bookedAppointmentCode})`;
        } else if (autoScheduleAppointment && selectedPatient && (doctorId || doctors[0]?.id)) {
          const doctorIdToUse = doctorId || doctors[0].id;
          try {
            const doc = doctors.find((d) => d.id === doctorIdToUse);
            const spec = doc?.specialization || 'DENTAL';
            const [timePart, modifier] = (procedureTime || '10:00 AM').split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const [y, m, d] = procedureDate.split('-').map(Number);
            const startDate = new Date(y, m - 1, d, hours, minutes, 0);

            const aptRes = await api.post('/appointments', {
              patientId: selectedPatient.id,
              doctorId: doctorIdToUse,
              specialization: spec,
              appointmentDate: procedureDate,
              startTime: startDate.toISOString(),
              durationMinutes: 30,
              visitType: 'PROCEDURE',
              procedureName: selectedProcedures[0] || 'Procedure',
              reasonForVisit: `Procedure: ${selectedProcedures.join(', ') || 'Procedure'}`,
            });
            if (aptRes.data.success) {
              const aptCode = aptRes.data.appointment?.appointmentCode || 'APT-SCHEDULED';
              appointmentNotice = ` & Appointment (${aptCode}) scheduled for ${procedureDate} at ${procedureTime}`;
            }
          } catch (aptErr: any) {
            console.warn('Appointment auto-booking notice:', aptErr.response?.data?.message);
          }
        }

        setFormSuccess(
          selectedProcedures.length === 1
            ? `Procedure "${selectedProcedures[0]}" recorded successfully for ${selectedPatient.name}${appointmentNotice}!`
            : `${selectedProcedures.length} procedures recorded successfully for ${selectedPatient.name}${appointmentNotice}!`
        );
        fetchData();
        setTimeout(() => {
          setViewMode('list');
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save procedure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter procedures for list view
  const filteredProcedures = useMemo(() => {
    return procedures.filter((proc) => {
      const matchesStatus =
        statusFilter === 'ALL' || proc.status.toUpperCase() === statusFilter.toUpperCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        proc.procedureCode.toLowerCase().includes(q) ||
        proc.patient?.name.toLowerCase().includes(q) ||
        proc.patient?.patientCode.toLowerCase().includes(q) ||
        (proc.procedureName || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [procedures, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Action Success Toast Banner */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Appointment Slot Booked Toast Banner */}
      {calendarBookedNotice && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl text-blue-950 text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-semibold">{calendarBookedNotice}</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToAppointments && (
              <button
                type="button"
                onClick={() => onNavigateToAppointments(selectedPatient?.id)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Go to Appointments
              </button>
            )}
            <button
              type="button"
              onClick={() => setCalendarBookedNotice(null)}
              className="text-blue-700 hover:text-blue-900 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {/* Top Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Procedures & Treatments</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record and manage clinical dental procedures actually performed during patient visits.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPreviousViewMode('list');
                  setViewMode('catalogue');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-200"
                title="View full procedure catalogue and manage master procedures"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Procedure Catalogue</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToCreate()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Procedure</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search patient, code, procedure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Procedures Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Loading procedure records...</div>
            ) : filteredProcedures.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Scissors className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No procedure records found matching your filters.</p>
                <button
                  type="button"
                  onClick={() => navigateToCreate()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Procedure</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 pl-5">Procedure Code</th>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Procedure Name</th>
                      <th className="p-3.5">Dentist / Doctor</th>
                      <th className="p-3.5">Tooth #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Fee (₹)</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProcedures.map((proc) => {
                      const isCompleted = proc.status === 'COMPLETED';
                      const isInvoiced = !!proc.operationInvoice;

                      return (
                        <tr key={proc.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                            {proc.procedureCode}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{proc.patient?.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {proc.patient?.patientCode}
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {proc.procedureName || proc.procedureMaster?.name || 'Procedure'}
                          </td>
                          <td className="p-3.5 text-slate-700">
                            {proc.doctor?.user?.fullName
                              ? `Dr. ${proc.doctor.user.fullName}`
                              : proc.dentistName || '—'}
                          </td>
                          <td className="p-3.5 font-mono">
                            {proc.toothNumber ? (
                              <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 font-bold text-slate-800">
                                #{proc.toothNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-slate-600">
                            {new Date(proc.procedureDate).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">₹{proc.charges}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                proc.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : proc.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {proc.status}
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                            {!isCompleted ? (
                              <button
                                type="button"
                                disabled={updatingProcId === proc.id}
                                onClick={() => handleSendToBilling(proc)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{updatingProcId === proc.id ? 'Updating...' : 'Complete & Bill'}</span>
                              </button>
                            ) : isInvoiced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                <FileCheck className="w-3.5 h-3.5" />
                                Invoiced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Awaiting Billing
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DEDICATED FULL-PAGE CREATE PROCEDURE */}
      {viewMode === 'create' && (
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                title="Back to Procedures List"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Record Dental Procedure</h2>
                <p className="text-xs text-slate-500">
                  Select performed procedures, dentist, tooth number, status, and fee details.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviousViewMode('create');
                  setViewMode('catalogue');
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
                title="Browse Full Procedure Catalogue"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Procedure Catalogue</span>
              </button>
              <button
                type="button"
                onClick={handleBackToList}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveProcedure} className="space-y-6">
            {/* 1. Patient Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>1. Patient Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Patient Name <span className="text-rose-500">*</span>
                  </label>
                  <PatientSearchSelect
                    selectedPatient={selectedPatient}
                    onSelect={(p) => handlePatientSelect(p)}
                  />
                  {patientDoctorNotice && (
                    <div className="mt-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{patientDoctorNotice}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Patient ID (Auto-populated)</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    {selectedPatient ? (
                      <>
                        <span className="font-mono text-xs font-black text-blue-700">{selectedPatient.patientCode}</span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {selectedPatient.gender}, {selectedPatient.age} yrs
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Select patient above</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Search-Based Procedure Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-blue-600" />
                  <span>2. Procedures Selection (Search-Based)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Search procedures by typing starting prefix or name. Select one or multiple procedures for this visit.
                </p>
              </div>

              {/* Selected Procedures Section */}
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Selected Procedures for this Visit:</span>
                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                      {selectedProcedures.length}
                    </span>
                  </span>
                  <span className="text-[11px] text-blue-800 font-bold">
                    Est. Base Charges: ₹{charges}
                  </span>
                </div>

                {selectedProcedures.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1">
                    No procedures selected yet. Search below to add procedures for this visit.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedProcedures.map((proc) => {
                      const matchedMaster = procedureMasters.find(
                        (m) => m.name.toLowerCase() === proc.toLowerCase()
                      );
                      return (
                        <span
                          key={proc}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-bold shadow-2xs group"
                        >
                          <span>{proc}</span>
                          {matchedMaster?.standardCharge ? (
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                              ₹{matchedMaster.standardCharge}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeProcedureChip(proc)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition cursor-pointer"
                            title={`Remove ${proc}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Procedure Search Field */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Type procedure name or starting characters (e.g. 'R', 'RC', 'Sc', 'Consultation', 'Crown')..."
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-9 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium placeholder:text-slate-400"
                />
                {procedureSearch && (
                  <button
                    type="button"
                    onClick={() => setProcedureSearch('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results Area */}
              {procedureSearch.trim().length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Search Results for "{procedureSearch}" ({filteredActiveMasters.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setProcedureSearch('')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>

                  {filteredActiveMasters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredActiveMasters.map((master) => {
                        const isSelected = selectedProcedures.includes(master.name);
                        return (
                          <div
                            key={master.id}
                            onClick={() => toggleProcedureSelection(master.name)}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-300 shadow-2xs ring-1 ring-blue-400'
                                : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {master.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  {master.category}
                                </span>
                                <span className="text-[11px] font-bold text-blue-700">
                                  ₹{master.standardCharge}
                                </span>
                              </div>
                              {master.description && (
                                <p className="text-[11px] text-slate-500 truncate">{master.description}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ Selected' : '+ Select'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No catalogue procedure found starting with "{procedureSearch}".</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        You can use "{procedureSearch}" as a custom procedure for this visit only.
                      </p>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = procedureSearch.trim();
                            if (trimmed && !selectedProcedures.includes(trimmed)) {
                              const updated = [...selectedProcedures, trimmed];
                              setSelectedProcedures(updated);
                              setCharges(calculateEstimatedCharges(updated));
                            }
                            setProcedureSearch('');
                          }}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          <span>Use "{procedureSearch}" for this Visit Only</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* One-Time Custom Visit Procedure Entry */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Need a one-time custom procedure?</span> Enter custom name below for this visit only without modifying the catalogue.
                </div>

                <div className="flex items-center gap-2 sm:w-80">
                  <input
                    type="text"
                    placeholder="Enter custom visit procedure name..."
                    value={customProcedureInput}
                    onChange={(e) => setCustomProcedureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomProcedure();
                      }
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomProcedure}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shrink-0 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Medications Prescribed (Clinical Notes Only) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <span>3. Medications Prescribed (Clinical Notes Only)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Record medicines written in the doctor's prescription for clinical documentation. Strictly clinical notes — does NOT trigger pharmacy dispensing, inventory deduction, or billing charges.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMedicineCard}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medicine</span>
                </button>
              </div>

              {/* Medicine Cards List */}
              {medications.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Pill className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">No medicines prescribed for this visit</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    Optional: You can record one or more medicines from the doctor's prescription if prescribed.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddMedicineCard}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Prescribed Medicine</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {medications.map((med, index) => (
                    <div
                      key={med.id}
                      className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl space-y-3 transition"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                            {index + 1}
                          </span>
                          <span>Prescription Medicine #{index + 1}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineCard(med.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
                          title="Remove medicine card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        {/* Medicine Name (Required for this item) */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Medicine Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Amoxicillin, Paracetamol..."
                            value={med.name}
                            onChange={(e) => handleUpdateMedicine(med.id, 'name', e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                          />
                        </div>

                        {/* Dosage */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Dosage (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 500 mg, 250 mg"
                            value={med.dosage}
                            onChange={(e) => handleUpdateMedicine(med.id, 'dosage', e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Frequency */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Frequency (Optional)
                          </label>
                          <input
                            type="text"
                            list={`freq-list-${med.id}`}
                            placeholder="e.g. Twice daily"
                            value={med.frequency}
                            onChange={(e) => handleUpdateMedicine(med.id, 'frequency', e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <datalist id={`freq-list-${med.id}`}>
                            <option value="Once daily" />
                            <option value="Twice daily" />
                            <option value="Thrice daily" />
                            <option value="Four times daily" />
                            <option value="As needed (SOS)" />
                          </datalist>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Duration (Optional)
                          </label>
                          <input
                            type="text"
                            list={`dur-list-${med.id}`}
                            placeholder="e.g. 5 days"
                            value={med.duration}
                            onChange={(e) => handleUpdateMedicine(med.id, 'duration', e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <datalist id={`dur-list-${med.id}`}>
                            <option value="3 days" />
                            <option value="5 days" />
                            <option value="7 days" />
                            <option value="10 days" />
                            <option value="14 days" />
                          </datalist>
                        </div>

                        {/* Instructions */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Instructions (Optional)
                          </label>
                          <input
                            type="text"
                            list={`inst-list-${med.id}`}
                            placeholder="e.g. After food"
                            value={med.instructions}
                            onChange={(e) => handleUpdateMedicine(med.id, 'instructions', e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <datalist id={`inst-list-${med.id}`}>
                            <option value="After food" />
                            <option value="Before food" />
                            <option value="At bedtime" />
                            <option value="With water" />
                            <option value="Empty stomach" />
                          </datalist>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Additional Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Complete full course, avoid alcohol, take with plenty of water..."
                          value={med.notes}
                          onChange={(e) => handleUpdateMedicine(med.id, 'notes', e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Treatment & Clinical Parameters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>4. Treatment & Clinical Parameters</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Procedure Date & Slot <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarPickedDate(procedureDate || todayStr);
                        setCalendarCurrentMonth(procedureDate ? new Date(procedureDate) : new Date());
                        setCalendarPickedTime(procedureTime || '10:00 AM');
                        setShowCalendarModal(true);
                      }}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Select date and slot from interactive calendar"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                      <span>Interactive Calendar</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={procedureDate}
                      onChange={(e) => setProcedureDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      required
                    />
                    <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-2 rounded-xl whitespace-nowrap">
                      {procedureTime}
                    </span>
                  </div>
                  {autoScheduleAppointment && (
                    <p className="text-[10px] text-blue-600 font-medium">
                      ✓ Auto-books appointment in Appointments Hub
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tooth Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14, 21, 36"
                    value={toothNumber}
                    onChange={(e) => setToothNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Dentist / Doctor</label>
                  <select
                    value={doctorId}
                    onChange={(e) => {
                      setDoctorId(e.target.value);
                      if (e.target.value) setCustomDentistName('');
                    }}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">-- Choose Clinic Doctor --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.user?.fullName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Procedure Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Treatment Details & Clinical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Record clinical details, materials used, patient tolerance, or instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estimated Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={charges}
                    onChange={(e) => setCharges(Number(e.target.value))}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Standard fee auto-calculated based on selected procedures.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleBackToList}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span>Recording Procedure...</span>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Save Performed Procedure</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 3: PROCEDURE CATALOGUE / LIST */}
      {viewMode === 'catalogue' && (
        <div className="space-y-5">
          {/* Top Bar with Navigation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode(previousViewMode)}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                title={`Back to ${previousViewMode === 'create' ? 'Record Procedure' : 'Procedures List'}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-0.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Procedure Catalogue & Master Management</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Procedure List & Catalogue</h2>
                <p className="text-xs text-slate-500">
                  Hospital master catalogue of dental procedures, categories, standard fees, and active clinical status.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenAddMasterModal()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Procedure</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total in Catalogue</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{procedureMasters.length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active Procedures</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">
                {procedureMasters.filter((m) => m.isActive).length}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inactive Procedures</div>
              <div className="text-lg font-black text-slate-600 mt-0.5">
                {procedureMasters.filter((m) => !m.isActive).length}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Filtered Matches</div>
              <div className="text-lg font-black text-blue-700 mt-0.5">{filteredCatalogueMasters.length}</div>
            </div>
          </div>

          {/* Search & Category / Status Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search catalogue by name, code, description..."
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {catalogueSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogueSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={catalogueCategoryFilter}
                onChange={(e) => setCatalogueCategoryFilter(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ALL">All Categories ({procedureMasters.length})</option>
                {STANDARD_PROCEDURE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({procedureMasters.filter((m) => m.category === cat).length})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={catalogueStatusFilter}
                onChange={(e) => setCatalogueStatusFilter(e.target.value as any)}
                className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only ({procedureMasters.filter((m) => m.isActive).length})</option>
                <option value="INACTIVE">Inactive Only ({procedureMasters.filter((m) => !m.isActive).length})</option>
              </select>

              {(catalogueSearch || catalogueCategoryFilter !== 'ALL' || catalogueStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setCatalogueSearch('');
                    setCatalogueCategoryFilter('ALL');
                    setCatalogueStatusFilter('ALL');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline px-1 cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Catalogue Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {filteredCatalogueMasters.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No procedures match your filter criteria</p>
                <p className="text-[11px] text-slate-400">
                  Try adjusting your search query, category, or status filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogueSearch('');
                    setCatalogueCategoryFilter('ALL');
                    setCatalogueStatusFilter('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="p-3 pl-5">Procedure Name</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Standard Fee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalogueMasters.map((master) => (
                      <tr key={master.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 pl-5 font-bold text-slate-900">
                          {master.name}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {master.code}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {master.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">
                          {master.description || <span className="italic text-slate-300">None</span>}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          ₹{master.standardCharge}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              master.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                master.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            <span>{master.isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="p-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMasterModal(master)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Edit Procedure"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleMasterStatus(master)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                master.isActive
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title={master.isActive ? 'Deactivate procedure' : 'Activate procedure'}
                            >
                              <span>{master.isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PERMANENT CATALOGUE PROCEDURE */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  {editingMaster ? 'Edit Catalogue Procedure' : 'Add New Procedure to Catalogue'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Permanent hospital procedure entry for clinical records and scheduling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMasterModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMaster} className="p-6 space-y-4">
              {masterModalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{masterModalError}</span>
                </div>
              )}

              {/* Procedure Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Procedure Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Composite Restoration, Gingivectomy, Tooth Bleaching..."
                  value={masterFormName}
                  onChange={(e) => setMasterFormName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Procedure Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={masterFormCategory}
                  onChange={(e) => setMasterFormCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  required
                >
                  {STANDARD_PROCEDURE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Standard Charge & Estimated Minutes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Standard Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={masterFormCharge}
                    onChange={(e) => setMasterFormCharge(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Est. Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="e.g. 45"
                    value={masterFormMins}
                    onChange={(e) => setMasterFormMins(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Procedure Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinical purpose, indications, or steps for this procedure..."
                  value={masterFormDescription}
                  onChange={(e) => setMasterFormDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-700"
                />
              </div>

              {/* Status Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catalogue Status
                </label>
                <div className="flex items-center gap-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                    <input
                      type="radio"
                      name="masterStatus"
                      checked={masterFormActive === true}
                      onChange={() => setMasterFormActive(true)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Active (Available in Search)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="masterStatus"
                      checked={masterFormActive === false}
                      onChange={() => setMasterFormActive(false)}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>Inactive (Hidden from Search)</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMasterModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={masterModalSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {masterModalSubmitting ? (
                    <span>Saving to Catalogue...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingMaster ? 'Save Changes' : 'Add to Catalogue'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE CALENDAR & SLOT MODAL FOR PROCEDURES               */}
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
                  <h3 className="text-base font-black text-slate-900">Interactive Calendar & Slot Picker</h3>
                  <p className="text-xs text-slate-400">
                    Schedule procedure visit date & real-time doctor availability slot
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
                  return visibleSlots.map((slot) => {
                    const isBooked = dayAppointments.some((a) => {
                      if (a.status === 'CANCELLED' || a.status === 'COMPLETED') return false;
                      const aptTime = new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return aptTime === slot;
                    });

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
            {selectedPatient && (doctorId || doctors.length > 0) && (
              <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="procAutoBookAppt"
                  checked={autoScheduleAppointment}
                  onChange={(e) => setAutoScheduleAppointment(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="procAutoBookAppt" className="text-xs text-blue-950 font-medium cursor-pointer">
                  <strong>Sync slot directly to Appointments Hub</strong>
                  <br />
                  <span className="text-[11px] text-blue-700">
                    Immediately reserves procedure slot on {calendarPickedDate} at {calendarPickedTime}. Displays across reception calendar, doctor queue, and patient records in real-time.
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{bookingAppointmentLoading ? 'Reserving Slot...' : 'Confirm Date & Slot'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
