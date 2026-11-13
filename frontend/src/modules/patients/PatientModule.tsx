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
      socket.off('procedure:created', handleProcedureUpdate);
      socket.off('procedure:scheduled', handleProcedureUpdate);
      socket.off('procedure:completed', handleProcedureUpdate);
    };
  }, [selectedPatientId]);

  const handleAgeCalculation = (dobStr: string) => {
    if (!dobStr) return;
    const birth = new Date(dobStr);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    setFormData((prev) => ({ ...prev, dob: dobStr, age: age >= 0 ? age.toString() : '0' }));
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || undefined,
        dob: formData.dob || undefined,
        age: parseInt(formData.age, 10) || 0,
        gender: formData.gender,
        address: formData.address || undefined,
        medicalAlerts: formData.medicalAlerts || undefined,
      };

      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, payload);
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
    setFormData({
      name: p.name,
      mobile: p.mobile,
      email: p.email || '',
      dob: p.dob ? p.dob.substring(0, 10) : '',
      age: p.age.toString(),
      gender: p.gender,
      address: p.address || '',
      medicalAlerts: p.medicalAlerts || '',
    });
    setShowRegisterModal(true);
  };

  // Safe Date & Time Formatters
  const formatDateStr = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
      const str = String(dateVal).substring(0, 10);
      if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateVal).toLocaleDateString();
    } catch {
      return String(dateVal).substring(0, 10);
    }
  };

  const formatTimeStr = (dateVal: any) => {
    if (!dateVal) return '';
    try {
      return new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
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

  // Unified Chronological Timeline Items
  const timelineEvents = useMemo(() => {
    if (!patientProfile?.patient) return [];
    const p = patientProfile.patient;
    const list: any[] = [];

    // Appointments
    (p.appointments || []).forEach((apt: any) => {
      list.push({
        type: 'APPOINTMENT',
        date: apt.appointmentDate || apt.startTime,
        time: apt.startTime,
        title: `Appointment: ${apt.procedureName || apt.visitType || 'General Consultation'}`,
        subtitle: `Dr. ${apt.doctor?.user?.fullName || 'Doctor'} (${apt.specialization || 'DENTAL'}) • Slot: ${apt.timeSlot || 'Scheduled'}`,
        status: apt.status,
        color: 'sky',
        icon: Calendar,
        raw: apt,
      });
    });

    // Clinical Notes
    (p.clinicalNotes || []).forEach((cn: any) => {
      list.push({
        type: 'CLINICAL_NOTE',
        date: cn.consultationDate,
        time: cn.consultationDate,
        title: `Clinical Note & Diagnosis`,
        subtitle: `Dr. ${cn.doctor?.user?.fullName || 'Doctor'} • Complaint: ${cn.chiefComplaints || 'Checkup'}`,
        details: cn.diagnosis ? `Diagnosis: ${cn.diagnosis}` : undefined,
        recommendations: cn.treatmentRecommendations,
        color: 'indigo',
        icon: FileText,
        raw: cn,
      });
    });

    // Procedures
    (p.procedures || []).forEach((proc: any) => {
      const procName = proc.procedureName || proc.procedureMaster?.name || 'Procedure';
      const dentist = proc.doctor?.user?.fullName || proc.dentistName || 'Dentist';
      list.push({
        type: 'PROCEDURE',
        date: proc.procedureDate,
        time: proc.procedureDate,
        title: `Procedure: ${procName}`,
        subtitle: `Dr. ${dentist}${proc.toothNumber ? ` • Tooth #${proc.toothNumber}` : ''}`,
        details: proc.clinicalNotes,
        status: proc.status,
        color: 'emerald',
        icon: Scissors,
        raw: proc,
      });
    });

    // Consultation Bills
    (p.consultationBills || []).forEach((bill: any) => {
      list.push({
        type: 'BILL',
        date: bill.billDate,
        time: bill.billDate,
        title: `Invoice #${bill.invoiceNumber}`,
        subtitle: `Consultation Fee: ₹${bill.totalAmount} • Paid: ₹${bill.paidAmount} • Due: ₹${bill.pendingBalance}`,
        status: bill.paymentStatus,
        color: 'amber',
        icon: CreditCard,
        raw: bill,
      });
    });

    // Pharmacy Sales
    (p.pharmacySales || []).forEach((sale: any) => {
      list.push({
        type: 'PHARMACY',
        date: sale.saleDate,
        time: sale.saleDate,
        title: `Pharmacy Dispensed: #${sale.invoiceNumber}`,
        subtitle: `Items: ${(sale.items || []).map((it: any) => it.medicine?.medicineName).filter(Boolean).join(', ') || 'Medication'} • Total: ₹${sale.grandTotal}`,
        status: sale.paymentStatus,
        color: 'purple',
        icon: Pill,
        raw: sale,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientProfile]);

  return (
    <div className="space-y-5">
      {/* Top SaaS Header & Statistics Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Patient 360° Directory</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {patients.length} Registered
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete clinical history, date-to-date appointments, tooth procedures, and billing ledger
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEditingPatient(null);
                setFormError('');
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
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Register New Patient</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Directory</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{patients.length} Patients</span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Male Patients</span>
            <span className="text-lg font-bold text-sky-400 mt-0.5 block">
              {patients.filter((p) => p.gender === 'MALE').length}
            </span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Female Patients</span>
            <span className="text-lg font-bold text-pink-400 mt-0.5 block">
              {patients.filter((p) => p.gender === 'FEMALE').length}
            </span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Medical Warnings</span>
            <span className="text-lg font-bold text-amber-400 mt-0.5 block">
              {patients.filter((p) => Boolean(p.medicalAlerts)).length} Flagged
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, Mobile (e.g. 9876...), or ID (DOC-2026-xxxxx)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'MALE', 'FEMALE'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  genderFilter === g
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g === 'ALL' ? 'All Genders' : g}
              </button>
            ))}
          </div>

          {/* Medical Alerts Filter */}
          <button
            onClick={() => setAlertFilter(alertFilter === 'ALERTS' ? 'ALL' : 'ALERTS')}
            className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 transition ${
              alertFilter === 'ALERTS'
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Allergies / Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane 360 View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Pane: Patient Cards List (5 columns when profile open, 12 when closed) */}
        <div className={`${selectedPatientId ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all duration-300`}>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[750px]">
            <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Patient Records ({filteredPatients.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Click to open 360° record</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading patient records...</div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No matching patients found.
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const isSelected = selectedPatientId === p.id;
                  const isMale = p.gender === 'MALE';
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`p-3.5 px-4 flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-teal-50/70 border-l-4 border-l-teal-600 shadow-inner'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            isMale
                              ? 'bg-sky-100 text-sky-700 border border-sky-200'
                              : 'bg-pink-100 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {p.patientCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 truncate">
                            <span className="font-semibold text-slate-700">{p.gender}</span>
                            <span>•</span>
                            <span>{p.age} yrs</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {p.mobile}
                            </span>
                          </div>
                          {p.medicalAlerts && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 font-semibold truncate">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{p.medicalAlerts}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Patient Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className={`w-4 h-4 text-slate-300 ${isSelected ? 'text-teal-600 translate-x-0.5' : ''}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Complete 360 Patient Details Dashboard (7 columns) */}
        {selectedPatientId && (
          <div className="lg:col-span-7">
            {loadingProfile || !patientProfile ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 h-[750px] flex items-center justify-center">
                Loading complete patient 360 profile & clinical history...
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
                {/* Patient Header Card */}
                <div className="p-5 bg-gradient-to-r from-slate-50 to-teal-50/40 border-b border-slate-200/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-teal-600/30">
                        {patientProfile.patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{patientProfile.patient.name}</h2>
                          <span className="text-xs font-mono font-bold bg-white text-teal-800 border border-teal-200 px-2 py-0.5 rounded shadow-xs">
                            {patientProfile.patient.patientCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{patientProfile.patient.gender}</span>
                          <span>•</span>
                          <span>{patientProfile.patient.age} years old</span>
                          <span>•</span>
                          <span>Mobile: <strong className="text-slate-800">{patientProfile.patient.mobile}</strong></span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Registered: {formatDateStr(patientProfile.patient.registrationDate)}
                          {patientProfile.patient.address ? ` • ${patientProfile.patient.address}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generatePatientReportPDF(patientProfile)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        title="Download Complete 360 Dossier PDF with all procedures and appointments"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>

                      <button
                        onClick={() => setSelectedPatientId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
                        title="Close Profile"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Medical Alerts Banner (if present) */}
                  {patientProfile.patient.medicalAlerts && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        <strong>Critical Medical Alert:</strong> {patientProfile.patient.medicalAlerts}
                      </span>
                    </div>
                  )}

                  {/* Quick Action Shortcuts */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                      Quick Action:
                    </span>
                    {onNavigateToAppointment && (
                      <button
                        onClick={() => onNavigateToAppointment(patientProfile.patient.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>+ Book Appointment</span>
                      </button>
                    )}
                    {onNavigateToNotes && (
                      <button
                        onClick={() => onNavigateToNotes(patientProfile.patient.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>+ Clinical Note</span>
                      </button>
                    )}
                    {onNavigateToBilling && (
                      <button
                        onClick={() => onNavigateToBilling(patientProfile.patient.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>+ Consultation Bill</span>
                      </button>
                    )}
                    {onNavigateToPharmacy && (
                      <button
                        onClick={() => onNavigateToPharmacy(patientProfile.patient.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        <Pill className="w-3 h-3" />
                        <span>+ Pharmacy</span>
                      </button>
                    )}
                  </div>

                  {/* Summary KPI Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Due</span>
                      <span
                        className={`text-xs font-bold ${
                          patientProfile.financialSummary.totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        ₹{patientProfile.financialSummary.totalOutstanding}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Appointments</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientProfile.patient.appointments?.length || 0} visits
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Procedures</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientProfile.patient.procedures?.length || 0} treatments
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Doctor Notes</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientProfile.patient.clinicalNotes?.length || 0} diagnoses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: 'timeline', label: '360° Timeline', icon: Activity, count: timelineEvents.length },
                    { id: 'appointments', label: 'Appointments', icon: Calendar, count: patientProfile.patient.appointments?.length || 0 },
                    { id: 'procedures', label: 'Procedures', icon: Scissors, count: patientProfile.patient.procedures?.length || 0 },
                    { id: 'notes', label: 'Clinical Notes', icon: FileText, count: patientProfile.patient.clinicalNotes?.length || 0 },
                    { id: 'billing', label: 'Billing & Ledger', icon: CreditCard, count: (patientProfile.patient.consultationBills?.length || 0) + (patientProfile.patient.pharmacySales?.length || 0) },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`py-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'border-teal-600 text-teal-700 bg-teal-50/30'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                  {/* TAB 1: 360 Timeline */}
                  {activeTab === 'timeline' && (
                    <div className="space-y-3">
                      {timelineEvents.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                          No timeline events or visits recorded yet for this patient.
                        </div>
                      ) : (
                        timelineEvents.map((evt, idx) => {
                          const Icon = evt.icon;
                          return (
                            <div
                              key={idx}
                              className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex gap-3"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  evt.color === 'sky'
                                    ? 'bg-sky-100 text-sky-700'
                                    : evt.color === 'indigo'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : evt.color === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : evt.color === 'amber'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                                  <div className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{formatDateStr(evt.date)}</span>
                                    {evt.time && <span className="text-slate-400">at {formatTimeStr(evt.time)}</span>}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5">{evt.subtitle}</p>
                                {evt.details && (
                                  <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                    {evt.details}
                                  </p>
                                )}
                                {evt.status && (
                                  <div className="mt-1.5">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                      {evt.status}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: Appointments */}
                  {activeTab === 'appointments' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">
                          Scheduled Visits & Queue ({patientProfile.patient.appointments?.length || 0})
                        </span>
                        {onNavigateToAppointment && (
                          <button
                            onClick={() => onNavigateToAppointment(patientProfile.patient.id)}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                          >
                            <span>+ Book Another Visit</span>
                          </button>
                        )}
                      </div>

                      {(!patientProfile.patient.appointments || patientProfile.patient.appointments.length === 0) ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                          No appointment records found.
                        </div>
                      ) : (
                        patientProfile.patient.appointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {formatDateStr(apt.appointmentDate || apt.startTime)}
                                </span>
                                <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {apt.timeSlot || formatTimeStr(apt.startTime)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 mt-1">
                                Doctor: <strong>Dr. {apt.doctor?.user?.fullName || 'Doctor'}</strong> ({apt.specialization})
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Visit: <strong>{apt.procedureName || apt.visitType || 'Standard'}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  apt.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : apt.status === 'CANCELLED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-sky-100 text-sky-800'
                                }`}
                              >
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: Procedures */}
                  {activeTab === 'procedures' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">
                          Dental & Clinical Procedures ({patientProfile.patient.procedures?.length || 0})
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Grouped by visit date (chronological)</span>
                      </div>

                      {!patientProfile.patient.procedures || patientProfile.patient.procedures.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                          No clinical procedures recorded for this patient yet.
                        </div>
                      ) : (
                        <div className="space-y-3 mt-2">
                          {(() => {
                            const procs = patientProfile.patient.procedures || [];
                            // Group by visit date
                            const dateMap = new Map<string, any[]>();
                            const sorted = [...procs].sort(
                              (a: any, b: any) =>
                                new Date(b.procedureDate).getTime() - new Date(a.procedureDate).getTime()
                            );

                            sorted.forEach((p) => {
                              const d = new Date(p.procedureDate);
                              const key = isNaN(d.getTime()) ? 'Unspecified Date' : d.toISOString().substring(0, 10);
                              if (!dateMap.has(key)) dateMap.set(key, []);
                              dateMap.get(key)!.push(p);
                            });

                            const months = [
                              'Jan',
                              'Feb',
                              'Mar',
                              'Apr',
                              'May',
                              'Jun',
                              'Jul',
                              'Aug',
                              'Sep',
                              'Oct',
                              'Nov',
                              'Dec',
                            ];

                            return Array.from(dateMap.entries()).map(([dateKey, visitProcs]) => {
                              const d = new Date(dateKey);
                              const formattedDate = isNaN(d.getTime())
                                ? dateKey
                                : `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;

                              const dentist =
                                visitProcs[0]?.doctor?.user?.fullName || visitProcs[0]?.dentistName || 'Assigned Dentist';

                              return (
                                <div
                                  key={dateKey}
                                  className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
                                >
                                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                      <span className="font-bold text-xs text-slate-800">
                                        Visit Date: {formattedDate}
                                      </span>
                                      <span className="text-slate-400 text-[11px]">|</span>
                                      <span className="text-xs text-slate-600 font-medium">
                                        Dr. {dentist.replace(/^Dr\.?\s*/i, '')}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                                      {visitProcs.length} {visitProcs.length === 1 ? 'Procedure' : 'Procedures'}
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                                        <tr>
                                          <th className="p-2.5 pl-3">Procedure Name</th>
                                          <th className="p-2.5">Code</th>
                                          <th className="p-2.5">Tooth #</th>
                                          <th className="p-2.5">Clinical Notes</th>
                                          <th className="p-2.5 pr-3">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {visitProcs.map((proc: any) => {
                                          const procName =
                                            proc.procedureName || proc.procedureMaster?.name || 'Procedure';
                                          const rawStatus = (proc.status || '').toUpperCase().replace(/[\s-]+/g, '_');
                                          let statusLabel = 'Planned';
                                          let statusStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                                          if (rawStatus === 'COMPLETED') {
                                            statusLabel = 'Completed';
                                            statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                          } else if (rawStatus === 'IN_PROGRESS') {
                                            statusLabel = 'In Progress';
                                            statusStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                                          }

                                          return (
                                            <tr key={proc.id} className="hover:bg-slate-50/70 transition">
                                              <td className="p-2.5 pl-3 font-bold text-slate-900">{procName}</td>
                                              <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                                                {proc.procedureCode || '—'}
                                              </td>
                                              <td className="p-2.5 font-mono font-semibold text-slate-800">
                                                {proc.toothNumber ? (
                                                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
                                                    #{proc.toothNumber}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal">—</span>
                                                )}
                                              </td>
                                              <td className="p-2.5 text-slate-600 max-w-xs">
                                                {proc.clinicalNotes ? (
                                                  <span className="line-clamp-2">{proc.clinicalNotes}</span>
                                                ) : (
                                                  <span className="text-slate-400 italic">None</span>
                                                )}
                                              </td>
                                              <td className="p-2.5 pr-3">
                                                <span
                                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusStyle}`}
                                                >
                                                  {statusLabel}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Clinical Notes */}
                  {activeTab === 'notes' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">
                          Doctor Consultations & Diagnoses ({patientProfile.patient.clinicalNotes?.length || 0})
                        </span>
                      </div>

                      {(!patientProfile.patient.clinicalNotes || patientProfile.patient.clinicalNotes.length === 0) ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                          No clinical consultation notes recorded.
                        </div>
                      ) : (
                        patientProfile.patient.clinicalNotes.map((cn: any) => (
                          <div
                            key={cn.id}
                            className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-indigo-900">
                                Dr. {cn.doctor?.user?.fullName || 'Doctor'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {formatDateStr(cn.consultationDate)}
                              </span>
                            </div>
                            <div className="text-xs">
                              <strong className="text-slate-800">Chief Complaints:</strong>{' '}
                              <span className="text-slate-700">{cn.chiefComplaints || 'Routine Evaluation'}</span>
                            </div>
                            <div className="text-xs">
                              <strong className="text-slate-800">Diagnosis:</strong>{' '}
                              <span className="text-slate-700">{cn.diagnosis || 'None'}</span>
                            </div>
                            {cn.treatmentRecommendations && (
                              <div className="text-xs">
                                <strong className="text-slate-800">Treatment Plan / Advice:</strong>{' '}
                                <span className="text-slate-700">{cn.treatmentRecommendations}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 5: Billing & Invoices */}
                  {activeTab === 'billing' && (
                    <div className="space-y-4">
                      {/* Consultation Invoices */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                          <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                          <span>Consultation Invoices ({patientProfile.patient.consultationBills?.length || 0})</span>
                        </h4>

                        {(!patientProfile.patient.consultationBills || patientProfile.patient.consultationBills.length === 0) ? (
                          <p className="text-xs text-slate-400 bg-white p-4 rounded-xl border border-slate-200">
                            No consultation bills generated.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {patientProfile.patient.consultationBills.map((b: any) => (
                              <div
                                key={b.id}
                                className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center shadow-2xs"
                              >
                                <div>
                                  <div className="font-mono font-bold text-slate-900">{b.invoiceNumber}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Date: {formatDateStr(b.billDate)} • Total: ₹{b.totalAmount} • Paid: ₹{b.paidAmount}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      b.paymentStatus === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {b.paymentStatus}
                                  </span>
                                  {b.pendingBalance > 0 && (
                                    <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                                      Due: ₹{b.pendingBalance}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pharmacy Invoices */}
                      <div className="pt-3 border-t border-slate-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                          <Pill className="w-3.5 h-3.5 text-purple-600" />
                          <span>Pharmacy Dispensed ({patientProfile.patient.pharmacySales?.length || 0})</span>
                        </h4>

                        {(!patientProfile.patient.pharmacySales || patientProfile.patient.pharmacySales.length === 0) ? (
                          <p className="text-xs text-slate-400 bg-white p-4 rounded-xl border border-slate-200">
                            No pharmacy medications dispensed.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {patientProfile.patient.pharmacySales.map((s: any) => (
                              <div
                                key={s.id}
                                className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center shadow-2xs"
                              >
                                <div>
                                  <div className="font-mono font-bold text-slate-900">{s.invoiceNumber}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Date: {formatDateStr(s.saleDate)} • Total: ₹{s.grandTotal} • Paid: ₹{s.paidAmount}
                                  </div>
                                </div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    s.paymentStatus === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {s.paymentStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Register/Edit Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingPatient ? 'Edit Patient Information' : 'Register New Patient'}
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="patient@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleAgeCalculation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Age in yrs"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Area, City"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical Alerts / Allergies (e.g., Penicillin allergy, Diabetes, Hypertension)
                </label>
                <textarea
                  rows={2}
                  value={formData.medicalAlerts}
                  onChange={(e) => setFormData({ ...formData, medicalAlerts: e.target.value })}
                  placeholder="Crucial medical warnings..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPatient ? 'Update Patient' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
