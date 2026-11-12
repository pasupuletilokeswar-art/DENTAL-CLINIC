import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Trash2,
  Lock,
} from 'lucide-react';
import api from '../../services/api';

export const AdminModule: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'RECEPTIONIST' | 'DOCTOR' | 'ADMIN'>('DOCTOR');
  const [specialization, setSpecialization] = useState<'DENTAL' | 'ORTHOPEDIC'>('DENTAL');
  const [designation, setDesignation] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(600);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/admin/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSubmitting(true);

    try {
      let resolvedRole: string = role;
      if (role === 'DOCTOR') {
        resolvedRole = specialization === 'DENTAL' ? 'DOCTOR_DENTAL' : 'DOCTOR_ORTHO';
      }

      const fullLicense = designation
        ? (licenseNumber ? `${designation} (Reg: ${licenseNumber})` : designation)
        : (licenseNumber || undefined);

      const payload: any = {
        fullName,
        username: username.toLowerCase().trim(),
        password,
        role: resolvedRole,
        email: email || undefined,
        phone: phone || undefined,
      };

      if (role === 'DOCTOR') {
        payload.specialization = specialization;
        payload.consultationFee = Number(consultationFee) || 0;
        payload.licenseNumber = fullLicense;
      }

      const res = await api.post('/auth/admin/users', payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `Account for ${res.data.user.fullName} created successfully in database!`,
        });

        // Reset form
        setFullName('');
        setUsername('');
        setPassword('');
        setEmail('');
        setPhone('');
        setDesignation('');
        setLicenseNumber('');
        setConsultationFee(specialization === 'DENTAL' ? 600 : 800);
        fetchUsers();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error creating user',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate user: ${name}?`)) return;
    try {
      const res = await api.delete(`/auth/admin/users/${id}`);
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deactivating user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Administration Panel</span>
          </div>
          <h2 className="text-lg font-bold">Staff & Doctor Account Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create and manage Receptionist, Dental Doctor, and Orthopedic Doctor accounts with permanent credentials.
          </p>
        </div>

        <div className="text-right">
          <span className="text-2xl font-extrabold text-teal-400">{users.length}</span>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Staff Accounts</div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Create User (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" />
            <span>Create New Staff / Doctor Account</span>
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            {/* Role Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Role *</label>
              <select
                value={role}
                onChange={(e) => {
                  const r = e.target.value as any;
                  setRole(r);
                  if (r === 'DOCTOR') {
                    setConsultationFee(specialization === 'DENTAL' ? 600 : 800);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="DOCTOR">Doctor (Medical Specialist - Dental / Ortho)</option>
                <option value="RECEPTIONIST">Receptionist (Front-Desk Staff)</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            {/* Doctor Practice Details: Specialization & Consultation Fee */}
            {role === 'DOCTOR' && (
              <div className="p-4 bg-teal-50/70 border-2 border-teal-300 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-teal-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    Doctor Department & Consultation Fee
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-teal-200/80 text-teal-900 uppercase">
                    {specialization}
                  </span>
                </div>

                {/* Specialization / Department Radio Buttons */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Department / Practice Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSpecialization('DENTAL');
                        if (consultationFee === 800) setConsultationFee(600);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                        specialization === 'DENTAL'
                          ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl">🦷</span>
                      <div>
                        <div className="text-xs font-bold">Dental Specialist</div>
                        <div className="text-[10px] opacity-80">Dentistry, RCT, Implants</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSpecialization('ORTHOPEDIC');
                        if (consultationFee === 600) setConsultationFee(800);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                        specialization === 'ORTHOPEDIC'
                          ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl">🦴</span>
                      <div>
                        <div className="text-xs font-bold">Orthopedic Specialist</div>
                        <div className="text-[10px] opacity-80">Bones, Joints & Spine</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Standard Consultation Fee Field */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Standard Consultation Fee (₹) <span className="text-red-500">*</span></span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                      Auto-Fetched Everywhere
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                      placeholder="Enter consultation fee (e.g. 600 or 800)"
                      className="w-full pl-8 pr-3 py-2 bg-white border-2 border-teal-400 rounded-xl font-extrabold text-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[10px] text-teal-900 mt-1 font-medium">
                    ⚡ This consultation fee automatically populates whenever this doctor is chosen for Appointments or Consultation Billing.
                  </p>
                </div>

                {/* Doctor Designation / Qualifications & License */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Qualifications / Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. BDS, MDS (Oral Surgeon)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Medical Reg. / License No.</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. DCI-2024-110"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'DOCTOR' ? 'e.g. Dr. Priya Sharma' : 'e.g. Amit Kumar (Receptionist)'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Login Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. priya / dr_amit"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Secret password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Staff mobile"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Staff email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              {submitting ? 'Creating Account in Database...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Right Table: All Created Users (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Existing Accounts ({users.length})</span>
            <span className="text-[11px] text-teal-700 font-semibold">Saved in PostgreSQL</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading user accounts...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No user accounts created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-4">Staff Member</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Role & Department</th>
                    <th className="p-3">Fee / Contact</th>
                    <th className="p-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          {u.doctorProfile && (
                            <span>{u.doctorProfile.specialization === 'DENTAL' ? '🦷' : '🦴'}</span>
                          )}
                          <span>{u.fullName}</span>
                        </div>
                        {u.doctorProfile?.licenseNumber && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {u.doctorProfile.licenseNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">@{u.username}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'ADMIN'
                                ? 'bg-slate-900 text-white'
                                : u.role === 'RECEPTIONIST'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                          {u.doctorProfile && (
                            <span className="text-[10px] font-semibold text-slate-600">
                              {u.doctorProfile.specialization}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {u.doctorProfile ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-1">
                            Fee: ₹{u.doctorProfile.consultationFee}
                          </span>
                        ) : null}
                        <div className="text-[10px] text-slate-500">{u.phone || '-'}</div>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        {u.isActive ? (
                          <span className="text-[11px] font-bold text-emerald-600">Active</span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

