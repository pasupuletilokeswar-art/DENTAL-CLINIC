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

  // Sub-module view navigation: 'list' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Create Procedure Form State
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
  const [updatingProcId, setUpdatingProcId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

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

  const navigateToCreate = () => {
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

    setViewMode('create');
  };

  const hasUnsavedChanges = useMemo(() => {
    return (
      selectedPatient !== null ||
      toothNumber.trim() !== '' ||
      description.trim() !== '' ||
      selectedProcedures.length > 1 ||
      (selectedProcedures.length === 1 && selectedProcedures[0] !== 'Consultation') ||
      customDentistName.trim() !== ''
    );
  }, [selectedPatient, toothNumber, description, selectedProcedures, customDentistName]);

  const handleBack = () => {
    if (hasUnsavedChanges && !formSuccess) {
      const confirmDiscard = window.confirm(
        'You have unsaved procedure details. Discard and return to Operations & Procedures?'
      );
      if (!confirmDiscard) return;
    }
    setViewMode('list');
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
          setViewMode('list');
        }, 1100);
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

  // RENDER DEDICATED FULL-PAGE CREATE PROCEDURE SUB-MODULE
  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        {/* Navigation & Breadcrumb Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <button
                type="button"
                onClick={handleBack}
                className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1"
              >
                <Scissors className="w-3.5 h-3.5 text-blue-600" />
                <span>Operations & Procedures</span>
              </button>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Create Procedure</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Create Clinical Procedure</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Full-Page Workspace
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Record one or multiple clinical dental procedures performed during the visit with real-time Patient Directory synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Procedures</span>
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{formSuccess}</span>
          </div>
        )}

        {/* Full-Page Workspace Form */}
        <form onSubmit={handleSaveProcedure} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Patient, Date, Dentist & Notes (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card 1: Patient & Appointment Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Patient & Visit Details</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Step 1</span>
                </div>

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
                    Patient ID <span className="text-slate-400 text-[11px] font-normal">(Auto-populated)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={selectedPatient ? selectedPatient.patientCode : ''}
                      placeholder="Select a patient above to populate ID"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-900 cursor-not-allowed"
                    />
                    {selectedPatient && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Verified Patient</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Field 3 & 4: Procedure Date and Tooth Number */}
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

                {/* Field 5: Dentist Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attending Dentist <span className="text-slate-400 text-[11px] font-normal">(Staff / Visiting)</span>
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
                          placeholder="Enter visiting dentist name (e.g. Dr. A. Sharma)..."
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
              </div>

              {/* Card 2: Clinical Notes & Treatment Summary */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>Clinical Notes & Status</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Step 2</span>
                </div>

                {/* Field 6: Procedure Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procedure Description & Clinical Observations
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Record clinical details, diagnosis, observations, anesthesia used, or post-treatment advice..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                {/* Field 7 & 8: Status & Charges */}
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
                      Estimated Charges (₹)
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
              </div>

            </div>

            {/* Right Column: Procedure / Treatment Selection (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Dental Procedures & Treatments
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {selectedProcedures.length} Selected
                    </span>
                    {selectedProcedures.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProcedures([]);
                          setCharges(0);
                        }}
                        className="text-xs text-slate-400 hover:text-red-600 transition font-medium cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected procedure tags / chips */}
                <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl min-h-[50px] flex flex-wrap items-center gap-2">
                  {selectedProcedures.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      No procedures selected. Click procedures from the categories below or type a custom procedure name.
                    </span>
                  ) : (
                    selectedProcedures.map((procName) => (
                      <span
                        key={procName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200 shadow-xs"
                      >
                        <span>{procName}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProcedure(procName)}
                          className="p-0.5 hover:bg-blue-200 rounded-md text-blue-700 hover:text-blue-900 transition cursor-pointer"
                          title={`Remove ${procName}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Searchable procedure filter input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={procedureSearch}
                    onChange={(e) => setProcedureSearch(e.target.value)}
                    placeholder="Search dental procedures across all categories (e.g. Scaling, RCT, Suture, GIC, Extraction)..."
                    className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  {procedureSearch && (
                    <button
                      type="button"
                      onClick={() => setProcedureSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Categorized Procedure Groups Grid */}
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {filteredCategories.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      No matching procedures found for "{procedureSearch}". You can add it as a custom procedure below.
                    </div>
                  ) : (
                    filteredCategories.map((group) => {
                      const selectedCountInGroup = group.procedures.filter((p) =>
                        selectedProcedures.includes(p)
                      ).length;

                      return (
                        <div key={group.category} className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/90 space-y-2.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              <span>{group.category}</span>
                            </span>
                            {selectedCountInGroup > 0 && (
                              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                                {selectedCountInGroup} selected
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.procedures.map((pName) => {
                              const isSelected = selectedProcedures.includes(pName);
                              return (
                                <button
                                  type="button"
                                  key={pName}
                                  onClick={() => handleToggleProcedure(pName)}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="truncate pr-1">{pName}</span>
                                  {isSelected ? (
                                    <Check className="w-4 h-4 shrink-0 text-white" />
                                  ) : (
                                    <span className="w-4 h-4 shrink-0 rounded border border-slate-300 inline-block" />
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
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Other / Custom Procedure Name
                  </label>
                  <div className="flex items-center gap-2">
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
                      placeholder="Type custom procedure name and click Add..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomProcedure}
                      disabled={!customProcedureInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Procedure</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Actions Bar (Full 12 cols) */}
            <div className="lg:col-span-12 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Selected Patient: </span>
                  <span className="font-bold text-slate-800">
                    {selectedPatient ? `${selectedPatient.name} (${selectedPatient.patientCode})` : 'None Selected'}
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 font-medium">Procedures: </span>
                  <span className="font-bold text-blue-700">
                    {selectedProcedures.length} {selectedProcedures.length === 1 ? 'procedure' : 'procedures'}
                  </span>
                </div>
                <div className="hidden sm:block h-4 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 font-medium">Estimated Charges: </span>
                  <span className="font-bold text-slate-900 font-mono">₹{charges}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Saving Procedures...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Link to Patient Directory</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    );
  }

  // RENDER MAIN OPERATIONS & PROCEDURES LIST VIEW
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
          onClick={navigateToCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Procedure</span>
        </button>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                        {proc.operationInvoice ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{proc.operationInvoice.invoiceNumber || 'Billed'}</span>
                          </span>
                        ) : proc.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Sent to Billing</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingProcId === proc.id}
                            onClick={() => handleSendToBilling(proc)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            title="Mark procedure Completed and send to Billing queue without leaving this page"
                          >
                            {updatingProcId === proc.id ? (
                              <span>Sending...</span>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Complete & Bill</span>
                              </>
                            )}
                          </button>
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
  );
};
