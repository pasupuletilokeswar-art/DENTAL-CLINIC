import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Stethoscope,
} from 'lucide-react';
import api from '../../services/api';
import { Appointment, Doctor, Patient } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

export const AppointmentModule: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [doctorFilter, setDoctorFilter] = useState<string>('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('');

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    specialization: 'DENTAL',
    appointmentDate: new Date().toISOString().substring(0, 10),
    timeSlot: '10:00',
    durationMinutes: 30,
    visitType: 'NEW_VISIT',
    procedureName: '',
    reasonForVisit: '',
  });
  const [bookingError, setBookingError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const params: any = { date: selectedDate };
      if (doctorFilter) params.doctorId = doctorFilter;
      if (specializationFilter) params.specialization = specializationFilter;

      const res = await api.get('/appointments', { params });
      if (res.data.success) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const docRes = await api.get('/reports/doctors');
      if (docRes.data.success) {
        setDoctors(docRes.data.doctors);
        if (docRes.data.doctors.length > 0 && !bookingData.doctorId) {
          setBookingData((prev) => ({
            ...prev,
            doctorId: docRes.data.doctors[0].id,
            specialization: docRes.data.doctors[0].specialization,
          }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, doctorFilter, specializationFilter]);

  useEffect(() => {
    const socket = getSocket();
    const handleAptUpdate = () => {
      fetchAppointments();
    };

    socket.on('appointment:created', handleAptUpdate);
    socket.on('appointment:updated', handleAptUpdate);

    return () => {
      socket.off('appointment:created', handleAptUpdate);
      socket.off('appointment:updated', handleAptUpdate);
    };
  }, [selectedDate, doctorFilter, specializationFilter]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setBookingError('Please search and select a patient first.');
      return;
    }

    setBookingError('');
    setSubmitting(true);

    try {
      const startDateTime = new Date(`${bookingData.appointmentDate}T${bookingData.timeSlot}:00`);

      const payload = {
        patientId: selectedPatient.id,
        doctorId: bookingData.doctorId,
        specialization: bookingData.specialization,
        appointmentDate: bookingData.appointmentDate,
        startTime: startDateTime.toISOString(),
        durationMinutes: parseInt(bookingData.durationMinutes.toString(), 10),
        visitType: bookingData.visitType,
        procedureName: bookingData.procedureName || undefined,
        reasonForVisit: bookingData.reasonForVisit || undefined,
      };

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        setShowBookingModal(false);
        setSelectedPatient(null);
        fetchAppointments();
      }
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Error booking appointment slot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Booking Trigger */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Specialization</label>
            <select
              value={specializationFilter}
              onChange={(e) => setSpecializationFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Specializations</option>
              <option value="DENTAL">Dental</option>
              <option value="ORTHOPEDIC">Orthopedic</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Doctor</label>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user.fullName} ({doc.specialization} • ₹{doc.consultationFee})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedPatient(null);
            setShowBookingModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Appointment Schedule List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Appointments for {new Date(selectedDate).toDateString()} ({appointments.length})
          </span>
          <span className="text-[11px] text-teal-600 font-semibold">Strict Overlap Conflict Check Active</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No appointments booked for this date. Click "Book Appointment" to schedule.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3 pl-5">Time Slot</th>
                  <th className="p-3">Appointment Code</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Doctor & Specialization</th>
                  <th className="p-3">Visit Type / Procedure</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 pl-5 font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(apt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 font-semibold">{apt.appointmentCode}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{apt.patient.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {apt.patient.patientCode} • {apt.patient.mobile}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{apt.doctor.user.fullName}</div>
                      <div className="text-[10px] text-teal-700 font-medium">{apt.specialization}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-700">{apt.visitType}</span>
                      {apt.procedureName && <div className="text-[10px] text-slate-500">{apt.procedureName}</div>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-3 pr-5 text-right space-x-1">
                      {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Book New Appointment</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search Patient (Name, Phone, or DOC ID) *
                </label>
                <PatientSearchSelect
                  selectedPatient={selectedPatient}
                  onSelect={(p) => setSelectedPatient(p)}
                  placeholder="Type to search and select patient..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookingData.specialization}
                    onChange={(e) => {
                      const spec = e.target.value;
                      const matchingDoctor = doctors.find((d) => d.specialization === spec);
                      setBookingData({
                        ...bookingData,
                        specialization: spec,
                        doctorId: matchingDoctor ? matchingDoctor.id : bookingData.doctorId,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  >
                    <option value="DENTAL">Dental</option>
                    <option value="ORTHOPEDIC">Orthopedic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={bookingData.doctorId}
                    onChange={(e) => {
                      const docId = e.target.value;
                      const doc = doctors.find((d) => d.id === docId);
                      setBookingData({
                        ...bookingData,
                        doctorId: docId,
                        specialization: doc ? doc.specialization : bookingData.specialization,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  >
                    {doctors
                      .filter((d) => d.specialization === bookingData.specialization)
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.user.fullName} (Fee: ₹{doc.consultationFee})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Auto-Fetched Doctor Practice & Consultation Fee Details */}
              {(() => {
                const currentDoc = doctors.find((d) => d.id === bookingData.doctorId);
                if (!currentDoc) return null;
                return (
                  <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-teal-950 flex items-center gap-1.5">
                        <span>{currentDoc.specialization === 'DENTAL' ? '🦷' : '🦴'}</span>
                        <span>{currentDoc.user.fullName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-900 uppercase">
                          {currentDoc.specialization} SPECIALIST
                        </span>
                      </div>
                      {currentDoc.licenseNumber && (
                        <div className="text-[11px] text-teal-700 mt-0.5">{currentDoc.licenseNumber}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-teal-700">Auto-Fetched Fee</div>
                      <div className="text-sm font-extrabold text-teal-950">₹{currentDoc.consultationFee}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookingData.appointmentDate}
                    onChange={(e) => setBookingData({ ...bookingData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <input
                    type="time"
                    required
                    value={bookingData.timeSlot}
                    onChange={(e) => setBookingData({ ...bookingData, timeSlot: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={bookingData.durationMinutes}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, durationMinutes: parseInt(e.target.value, 10) || 30 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visit Type</label>
                  <select
                    value={bookingData.visitType}
                    onChange={(e) => setBookingData({ ...bookingData, visitType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  >
                    <option value="NEW_VISIT">New Visit</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="ROUTINE_CHECKUP">Routine Checkup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure/Reason</label>
                  <input
                    type="text"
                    value={bookingData.procedureName}
                    onChange={(e) => setBookingData({ ...bookingData, procedureName: e.target.value })}
                    placeholder="e.g. Toothache / Knee Pain"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Checking Conflict...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
