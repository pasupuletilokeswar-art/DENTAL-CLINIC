import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  History,
  Calendar,
  User,
  Stethoscope,
  Smile,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, ClinicalNote } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

export const ClinicalNotesModule: React.FC = () => {
  // Navigation Tabs: New Paper Entry vs. Previous Historical Records
  const [activeTab, setActiveTab] = useState<'new-entry' | 'previous-records'>('new-entry');

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [previousNotes, setPreviousNotes] = useState<ClinicalNote[]>([]);
  const [allNotesFeed, setAllNotesFeed] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Exact 9 Fields matching specifications
  const [chiefComplaints, setChiefComplaints] = useState(''); // 1
  const [detailedMedicalHistory, setDetailedMedicalHistory] = useState(''); // 2
  const [teethChart, setTeethChart] = useState<Record<string, string>>({}); // 3
  const [observations, setObservations] = useState(''); // 4
  const [investigations, setInvestigations] = useState(''); // 5
  const [diagnosis, setDiagnosis] = useState(''); // 6
  const [treatmentRecommendations, setTreatmentRecommendations] = useState(''); // 7
  const [notes, setNotes] = useState(''); // 8
  const [advice, setAdvice] = useState(''); // 9

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Universal Odontogram Numbers 1-32
  const upperTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const lowerTeeth = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/reports/doctors');
      if (res.data.success) {
        setDoctors(res.data.doctors);
        if (res.data.doctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(res.data.doctors[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotesForPatient = async (patientId: string) => {
    if (!patientId) return;
    setLoadingNotes(true);
    try {
      const res = await api.get(`/clinical-notes/patient/${patientId}`);
      if (res.data.success) {
        setPreviousNotes(res.data.notes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchNotesForPatient(selectedPatient.id);
    } else {
      setPreviousNotes([]);
    }
  }, [selectedPatient]);

  // Real-time socket listener
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      if (selectedPatient) {
        fetchNotesForPatient(selectedPatient.id);
      }
    };
    socket.on('clinical-note:saved', handleUpdate);
    return () => {
      socket.off('clinical-note:saved', handleUpdate);
    };
  }, [selectedPatient]);

  const handleToothToggle = (toothNum: number) => {
    const key = `T${toothNum}`;
    const current = teethChart[key];
    const statuses = ['', 'Caries/Cavity', 'RCT Done', 'Missing/Extracted', 'Crown/Bridge', 'Impacted'];
    const nextIdx = (statuses.indexOf(current || '') + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    setTeethChart((prev) => {
      const updated = { ...prev };
      if (!nextStatus) {
        delete updated[key];
      } else {
        updated[key] = nextStatus;
      }
      return updated;
    });
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Please search and select a patient first' });
      return;
    }
    if (!selectedDoctorId) {
      setStatusMessage({ type: 'error', text: 'Please select the doctor who authored the prescription' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        chiefComplaints,
        detailedMedicalHistory: detailedMedicalHistory || undefined,
        teethChart: Object.keys(teethChart).length > 0 ? teethChart : undefined,
        observations: observations || undefined,
        investigations: investigations || undefined,
        diagnosis,
        treatmentRecommendations: treatmentRecommendations || undefined,
        notes: notes || undefined,
        advice: advice || undefined,
      };

      const res = await api.post('/clinical-notes', payload);
      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Clinical notes saved permanently for ${selectedPatient.name} (${selectedPatient.patientCode})!`,
        });

        // Reset fields
        setChiefComplaints('');
        setDetailedMedicalHistory('');
        setTeethChart({});
        setObservations('');
        setInvestigations('');
        setDiagnosis('');
        setTreatmentRecommendations('');
        setNotes('');
        setAdvice('');
        fetchNotesForPatient(selectedPatient.id);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Error saving notes' });
    } finally {
      setSaving(false);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="space-y-5">
      {/* Top Tabs: Record Doctor Paper Prescription vs. Historical Previous Records */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('new-entry')}
          className={`pb-3 px-5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'new-entry'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>New 9-Field Paper Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('previous-records')}
          className={`pb-3 px-5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'previous-records'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>Previous Clinical Records & Case Sheets ({previousNotes.length})</span>
        </button>
      </div>

      {/* Top Patient Search & Doctor Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-3/4">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Search Patient (Name, Phone, or DOC ID) *
            </label>
            <PatientSearchSelect
              selectedPatient={selectedPatient}
              onSelect={(p) => setSelectedPatient(p)}
              placeholder="Type to search patient and view history..."
            />
          </div>

          <div className="w-72">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Prescription Doctor *
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user.fullName} ({doc.specialization} • Fee: ₹{doc.consultationFee})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Doctor Auto-Fetched Practice Details */}
        {(() => {
          const doc = doctors.find((d) => d.id === selectedDoctorId);
          if (!doc) return null;
          return (
            <div className="text-right text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-end gap-1.5">
                <span>{doc.specialization === 'DENTAL' ? '🦷' : '🦴'}</span>
                <span>{doc.user.fullName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800">
                  {doc.specialization}
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {doc.licenseNumber ? `${doc.licenseNumber} • ` : ''}Standard Fee: ₹{doc.consultationFee}
              </div>
            </div>
          );
        })()}
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: NEW 9-FIELD PAPER PRESCRIPTION ENTRY                              */}
      {/* ========================================================================= */}
      {activeTab === 'new-entry' && (
        <form onSubmit={handleSaveNotes} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">9-Field Standard Clinical Documentation</h3>
              <p className="text-xs text-slate-500">
                {selectedPatient
                  ? `Transcribing paper prescription for ${selectedPatient.name} (${selectedPatient.patientCode})`
                  : 'Search and select a patient above to start transcribing doctor paper notes'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs uppercase">
              {selectedDoctor?.specialization || 'CLINICAL'}
            </span>
          </div>

          {/* Field 1: Chief Complaints */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Chief Complaints <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              placeholder="Patient's primary symptoms, duration and chief concern..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 2: Detailed Medical History */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Detailed Medical History
            </label>
            <textarea
              rows={2}
              value={detailedMedicalHistory}
              onChange={(e) => setDetailedMedicalHistory(e.target.value)}
              placeholder="Past surgeries, existing illnesses, systemic diseases, drug allergies..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 3: Teeth Chart (Interactive Dental odontogram) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                3. Teeth Chart (Universal Odontogram 1–32)
              </label>
              <span className="text-[10px] text-slate-400">Click tooth to toggle Caries / RCT / Crown / Missing</span>
            </div>
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <div className="text-[10px] text-teal-400 uppercase font-semibold text-center mb-2">
                Maxillary (Upper Teeth 1 - 16)
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {upperTeeth.map((num) => {
                  const status = teethChart[`T${num}`];
                  return (
                    <button
                      type="button"
                      key={num}
                      onClick={() => handleToothToggle(num)}
                      title={`Tooth #${num}: ${status || 'Normal'}`}
                      className={`w-7 h-8 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center transition border ${
                        status
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-teal-500'
                      }`}
                    >
                      <span>{num}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[10px] text-teal-400 uppercase font-semibold text-center mb-2">
                Mandibular (Lower Teeth 32 - 17)
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {lowerTeeth.map((num) => {
                  const status = teethChart[`T${num}`];
                  return (
                    <button
                      type="button"
                      key={num}
                      onClick={() => handleToothToggle(num)}
                      title={`Tooth #${num}: ${status || 'Normal'}`}
                      className={`w-7 h-8 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center transition border ${
                        status
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-teal-500'
                      }`}
                    >
                      <span>{num}</span>
                    </button>
                  );
                })}
              </div>

              {Object.keys(teethChart).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex flex-wrap gap-2">
                  {Object.entries(teethChart).map(([t, s]) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                      <strong>{t}:</strong> {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Field 4: Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              4. Observations
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Clinical signs, palpation, mobility, gait or range of motion..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 5: Investigations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              5. Investigations
            </label>
            <textarea
              rows={2}
              value={investigations}
              onChange={(e) => setInvestigations(e.target.value)}
              placeholder="X-Ray findings, OPG, MRI, Blood sugar, CBC, Bone density reports..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 6: Diagnosis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              6. Diagnosis <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Definitive or provisional clinical diagnosis..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 7: Treatment Recommendations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              7. Treatment Recommendations
            </label>
            <textarea
              rows={2}
              value={treatmentRecommendations}
              onChange={(e) => setTreatmentRecommendations(e.target.value)}
              placeholder="Recommended dental procedures, orthopedic therapy, surgical plans..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 8: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              8. Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal progress observations or doctor instructions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          {/* Field 9: Advice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              9. Advice
            </label>
            <textarea
              rows={2}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="Post-procedure instructions, diet restrictions, follow-up date..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving || !selectedPatient}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Paper Notes...' : 'Save Clinical Notes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DEDICATED PREVIOUS CLINICAL RECORDS TAB                            */}
      {/* ========================================================================= */}
      {activeTab === 'previous-records' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Historical Clinical Case Sheets ({previousNotes.length})
              </h3>
              <p className="text-xs text-slate-500">
                {selectedPatient
                  ? `Past medical records for ${selectedPatient.name} (${selectedPatient.patientCode})`
                  : 'Search and select a patient above to view their chronological case history.'}
              </p>
            </div>
            {selectedPatient && (
              <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-lg">
                Patient: {selectedPatient.patientCode}
              </span>
            )}
          </div>

          {loadingNotes ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading historical notes...</div>
          ) : !selectedPatient ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Please search and select a patient using the top bar to inspect their previous clinical records.
            </div>
          ) : previousNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No previous clinical records found for {selectedPatient.name}.
            </div>
          ) : (
            <div className="space-y-4">
              {previousNotes.map((note, idx) => (
                <div
                  key={note.id}
                  className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-3 hover:border-teal-500/50 transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Record #{previousNotes.length - idx}</span>
                      <span className="text-[11px] text-teal-700 font-semibold">
                        Dr. {note.doctor?.user?.fullName} ({note.doctor?.specialization})
                      </span>
                    </div>
                    <span className="text-slate-500 font-medium">
                      Date: {new Date(note.consultationDate).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">1. Chief Complaints</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{note.chiefComplaints}</p>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">6. Diagnosis</span>
                      <p className="font-bold text-slate-900 mt-0.5">{note.diagnosis}</p>
                    </div>
                  </div>

                  {note.detailedMedicalHistory && (
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">2. Medical History</span>
                      <p className="text-slate-700 mt-0.5">{note.detailedMedicalHistory}</p>
                    </div>
                  )}

                  {note.teethChart && Object.keys(note.teethChart).length > 0 && (
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase mb-1">
                        3. Teeth Odontogram Chart
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(note.teethChart).map(([tooth, condition]) => (
                          <span
                            key={tooth}
                            className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]"
                          >
                            {tooth}: {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {note.observations && (
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">4. Observations</span>
                      <p className="text-slate-700 mt-0.5">{note.observations}</p>
                    </div>
                  )}

                  {note.investigations && (
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">5. Investigations</span>
                      <p className="text-slate-700 mt-0.5">{note.investigations}</p>
                    </div>
                  )}

                  {note.treatmentRecommendations && (
                    <div>
                      <span className="text-slate-500 block text-[10px] font-bold uppercase">
                        7. Treatment Recommendations
                      </span>
                      <p className="text-slate-700 mt-0.5">{note.treatmentRecommendations}</p>
                    </div>
                  )}

                  {note.advice && (
                    <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl">
                      <span className="text-teal-900 block text-[10px] font-bold uppercase">9. Patient Advice</span>
                      <p className="text-teal-950 font-medium mt-0.5">{note.advice}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
