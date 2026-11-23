import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  Pill,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  FileText,
  ChevronRight,
  Layers,
  Coins,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

interface DashboardStats {
  totalPatients: number;
  todayPatients: number;
  todayAppointments: number;
  dentalToday: number;
  orthoToday: number;
  completedToday: number;
  totalRevenueToday: number;
  totalOutstandingToday: number;
  lowStockCount: number;
  breakdown: {
    consultationCollected: number;
    pharmacyCollected: number;
    operationCollected: number;
  };
}

interface DashboardProps {
  onNavigate: (tab: string, param?: any) => void;
}

// Dental Tooth SVG icon
const ToothIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 3C4.24 3 2 5.24 2 8c0 3.12 1.58 6.06 2.5 9 .63 2 1.83 4 3.5 4 1.5 0 2-2 2-4 0-1.5.5-2 2-2s2 .5 2 2c0 2 .5 4 2 4 1.67 0 2.87-2 3.5-4 .92-2.94 2.5-5.88 2.5-9 0-2.76-2.24-5-5-5-1.78 0-3.34.93-4.22 2.34C11.34 3.93 9.78 3 8 3z" />
  </svg>
);

const formatCurrency = (val: number | undefined) => {
  if (val === undefined || val === null) return '₹0';
  return (
    '₹' +
    Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
};

export const DashboardOverview: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setRecentAppointments(res.data.recentAppointments);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const socket = getSocket();
    const handleRefresh = () => {
      fetchStats();
    };

    socket.on('patient:registered', handleRefresh);
    socket.on('appointment:created', handleRefresh);
    socket.on('appointment:updated', handleRefresh);
    socket.on('clinical-note:saved', handleRefresh);
    socket.on('billing:consultation-created', handleRefresh);
    socket.on('pharmacy:inventory-updated', handleRefresh);
    socket.on('procedure:completed', handleRefresh);

    return () => {
      socket.off('patient:registered', handleRefresh);
      socket.off('appointment:created', handleRefresh);
      socket.off('appointment:updated', handleRefresh);
      socket.off('clinical-note:saved', handleRefresh);
      socket.off('billing:consultation-created', handleRefresh);
      socket.off('pharmacy:inventory-updated', handleRefresh);
      socket.off('procedure:completed', handleRefresh);
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading real-time clinic statistics...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Top 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Today's Schedule */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-start gap-4">
          <svg
            className="absolute -bottom-1 -right-1 w-28 h-20 pointer-events-none"
            viewBox="0 0 100 60"
            fill="none"
          >
            <path d="M0 60 C35 58, 48 26, 100 8 L100 60 Z" fill="url(#grad-blue)" />
            <defs>
              <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>

          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shrink-0">
            <Calendar className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
              TODAY'S SCHEDULE
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.todayAppointments || 0}
            </div>
            <div className="mt-2 text-xs text-slate-600 font-semibold">
              {stats?.dentalToday || 0} Dental <span className="text-slate-400 mx-1">•</span>{' '}
              {stats?.orthoToday || 0} Ortho
            </div>
          </div>
        </div>

        {/* Card 2: Total Patients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-start gap-4">
          <svg
            className="absolute -bottom-1 -right-1 w-28 h-20 pointer-events-none"
            viewBox="0 0 100 60"
            fill="none"
          >
            <path d="M0 60 C35 58, 48 26, 100 8 L100 60 Z" fill="url(#grad-teal)" />
            <defs>
              <linearGradient id="grad-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>

          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
            <Users className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
              TOTAL PATIENTS
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.totalPatients || 0}
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>+{stats?.todayPatients || 0} registered today</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Collections */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-start gap-4">
          <svg
            className="absolute -bottom-1 -right-1 w-28 h-20 pointer-events-none"
            viewBox="0 0 100 60"
            fill="none"
          >
            <path d="M0 60 C35 58, 48 26, 100 8 L100 60 Z" fill="url(#grad-sky)" />
            <defs>
              <linearGradient id="grad-sky" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>

          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shrink-0">
            <CreditCard className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
              TODAY'S COLLECTIONS
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {formatCurrency(stats?.totalRevenueToday)}
            </div>
            <div className="mt-2 text-xs text-slate-600 font-semibold">
              Consult: ₹{stats?.breakdown.consultationCollected || 0}{' '}
              <span className="text-slate-400 mx-1">|</span> Pharm: ₹
              {stats?.breakdown.pharmacyCollected || 0}
            </div>
          </div>
        </div>

        {/* Card 4: Pharmacy Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-start gap-4">
          <svg
            className="absolute -bottom-1 -right-1 w-28 h-20 pointer-events-none"
            viewBox="0 0 100 60"
            fill="none"
          >
            <path d="M0 60 C35 58, 48 26, 100 8 L100 60 Z" fill="url(#grad-mint)" />
            <defs>
              <linearGradient id="grad-mint" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.75" />
              </linearGradient>
            </defs>
          </svg>

          <div className="w-12 h-12 rounded-xl bg-emerald-50/90 border border-emerald-100 flex items-center justify-center text-teal-600 shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div className="relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
              PHARMACY ALERTS
            </span>
            <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">
              {stats?.lowStockCount || 0}
            </div>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              Medicines below reorder threshold
            </div>
          </div>
        </div>
      </div>

      {/* Main Middle Row: Today's Appointments & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Appointment Queue (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    TODAY'S APPOINTMENT QUEUE
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Live schedule for Dental and Orthopedic consultations
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('appointments')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition"
              >
                View Full Calendar →
              </button>
            </div>

            <div className="space-y-3">
              {recentAppointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No appointments booked for today yet. Use quick actions to book an appointment.
                </div>
              ) : (
                recentAppointments.map((apt) => {
                  const startTime = new Date(apt.startTime);
                  const timeFormatted = startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const [timeDigits, period] = timeFormatted.split(' ');

                  return (
                    <div
                      key={apt.id}
                      className="p-3 bg-white hover:bg-slate-50/80 border border-slate-100 rounded-xl flex items-center justify-between transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Time Pill with Left Blue Accent Bar */}
                        <div className="bg-sky-50/80 border border-sky-100 border-l-4 border-l-[#0284c7] rounded-lg px-2.5 py-1 text-center min-w-[56px] shadow-2xs">
                          <div className="text-xs font-black text-slate-900 font-mono tracking-tight leading-tight">
                            {timeDigits}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 font-mono tracking-wide leading-tight">
                            {period || 'PM'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {apt.patient?.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-sky-50/70 text-sky-800 border border-sky-200/80 px-2 py-0.5 rounded-md">
                              {apt.patient?.patientCode}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            {apt.doctor?.user?.fullName?.toLowerCase() ||
                              apt.doctor?.user?.username ||
                              'Doctor'}{' '}
                            ({apt.specialization})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-lg tracking-wider uppercase ${
                            apt.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : apt.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-sky-50 text-[#0284c7] border border-sky-200'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Real-time WebSocket feed active</span>
            </div>
            <span className="font-bold text-slate-800">{recentAppointments.length} Active Slots</span>
          </div>
        </div>

        {/* Right Column: Receptionist Quick Actions (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  RECEPTIONIST QUICK ACTIONS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Fast entry shortcuts for daily clinical front-desk
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Register New Patient */}
              <button
                onClick={() => onNavigate('patients')}
                className="w-full p-2.5 rounded-xl border border-sky-100 bg-sky-50/30 hover:bg-sky-50/70 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <UserPlus className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Register New Patient</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Auto sequential ID generation
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Book Doctor Slot */}
              <button
                onClick={() => onNavigate('appointments')}
                className="w-full p-2.5 rounded-xl border border-emerald-100/90 bg-emerald-50/20 hover:bg-emerald-50/60 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Book Doctor Slot</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Dental or Ortho with overlap check
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Clinical Examination */}
              <button
                onClick={() => onNavigate('operations-examination')}
                className="w-full p-2.5 rounded-xl border border-sky-100 bg-sky-50/20 hover:bg-sky-50/60 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Clinical Examination</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Doctor clinical findings & procedures
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              {/* Dispense Pharmacy Sale */}
              <button
                onClick={() => onNavigate('pharmacy-billing')}
                className="w-full p-2.5 rounded-xl border border-teal-100/90 bg-teal-50/20 hover:bg-teal-50/60 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Pill className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Dispense Pharmacy Sale</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      FEFO batch deduction & GST bill
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
            Database records update permanently in PostgreSQL. All changes broadcast across connected terminals in real time.
          </div>
        </div>
      </div>

      {/* Bottom Row: Clinical Departments & Collections Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Operations Stream (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                <ToothIcon className="w-5 h-5 stroke-[2] text-sky-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  CLINICAL DEPARTMENTS & ACTIVE WORKFLOWS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Real-time status across Dental and Orthodontics operations
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg tracking-wider uppercase">
              OPERATIONAL HUB
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {/* Dental Division Card */}
            <div className="p-4 rounded-xl border border-sky-100 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-slate-900">Dental Department</span>
                <span className="text-xs font-bold text-sky-600">
                  {stats?.dentalToday ?? 0} Visits
                </span>
              </div>
              <p className="text-[11px] text-slate-500 my-2.5 leading-snug">
                Root canal, scaling, tooth extractions, and routine oral exams.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                  style={{
                    width: stats?.todayAppointments && stats?.dentalToday
                      ? `${Math.min(100, Math.round((stats.dentalToday / stats.todayAppointments) * 100))}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span className="font-bold text-slate-600">
                  Active Slots: {stats?.dentalToday ?? 0}
                </span>
                <span className="text-slate-700 font-semibold font-sans">Dental Division</span>
              </div>
            </div>

            {/* Orthodontic Division Card */}
            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-slate-900">Orthodontic Department</span>
                <span className="text-xs font-bold text-emerald-600">
                  {stats?.orthoToday ?? 0} Visits
                </span>
              </div>
              <p className="text-[11px] text-slate-500 my-2.5 leading-snug">
                Braces tightening, aligner adjustments, and retainer check-ups.
              </p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: stats?.todayAppointments && stats?.orthoToday
                      ? `${Math.min(100, Math.round((stats.orthoToday / stats.todayAppointments) * 100))}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                <span className="font-bold text-slate-600">
                  Active Slots: {stats?.orthoToday ?? 0}
                </span>
                <span className="text-slate-700 font-semibold font-sans">Orthodontic Division</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Ledger Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    DAILY COLLECTIONS LEDGER
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Real-time revenue breakdown
                  </p>
                </div>
              </div>

              <span className="text-xs font-extrabold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg tracking-wider">
                {formatCurrency(stats?.totalRevenueToday)}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-semibold">Consultation Fees</span>
                  <span className="font-extrabold text-slate-900 font-mono">
                    ₹{stats?.breakdown?.consultationCollected ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                    style={{
                      width: stats?.totalRevenueToday && stats?.breakdown?.consultationCollected
                        ? `${Math.min(
                            100,
                            Math.round(
                              ((stats.breakdown.consultationCollected || 0) /
                                stats.totalRevenueToday) *
                                100
                            )
                          )}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-semibold">Pharmacy Sales</span>
                  <span className="font-extrabold text-slate-900 font-mono">
                    ₹{stats?.breakdown?.pharmacyCollected ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: stats?.totalRevenueToday && stats?.breakdown?.pharmacyCollected
                        ? `${Math.min(
                            100,
                            Math.round(
                              ((stats.breakdown.pharmacyCollected || 0) /
                                stats.totalRevenueToday) *
                                100
                            )
                          )}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-semibold">Procedure & Operations</span>
                  <span className="font-extrabold text-slate-900 font-mono">
                    ₹{stats?.breakdown?.operationCollected ?? 0}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-300 h-full rounded-full transition-all duration-500"
                    style={{
                      width: stats?.totalRevenueToday && stats?.breakdown?.operationCollected
                        ? `${Math.min(
                            100,
                            Math.round(
                              ((stats.breakdown.operationCollected || 0) /
                                stats.totalRevenueToday) *
                                100
                            )
                          )}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">GST & Receipts:</span>
            <span className="text-sky-600 font-bold">Compliant & Auto-calculated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
