import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  AlertCircle,
  Eye,
  Edit2,
  FileText,
  CreditCard,
  Pill,
  Scissors,
  CheckCircle2,
  X,
  History,
  Download,
  Clock,
  Activity,
  ArrowRight,
  UserCheck,
  DollarSign,
  ChevronRight,
  Filter,
  User,
  Mail,
  MapPin,
  AlertTriangle,
  Check,
  UserPlus,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { Patient } from '../../types';
import { getSocket } from '../../services/socket';
import { generatePatientReportPDF } from '../../services/pdfService';

interface PatientModuleProps {
  initialPatientId?: string | null;
  onNavigateToNotes?: (patientId: string) => void;
  onNavigateToBilling?: (patientId: string) => void;
  onNavigateToPharmacy?: (patientId: string) => void;
  onNavigateToAppointment?: (patientId: string) => void;
}

type TabType = 'timeline' | 'appointments' | 'procedures' | 'notes' | 'billing';

export const PatientModule: React.FC<PatientModuleProps> = ({
  initialPatientId,
  onNavigateToNotes,
  onNavigateToBilling,
  onNavigateToPharmacy,
  onNavigateToAppointment,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId || null);
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Newest first, 'asc' = Chronological

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Registration form
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    dob: '',
    age: '',
    gender: 'MALE',
    address: '',
    medicalAlerts: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients', { params: { search } });
      if (res.data.success) {
        setPatients(res.data.patients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (id: string) => {
    setLoadingProfile(true);
    try {
      const res = await api.get(`/patients/${id}`);
      if (res.data.success) {
        setPatientProfile(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search]);

  useEffect(() => {
    setSelectedPatientId(initialPatientId || null);
  }, [initialPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchProfile(selectedPatientId);
    } else {
      setPatientProfile(null);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    const socket = getSocket();
    const handlePatientUpdate = (patient: Patient) => {
      fetchPatients();
      if (selectedPatientId === patient.id) {
        fetchProfile(patient.id);
      }
    };

    socket.on('patient:registered', handlePatientUpdate);
    socket.on('patient:updated', handlePatientUpdate);
    socket.on('clinical-note:saved', () => {
      if (selectedPatientId) fetchProfile(selectedPatientId);
    });
    socket.on('billing:consultation-created', () => {
      if (selectedPatientId) fetchProfile(selectedPatientId);
    });
    socket.on('billing:payment-received', () => {
      if (selectedPatientId) fetchProfile(selectedPatientId);
    });
    const handleProcedureUpdate = () => {
      if (selectedPatientId) fetchProfile(selectedPatientId);
    };
    socket.on('procedure:created', handleProcedureUpdate);
    socket.on('procedure:scheduled', handleProcedureUpdate);
    socket.on('procedure:completed', handleProcedureUpdate);

    const handleAppointmentUpdate = () => {
      fetchPatients();
      if (selectedPatientId) fetchProfile(selectedPatientId);
    };
    socket.on('appointment:created', handleAppointmentUpdate);
    socket.on('appointment:updated', handleAppointmentUpdate);
    socket.on('appointment:rescheduled', handleAppointmentUpdate);

    return () => {
      socket.off('patient:registered', handlePatientUpdate);
      socket.off('patient:updated', handlePatientUpdate);
      socket.off('appointment:created', handleAppointmentUpdate);
      socket.off('appointment:updated', handleAppointmentUpdate);
      socket.off('appointment:rescheduled', handleAppointmentUpdate);
      socket.off('clinical-note:saved');
      socket.off('billing:consultation-created');
      socket.off('billing:payment-received');
      socket.off('procedure:created', handleProcedureUpdate);
      socket.off('procedure:scheduled', handleProcedureUpdate);
      socket.off('procedure:completed', handleProcedureUpdate);
    };
  }, [selectedPatientId]);

  const handleMobileInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: cleaned }));
  };

  const handleAgeCalculation = (dobStr: string) => {
    setFormData((prev) => ({ ...prev, dob: dobStr }));
    if (!dobStr) return;
    try {
      const birth = new Date(dobStr);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 125) {
        setFormData((prev) => ({ ...prev, age: age.toString() }));
      }
    } catch {}
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFormError('Patient full name is required (at least 2 letters).');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile)) {
      setFormError('Mobile number must be exactly 10 digits (e.g. 9876543210).');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setFormError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      setFormError('Please enter a valid age between 0 and 125.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email ? formData.email.trim() : undefined,
        dob: formData.dob || undefined,
        age: ageNum,
        gender: formData.gender,
        address: formData.address ? formData.address.trim() : undefined,
        medicalAlerts: formData.medicalAlerts ? formData.medicalAlerts.trim() : undefined,
      };

      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, payload);
        if (selectedPatientId === editingPatient.id) {
          fetchProfile(editingPatient.id);
        }
      } else {
        const res = await api.post('/patients', payload);
        if (res.data.success) {
          setSelectedPatientId(res.data.patient.id);
        }
      }

      setShowRegisterModal(false);
      setEditingPatient(null);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        dob: '',
        age: '',
        gender: 'MALE',
        address: '',
        medicalAlerts: '',
      });
      fetchPatients();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Error saving patient details';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: Patient) => {
    setEditingPatient(p);
    let formattedDob = '';
    if (p.dob) {
      try {
        formattedDob = typeof p.dob === 'string' ? p.dob.substring(0, 10) : new Date(p.dob).toISOString().substring(0, 10);
      } catch (e) {
        formattedDob = '';
      }
    }
    setFormData({
      name: p.name,
      mobile: p.mobile,
      email: p.email || '',
      dob: formattedDob,
      age: p.age ? p.age.toString() : '',
      gender: p.gender || 'MALE',
      address: p.address || '',
      medicalAlerts: p.medicalAlerts || '',
    });
    setFormError('');
    setShowRegisterModal(true);
  };

  // Clean Doctor Name formatter to avoid "Dr. Dr. ..."
  const formatDoctorName = (name?: string): string => {
    if (!name) return 'Doctor';
    const clean = name.trim();
    if (clean.toLowerCase().startsWith('dr.') || clean.toLowerCase().startsWith('dr ')) {
      return clean;
    }
    return `Dr. ${clean}`;
  };

  // Safe Exact Date & Time Parser
  const parseExactDateTime = (dateVal: any, timeVal?: any) => {
    let ts = 0;
    let dStr = '—';
    let tStr = '—';

    if (!dateVal && !timeVal) {
      return { timestamp: 0, dateStr: '—', timeStr: '—', fullStr: '—' };
    }

    try {
      const rawDate = dateVal ? String(dateVal) : '';
      const rawTime = timeVal ? String(timeVal) : '';

      let year = 1970,
        month = 0,
        day = 1,
        hours = 0,
        minutes = 0;
      let hasDate = false;
      let hasTime = false;

      if (rawDate.includes('T') && rawDate.includes(':')) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          ts = d.getTime();
          year = d.getFullYear();
          month = d.getMonth();
          day = d.getDate();
          hours = d.getHours();
          minutes = d.getMinutes();
          hasDate = true;
          if (hours !== 0 || minutes !== 0) hasTime = true;
        }
      } else if (rawDate.includes('-')) {
        const parts = rawDate.substring(0, 10).split('-').map(Number);
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          year = parts[0];
          month = parts[1] - 1;
          day = parts[2];
          hasDate = true;
        }
      }

      if (rawTime) {
        if (rawTime.includes('T') && rawTime.includes(':')) {
          const d = new Date(rawTime);
          if (!isNaN(d.getTime())) {
            hours = d.getHours();
            minutes = d.getMinutes();
            hasTime = true;
            if (!hasDate) {
              year = d.getFullYear();
              month = d.getMonth();
              day = d.getDate();
              hasDate = true;
            }
          }
        } else if (rawTime.includes(':')) {
          const parts = rawTime.split(':');
          hours = parseInt(parts[0], 10) || 0;
          minutes = parseInt(parts[1], 10) || 0;
          hasTime = true;
        }
      }

      const finalDate = new Date(year, month, day, hours, minutes);
      ts = finalDate.getTime();

      dStr = finalDate.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (hasTime) {
        tStr = finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        tStr = 'Scheduled';
      }

      return {
        timestamp: ts,
        dateStr: dStr,
        timeStr: tStr,
        fullStr: hasTime ? `${dStr} • ${tStr}` : dStr,
      };
    } catch {
      return { timestamp: 0, dateStr: String(dateVal || '—'), timeStr: '—', fullStr: String(dateVal || '—') };
    }
  };

  // Filtered patients list
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;
      if (alertFilter === 'ALERTS' && !p.medicalAlerts) return false;
      return true;
    });
  }, [patients, genderFilter, alertFilter]);

  // Unified Chronological Timeline Items (Sorted Strictly by Date & Time)
  const timelineEvents = useMemo(() => {
    if (!patientProfile?.patient) return [];
    const p = patientProfile.patient;
    const list: any[] = [];

    // 1. Initial Intake & Registration
    const regDate = p.registrationDate || p.createdAt;
    if (regDate) {
      const dt = parseExactDateTime(regDate);
      list.push({
        type: 'REGISTRATION',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Patient Intake & Registration`,
        subtitle: `Registered Code: ${p.patientCode} • Mobile: ${p.mobile} • ${p.gender}, ${p.age} yrs`,
        details: p.medicalAlerts ? `Medical Alerts: ${p.medicalAlerts}` : `Official clinic registration completed`,
        status: 'COMPLETED',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: UserPlus,
        raw: p,
      });
    }

    // 2. Appointments
    (p.appointments || []).forEach((apt: any) => {
      const dt = parseExactDateTime(apt.appointmentDate, apt.startTime);
      list.push({
        type: 'APPOINTMENT',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Appointment: ${apt.procedureName || apt.visitType || 'General Consultation'}`,
        subtitle: `${formatDoctorName(apt.doctor?.user?.fullName)} (${apt.specialization || 'DENTAL'}) • Slot: ${apt.timeSlot || dt.timeStr}`,
        status: apt.status || 'SCHEDULED',
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
        icon: Calendar,
        raw: apt,
      });
    });

    // 3. Clinical Notes
    (p.clinicalNotes || []).forEach((cn: any) => {
      const dt = parseExactDateTime(cn.consultationDate || cn.createdAt);
      list.push({
        type: 'CLINICAL_NOTE',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Clinical Note & Diagnosis`,
        subtitle: `${formatDoctorName(cn.doctor?.user?.fullName)} • Complaint: ${cn.chiefComplaints || 'Checkup'}`,
        details: cn.diagnosis ? `Diagnosis: ${cn.diagnosis}` : undefined,
        recommendations: cn.treatmentRecommendations,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: FileText,
        raw: cn,
      });
    });

    // 4. Procedures
    (p.procedures || []).forEach((proc: any) => {
      const dt = parseExactDateTime(proc.procedureDate || proc.createdAt);
      const procName = proc.procedureName || proc.procedureMaster?.name || 'Procedure';
      const dentist = proc.doctor?.user?.fullName || proc.dentistName || 'Dentist';
      list.push({
        type: 'PROCEDURE',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Procedure: ${procName}`,
        subtitle: `${formatDoctorName(dentist)}${proc.toothNumber ? ` • Tooth #${proc.toothNumber}` : ''}`,
        details: proc.clinicalNotes,
        status: (proc.status || 'PLANNED').toUpperCase(),
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: Scissors,
        raw: proc,
      });
    });

    // 5. Consultation Bills
    (p.consultationBills || []).forEach((bill: any) => {
      const dt = parseExactDateTime(bill.billDate || bill.createdAt);
      list.push({
        type: 'BILL',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Invoice #${bill.invoiceNumber}`,
        subtitle: `Consultation Fee: ₹${bill.totalAmount} • Paid: ₹${bill.paidAmount} • Due: ₹${bill.pendingBalance}`,
        status: bill.paymentStatus || 'PENDING',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: CreditCard,
        raw: bill,
      });
    });

    // 6. Pharmacy Sales
    (p.pharmacySales || []).forEach((sale: any) => {
      const dt = parseExactDateTime(sale.saleDate || sale.createdAt);
      list.push({
        type: 'PHARMACY',
        timestamp: dt.timestamp,
        dateStr: dt.dateStr,
        timeStr: dt.timeStr,
        fullStr: dt.fullStr,
        title: `Pharmacy Dispensed: #${sale.invoiceNumber}`,
        subtitle: `Items: ${(sale.items || []).map((it: any) => it.medicine?.medicineName).filter(Boolean).join(', ') || 'Medication'} • Total: ₹${sale.grandTotal}`,
        status: sale.paymentStatus || 'PAID',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: Pill,
        raw: sale,
      });
    });

    return list.sort((a, b) => {
      return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
  }, [patientProfile, sortOrder]);

  // Sub-tab sorted datasets (All strictly ordered by date & time)
  const sortedAppointments = useMemo(() => {
    if (!patientProfile?.patient?.appointments) return [];
    return [...patientProfile.patient.appointments].sort((a: any, b: any) => {
      const tA = parseExactDateTime(a.appointmentDate, a.startTime).timestamp;
      const tB = parseExactDateTime(b.appointmentDate, b.startTime).timestamp;
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [patientProfile, sortOrder]);

  const sortedProcedures = useMemo(() => {
    if (!patientProfile?.patient?.procedures) return [];
    return [...patientProfile.patient.procedures].sort((a: any, b: any) => {
      const tA = parseExactDateTime(a.procedureDate || a.createdAt).timestamp;
      const tB = parseExactDateTime(b.procedureDate || b.createdAt).timestamp;
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [patientProfile, sortOrder]);

  const sortedClinicalNotes = useMemo(() => {
    if (!patientProfile?.patient?.clinicalNotes) return [];
    return [...patientProfile.patient.clinicalNotes].sort((a: any, b: any) => {
      const tA = parseExactDateTime(a.consultationDate || a.createdAt).timestamp;
      const tB = parseExactDateTime(b.consultationDate || b.createdAt).timestamp;
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [patientProfile, sortOrder]);

  const sortedBillingAndLedger = useMemo(() => {
    if (!patientProfile?.patient) return [];
    const p = patientProfile.patient;
    const list = [
      ...(p.consultationBills || []).map((b: any) => ({
        ...b,
        kind: 'CONSULTATION',
        eventDate: b.billDate || b.createdAt,
      })),
      ...(p.pharmacySales || []).map((s: any) => ({
        ...s,
        kind: 'PHARMACY',
        eventDate: s.saleDate || s.createdAt,
      })),
    ];
    return list.sort((a: any, b: any) => {
      const tA = parseExactDateTime(a.eventDate).timestamp;
      const tB = parseExactDateTime(b.eventDate).timestamp;
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [patientProfile, sortOrder]);

  // Modal Component
  const renderRegisterModal = () => {
    if (!showRegisterModal) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">
              {editingPatient ? 'Edit Patient Profile' : 'Register New Patient'}
            </h3>
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {formError}
            </div>
          )}

          <form onSubmit={handleSavePatient} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. vara rakoti"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => handleMobileInput(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  required
                  value={formData.age}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setFormData({ ...formData, age: cleaned });
                  }}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">DOB</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleAgeCalculation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">City / Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Hyderabad"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Medical Alerts / Allergies
              </label>
              <input
                type="text"
                value={formData.medicalAlerts}
                onChange={(e) => setFormData({ ...formData, medicalAlerts: e.target.value })}
                placeholder="e.g. Penicillin Allergy, Hypertension, Diabetic"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#0A685D] hover:bg-[#085249] text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                {submitting ? 'Saving...' : editingPatient ? 'Update' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ==============================================================
  // 1. INITIAL FULL SCREEN STATE (NO PATIENT CLICKED YET)
  // "dont show the patient records to left from first, show the reocrs in enrire screen"
  // ==============================================================
  if (!selectedPatientId) {
    return (
      <div className="space-y-5 max-w-[1720px] mx-auto pb-10">
        {/* Top Header & Register Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Patient Directory</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                {patients.length} Active Records
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Complete clinical directory with chronological 360° medical dossiers
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingPatient(null);
              setFormData({
                name: '',
                mobile: '',
                email: '',
                dob: '',
                age: '',
                gender: 'MALE',
                address: '',
                medicalAlerts: '',
              });
              setShowRegisterModal(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-700 via-[#0A685D] to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-2xl text-xs font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register New Patient</span>
          </button>
        </div>

        {/* 4 Rich Gradient Stat Cards Across Full Width */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Patients */}
          <div className="bg-gradient-to-br from-teal-700 via-[#0A685D] to-emerald-800 text-white rounded-2xl p-4 border border-teal-600/40 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-100">Total Patients</span>
              <span className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                <Users className="w-4 h-4 text-white" />
              </span>
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">{patients.length}</div>
            <div className="text-[11px] text-teal-200/90 mt-0.5 font-medium">All registered clinic records</div>
          </div>

          {/* Card 2: Male Patients */}
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white rounded-2xl p-4 border border-blue-600/40 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Male Patients</span>
              <span className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                <User className="w-4 h-4 text-white" />
              </span>
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">
              {patients.filter((p) => p.gender === 'MALE').length}
            </div>
            <div className="text-[11px] text-blue-200/90 mt-0.5 font-medium">Active male dossiers</div>
          </div>

          {/* Card 3: Female Patients */}
          <div className="bg-gradient-to-br from-rose-600 via-pink-700 to-purple-900 text-white rounded-2xl p-4 border border-rose-500/40 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-100">Female Patients</span>
              <span className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                <UserCheck className="w-4 h-4 text-white" />
              </span>
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">
              {patients.filter((p) => p.gender === 'FEMALE').length}
            </div>
            <div className="text-[11px] text-rose-200/90 mt-0.5 font-medium">Active female dossiers</div>
          </div>

          {/* Card 4: Medical Alerts */}
          <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-red-800 text-white rounded-2xl p-4 border border-amber-500/40 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Critical Flags</span>
              <span className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
                <AlertTriangle className="w-4 h-4 text-white" />
              </span>
            </div>
            <div className="text-3xl font-black mt-2 tracking-tight">
              {patients.filter((p) => Boolean(p.medicalAlerts)).length}
            </div>
            <div className="text-[11px] text-amber-200/90 mt-0.5 font-medium">Allergies & medical warnings</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Patient Name, 10-digit Mobile or DOC ID..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Colored Filter Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setGenderFilter('ALL');
                setAlertFilter('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                genderFilter === 'ALL' && alertFilter === 'ALL'
                  ? 'bg-teal-700 text-white shadow-sm font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({patients.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setGenderFilter('MALE');
                setAlertFilter('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                genderFilter === 'MALE'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Male ({patients.filter((p) => p.gender === 'MALE').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setGenderFilter('FEMALE');
                setAlertFilter('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                genderFilter === 'FEMALE'
                  ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Female ({patients.filter((p) => p.gender === 'FEMALE').length})
            </button>
            <button
              type="button"
              onClick={() => setAlertFilter(alertFilter === 'ALERTS' ? 'ALL' : 'ALERTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                alertFilter === 'ALERTS'
                  ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Flagged ({patients.filter((p) => Boolean(p.medicalAlerts)).length})
            </button>
          </div>
        </div>

        {/* Full-Screen Patient Records Cards (Entire Screen Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Loading patient records...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="col-span-full p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              No matching patients found.
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isMale = p.gender === 'MALE';
              const initialLetter = p.name ? p.name.charAt(0).toUpperCase() : 'P';
              const regDt = parseExactDateTime(p.registrationDate || (p as any).createdAt);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`bg-white border rounded-3xl p-4.5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group relative overflow-hidden ${
                    isMale
                      ? 'border-slate-200/90 border-l-4 border-l-blue-600 hover:border-blue-400'
                      : 'border-slate-200/90 border-l-4 border-l-rose-500 hover:border-rose-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Vibrant Gradient Avatar */}
                      <div
                        className={`w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm transition group-hover:scale-105 ${
                          isMale
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                            : 'bg-gradient-to-br from-rose-500 to-pink-600'
                        }`}
                      >
                        {initialLetter}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 capitalize truncate group-hover:text-teal-700 transition">
                          {p.name}
                        </div>
                        <div className="text-[11px] font-mono text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-teal-200/60">
                          {p.patientCode}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          isMale
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.gender} • {p.age} yrs
                      </span>
                      <div className="text-xs font-mono font-bold text-slate-700 mt-1.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.mobile}</span>
                      </div>
                    </div>
                  </div>

                  {/* Medical Alerts Banner (if any) */}
                  {p.medicalAlerts && (
                    <div className="mt-3 p-2 px-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Alert: {p.medicalAlerts}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Reg: {regDt.dateStr}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                        title={`Edit details for ${p.name}`}
                      >
                        <Edit2 className="w-3 h-3 text-teal-700" />
                        <span>Edit</span>
                      </button>
                      <span className="text-teal-700 font-bold group-hover:translate-x-1 transition flex items-center gap-0.5">
                        <span>View 360° Flow</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {renderRegisterModal()}
      </div>
    );
  }

  // ==============================================================
  // 2. SPLIT VIEW: OPENS AFTER CLICKING A RECORD
  // "after clicking the record then is should go to left and thier data should ahow on right"
  // ==============================================================
  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start max-w-[1720px] mx-auto pb-10">
      {/* ============================================================== */}
      {/* LEFT COLUMN: PATIENTS DIRECTORY COLLAPSED (RICH STYLING)        */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 space-y-3.5">
        {/* Header Title */}
        <div className="pt-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patients</h1>
            <p className="text-xs text-slate-400 font-medium">Patient Directory</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPatientId(null)}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition cursor-pointer"
          >
            ← Full Directory
          </button>
        </div>

        {/* 4 Mini Colored Stat Badges */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gradient-to-br from-teal-700 to-emerald-800 text-white rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-teal-100 block">Total</span>
            <span className="text-base font-black block mt-0.5">{patients.length}</span>
          </div>

          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-blue-100 block">Male</span>
            <span className="text-base font-black block mt-0.5">
              {patients.filter((p) => p.gender === 'MALE').length}
            </span>
          </div>

          <div className="bg-gradient-to-br from-rose-600 to-pink-800 text-white rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-rose-100 block">Female</span>
            <span className="text-base font-black block mt-0.5">
              {patients.filter((p) => p.gender === 'FEMALE').length}
            </span>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] font-bold text-amber-100 block">Alerts</span>
            <span className="text-base font-black block mt-0.5">
              {patients.filter((p) => Boolean(p.medicalAlerts)).length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, Mobile or ID..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setGenderFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              genderFilter === 'ALL'
                ? 'bg-teal-700 text-white font-extrabold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('MALE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              genderFilter === 'MALE'
                ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('FEMALE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              genderFilter === 'FEMALE'
                ? 'bg-rose-600 text-white font-extrabold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Female
          </button>
        </div>

        {/* Patient Cards List */}
        <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No matching patients found.
            </div>
          ) : (
            filteredPatients.map((p) => {
              const isSelected = selectedPatientId === p.id;
              const isMale = p.gender === 'MALE';
              const initialLetter = p.name ? p.name.charAt(0).toUpperCase() : 'P';

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`rounded-2xl p-3 border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-50 via-emerald-50 to-white border-2 border-teal-600 shadow-md ring-2 ring-teal-200/50'
                      : 'bg-white border-slate-200/90 hover:border-teal-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                        isMale
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                          : 'bg-gradient-to-br from-rose-500 to-pink-600'
                      }`}
                    >
                      {initialLetter}
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`font-black text-xs capitalize truncate ${
                          isSelected ? 'text-teal-950 font-black' : 'text-slate-900'
                        }`}
                      >
                        {p.name}
                      </div>
                      <div className="text-[10px] font-mono text-teal-800 font-bold mt-0.5">
                        {p.patientCode}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    <div>
                      <div className="text-[10px] font-bold text-slate-600">
                        {p.age} yrs | {p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : 'Other'}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                        {p.mobile}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(p);
                      }}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition border border-transparent hover:border-teal-200 cursor-pointer"
                      title={`Edit data for ${p.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight
                      className={`w-4 h-4 ml-0.5 ${isSelected ? 'text-teal-700 font-bold' : 'text-slate-300'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Patient Button */}
        <button
          type="button"
          onClick={() => {
            setEditingPatient(null);
            setFormData({
              name: '',
              mobile: '',
              email: '',
              dob: '',
              age: '',
              gender: 'MALE',
              address: '',
              medicalAlerts: '',
            });
            setShowRegisterModal(true);
          }}
          className="w-full py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-2xl text-xs font-black transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Patient</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: 360 PATIENT DETAILS (VIBRANT & TIME-ORDERED)      */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-0 w-full">
        {loadingProfile || !patientProfile ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-16 flex items-center justify-center min-h-[580px] text-xs text-slate-400">
            Loading patient dossier...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Breadcrumb */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPatientId(null)}
                  className="text-slate-400 hover:text-teal-700 font-semibold cursor-pointer"
                >
                  Patients
                </button>
                <span className="text-slate-300 font-bold">&gt;</span>
                <span className="text-teal-700 font-black">Patient Details Dossier</span>
              </div>

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 text-[11px] font-bold transition cursor-pointer"
                title="Toggle Date & Time Sorting Order"
              >
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  Order: {sortOrder === 'desc' ? 'Newest First (Recent)' : 'Chronological (Oldest First)'}
                </span>
                <ArrowUpDown className="w-3 h-3 text-teal-600 ml-0.5" />
              </button>
            </div>

            {/* CARD 1: Executive Patient Header Banner (Rich Slate & Teal Gradient) */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 border border-teal-800/50 shadow-md flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
              <div className="flex items-center gap-4 min-w-0 relative z-10">
                {/* Glowing Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 font-black text-2xl flex items-center justify-center shrink-0 shadow-lg">
                  {patientProfile.patient.name ? patientProfile.patient.name.charAt(0).toUpperCase() : 'P'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-white capitalize tracking-tight truncate">
                      {patientProfile.patient.name}
                    </h2>
                    <span className="text-xs font-mono font-bold bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-lg border border-teal-400/40">
                      {patientProfile.patient.patientCode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium mt-1 flex flex-wrap items-center gap-2">
                    <span className="uppercase font-bold text-teal-300">{patientProfile.patient.gender}</span>
                    <span>•</span>
                    <span>{patientProfile.patient.age} years old</span>
                    <span>•</span>
                    <span>
                      Mobile: <strong className="text-white font-mono">{patientProfile.patient.mobile}</strong>
                    </span>
                  </p>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{patientProfile.patient.address || 'Address Not Provided'}</span>
                    <span>•</span>
                    <span>
                      Registered:{' '}
                      {parseExactDateTime(patientProfile.patient.registrationDate || patientProfile.patient.createdAt).fullStr}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Export PDF & Close X */}
              <div className="flex items-center gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={() => generatePatientReportPDF(patientProfile)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Chronological PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(patientProfile.patient)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition border border-white/20 cursor-pointer shadow-xs"
                  title="Edit Patient Profile"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <div className="h-6 w-px bg-white/20 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setSelectedPatientId(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  title="Close Details Pane (Return to Full Directory)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Medical Alerts (if any) */}
            {patientProfile.patient.medicalAlerts && (
              <div className="p-3 bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-300 rounded-2xl flex items-center gap-2 text-rose-900 text-xs font-bold shadow-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Critical Medical Alert: {patientProfile.patient.medicalAlerts}</span>
              </div>
            )}

            {/* CARD 2: Quick Action Bar (Distinct Themed Gradients) */}
            <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 px-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="font-black text-xs text-slate-900 mr-2 shrink-0">Quick Action:</span>

              {onNavigateToAppointment && (
                <button
                  type="button"
                  onClick={() => onNavigateToAppointment(patientProfile.patient.id)}
                  className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>+ Book Appointment</span>
                </button>
              )}

              {onNavigateToNotes && (
                <button
                  type="button"
                  onClick={() => onNavigateToNotes(patientProfile.patient.id)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Clinical Note</span>
                </button>
              )}

              {onNavigateToBilling && (
                <button
                  type="button"
                  onClick={() => onNavigateToBilling(patientProfile.patient.id)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-700 to-violet-800 hover:from-purple-800 hover:to-violet-900 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>+ Consultation Bill</span>
                </button>
              )}

              {onNavigateToPharmacy && (
                <button
                  type="button"
                  onClick={() => onNavigateToPharmacy(patientProfile.patient.id)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>+ Pharmacy</span>
                </button>
              )}
            </div>

            {/* CARD 3: 4 Vibrant Summary Metric KPI Cards */}
            {(() => {
              const p = patientProfile.patient;
              const appointments = p.appointments || [];
              const completedAppointments = appointments.filter((a: any) => a.status === 'COMPLETED');
              const clinicalNotes = p.clinicalNotes || [];
              const procedures = p.procedures || [];
              const completedProcedures = procedures.filter((pr: any) => pr.status === 'COMPLETED');
              const consultationBills = p.consultationBills || [];
              const pharmacySales = p.pharmacySales || [];

              const totalConsultationPaid = consultationBills.reduce(
                (sum: number, b: any) => sum + (b.paidAmount || 0),
                0
              );
              const totalPharmacyPaid = pharmacySales.reduce(
                (sum: number, s: any) => sum + (s.paidAmount || 0),
                0
              );
              const totalPaid = totalConsultationPaid + totalPharmacyPaid;
              const totalBillsCount = consultationBills.length + pharmacySales.length;
              const totalOutstanding = patientProfile.financialSummary?.totalOutstanding || 0;

              const consultationCompletedCount = Math.max(
                clinicalNotes.length,
                completedAppointments.length,
                consultationBills.length
              );

              const isAppointmentDone =
                completedAppointments.length > 0 || (appointments.length > 0 && consultationCompletedCount > 0);
              const isConsultationDone = consultationCompletedCount > 0;
              const isProceduresDone = procedures.length > 0 && completedProcedures.length === procedures.length;
              const isBillingDone = totalBillsCount > 0 && totalOutstanding === 0;

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Billing & Financial Status */}
                    <div
                      className={`rounded-2xl p-4 border shadow-xs transition ${
                        totalOutstanding > 0
                          ? 'bg-gradient-to-br from-rose-50 to-orange-50/70 border-rose-300 text-rose-950'
                          : totalBillsCount > 0
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50/70 border-emerald-300 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            totalOutstanding > 0
                              ? 'text-rose-800'
                              : totalBillsCount > 0
                              ? 'text-emerald-800'
                              : 'text-slate-600'
                          }`}
                        >
                          Billing Status
                        </p>
                        {totalBillsCount > 0 && totalOutstanding === 0 && (
                          <span className="text-[10px] font-extrabold bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <Check className="w-3 h-3 text-emerald-800" /> Settled
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-black mt-1">
                        {totalOutstanding > 0
                          ? `₹${totalOutstanding} Due`
                          : totalBillsCount > 0
                          ? `₹${totalPaid} Paid`
                          : '₹0 Billed'}
                      </p>
                      <p
                        className={`text-[10px] mt-0.5 font-medium ${
                          totalOutstanding > 0
                            ? 'text-rose-700'
                            : totalBillsCount > 0
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {totalBillsCount > 0
                          ? `${totalBillsCount} Invoices • ₹0 Pending Due`
                          : 'No invoices generated'}
                      </p>
                    </div>

                    {/* Appointments */}
                    <div className="bg-gradient-to-br from-sky-50 to-cyan-50/70 rounded-2xl p-4 border border-sky-200/90 shadow-xs">
                      <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Appointments</p>
                      <p className="text-xl font-black text-sky-950 mt-1">{appointments.length} visits</p>
                      <p className="text-[10px] text-sky-700 mt-0.5 font-medium">
                        {completedAppointments.length > 0
                          ? `${completedAppointments.length} completed`
                          : `${appointments.length} booked`}
                      </p>
                    </div>

                    {/* Procedures */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 rounded-2xl p-4 border border-emerald-200/90 shadow-xs">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Procedures</p>
                      <p className="text-xl font-black text-emerald-950 mt-1">{procedures.length} treatments</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                        {completedProcedures.length > 0
                          ? `${completedProcedures.length} done`
                          : `${procedures.length} planned`}
                      </p>
                    </div>

                    {/* Consultations & Notes */}
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50/70 rounded-2xl p-4 border border-indigo-200/90 shadow-xs">
                      <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                        Consultations
                      </p>
                      <p className="text-xl font-black text-indigo-950 mt-1">
                        {consultationCompletedCount} completed
                      </p>
                      <p className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                        {clinicalNotes.length > 0
                          ? `${clinicalNotes.length} doctor notes`
                          : consultationBills.length > 0
                          ? `${consultationBills.length} consult billed`
                          : 'Consultation visits'}
                      </p>
                    </div>
                  </div>

                  {/* CARD 4: Clinical Journey Stepper Bar */}
                  <div className="bg-white rounded-2xl p-3.5 px-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
                    {/* Step 1: Registration */}
                    <div className="bg-teal-700 text-white px-3.5 py-1.5 rounded-full text-xs font-black shrink-0 shadow-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>1. Registered</span>
                    </div>

                    <div
                      className={`flex-1 h-0.5 min-w-[20px] transition-colors ${
                        isAppointmentDone || appointments.length > 0 ? 'bg-teal-500' : 'bg-slate-200'
                      }`}
                    />

                    {/* Step 2: Appointment */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('appointments')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                        isAppointmentDone
                          ? 'bg-emerald-100 border border-emerald-300 text-emerald-950 font-black shadow-xs'
                          : appointments.length > 0
                          ? 'bg-sky-100 border border-sky-300 text-sky-900 font-extrabold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isAppointmentDone && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      <span>
                        2. Appointment (
                        {appointments.length > 0
                          ? `${appointments.length} ${isAppointmentDone ? 'Done' : 'Booked'}`
                          : '0'}
                        )
                      </span>
                    </button>

                    <div
                      className={`flex-1 h-0.5 min-w-[20px] transition-colors ${
                        isConsultationDone ? 'bg-teal-500' : 'bg-slate-200'
                      }`}
                    />

                    {/* Step 3: Consultation */}
                    <button
                      type="button"
                      onClick={() => setActiveTab(clinicalNotes.length > 0 ? 'notes' : 'appointments')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                        isConsultationDone
                          ? 'bg-indigo-100 border border-indigo-300 text-indigo-950 font-black shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isConsultationDone && <Check className="w-3.5 h-3.5 text-indigo-700" />}
                      <span>
                        3. Consultation (
                        {isConsultationDone ? `${consultationCompletedCount} Completed` : 'Pending'}
                        )
                      </span>
                    </button>

                    <div
                      className={`flex-1 h-0.5 min-w-[20px] transition-colors ${
                        isProceduresDone || isBillingDone ? 'bg-teal-500' : 'bg-slate-200'
                      }`}
                    />

                    {/* Step 4: Procedures */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('procedures')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                        isProceduresDone
                          ? 'bg-teal-100 border border-teal-300 text-teal-950 font-black shadow-xs'
                          : procedures.length > 0
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isProceduresDone && <Check className="w-3.5 h-3.5 text-teal-700" />}
                      <span>
                        4. Procedures (
                        {procedures.length > 0
                          ? `${procedures.length} ${isProceduresDone ? 'Done' : 'Planned'}`
                          : '0'}
                        )
                      </span>
                    </button>

                    <div
                      className={`flex-1 h-0.5 min-w-[20px] transition-colors ${
                        isBillingDone ? 'bg-teal-500' : 'bg-slate-200'
                      }`}
                    />

                    {/* Step 5: Billing */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('billing')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                        totalOutstanding > 0
                          ? 'bg-rose-100 border border-rose-300 text-rose-950 font-black'
                          : isBillingDone
                          ? 'bg-emerald-100 border border-emerald-300 text-emerald-950 font-black shadow-xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isBillingDone && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      <span>
                        5. Billing (
                        {totalOutstanding > 0
                          ? `₹${totalOutstanding} Due`
                          : isBillingDone
                          ? `Settled • ₹${totalPaid}`
                          : totalBillsCount > 0
                          ? `${totalBillsCount} Invoices`
                          : 'Pending'}
                        )
                      </span>
                    </button>
                  </div>
                </>
              );
            })()}

            {/* CARD 5: Tab Navigation & Content Panel (Strictly Ordered by Date & Time) */}
            <div className="space-y-0">
              {/* Tab Header Pills */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0 overflow-x-auto">
                {[
                  { id: 'timeline', label: '360° Activity Flow', count: timelineEvents.length },
                  { id: 'appointments', label: 'Appointments', count: sortedAppointments.length },
                  { id: 'procedures', label: 'Procedures', count: sortedProcedures.length },
                  {
                    id: 'notes',
                    label: 'Consultation & Notes',
                    count: Math.max(
                      sortedClinicalNotes.length,
                      (patientProfile.patient.appointments || []).filter((a: any) => a.status === 'COMPLETED').length,
                      (patientProfile.patient.consultationBills || []).length
                    ),
                  },
                  { id: 'billing', label: 'Billing & Ledger', count: sortedBillingAndLedger.length },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`px-4 py-2.5 rounded-t-2xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-teal-700 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="bg-white rounded-b-3xl rounded-tr-3xl border border-slate-200/90 shadow-sm p-5 min-h-[400px]">
                {/* 1. TIMELINE TAB (STRICT DATE & TIME CHRONOLOGICAL ORDER) */}
                {activeTab === 'timeline' && (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
                    {timelineEvents.length === 0 ? (
                      <p className="text-slate-400 text-xs italic py-4">No events found for this patient.</p>
                    ) : (
                      timelineEvents.map((evt, idx) => {
                        const isReg = evt.type === 'REGISTRATION';
                        const Icon = evt.icon;

                        return (
                          <div key={idx} className="relative group">
                            {/* Circle Node */}
                            <span
                              className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 transition ${
                                isReg
                                  ? 'bg-teal-700 border-white ring-2 ring-teal-700'
                                  : 'bg-white border-teal-600 ring-2 ring-teal-100'
                              }`}
                            />

                            <div className="bg-slate-50/70 hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 transition shadow-2xs">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${evt.badgeColor}`}
                                    >
                                      {evt.type.replace('_', ' ')}
                                    </span>
                                    <h4 className="font-extrabold text-xs text-slate-900">{evt.title}</h4>
                                  </div>

                                  <p className="text-[11px] text-slate-600 font-medium">{evt.subtitle}</p>

                                  {evt.details && (
                                    <div className="mt-1.5 p-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                                      {evt.details}
                                    </div>
                                  )}

                                  {evt.status && (
                                    <div className="pt-1">
                                      <span className="inline-block px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-[10px] font-black uppercase">
                                        Status: {evt.status}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                                    <Clock className="w-3 h-3 text-teal-600" />
                                    <span>{evt.fullStr}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. APPOINTMENTS TAB (SORTED STRICTLY BY DATE & TIME) */}
                {activeTab === 'appointments' && (
                  <div className="space-y-3">
                    {sortedAppointments.length === 0 ? (
                      <p className="text-slate-400 text-xs italic py-4">No appointments found.</p>
                    ) : (
                      sortedAppointments.map((apt: any) => {
                        const dt = parseExactDateTime(apt.appointmentDate, apt.startTime);
                        return (
                          <div
                            key={apt.id}
                            className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                  {apt.appointmentCode || 'APT'}
                                </span>
                                <div className="font-extrabold text-xs text-slate-900">
                                  {apt.procedureName || apt.visitType || 'General Consultation'}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                Attending: <strong>{formatDoctorName(apt.doctor?.user?.fullName)}</strong> (
                                {apt.specialization || 'DENTAL'}) • Slot: {apt.timeSlot || dt.timeStr}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-50 text-teal-800 border border-teal-200">
                                {apt.status}
                              </span>
                              <div className="text-[11px] font-mono font-bold text-slate-600 mt-1 flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3 text-teal-600" />
                                <span>{dt.fullStr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 3. PROCEDURES TAB (SORTED STRICTLY BY DATE & TIME) */}
                {activeTab === 'procedures' && (
                  <div className="space-y-3">
                    {sortedProcedures.length === 0 ? (
                      <p className="text-slate-400 text-xs italic py-4">No procedures recorded yet.</p>
                    ) : (
                      sortedProcedures.map((proc: any) => {
                        const dt = parseExactDateTime(proc.procedureDate || proc.createdAt);
                        return (
                          <div
                            key={proc.id}
                            className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  PROCEDURE
                                </span>
                                <div className="font-extrabold text-xs text-slate-900">
                                  {proc.procedureName || proc.procedureMaster?.name}
                                  {proc.toothNumber && ` (Tooth #${proc.toothNumber})`}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                Surgeon: {formatDoctorName(proc.doctor?.user?.fullName || proc.dentistName)} • Notes:{' '}
                                {proc.clinicalNotes || 'None'}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {proc.status}
                              </span>
                              <div className="text-[11px] font-mono font-bold text-slate-600 mt-1 flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3 text-emerald-600" />
                                <span>{dt.fullStr}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 4. CLINICAL NOTES TAB (SORTED STRICTLY BY DATE & TIME) */}
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    {sortedClinicalNotes.length === 0 ? (
                      (() => {
                        const compApt = (patientProfile.patient.appointments || []).find(
                          (a: any) => a.status === 'COMPLETED'
                        );
                        const cBill = (patientProfile.patient.consultationBills || [])[0];

                        if (compApt || cBill) {
                          const docName =
                            compApt?.doctor?.user?.fullName || cBill?.doctor?.user?.fullName || 'Clinic Doctor';
                          return (
                            <div className="p-5 bg-gradient-to-r from-indigo-50/80 to-blue-50/60 rounded-2xl border border-indigo-200/90 space-y-3 shadow-2xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                    ✓
                                  </span>
                                  <div>
                                    <h4 className="font-extrabold text-xs text-indigo-950">
                                      Doctor Consultation Completed
                                    </h4>
                                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                                      Attended by {formatDoctorName(docName)}
                                      {cBill && ` • Consultation Invoice #${cBill.invoiceNumber} (₹${cBill.totalAmount} Settled)`}
                                    </p>
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Consultation Attended
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-indigo-100 italic">
                                Note: The consultation visit and examination were completed and billed. A clinical examination record can be added below if required.
                              </p>

                              {onNavigateToNotes && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToNotes(patientProfile.patient.id)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>+ Add Clinical Examination for this Patient</span>
                                </button>
                              )}
                            </div>
                          );
                        }

                        return <p className="text-slate-400 text-xs italic py-4">No clinical notes recorded yet.</p>;
                      })()
                    ) : (
                      sortedClinicalNotes.map((cn: any) => {
                        const dt = parseExactDateTime(cn.consultationDate || cn.createdAt);
                        return (
                          <div
                            key={cn.id}
                            className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2 shadow-2xs transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  NOTE
                                </span>
                                <span className="font-extrabold text-xs text-slate-900">
                                  Chief Complaint: {cn.chiefComplaints || 'Checkup'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-600" />
                                <span>{dt.fullStr}</span>
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-600">
                              Attending Doctor: {formatDoctorName(cn.doctor?.user?.fullName)}
                            </div>

                            {cn.diagnosis && (
                              <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                                <strong>Diagnosis:</strong> {cn.diagnosis}
                              </p>
                            )}

                            {cn.treatmentRecommendations && (
                              <p className="text-[11px] text-slate-500 italic">
                                Recommendations: {cn.treatmentRecommendations}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 5. BILLING & LEDGER TAB (SORTED STRICTLY BY DATE & TIME) */}
                {activeTab === 'billing' && (
                  <div className="space-y-3">
                    {sortedBillingAndLedger.length === 0 ? (
                      <p className="text-slate-400 text-xs italic py-4">No invoices or billing records found.</p>
                    ) : (
                      sortedBillingAndLedger.map((item: any, idx: number) => {
                        const dt = parseExactDateTime(item.eventDate);
                        const isPharm = item.kind === 'PHARMACY';

                        return (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    isPharm
                                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {isPharm ? 'PHARMACY POS' : 'CONSULTATION'}
                                </span>
                                <div className="font-extrabold text-xs text-slate-900">
                                  Invoice #{item.invoiceNumber}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{dt.fullStr}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-black text-sm text-teal-800">
                                ₹{item.grandTotal || item.totalAmount}
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  item.paymentStatus === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.paymentStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {renderRegisterModal()}
    </div>
  );
};
