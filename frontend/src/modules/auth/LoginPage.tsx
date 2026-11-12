import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Stethoscope,
  Settings,
  Users,
  ChevronDown,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  Check,
} from 'lucide-react';
import api from '../../services/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'RECEPTIONIST' | 'DOCTOR' | 'ADMIN'>('RECEPTIONIST');
  const [usersInRole, setUsersInRole] = useState<any[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch users whenever selectedRole changes
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError('');
      setIsDropdownOpen(false);

      if (selectedRole === 'ADMIN') {
        setSelectedUsername('admin');
        setSelectedDisplayName('System Administrator (@admin)');
        setLoadingUsers(false);
        return;
      }

      try {
        const res = await api.get('/auth/users-by-role', {
          params: { role: selectedRole },
        });

        if (res.data.success && res.data.users.length > 0) {
          setUsersInRole(res.data.users);
          const first = res.data.users[0];
          setSelectedUsername(first.username);
          setSelectedDisplayName(`${first.fullName} (@${first.username})`);
        } else {
          setUsersInRole([]);
          setSelectedUsername('');
          setSelectedDisplayName('');
        }
      } catch (err: any) {
        console.error('Failed to load users for role:', err);
        setUsersInRole([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername) {
      setError(`Please select or enter a valid ${selectedRole.toLowerCase()} account`);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        username: selectedUsername,
        password,
      });

      if (response.data.success) {
        localStorage.setItem('clinic_token', response.data.token);
        localStorage.setItem('clinic_user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden w-full flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white bg-gradient-to-br from-[#ebf6fd] via-[#f5faff] to-[#e5f2fc]">
      
      {/* Background vector wave accents (No circular rings) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(#0284c7 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top-Right Smooth Vector Waves */}
        <svg
          className="absolute -top-20 -right-20 w-[680px] h-[680px] opacity-70"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="waveGradTop1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="waveGradTop2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path d="M 150 0 C 300 180, 420 80, 600 240 L 600 0 Z" fill="url(#waveGradTop1)" />
          <path d="M 280 0 C 360 220, 480 140, 600 360 L 600 0 Z" fill="url(#waveGradTop2)" />
        </svg>

        {/* Bottom-Left Smooth Vector Waves */}
        <svg
          className="absolute -bottom-28 -left-28 w-[780px] h-[780px] opacity-75"
          viewBox="0 0 700 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="waveGradBottom1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="waveGradBottom2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0090e7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d="M 0 700 L 700 700 C 520 540, 360 620, 200 440 C 90 320, 40 400, 0 460 Z"
            fill="url(#waveGradBottom1)"
          />
          <path
            d="M 0 700 L 580 700 C 420 580, 280 640, 140 500 C 60 420, 20 480, 0 540 Z"
            fill="url(#waveGradBottom2)"
          />
        </svg>

        {/* Soft Ambient Lighting Glows */}
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-cyan-200/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-20 w-[28rem] h-[28rem] bg-sky-200/35 blur-3xl pointer-events-none" />
      </div>

      {/* The Authentic HospAI Dental Logo (Kept at exact approved top-left position) */}
      <div className="absolute top-5 left-8 sm:top-6 sm:left-12 lg:top-7 lg:left-14 z-20">
        <img
          src="/assets/hospai-logo.png"
          alt="HospAI Dental"
          className="h-22 sm:h-26 w-auto object-contain transition-transform hover:scale-102"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* MAIN HERO VIEW: CLEAN, VERTICALLY BALANCED CONTENT */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6 pt-24 md:pt-8 lg:px-16 my-auto">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 mt-10 sm:mt-14 lg:mt-16">
          
          {/* LEFT COLUMN: HEADLINE & SUBTEXT (Vertically Centered) */}
          <div className="flex-1 flex flex-col items-start justify-center max-w-lg">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0a2540] leading-[1.15] tracking-tight">
              Smarter Dental Care <br />
              for a <span className="text-[#0090e7]">Healthier Smile</span>
            </h1>

            {/* Accent divider bar */}
            <div className="w-16 h-1 bg-gradient-to-r from-[#0090e7] to-[#00d2d3] my-4 rounded-none" />

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              Manage patient records, streamline appointments & clinical workflows, and deliver superior dental care with HospAI.
            </p>
          </div>

          {/* VERTICAL DIVIDER LINE BETWEEN LEFT AND RIGHT */}
          <div className="hidden md:block w-px h-80 bg-gradient-to-b from-transparent via-slate-300 to-transparent self-center shrink-0 mx-2" />

          {/* RIGHT COLUMN: SQUARED LOGIN CARD (Moved slightly down) */}
          <div className="flex-1 flex justify-center md:justify-end max-w-md w-full mt-6 md:mt-8">
            <div className="relative w-full bg-white rounded-none shadow-[0_15px_40px_rgba(2,132,199,0.12)] border border-slate-200 p-7 sm:p-8">
              
              {/* Top border accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0090e7] via-[#00b4d8] to-[#0070c9]" />

              {/* Card Header */}
              <div className="text-center mb-5">
                <h2 className="text-2xl font-black text-[#0a2540] tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Sign in to access your clinical dashboard
                </p>
                <div className="w-12 h-1 bg-[#0090e7] mx-auto mt-2 rounded-none" />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-none bg-rose-50 border-l-4 border-rose-500 flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. ROLE SELECTION BUTTONS (Squared) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Receptionist */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('RECEPTIONIST')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-none text-xs font-bold transition-all cursor-pointer ${
                        selectedRole === 'RECEPTIONIST'
                          ? 'bg-[#0090e7] text-white shadow-sm border border-[#0090e7]'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Receptionist</span>
                    </button>

                    {/* Doctor */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('DOCTOR')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-none text-xs font-bold transition-all cursor-pointer ${
                        selectedRole === 'DOCTOR'
                          ? 'bg-[#0090e7] text-white shadow-sm border border-[#0090e7]'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Doctor</span>
                    </button>

                    {/* Admin */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole('ADMIN')}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-none text-xs font-bold transition-all cursor-pointer ${
                        selectedRole === 'ADMIN'
                          ? 'bg-[#0a2540] text-white shadow-sm border border-[#0a2540]'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                {/* 2. SELECT ACCOUNT / STAFF NAME (Squared) */}
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Select Account / Staff Name ({selectedRole})
                  </label>

                  {selectedRole === 'ADMIN' ? (
                    // Admin Direct Box
                    <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-700 font-semibold">
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-slate-600" />
                        <span>System Administrator (admin)</span>
                      </div>
                      <Check className="w-4 h-4 text-[#0090e7]" />
                    </div>
                  ) : (
                    // Dropdown for Receptionist and Doctor
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={loadingUsers}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-none text-xs text-slate-700 transition cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#0090e7] focus:border-[#0090e7]"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <User className="w-4 h-4 text-slate-600 shrink-0" />
                          <span className={`truncate font-medium ${selectedUsername ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                            {loadingUsers
                              ? `Loading ${selectedRole.toLowerCase()} accounts...`
                              : selectedDisplayName || 'Choose your account'}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu Options */}
                      {isDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-xl z-50 p-1.5 max-h-52 overflow-y-auto space-y-1 rounded-none">
                          {usersInRole.length === 0 ? (
                            <div className="p-3 text-center text-xs text-amber-700 bg-amber-50 rounded-none">
                              No {selectedRole.toLowerCase()} accounts found. Log in as <strong>Admin</strong> to add staff.
                            </div>
                          ) : (
                            usersInRole.map((u) => {
                              const isSelected = selectedUsername === u.username;
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedUsername(u.username);
                                    setSelectedDisplayName(`${u.fullName} (@${u.username})`);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`px-3.5 py-2.5 flex items-center justify-between text-xs cursor-pointer transition rounded-none ${
                                    isSelected
                                      ? 'bg-sky-50 text-sky-900 font-bold border border-sky-300'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold text-slate-900">{u.fullName}</div>
                                    <div className="text-[10px] text-slate-500 font-normal">
                                      @{u.username} {u.doctorProfile ? `• ${u.doctorProfile.specialization === 'DENTAL' ? '🦷 Dental' : '🦴 Orthopedic'} (Fee: ₹${u.doctorProfile.consultationFee})` : ''}
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-[#0090e7]" />}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. ENTER PASSWORD (Squared) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Enter Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0090e7] focus:border-[#0090e7] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4. SUBMIT BUTTON (Squared) */}
                <button
                  type="submit"
                  disabled={submitting || !selectedUsername}
                  className="w-full mt-2 py-3 px-6 bg-[#0090e7] hover:bg-[#0077b6] text-white rounded-none font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50 uppercase tracking-wider"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {submitting ? 'Authenticating...' : `Sign In as ${selectedRole}`}
                  </span>
                </button>
              </form>

              {/* 5. NEED HELP / FOOTER LINK */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0090e7] transition cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-[#0090e7]" />
                  <span>Need help? Contact Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER: PROMINENT KALPRA TECH LOGO (BOTTOM RIGHT - INCREASED SIZE) */}
      <footer className="relative z-20 w-full px-8 py-4 flex justify-end items-center">
        <div className="flex items-center">
          <img
            src="/assets/kalpra-tech-logo.png"
            alt="Kalpra Tech - Your AI & Gen AI Partner"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs"
          />
        </div>
      </footer>

      {/* ADMIN HELPER POPUP MODAL (Squared) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-none max-w-sm w-full p-6 shadow-2xl border border-slate-300">
            <div className="flex items-center gap-2 text-[#0090e7] mb-3">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">Administrator Access</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              To add new staff members (Receptionists or Doctors), log in using the initial default administrator credentials:
            </p>
            <div className="bg-slate-50 border border-slate-300 rounded-none p-3 text-xs space-y-1.5 mb-5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-slate-800">Admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-bold text-[#0090e7]">admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="font-bold text-[#0090e7]">admin123</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ADMIN');
                  setSelectedUsername('admin');
                  setPassword('admin123');
                  setShowHelpModal(false);
                }}
                className="flex-1 py-2.5 px-3 bg-[#0090e7] hover:bg-[#0077b6] text-white rounded-none text-xs font-bold transition uppercase tracking-wider"
              >
                Auto-fill Admin
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-none text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
