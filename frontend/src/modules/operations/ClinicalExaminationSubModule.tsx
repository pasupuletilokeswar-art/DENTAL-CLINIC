import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Doctor, ClinicalFinding, RecommendedTreatment, ClinicalNote, DentitionType } from '../../types';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { ToothQuadrantSelector, SelectedTooth, parseToothValue } from '../../components/ToothQuadrantSelector';

interface ClinicalExaminationSubModuleProps {
  initialPatient?: Patient | null;
  initialNote?: ClinicalNote | null;
  onNavigateToProcedures?: (patient: Patient) => void;
  onNavigateToHistory?: (patient: Patient) => void;
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

export const ClinicalExaminationSubModule: React.FC<ClinicalExaminationSubModuleProps> = ({
  initialPatient = null,
  initialNote = null,
  onNavigateToProcedures,
  onNavigateToHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // SECTION 1: Patient Complaint
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [customComplaint, setCustomComplaint] = useState('');
  const [durationOfComplaint, setDurationOfComplaint] = useState('');
  const [patientDescription, setPatientDescription] = useState('');

  // SECTION 2: Consulting Doctor
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [consultationDate, setConsultationDate] = useState<string>(new Date().toISOString().substring(0, 10));

  // SECTION 3: Clinical Examination & Findings
  const [findingsList, setFindingsList] = useState<ClinicalFinding[]>([]);
  const [customFindingInput, setCustomFindingInput] = useState('');

  // SECTION 4: Recommended Treatment
  const [treatmentsList, setTreatmentsList] = useState<RecommendedTreatment[]>([]);
  const [customTreatmentInput, setCustomTreatmentInput] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

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
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    };
    fetchDoctors();
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
      if (initialNote.recommendedTreatments && Array.isArray(initialNote.recommendedTreatments)) {
        setTreatmentsList(initialNote.recommendedTreatments);
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

  // SECTION 4 Handlers: Recommended Treatments
  const addTreatment = (name: string) => {
    setTreatmentsList([
      ...treatmentsList,
      {
        treatment: name,
        priority: 'Normal',
        advice: '',
        plannedDate: '',
        followUpDate: '',
      },
    ]);
  };

  const updateTreatment = (index: number, field: keyof RecommendedTreatment, value: any) => {
    const updated = [...treatmentsList];
    updated[index] = { ...updated[index], [field]: value };
    setTreatmentsList(updated);
  };

  const removeTreatment = (index: number) => {
    setTreatmentsList(treatmentsList.filter((_, i) => i !== index));
  };

  const handleResetForm = () => {
    if (window.confirm('Reset all fields in this clinical examination form?')) {
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
      setFormError(null);
      setSavedSuccess(null);
    }
  };

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
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
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
            plannedDate: t.plannedDate || null,
            followUpDate: t.followUpDate || null,
          })),
        followUpDate: followUpDate || null,
        notes: generalNotes.trim() || null,
        advice: treatmentsList.map((t) => t.advice).filter(Boolean).join('; ') || null,
      };

      const res = await api.post('/clinical-notes/examination', payload);

      if (res.data.success) {
        setSavedSuccess({
          note: res.data.note,
          patient: selectedPatient,
          timestamp: new Date().toLocaleTimeString(),
        });

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
        setFormError(null);

        // Move to the top smoothly
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
          mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save clinical examination record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Notes & Examination</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record patient-reported complaints, consulting doctor, clinical findings, and recommended treatments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>
        </div>
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

            <div className="flex items-center gap-2 shrink-0">
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
              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={() => onNavigateToHistory(savedSuccess.patient)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                >
                  View Patient History
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSaveExamination} className="space-y-6">
        {/* ======================================================== */}
        {/* SECTION 1: PATIENT COMPLAINT (CHIEF COMPLAINT)          */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Patient Complaint (Chief Complaint)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Record what the patient reports upon visiting the clinic in their own words.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-full">
              Patient Reported
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Patient Search & Auto Population */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Patient Name <span className="text-rose-500">*</span>
                </label>
                <PatientSearchSelect
                  selectedPatient={selectedPatient}
                  onSelect={(p) => setSelectedPatient(p)}
                />
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
                    <span className="text-xs text-slate-400 italic">Select patient to auto-populate</span>
                  )}
                </div>
              </div>
            </div>

            {/* Visit Date & Complaint Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Appointment / Visit Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Duration of Complaint (e.g., 3 days, 1 week, 2 months)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2-3 days, 1 week"
                  value={durationOfComplaint}
                  onChange={(e) => setDurationOfComplaint(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Common Chief Complaints (Chips) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Chief Complaint Options (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_COMPLAINTS.map((c) => {
                  const isSelected = selectedComplaints.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleComplaint(c)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Complaint */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Or enter custom complaint..."
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
                  + Add
                </button>
              </div>
            </div>

            {/* Patient's Description in Own Words */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Patient's Description (Additional details in the patient's own words)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Patient reports throbbing pain in upper left quadrant that worsens on drinking cold water and chewing..."
                value={patientDescription}
                onChange={(e) => setPatientDescription(e.target.value)}
                className="w-full text-xs font-medium p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2 text-[11px] text-blue-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Clinical Note:</strong> Patient complaints represent subjective patient symptoms, not the doctor's objective clinical diagnosis.
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: CONSULTING DOCTOR                            */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Consulting Doctor</h3>
                <p className="text-[11px] text-slate-500">
                  Select which clinic doctor or dental specialist consulted and examined the patient.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2.5 py-1 rounded-full">
              Clinician Record
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Consulting Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user?.fullName} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Doctor ID</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-700">
                  {currentDoctor ? currentDoctor.id.substring(0, 13) + '...' : '—'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Department / Specialization</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-700">
                  {currentDoctor?.specialization || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: CLINICAL EXAMINATION & FINDINGS               */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Clinical Examination & Findings
                </h3>
                <p className="text-[11px] text-slate-500">
                  Objective clinical examination findings observed by the consulting doctor.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100/70 border border-teal-200 px-2.5 py-1 rounded-full">
              Doctor Findings
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Common Findings Quick Add Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Quick Add Common Findings (Click to add another finding card)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_FINDINGS.map((finding) => (
                  <button
                    type="button"
                    key={finding}
                    onClick={() => addFinding(finding)}
                    className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 rounded-lg font-medium transition cursor-pointer"
                  >
                    + {finding}
                  </button>
                ))}
              </div>

              {/* Custom finding input */}
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
                  className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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

            {/* Structured Findings List */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Recorded Clinical Findings ({findingsList.length})
              </label>

              {findingsList.length === 0 ? (
                <div className="p-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-600">No clinical findings added yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click a quick-add chip above or enter a custom finding to record examination observations.</p>
                </div>
              ) : (
                findingsList.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 relative transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={f.finding}
                          onChange={(e) => updateFinding(idx, 'finding', e.target.value)}
                          placeholder="Finding / Observed Problem"
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

                    {/* Interactive Four-Quadrant Dental Tooth Selector */}
                    <div className="pt-1">
                      <ToothQuadrantSelector
                        value={f.selectedTeeth && f.selectedTeeth.length > 0 ? f.selectedTeeth : f.toothNumber}
                        patientAge={selectedPatient?.age}
                        patientDob={selectedPatient?.dob}
                        initialChartType={f.chartType}
                        onChange={(selectedTeeth, fdiString, chartType) =>
                          handleToothSelectionChange(idx, selectedTeeth, fdiString, chartType)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
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
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Examination Details & Clinical Observations
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Deep cavity on occlusal surface, tenderness on vertical percussion..."
                          value={f.details || ''}
                          onChange={(e) => updateFinding(idx, 'details', e.target.value)}
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
              onClick={() => addFinding('')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Clinical Finding</span>
            </button>
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
                  Doctor's treatment recommendations, planned treatments, instructions, and follow-up advice.
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-full">
              Treatment Plan
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Quick Add Common Treatments */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Quick Add Recommended Treatments
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_TREATMENTS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => addTreatment(t)}
                    className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 rounded-lg font-medium transition cursor-pointer"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              {/* Custom treatment input */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="Enter custom recommended treatment..."
                  value={customTreatmentInput}
                  onChange={(e) => setCustomTreatmentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customTreatmentInput.trim()) {
                        addTreatment(customTreatmentInput.trim());
                        setCustomTreatmentInput('');
                      }
                    }
                  }}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-xl flex-1 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTreatmentInput.trim()) {
                      addTreatment(customTreatmentInput.trim());
                      setCustomTreatmentInput('');
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  + Add Treatment
                </button>
              </div>
            </div>

            {/* Structured Treatments List */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Recommended Treatments Plan ({treatmentsList.length})
              </label>

              {treatmentsList.length === 0 ? (
                <div className="p-5 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-600">No recommended treatments added yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click a quick-add chip above or enter a custom treatment to record recommendations.</p>
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
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Planned Date (Optional)</label>
                        <input
                          type="date"
                          value={t.plannedDate || ''}
                          onChange={(e) => updateTreatment(idx, 'plannedDate', e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                        />
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

            {/* Follow-up Date & Additional Clinical Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Follow-up Date / Review Appointment
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">General Clinical Notes & Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Patient agreed with treatment plan; consented for procedure."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Important Distinction:</strong> Recommended treatments are plans and are <strong>NOT</strong> automatically marked as completed procedures. Actual procedures performed are documented separately in the <em>Procedures & Treatments</em> sub-module.
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
            className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
    </div>
  );
};
