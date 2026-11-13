import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Trash2,
  Edit3,
  Search,
  Filter,
  Check,
  X,
  Lock,
  Mail,
  Phone,
  DollarSign,
  Activity,
  UserX,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import api from '../../services/api';

export const AdminModule: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Staff Form State
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Edit Staff Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'RECEPTIONIST' | 'DOCTOR_DENTAL' | 'DOCTOR_ORTHO' | 'ADMIN'>('DOCTOR_DENTAL');
  const [editSpecialization, setEditSpecialization] = useState<'DENTAL' | 'ORTHOPEDIC'>('DENTAL');
  const [editConsultationFee, setEditConsultationFee] = useState<number>(600);
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Confirmation State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/admin/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.doctorProfile?.licenseNumber && u.doctorProfile.licenseNumber.toLowerCase().includes(q));

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'DOCTOR' && (u.role === 'DOCTOR_DENTAL' || u.role === 'DOCTOR_ORTHO')) ||
        u.role === roleFilter;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchQuery && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = users.length;
    const doctors = users.filter((u) => u.role === 'DOCTOR_DENTAL' || u.role === 'DOCTOR_ORTHO').length;
    const receptionists = users.filter((u) => u.role === 'RECEPTIONIST').length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const active = users.filter((u) => u.isActive).length;
    return { total, doctors, receptionists, admins, active };
  }, [users]);

  // Handle Create User
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
        ? licenseNumber
          ? `${designation} (Reg: ${licenseNumber})`
          : designation
        : licenseNumber || undefined;

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
        setShowAddModal(false);
        fetchUsers();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error creating user account',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditFullName(user.fullName || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditIsActive(user.isActive !== false);
    setEditNewPassword('');

    if (user.doctorProfile) {
      setEditSpecialization(user.doctorProfile.specialization || 'DENTAL');
      setEditConsultationFee(user.doctorProfile.consultationFee || 600);
      setEditLicenseNumber(user.doctorProfile.licenseNumber || '');
    } else {
      setEditSpecialization('DENTAL');
      setEditConsultationFee(600);
      setEditLicenseNumber('');
    }
  };

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const payload: any = {
        fullName: editFullName,
        email: editEmail || null,
        phone: editPhone || null,
        role: editRole,
        isActive: editIsActive,
      };

      if (editNewPassword.trim().length >= 4) {
        payload.password = editNewPassword.trim();
      }

      if (editRole === 'DOCTOR_DENTAL' || editRole === 'DOCTOR_ORTHO') {
        payload.specialization = editSpecialization;
        payload.consultationFee = Number(editConsultationFee) || 0;
        payload.licenseNumber = editLicenseNumber || null;
      }

      const res = await api.put(`/auth/admin/users/${editingUser.id}`, payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `User ${res.data.user.fullName} updated successfully!`,
        });
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error updating user profile',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (user: any) => {
    try {
      const res = await api.put(`/auth/admin/users/${user.id}`, {
        isActive: !user.isActive,
      });
      if (res.data.success) {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error toggling user status');
    }
  };

  // Delete User Confirmation
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/auth/admin/users/${deletingUser.id}`);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: res.data.message || 'User deleted successfully',
        });
        setDeletingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* 1. TOP HEADER & METRIC STAT CARDS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-extrabold uppercase tracking-wider text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Administration Hub</span>
            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full text-[10px]">
              Full RBAC Engine
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Staff & Doctor Administration</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Create, edit, manage, and configure staff credentials, roles, and consultation fees for doctors and receptionists.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0090e7] to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0090e7]/30 transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add New Staff Member</span>
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Staff</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
          <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">{metrics.active} Active accounts</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 block">Doctors</span>
          <div className="text-2xl font-black text-teal-700 mt-1">{metrics.doctors}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Dental & Ortho</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Receptionists</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.receptionists}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Front-desk staff</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Administrators</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.admins}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Full clinical rights</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">System Health</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">PostgreSQL Synced</span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. USER DIRECTORY & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by Name, Username, Phone..."
                className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0090e7] shadow-2xs"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0090e7] shadow-2xs"
            >
              <option value="ALL">All Roles</option>
              <option value="DOCTOR">All Doctors</option>
              <option value="DOCTOR_DENTAL">Dental Doctors</option>
              <option value="DOCTOR_ORTHO">Orthopedic Doctors</option>
              <option value="RECEPTIONIST">Receptionists</option>
              <option value="ADMIN">Administrators</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0090e7] shadow-2xs"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} accounts
          </div>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading staff database...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No staff accounts found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-6">Staff Member</th>
                  <th className="p-3.5">Username</th>
                  <th className="p-3.5">Role & Practice</th>
                  <th className="p-3.5">Consultation Fee</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isDoctor = u.role === 'DOCTOR_DENTAL' || u.role === 'DOCTOR_ORTHO';
                  return (
                    <tr key={u.id} className="hover:bg-sky-50/30 transition">
                      {/* Name & Avatar */}
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                              u.role === 'ADMIN'
                                ? 'bg-gradient-to-tr from-indigo-700 to-purple-600'
                                : u.role === 'RECEPTIONIST'
                                ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                                : u.doctorProfile?.specialization === 'DENTAL'
                                ? 'bg-gradient-to-tr from-[#0090e7] to-cyan-500'
                                : 'bg-gradient-to-tr from-teal-600 to-emerald-500'
                            }`}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isDoctor && (
                                <span className="text-sm">
                                  {u.doctorProfile?.specialization === 'DENTAL' ? '🦷' : '🦴'}
                                </span>
                              )}
                            </div>
                            {u.doctorProfile?.licenseNumber && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                {u.doctorProfile.licenseNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="p-3.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          @{u.username}
                        </span>
                      </td>

                      {/* Role & Practice */}
                      <td className="p-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : u.role === 'RECEPTIONIST'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : u.doctorProfile?.specialization === 'DENTAL'
                                ? 'bg-sky-50 text-[#0090e7] border-sky-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                          {u.doctorProfile && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {u.doctorProfile.specialization}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fee */}
                      <td className="p-3.5">
                        {u.doctorProfile ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-xs">
                            <span>₹{u.doctorProfile.consultationFee}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="p-3.5 text-slate-600 text-[11px]">
                        <div>{u.phone || '—'}</div>
                        {u.email && <div className="text-slate-400 text-[10px]">{u.email}</div>}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle account active status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#0090e7] rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                            title="Edit Staff Information & Fee"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                            title="Delete / Deactivate User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. ADD NEW STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-[#0090e7] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add New Staff Member</h3>
                  <p className="text-xs text-slate-400">Create login credentials with specific clinical role</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              {/* Role */}
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                >
                  <option value="DOCTOR">Doctor (Medical Specialist - Dental / Ortho)</option>
                  <option value="RECEPTIONIST">Receptionist (Front-Desk Staff)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {/* Doctor Details */}
              {role === 'DOCTOR' && (
                <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Department Practice Category *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialization('DENTAL');
                          if (consultationFee === 800) setConsultationFee(600);
                        }}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                          specialization === 'DENTAL'
                            ? 'bg-[#0090e7] text-white border-[#0090e7] font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">🦷</span>
                        <div>
                          <div className="text-xs font-bold">Dental</div>
                          <div className="text-[10px] opacity-80">Dentistry, RCT, Surgery</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSpecialization('ORTHOPEDIC');
                          if (consultationFee === 600) setConsultationFee(800);
                        }}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                          specialization === 'ORTHOPEDIC'
                            ? 'bg-[#0090e7] text-white border-[#0090e7] font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg">🦴</span>
                        <div>
                          <div className="text-xs font-bold">Orthopedic</div>
                          <div className="text-[10px] opacity-80">Bones & Joints</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Standard Consultation Fee (₹) *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-[#0090e7]"
                      />
                    </div>
                  </div>

                  {/* Qualifications & License */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Designation</label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. BDS, MDS"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">License / Reg #</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. DCI-9844"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
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
                  placeholder={role === 'DOCTOR' ? 'Dr. Name...' : 'Staff Member Name...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. dr_rajesh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0090e7] hover:bg-sky-600 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Creating Staff Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT STAFF MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Staff Account</h3>
                  <p className="text-xs text-slate-400">Update details for @{editingUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                />
              </div>

              {/* Role */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    <option value="DOCTOR_DENTAL">Doctor (Dental)</option>
                    <option value="DOCTOR_ORTHO">Doctor (Orthopedic)</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Active Status</label>
                  <select
                    value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditIsActive(e.target.value === 'ACTIVE')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    <option value="ACTIVE">Active (Can Login)</option>
                    <option value="INACTIVE">Deactivated (Login Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Doctor Details */}
              {(editRole === 'DOCTOR_DENTAL' || editRole === 'DOCTOR_ORTHO') && (
                <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Department</label>
                      <select
                        value={editSpecialization}
                        onChange={(e) => setEditSpecialization(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="DENTAL">Dental</option>
                        <option value="ORTHOPEDIC">Orthopedic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Consultation Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={editConsultationFee}
                        onChange={(e) => setEditConsultationFee(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Medical Registration / License</label>
                    <input
                      type="text"
                      value={editLicenseNumber}
                      onChange={(e) => setEditLicenseNumber(e.target.value)}
                      placeholder="e.g. DCI-2024-110"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Reset Password Optional */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Reset Password (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Leave blank to keep existing</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Enter new password if resetting..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION DIALOG */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete User Account</h3>
                <p className="text-xs text-slate-500">Confirm action for @{deletingUser.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the account for <strong>{deletingUser.fullName}</strong> ({deletingUser.role.replace('_', ' ')})?
              If this user has linked clinical records, the account will be safely deactivated to preserve clinical history.
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
