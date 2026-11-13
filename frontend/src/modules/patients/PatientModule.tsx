import React, { useState, useEffect } from 'react';
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
}

export const PatientModule: React.FC<PatientModuleProps> = ({
  initialPatientId,
  onNavigateToNotes,
  onNavigateToBilling,
  onNavigateToPharmacy,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId || null);
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

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

    return () => {
      socket.off('patient:registered', handlePatientUpdate);
      socket.off('patient:updated', handlePatientUpdate);
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

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient directory by Name, Phone or ID (DOC-2026-xxxxx)..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          />
        </div>

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
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Patient Directory Table (5 columns) */}
        <div className={`${selectedPatientId ? 'lg:col-span-5' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Registered Patients ({patients.length})</span>
              <span className="text-[11px] text-slate-400">Click to view 360° record & export PDF</span>
            </div>

            <div className="overflow-x-auto max-h-[680px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading patients...</div>
              ) : patients.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No patients found.</div>
              ) : (
                patients.map((p) => {
                  const isSelected = selectedPatientId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'bg-teal-50/60 border-l-4 border-l-teal-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {p.patientCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{p.gender}</span>
                            <span>•</span>
                            <span>{p.age} yrs</span>
                            <span>•</span>
                            <span>{p.mobile}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded"
                          title="Edit Patient Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Phase 4 – Complete 360 Patient Details Dashboard (7 columns) */}
        {selectedPatientId && (
          <div className="lg:col-span-7">
            {loadingProfile || !patientProfile ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                Loading complete patient 360 profile...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header card with summary & 1-Click PDF Export */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-teal-600/20">
                        {patientProfile.patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{patientProfile.patient.name}</h3>
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {patientProfile.patient.patientCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {patientProfile.patient.gender} • {patientProfile.patient.age} yrs • Registered on{' '}
                          {new Date(patientProfile.patient.registrationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* PDF DOWNLOAD BUTTON */}
                      <button
                        onClick={() => generatePatientReportPDF(patientProfile)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        title="Download Complete 360 Dossier PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>

                      <button
                        onClick={() => setSelectedPatientId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial & Alerts summary bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mobile</span>
                      <span className="text-xs font-bold text-slate-800">{patientProfile.patient.mobile}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Pending</span>
                      <span
                        className={`text-xs font-bold ${
                          patientProfile.financialSummary.totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        ₹{patientProfile.financialSummary.totalOutstanding}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Appointments</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientProfile.patient.appointments.length} Visits
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Procedures</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientProfile.patient.procedures?.length || 0} Recorded
                      </span>
                    </div>
                  </div>

                  {patientProfile.patient.medicalAlerts && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200/60 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        <strong>Medical Alerts:</strong> {patientProfile.patient.medicalAlerts}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sub-tabs / Modules for this patient */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                  {/* 1. Appointment History */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        Appointment History ({patientProfile.patient.appointments.length})
                      </h4>
                    </div>
                    {patientProfile.patient.appointments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No appointments scheduled.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientProfile.patient.appointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                {new Date(apt.startTime).toLocaleDateString()} at{' '}
                                {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="text-slate-500 text-[11px]">
                                {apt.doctor?.user?.fullName} ({apt.specialization}) - {apt.visitType}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white border border-slate-200 text-slate-700">
                              {apt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Clinical Notes History */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Clinical Notes ({patientProfile.patient.clinicalNotes.length})
                    </h4>
                    {patientProfile.patient.clinicalNotes.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No doctor paper notes recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientProfile.patient.clinicalNotes.map((cn: any) => (
                          <div
                            key={cn.id}
                            className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs space-y-1"
                          >
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>Dr. {cn.doctor?.user?.fullName}</span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(cn.consultationDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <strong className="text-indigo-950">Chief Complaint:</strong> {cn.chiefComplaints}
                            </div>
                            <div>
                              <strong className="text-indigo-950">Diagnosis:</strong> {cn.diagnosis}
                            </div>
                            {cn.treatmentRecommendations && (
                              <div>
                                <strong className="text-indigo-950">Recommendations:</strong>{' '}
                                {cn.treatmentRecommendations}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Procedure History */}
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-blue-600" />
                        <span>Procedure History ({patientProfile.patient.procedures?.length || 0})</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">Chronological treatment log</span>
                    </div>

                    {!patientProfile.patient.procedures || patientProfile.patient.procedures.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No procedure history recorded for this patient yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5 pl-3">Date</th>
                              <th className="p-2.5">Procedure</th>
                              <th className="p-2.5">Dentist</th>
                              <th className="p-2.5">Tooth #</th>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 pr-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {[...(patientProfile.patient.procedures || [])]
                              .sort(
                                (a: any, b: any) =>
                                  new Date(a.procedureDate).getTime() - new Date(b.procedureDate).getTime()
                              )
                              .map((proc: any) => {
                                const procName = proc.procedureName || proc.procedureMaster?.name || 'Procedure';
                                const dentist = proc.doctor?.user?.fullName || proc.dentistName || 'Dentist';
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

                                const d = new Date(proc.procedureDate);
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
                                const formattedDate = isNaN(d.getTime())
                                  ? '—'
                                  : `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;

                                return (
                                  <tr key={proc.id} className="hover:bg-slate-50/70 transition">
                                    <td className="p-2.5 pl-3 font-medium text-slate-700 whitespace-nowrap">
                                      {formattedDate}
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-900">{procName}</td>
                                    <td className="p-2.5 text-slate-700">{dentist}</td>
                                    <td className="p-2.5 font-mono font-semibold text-slate-800">
                                      {proc.toothNumber ? (
                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
                                          {proc.toothNumber}
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
                    )}
                  </div>

                  {/* 4. Consultation Bills & Receipts */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Consultation Invoices ({patientProfile.patient.consultationBills.length})
                    </h4>
                    {patientProfile.patient.consultationBills.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No consultation invoices generated.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientProfile.patient.consultationBills.map((b: any) => (
                          <div
                            key={b.id}
                            className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-800">{b.invoiceNumber}</span>
                              <div className="text-[11px] text-slate-500">
                                Total: ₹{b.totalAmount} • Paid: ₹{b.paidAmount}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                b.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.paymentStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Register/Edit Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition"
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
