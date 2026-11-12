import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../../services/api';
import { Procedure, ProcedureMaster, Patient, Doctor } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

interface OperationsModuleProps {
  onNavigateToBillingProcedure?: (procedure: Procedure) => void;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({
  onNavigateToBillingProcedure,
}) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureMasters, setProcedureMasters] = useState<ProcedureMaster[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule Procedure Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [masterId, setMasterId] = useState('');
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().substring(0, 10));
  const [charges, setCharges] = useState(4500);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        if (masterRes.data.masters.length > 0 && !masterId) {
          setMasterId(masterRes.data.masters[0].id);
          setCharges(masterRes.data.masters[0].standardCharge);
        }
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
    socket.on('procedure:completed', handleProcUpdate);

    return () => {
      socket.off('procedure:scheduled', handleProcUpdate);
      socket.off('procedure:completed', handleProcUpdate);
    };
  }, []);

  const handleMasterChange = (id: string) => {
    setMasterId(id);
    const m = procedureMasters.find((p) => p.id === id);
    if (m) {
      setCharges(m.standardCharge);
      const matchedDoc = doctors.find((d) => d.specialization === m.specialization);
      if (matchedDoc) setDoctorId(matchedDoc.id);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please search and select a patient first.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/procedures', {
        patientId: selectedPatient.id,
        doctorId,
        procedureMasterId: masterId,
        procedureDate,
        charges,
        clinicalNotes: clinicalNotes || undefined,
      });

      if (res.data.success) {
        setShowScheduleModal(false);
        setSelectedPatient(null);
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error scheduling procedure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Operations & Minor Procedures Management</h3>
          <p className="text-xs text-slate-500">
            Surgical procedures, RCTs, Implants & Injections. Complete Bill opens the dedicated Procedure Billing tab.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedPatient(null);
            setShowScheduleModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Procedure</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Scheduled & Completed Procedures ({procedures.length})
          </span>
          <span className="text-[11px] text-amber-700 font-semibold">Independent Procedure Billing Pipeline</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading procedures...</div>
        ) : procedures.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No procedures scheduled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3 pl-5">Procedure Code</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Procedure Name</th>
                  <th className="p-3">Surgeon / Doctor</th>
                  <th className="p-3">Base Charges</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 pl-5 font-mono font-bold text-slate-800">{proc.procedureCode}</td>
                    <td className="p-3 text-slate-500">{new Date(proc.procedureDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{proc.patient.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{proc.patient.patientCode}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{proc.procedureMaster.name}</div>
                      <div className="text-[10px] text-teal-600">{proc.procedureMaster.specialization}</div>
                    </td>
                    <td className="p-3 text-slate-700">{proc.doctor.user.fullName}</td>
                    <td className="p-3 font-bold text-slate-900">₹{proc.charges}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          proc.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
              Schedule Operation / Procedure
            </h3>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Search Patient *</label>
                <PatientSearchSelect
                  selectedPatient={selectedPatient}
                  onSelect={(p) => setSelectedPatient(p)}
                  placeholder="Type patient name or mobile..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Master *</label>
                <select
                  required
                  value={masterId}
                  onChange={(e) => handleMasterChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {procedureMasters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.specialization} - Standard: ₹{m.standardCharge})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Surgeon / Doctor *</label>
                  <select
                    required
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user.fullName} ({d.specialization} • Fee: ₹{d.consultationFee})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const doc = doctors.find((d) => d.id === doctorId);
                    if (!doc) return null;
                    return (
                      <div className="mt-1 text-[11px] text-teal-800 flex items-center gap-1.5 font-medium">
                        <span>{doc.specialization === 'DENTAL' ? '🦷' : '🦴'}</span>
                        <span className="font-bold">{doc.specialization} Specialist</span>
                        {doc.licenseNumber && <span>• {doc.licenseNumber}</span>}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Date *</label>
                  <input
                    type="date"
                    required
                    value={procedureDate}
                    onChange={(e) => setProcedureDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={charges}
                  onChange={(e) => setCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Procedure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
