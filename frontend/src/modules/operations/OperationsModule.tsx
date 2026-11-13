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
  X,
  Stethoscope,
  Info,
  Check,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import { Procedure, ProcedureMaster, Patient, Doctor } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

interface OperationsModuleProps {
  onNavigateToBillingProcedure?: (procedure: Procedure) => void;
}

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

export const OperationsModule: React.FC<OperationsModuleProps> = ({
  onNavigateToBillingProcedure,
}) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureMasters, setProcedureMasters] = useState<ProcedureMaster[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Procedure Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>(['Consultation']);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().substring(0, 10));
  const [toothNumber, setToothNumber] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [customDentistName, setCustomDentistName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Planned' | 'In Progress' | 'Completed'>('Planned');
  const [charges, setCharges] = useState(500);

  // Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [procRes, masterRes, docRes] = await Promise.all([
        api.get('/procedures'),
        api.get('/procedures/masters'),
        api.get('/reports/doctors'),
      ]);
      if (procRes.data.success) setProcedures(procRes.data.procedures);
      if (masterRes.data.success) {
        setProcedureMasters(masterRes.data.masters);
      }
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

  const openCreateModal = () => {
    setSelectedPatient(null);
    setSelectedProcedures(['Consultation']);
    setProcedureSearch('');
    setCustomProcedureInput('');
    setProcedureDate(new Date().toISOString().substring(0, 10));
    setToothNumber('');
    setDescription('');
    setStatus('Planned');
    setFormError(null);
    setFormSuccess(null);
    setCharges(500);

    // Pick first doctor if available
    if (doctors.length > 0) {
      setDoctorId(doctors[0].id);
      setCustomDentistName('');
    } else {
      setDoctorId('');
      setCustomDentistName('');
    }

    setShowCreateModal(true);
  };

  const handleToggleProcedure = (procName: string) => {
    let updated: string[];
    if (selectedProcedures.includes(procName)) {
      updated = selectedProcedures.filter((p) => p !== procName);
    } else {
      updated = [...selectedProcedures, procName];
    }
    setSelectedProcedures(updated);
    setCharges(calculateEstimatedCharges(updated));
  };

  const handleRemoveProcedure = (procName: string) => {
    const updated = selectedProcedures.filter((p) => p !== procName);
    setSelectedProcedures(updated);
    setCharges(calculateEstimatedCharges(updated));
  };

  const handleAddCustomProcedure = () => {
    const trimmed = customProcedureInput.trim();
    if (!trimmed) return;
    if (!selectedProcedures.includes(trimmed)) {
      const updated = [...selectedProcedures, trimmed];
      setSelectedProcedures(updated);
      setCharges(calculateEstimatedCharges(updated));
    }
    setCustomProcedureInput('');
  };

  const filteredCategories = useMemo(() => {
    const query = procedureSearch.trim().toLowerCase();
    if (!query) return PROCEDURE_CATEGORIES;

    return PROCEDURE_CATEGORIES.map((cat) => ({
      category: cat.category,
      procedures: cat.procedures.filter(
        (p) => p.toLowerCase().includes(query) || cat.category.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.procedures.length > 0);
  }, [procedureSearch]);

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedPatient) {
      setFormError('Please search and select an existing registered patient.');
      return;
    }

    if (selectedProcedures.length === 0) {
      setFormError('Please select at least one dental procedure.');
      return;
    }

    if (!procedureDate) {
      setFormError('Please select a procedure date.');
      return;
    }

    // Determine dentist details
    let resolvedDoctorId = doctorId && doctorId !== 'OTHER' ? doctorId : null;
    let resolvedDentistName = '';

    if (resolvedDoctorId) {
      const doc = doctors.find((d) => d.id === resolvedDoctorId);
      if (doc) resolvedDentistName = doc.user.fullName;
    } else if (customDentistName.trim()) {
      resolvedDentistName = customDentistName.trim();
    }

    // Map UI status to backend enum
    let backendStatus = 'PLANNED';
    if (status === 'In Progress') backendStatus = 'IN_PROGRESS';
    else if (status === 'Completed') backendStatus = 'COMPLETED';

    setSubmitting(true);
    try {
      const res = await api.post('/procedures', {
        patientId: selectedPatient.id,
        patientCode: selectedPatient.patientCode,
        doctorId: resolvedDoctorId,
        dentistName: resolvedDentistName || undefined,
        procedureNames: selectedProcedures,
        procedureName: selectedProcedures[0] || 'Consultation',
        procedureDate,
        toothNumber: toothNumber.trim() || undefined,
        charges,
        clinicalNotes: description.trim() || undefined,
        procedureDescription: description.trim() || undefined,
        status: backendStatus,
      });

      if (res.data.success) {
        setFormSuccess(
          res.data.message ||
            `${selectedProcedures.length} procedure(s) created and linked to patient successfully!`
        );
        fetchData();
        setTimeout(() => {
          setShowCreateModal(false);
        }, 800);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error creating procedure');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (stat: string) => {
    const s = stat.toUpperCase().replace(/\s+/g, '_');
    if (s === 'COMPLETED') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          Completed
        </span>
      );
    }
    if (s === 'IN_PROGRESS') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
        Planned
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-600" />
            <span>Operations & Procedures</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, and manage dental treatments, RCTs, implants, scalings, and minor surgeries.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Procedure</span>
        </button>
      </div>

      {/* Procedures List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Dental Procedures Log ({procedures.length})
          </span>
          <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Synchronized with Patient Directory
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading procedures...</div>
        ) : procedures.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No procedures recorded yet. Click "Create Procedure" above to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3 pl-5">Procedure Code</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Procedure Name</th>
                  <th className="p-3">Tooth #</th>
                  <th className="p-3">Dentist / Doctor</th>
                  <th className="p-3">Base Charges</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procedures.map((proc) => {
                  const procName = proc.procedureName || proc.procedureMaster?.name || 'Procedure';
                  const dentistName = proc.doctor?.user?.fullName || proc.dentistName || 'Assigned Dentist';
                  return (
                    <tr key={proc.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 pl-5 font-mono font-bold text-slate-800">{proc.procedureCode}</td>
                      <td className="p-3 text-slate-600 font-medium">
                        {new Date(proc.procedureDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{proc.patient.name}</div>
                        <div className="text-[10px] text-blue-700 font-mono font-semibold">{proc.patient.patientCode}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        <div>{procName}</div>
                        {proc.clinicalNotes && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 font-normal max-w-xs">
                            {proc.clinicalNotes}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 font-mono font-bold">
                        {proc.toothNumber ? (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            {proc.toothNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">
                        <div className="font-medium text-slate-800">{dentistName}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">₹{proc.charges}</td>
                      <td className="p-3">{getStatusBadge(proc.status)}</td>
                      <td className="p-3 pr-5 text-right space-x-1">
                        {proc.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => {
                              if (onNavigateToBillingProcedure) {
                                onNavigateToBillingProcedure(proc);
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Complete & Bill</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono font-bold">
                            {proc.operationInvoice?.invoiceNumber || 'Billed'}
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

      {/* Create Procedure Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Create Procedure</h3>
                  <p className="text-[11px] text-slate-500">Record a dental procedure linked to patient profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProcedure} className="space-y-4">
              {/* Field 1: Patient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <PatientSearchSelect
                  selectedPatient={selectedPatient}
                  onSelect={(p) => setSelectedPatient(p)}
                  placeholder="Search registered patient by name, mobile, or ID..."
                  required
                />
              </div>

              {/* Field 2: Patient ID (Auto-populated) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient ID <span className="text-slate-400 text-[11px] font-normal">(Automatically populated)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedPatient ? selectedPatient.patientCode : ''}
                    placeholder="Patient ID will auto-populate upon selection"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-900 cursor-not-allowed"
                  />
                  {selectedPatient && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified Patient
                    </span>
                  )}
                </div>
              </div>

              {/* Field 3: Procedure Name (Multiple Selection Supported) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Procedure Name(s)</span>
                    <span className="text-red-500">*</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      (Select one or multiple for this visit)
                    </span>
                  </label>
                  {selectedProcedures.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {selectedProcedures.length} selected
                    </span>
                  )}
                </div>

                {/* Selected procedure tags / chips */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-2 min-h-[46px] flex flex-wrap items-center gap-1.5">
                  {selectedProcedures.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      No procedures selected. Click procedures below to add them.
                    </span>
                  ) : (
                    <>
                      {selectedProcedures.map((procName) => (
                        <span
                          key={procName}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100/90 text-blue-900 border border-blue-200 shadow-xs"
                        >
                          <span>{procName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(procName)}
                            className="p-0.5 hover:bg-blue-200 rounded-md text-blue-700 hover:text-blue-900 transition cursor-pointer"
                            title={`Remove ${procName}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {selectedProcedures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProcedures([]);
                            setCharges(0);
                          }}
                          className="text-[11px] font-medium text-slate-400 hover:text-red-600 transition ml-auto px-1 cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Searchable procedure filter input */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    placeholder="Search dental procedures (e.g. Scaling, Suture, Irrigation, RCT)..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  {procedureSearch && (
                    <button
                      type="button"
                      onClick={() => setProcedureSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Categorized Procedure List */}
                <div className="max-h-56 overflow-y-auto space-y-3 p-2 bg-slate-50/70 border border-slate-200 rounded-xl">
                  {filteredCategories.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No matching procedures found for "{procedureSearch}". You can add it as a custom procedure below.
                    </div>
                  ) : (
                    filteredCategories.map((group) => {
                      const selectedCountInGroup = group.procedures.filter((p) =>
                        selectedProcedures.includes(p)
                      ).length;

                      return (
                        <div key={group.category} className="bg-white p-2 rounded-lg border border-slate-200/80">
                          <div className="flex items-center justify-between mb-1.5 px-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                              {group.category}
                            </span>
                            {selectedCountInGroup > 0 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                {selectedCountInGroup} selected
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.procedures.map((pName) => {
                              const isSelected = selectedProcedures.includes(pName);
                              return (
                                <button
                                  type="button"
                                  key={pName}
                                  onClick={() => handleToggleProcedure(pName)}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="truncate pr-1">{pName}</span>
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 shrink-0 rounded border border-slate-300 inline-block" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Custom / Other Procedure Input */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customProcedureInput}
                    onChange={(e) => setCustomProcedureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomProcedure();
                      }
                    }}
                    placeholder="Add custom procedure name if not listed above..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomProcedure}
                    disabled={!customProcedureInput.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Field 4 & 5: Procedure Date and Tooth Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procedure Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={procedureDate}
                    onChange={(e) => setProcedureDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tooth Number <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={toothNumber}
                    onChange={(e) => setToothNumber(e.target.value)}
                    placeholder="e.g. 14, 21, 36 or Upper Molar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Field 6: Dentist Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dentist Name
                </label>
                {doctors.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={doctorId}
                      onChange={(e) => {
                        setDoctorId(e.target.value);
                        if (e.target.value !== 'OTHER') setCustomDentistName('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.fullName} ({d.specialization} Specialist)
                        </option>
                      ))}
                      <option value="OTHER">Other / Visiting Dentist...</option>
                    </select>

                    {doctorId === 'OTHER' && (
                      <input
                        type="text"
                        value={customDentistName}
                        onChange={(e) => setCustomDentistName(e.target.value)}
                        placeholder="Enter dentist name (e.g. Dr. A. Sharma)..."
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 transition"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customDentistName}
                    onChange={(e) => setCustomDentistName(e.target.value)}
                    placeholder="Enter dentist name (e.g. Dr. A. Sharma)..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                )}
              </div>

              {/* Field 7: Procedure Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Procedure Description & Clinical Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Record treatment details, clinical notes, diagnosis, observations, or anesthesia used..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Field 8: Procedure Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procedure Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procedure Charges (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={charges}
                    onChange={(e) => setCharges(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Action Buttons: Save & Cancel */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving Procedure...' : 'Save Procedure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
