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
  FileBadge,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';

export const AVAILABLE_MODULES = [
  { id: 'appointments', label: 'Appointments & Queue', short: 'Appointments', description: 'Patient booking queue and schedule slots' },
  { id: 'operations', label: 'Operations & 3D Chart', short: 'Operations & 3D', description: 'Clinical notes, 3D interactive tooth chart, procedures' },
  { id: 'patients', label: 'Patient Directory', short: 'Patients', description: 'Patient records, case sheets and clinical history' },
  { id: 'dental-lab', label: 'Dental Lab', short: 'Dental Lab', description: 'Physical lab orders, crown & bridge tracking' },
  { id: 'billing', label: 'Consultation Billing', short: 'Billing', description: 'Receipts, payments & consultation fee collection' },
  { id: 'pharmacy', label: 'Pharmacy & Meds', short: 'Pharmacy', description: 'Stock inventory, medicine POS dispensation' },
  { id: 'reports', label: 'Reports & Analytics', short: 'Reports', description: 'Clinical analytics, revenue reports' },
];

export const AdminModule: React.FC = () => {
  // Navigation Tabs: Doctors & Specialists vs Terminal Staff
  const [activeTab, setActiveTab] = useState<'DOCTORS' | 'STAFF'>('DOCTORS');

  // Lists
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Doctors Filtering
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorSpecFilter, setDoctorSpecFilter] = useState('ALL');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState('ALL');

  // Staff Filtering
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState('ALL');

  // Add Doctor Modal State (NO credentials required)
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [docFullName, setDocFullName] = useState('');
  const [docSpecialization, setDocSpecialization] = useState<'DENTAL' | 'ORTHOPEDIC'>('DENTAL');
  const [docFee, setDocFee] = useState<number>(600);
  const [docLicense, setDocLicense] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('doctor123');
  const [docIsActive, setDocIsActive] = useState(true);
  const [docAllowedModules, setDocAllowedModules] = useState<string[]>([
    'appointments',
    'operations',
    'patients',
    'dental-lab',
  ]);

  // Edit Doctor Modal State
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [editDocFullName, setEditDocFullName] = useState('');
  const [editDocSpecialization, setEditDocSpecialization] = useState<'DENTAL' | 'ORTHOPEDIC'>('DENTAL');
  const [editDocFee, setEditDocFee] = useState<number>(600);
  const [editDocLicense, setEditDocLicense] = useState('');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editDocEmail, setEditDocEmail] = useState('');
  const [editDocPassword, setEditDocPassword] = useState('');
  const [editDocIsActive, setEditDocIsActive] = useState(true);
  const [editDocAllowedModules, setEditDocAllowedModules] = useState<string[]>([
    'appointments',
    'operations',
    'patients',
    'dental-lab',
  ]);

  // Delete/Deactivate Doctor State
  const [deletingDoctor, setDeletingDoctor] = useState<any | null>(null);

  // Add Staff Modal State (Username + Password required, Receptionist or Admin only)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffFullName, setStaffFullName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'RECEPTIONIST' | 'ADMIN'>('RECEPTIONIST');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editStaffFullName, setEditStaffFullName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'RECEPTIONIST' | 'ADMIN'>('RECEPTIONIST');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffIsActive, setEditStaffIsActive] = useState(true);
  const [editStaffNewPassword, setEditStaffNewPassword] = useState('');

  // Delete Staff State
  const [deletingStaff, setDeletingStaff] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all doctors and terminal staff
  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, userRes] = await Promise.all([
        api.get('/reports/doctors?all=true'),
        api.get('/auth/admin/users'),
      ]);

      if (docRes.data.success) {
        setDoctors(docRes.data.doctors || []);
      }
      if (userRes.data.success) {
        const allUsers = userRes.data.users || [];
        setStaffUsers(allUsers.filter((u: any) => u.role === 'RECEPTIONIST' || u.role === 'ADMIN'));
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = doctorSearch.toLowerCase().trim();
      const name = (doc.user?.fullName || '').toLowerCase();
      const license = (doc.licenseNumber || '').toLowerCase();
      const phone = (doc.user?.phone || '').toLowerCase();
      const email = (doc.user?.email || '').toLowerCase();

      const matchQuery = !q || name.includes(q) || license.includes(q) || phone.includes(q) || email.includes(q);
      const matchSpec = doctorSpecFilter === 'ALL' || doc.specialization === doctorSpecFilter;
      const isActive = doc.user?.isActive !== false;
      const matchStatus =
        doctorStatusFilter === 'ALL' ||
        (doctorStatusFilter === 'ACTIVE' && isActive) ||
        (doctorStatusFilter === 'INACTIVE' && !isActive);

      return matchQuery && matchSpec && matchStatus;
    });
  }, [doctors, doctorSearch, doctorSpecFilter, doctorStatusFilter]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffUsers.filter((u) => {
      const q = staffSearch.toLowerCase().trim();
      const name = (u.fullName || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();

      const matchQuery = !q || name.includes(q) || username.includes(q) || phone.includes(q);
      const matchRole = staffRoleFilter === 'ALL' || u.role === staffRoleFilter;
      const matchStatus =
        staffStatusFilter === 'ALL' ||
        (staffStatusFilter === 'ACTIVE' && u.isActive) ||
        (staffStatusFilter === 'INACTIVE' && !u.isActive);

      return matchQuery && matchRole && matchStatus;
    });
  }, [staffUsers, staffSearch, staffRoleFilter, staffStatusFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const totalDoctors = doctors.length;
    const activeDoctors = doctors.filter((d) => d.user?.isActive !== false).length;
    const dentalDoctors = doctors.filter((d) => d.specialization === 'DENTAL').length;
    const orthoDoctors = doctors.filter((d) => d.specialization === 'ORTHOPEDIC').length;
    const totalStaff = staffUsers.length;
    const activeStaff = staffUsers.filter((u) => u.isActive).length;
    return { totalDoctors, activeDoctors, dentalDoctors, orthoDoctors, totalStaff, activeStaff };
  }, [doctors, staffUsers]);

  // ==========================================
  // DOCTOR HANDLERS
  // ==========================================
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        fullName: docFullName.trim(),
        specialization: docSpecialization,
        consultationFee: Number(docFee) || (docSpecialization === 'DENTAL' ? 600 : 800),
        licenseNumber: docLicense.trim() || undefined,
        phone: docPhone.trim() || undefined,
        email: docEmail.trim() || undefined,
        password: docPassword.trim() || 'doctor123',
        isActive: docIsActive,
        allowedModules: docAllowedModules,
      };

      const res = await api.post('/auth/admin/doctors', payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `Doctor ${res.data.doctor.user?.fullName || docFullName} added successfully! Visible everywhere across appointments, billing, and clinical operations. (Login password: ${docPassword || 'doctor123'})`,
        });

        // Reset
        setDocFullName('');
        setDocSpecialization('DENTAL');
        setDocFee(600);
        setDocLicense('');
        setDocPhone('');
        setDocEmail('');
        setDocPassword('doctor123');
        setDocIsActive(true);
        setDocAllowedModules(['appointments', 'operations', 'patients', 'dental-lab']);
        setShowAddDoctorModal(false);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error registering doctor profile.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditDoctor = (doc: any) => {
    setEditingDoctor(doc);
    setEditDocFullName(doc.user?.fullName || '');
    setEditDocSpecialization(doc.specialization || 'DENTAL');
    setEditDocFee(doc.consultationFee ?? (doc.specialization === 'DENTAL' ? 600 : 800));
    setEditDocLicense(doc.licenseNumber || '');
    setEditDocPhone(doc.user?.phone || '');
    setEditDocEmail(doc.user?.email || '');
    setEditDocPassword('');
    setEditDocIsActive(doc.user?.isActive !== false);

    let modules = ['appointments', 'operations', 'patients', 'dental-lab'];
    if (doc.user?.allowedModules) {
      try {
        const parsed = typeof doc.user.allowedModules === 'string' ? JSON.parse(doc.user.allowedModules) : doc.user.allowedModules;
        if (Array.isArray(parsed) && parsed.length > 0) modules = parsed;
      } catch (e) {
        modules = String(doc.user.allowedModules).split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    setEditDocAllowedModules(modules);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const payload: any = {
        fullName: editDocFullName.trim(),
        specialization: editDocSpecialization,
        consultationFee: Number(editDocFee) || 0,
        licenseNumber: editDocLicense.trim() || null,
        phone: editDocPhone.trim() || null,
        email: editDocEmail.trim() || null,
        isActive: editDocIsActive,
        allowedModules: editDocAllowedModules,
      };

      if (editDocPassword.trim()) {
        payload.password = editDocPassword.trim();
      }

      const res = await api.put(`/auth/admin/doctors/${editingDoctor.id}`, payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `Doctor ${res.data.doctor.user?.fullName || editDocFullName} updated successfully!`,
        });
        setEditingDoctor(null);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error updating doctor profile.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDoctorStatus = async (doc: any) => {
    try {
      const currentActive = doc.user?.isActive !== false;
      const res = await api.put(`/auth/admin/doctors/${doc.id}`, {
        isActive: !currentActive,
      });
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error toggling doctor status');
    }
  };

  const handleDeleteDoctor = async () => {
    if (!deletingDoctor) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/auth/admin/doctors/${deletingDoctor.id}`);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: res.data.message || 'Doctor profile removed successfully.',
        });
        setDeletingDoctor(null);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error deleting doctor.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // STAFF HANDLERS (Receptionist & Admin logins)
  // ==========================================
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        fullName: staffFullName.trim(),
        username: staffUsername.toLowerCase().trim(),
        password: staffPassword,
        role: staffRole,
        email: staffEmail || undefined,
        phone: staffPhone || undefined,
      };

      const res = await api.post('/auth/admin/users', payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `Staff account for ${res.data.user.fullName} (@${res.data.user.username}) created successfully!`,
        });

        setStaffFullName('');
        setStaffUsername('');
        setStaffPassword('');
        setStaffEmail('');
        setStaffPhone('');
        setShowAddStaffModal(false);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error creating staff login account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditStaff = (user: any) => {
    setEditingStaff(user);
    setEditStaffFullName(user.fullName || '');
    setEditStaffEmail(user.email || '');
    setEditStaffPhone(user.phone || '');
    setEditStaffRole(user.role);
    setEditStaffIsActive(user.isActive !== false);
    setEditStaffNewPassword('');
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setStatusMsg(null);
    setSubmitting(true);

    try {
      const payload: any = {
        fullName: editStaffFullName.trim(),
        email: editStaffEmail || null,
        phone: editStaffPhone || null,
        role: editStaffRole,
        isActive: editStaffIsActive,
      };

      if (editStaffNewPassword.trim().length >= 4) {
        payload.password = editStaffNewPassword.trim();
      }

      const res = await api.put(`/auth/admin/users/${editingStaff.id}`, payload);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: `Staff account @${editingStaff.username} updated successfully!`,
        });
        setEditingStaff(null);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error updating staff account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStaffStatus = async (user: any) => {
    try {
      const res = await api.put(`/auth/admin/users/${user.id}`, {
        isActive: !user.isActive,
      });
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error toggling staff status');
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/auth/admin/users/${deletingStaff.id}`);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          text: res.data.message || 'Staff account deleted.',
        });
        setDeletingStaff(null);
        fetchData();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error deleting staff account.',
      });
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
              Single-Terminal Architecture
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Clinic & Doctor Administration</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure consulting doctors, consultation fees, and front-desk reception staff. Doctors do not require terminal credentials and reflect everywhere in the clinic.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === 'DOCTORS' ? (
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Doctor</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0090e7] to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#0090e7]/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 block">Total Doctors</span>
            <Stethoscope className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalDoctors}</div>
          <span className="text-[11px] text-emerald-600 font-bold mt-0.5 block">{metrics.activeDoctors} Active practitioners</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 block">Dental Specialists</span>
            <span className="text-sm">🦷</span>
          </div>
          <div className="text-2xl font-black text-sky-700 mt-1">{metrics.dentalDoctors}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Dental department</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Orthopedic Specialists</span>
            <span className="text-sm">🦴</span>
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{metrics.orthoDoctors}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Orthopedic department</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Terminal Staff</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.totalStaff}</div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">{metrics.activeStaff} Active logins</span>
        </div>
      </div>

      {/* Global Status Message */}
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

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('DOCTORS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'DOCTORS'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Consulting Doctors & Specialists</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'DOCTORS' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {doctors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'STAFF'
              ? 'bg-[#0090e7] text-white shadow-md shadow-[#0090e7]/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Terminal Logins (Reception & Admin)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'STAFF' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {staffUsers.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CONSULTING DOCTORS                                     */}
      {/* ============================================================== */}
      {activeTab === 'DOCTORS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctor by name, license, contact..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
                />
              </div>

              {/* Specialization Filter */}
              <select
                value={doctorSpecFilter}
                onChange={(e) => setDoctorSpecFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="ALL">All Departments</option>
                <option value="DENTAL">Dental Specialists</option>
                <option value="ORTHOPEDIC">Orthopedic Specialists</option>
              </select>

              {/* Status Filter */}
              <select
                value={doctorStatusFilter}
                onChange={(e) => setDoctorStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredDoctors.length}</strong> of {doctors.length} doctors
              </span>
              <button
                onClick={() => setShowAddDoctorModal(true)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>+ Add Doctor</span>
              </button>
            </div>
          </div>

          {/* Doctors Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading doctor profiles...</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Stethoscope className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No doctors found matching criteria</p>
              <p className="text-slate-400 text-[11px] mt-1">Click "+ Add New Doctor" to register clinical practitioners.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-6">Doctor / Specialist</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Standard Consultation Fee</th>
                    <th className="p-3.5">Permitted Modules</th>
                    <th className="p-3.5">License / Reg Number</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Availability Status</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => {
                    const isDental = doc.specialization === 'DENTAL';
                    const isActive = doc.user?.isActive !== false;

                    return (
                      <tr key={doc.id} className="hover:bg-teal-50/30 transition">
                        {/* Name & Avatar */}
                        <td className="p-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                                isDental
                                  ? 'bg-gradient-to-tr from-sky-500 to-teal-500'
                                  : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                              }`}
                            >
                              {doc.user?.fullName ? doc.user.fullName.replace('Dr.', '').trim().charAt(0).toUpperCase() : 'D'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{doc.user?.fullName || 'Doctor'}</span>
                                <span className="text-sm">{isDental ? '🦷' : '🦴'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Reflected across Appointments & Billing
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Specialization */}
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 ${
                              isDental
                                ? 'bg-sky-50 text-[#0090e7] border-sky-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            <span>{isDental ? 'Dental' : 'Orthopedic'}</span>
                          </span>
                        </td>

                        {/* Consultation Fee */}
                        <td className="p-3.5">
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-xs">
                            <span>₹{doc.consultationFee}</span>
                          </div>
                        </td>

                        {/* Permitted Modules */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(() => {
                              let modules: string[] = ['appointments', 'operations', 'patients', 'dental-lab'];
                              if (doc.user?.allowedModules) {
                                try {
                                  const parsed = typeof doc.user.allowedModules === 'string' ? JSON.parse(doc.user.allowedModules) : doc.user.allowedModules;
                                  if (Array.isArray(parsed) && parsed.length > 0) modules = parsed;
                                } catch (e) {
                                  modules = String(doc.user.allowedModules).split(',').map((s: string) => s.trim()).filter(Boolean);
                                }
                              }
                              return modules.map((modId) => {
                                const found = AVAILABLE_MODULES.find((m) => m.id === modId);
                                return (
                                  <span
                                    key={modId}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                                    title={found?.description || modId}
                                  >
                                    {found?.short || modId}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </td>

                        {/* License / Reg */}
                        <td className="p-3.5">
                          {doc.licenseNumber ? (
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {doc.licenseNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="p-3.5 text-slate-600 text-[11px]">
                          <div>{doc.user?.phone || '—'}</div>
                          {doc.user?.email && <div className="text-slate-400 text-[10px]">{doc.user.email}</div>}
                        </td>

                        {/* Availability Status */}
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleDoctorStatus(doc)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Click to toggle doctor active status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditDoctor(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                              title="Edit Doctor Details & Fee"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingDoctor(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                              title="Delete or Deactivate Doctor"
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
      )}

      {/* ============================================================== */}
      {/* TAB 2: TERMINAL STAFF LOGINS (RECEPTIONIST & ADMIN)             */}
      {/* ============================================================== */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff by name, username, phone..."
                  className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0090e7] shadow-2xs"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0090e7] shadow-2xs"
              >
                <option value="ALL">All Roles</option>
                <option value="RECEPTIONIST">Receptionists</option>
                <option value="ADMIN">Administrators</option>
              </select>

              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0090e7] shadow-2xs"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredStaff.length}</strong> of {staffUsers.length} staff
              </span>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-3.5 py-1.5 bg-[#0090e7] hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Staff Member</span>
              </button>
            </div>
          </div>

          {/* Staff Table */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading terminal staff...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No staff accounts found matching filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-6">Staff Member</th>
                    <th className="p-3.5">Terminal Username</th>
                    <th className="p-3.5">System Role</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Login Access</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((u) => (
                    <tr key={u.id} className="hover:bg-sky-50/30 transition">
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                              u.role === 'ADMIN'
                                ? 'bg-gradient-to-tr from-indigo-700 to-purple-600'
                                : 'bg-gradient-to-tr from-amber-600 to-orange-500'
                            }`}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.fullName}</div>
                            <div className="text-[10px] text-slate-400">Single-Terminal Login</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          @{u.username}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 text-[11px]">
                        <div>{u.phone || '—'}</div>
                        {u.email && <div className="text-slate-400 text-[10px]">{u.email}</div>}
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStaffStatus(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Click to toggle terminal login access"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{u.isActive ? 'Allowed' : 'Blocked'}</span>
                        </button>
                      </td>

                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditStaff(u)}
                            className="p-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#0090e7] rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                            title="Edit Staff Account"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingStaff(u)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                            title="Delete Staff Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ADD DOCTOR MODAL (NO CREDENTIALS)                           */}
      {/* ============================================================== */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Consulting Doctor</h3>
                  <p className="text-xs text-slate-400">Register doctor details, specialization, and consultation fee</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informational Banner */}
            <div className="mt-3.5 p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl text-[11px] text-teal-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <strong>No Login Credentials Required:</strong> Consulting doctors do not use the terminal. They will automatically be available in Appointments, Billing, Clinical Notes, and Procedures.
              </div>
            </div>

            <form onSubmit={handleCreateDoctor} className="mt-4 space-y-3.5 text-xs">
              {/* Doctor Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  value={docFullName}
                  onChange={(e) => setDocFullName(e.target.value)}
                  placeholder="Doctor Full Name"
                  maxLength={100}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Department & Consultation Fee */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Specialization *</label>
                  <select
                    value={docSpecialization}
                    onChange={(e) => {
                      const spec = e.target.value as 'DENTAL' | 'ORTHOPEDIC';
                      setDocSpecialization(spec);
                      if (docFee === 600 || docFee === 800) {
                        setDocFee(spec === 'DENTAL' ? 600 : 800);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="DENTAL">🦷 Dental Specialist</option>
                    <option value="ORTHOPEDIC">🦴 Orthopedic Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={docFee}
                      onChange={(e) => setDocFee(parseFloat(e.target.value) || 0)}
                      placeholder="600"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Registration / License */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Registration / License / Degree</label>
                <input
                  type="text"
                  value={docLicense}
                  onChange={(e) => setDocLicense(e.target.value)}
                  placeholder="e.g. DCI-2024-9182 / BDS, MDS (Endodontist)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    placeholder="Doctor email address"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Doctor Login Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Portal Login Password</label>
                <input
                  type="text"
                  value={docPassword}
                  onChange={(e) => setDocPassword(e.target.value)}
                  placeholder="Password for doctor login (default: doctor123)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Doctor selects their name on the login screen and enters this password.</span>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Availability Status</label>
                <select
                  value={docIsActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setDocIsActive(e.target.value === 'ACTIVE')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="ACTIVE">Active (Available for Appointments & Billing)</option>
                  <option value="INACTIVE">Inactive (Temporarily Hidden)</option>
                </select>
              </div>

              {/* Permitted Modules Access Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Permitted Modules (Role Access)</label>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {docAllowedModules.length} Modules Allowed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Select which modules this doctor is allowed to access upon login:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {AVAILABLE_MODULES.map((m) => {
                    const isChecked = docAllowedModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-50/60 border-teal-300 text-teal-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocAllowedModules([...docAllowedModules, m.id]);
                            } else {
                              setDocAllowedModules(docAllowedModules.filter((id) => id !== m.id));
                            }
                          }}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{m.label}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{m.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Registering Doctor...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. EDIT DOCTOR MODAL (EDIT DETAILS & STATUS)                   */}
      {/* ============================================================== */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Doctor Details</h3>
                  <p className="text-xs text-slate-400">Update practice information, fee, and availability status</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDoctor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor} className="mt-4 space-y-3.5 text-xs">
              {/* Doctor Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  value={editDocFullName}
                  onChange={(e) => setEditDocFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Department & Consultation Fee */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Specialization *</label>
                  <select
                    value={editDocSpecialization}
                    onChange={(e) => setEditDocSpecialization(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="DENTAL">🦷 Dental Specialist</option>
                    <option value="ORTHOPEDIC">🦴 Orthopedic Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Fee (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editDocFee}
                      onChange={(e) => setEditDocFee(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Registration / License */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Registration / License</label>
                <input
                  type="text"
                  value={editDocLicense}
                  onChange={(e) => setEditDocLicense(e.target.value)}
                  placeholder="e.g. DCI-2024-9182"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editDocPhone}
                    onChange={(e) => setEditDocPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editDocEmail}
                    onChange={(e) => setEditDocEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Reset Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Update Doctor Login Password (Optional)</label>
                <input
                  type="text"
                  value={editDocPassword}
                  onChange={(e) => setEditDocPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Enter a new password if the doctor wishes to reset it.</span>
              </div>

              {/* Availability Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Availability Status</label>
                <select
                  value={editDocIsActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setEditDocIsActive(e.target.value === 'ACTIVE')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="ACTIVE">Active (Available for Appointments & Billing)</option>
                  <option value="INACTIVE">Inactive (Hidden from booking dropdowns)</option>
                </select>
              </div>

              {/* Permitted Modules Access Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Permitted Modules (Role Access)</label>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {editDocAllowedModules.length} Modules Allowed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">Select which modules this doctor is allowed to access upon login:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {AVAILABLE_MODULES.map((m) => {
                    const isChecked = editDocAllowedModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border transition cursor-pointer ${
                          isChecked
                            ? 'bg-teal-50/60 border-teal-300 text-teal-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditDocAllowedModules([...editDocAllowedModules, m.id]);
                            } else {
                              setEditDocAllowedModules(editDocAllowedModules.filter((id) => id !== m.id));
                            }
                          }}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{m.label}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{m.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. DELETE DOCTOR DIALOG                                        */}
      {/* ============================================================== */}
      {deletingDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Remove Doctor</h3>
                <p className="text-xs text-slate-500">{deletingDoctor.user?.fullName || 'Doctor'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{deletingDoctor.user?.fullName}</strong> ({deletingDoctor.specialization})?
              If this doctor has existing clinical consultations, appointments, or bills, they will be safely deactivated to preserve historical data.
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingDoctor(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteDoctor}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {submitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. ADD STAFF MODAL (RECEPTIONIST & ADMIN ONLY)                  */}
      {/* ============================================================== */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-[#0090e7] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Add Staff Member</h3>
                  <p className="text-xs text-slate-400">Create login credentials for front-desk or admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Staff Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                >
                  <option value="RECEPTIONIST">Receptionist (Front-Desk Staff)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Staff Full Name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Terminal Username *</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="Terminal username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    maxLength={100}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#0090e7] hover:bg-sky-600 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Creating Staff Account...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. EDIT STAFF MODAL                                            */}
      {/* ============================================================== */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Staff Account</h3>
                  <p className="text-xs text-slate-400">Update details for @{editingStaff.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editStaffFullName}
                  onChange={(e) => setEditStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Terminal Login Status</label>
                  <select
                    value={editStaffIsActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditStaffIsActive(e.target.value === 'ACTIVE')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#0090e7]"
                  >
                    <option value="ACTIVE">Active (Can Login)</option>
                    <option value="INACTIVE">Blocked (Login Prevented)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editStaffPhone}
                    onChange={(e) => setEditStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editStaffEmail}
                    onChange={(e) => setEditStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Reset Password (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Leave blank to keep existing</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={editStaffNewPassword}
                    onChange={(e) => setEditStaffNewPassword(e.target.value)}
                    placeholder="Enter new password if resetting..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
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

      {/* ============================================================== */}
      {/* 8. DELETE STAFF DIALOG                                         */}
      {/* ============================================================== */}
      {deletingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Staff Account</h3>
                <p className="text-xs text-slate-500">Confirm action for @{deletingStaff.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the staff account for <strong>{deletingStaff.fullName}</strong> (@{deletingStaff.username})?
            </p>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteStaff}
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
