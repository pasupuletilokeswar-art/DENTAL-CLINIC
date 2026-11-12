import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  Pill,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  FileCheck2,
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
      {/* Top Banner & Quick Metrics (Squared High-Contrast KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <div className="bg-white p-5 rounded-none border border-slate-200 shadow-xs relative overflow-hidden group hover:border-[#0090e7] transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Today's Schedule
            </span>
            <div className="w-9 h-9 rounded-none bg-sky-50 text-[#0090e7] flex items-center justify-center border border-sky-100">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{stats?.todayAppointments || 0}</div>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="text-[#0090e7] font-bold">{stats?.dentalToday || 0} Dental</span>
            <span>•</span>
            <span className="text-teal-600 font-bold">{stats?.orthoToday || 0} Ortho</span>
          </div>
        </div>

        {/* Card 2: Registered Patients */}
        <div className="bg-white p-5 rounded-none border border-slate-200 shadow-xs relative overflow-hidden group hover:border-[#0090e7] transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Total Patients
            </span>
            <div className="w-9 h-9 rounded-none bg-sky-50 text-[#0090e7] flex items-center justify-center border border-sky-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{stats?.totalPatients || 0}</div>
          <div className="mt-2.5 text-xs text-emerald-600 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>+{stats?.todayPatients || 0} registered today</span>
          </div>
        </div>

        {/* Card 3: Today's Total Collections */}
        <div className="bg-white p-5 rounded-none border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-500 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Today's Collections
            </span>
            <div className="w-9 h-9 rounded-none bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ₹{(stats?.totalRevenueToday || 0).toLocaleString()}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-600 font-semibold flex justify-between">
            <span>Consult: ₹{stats?.breakdown.consultationCollected || 0}</span>
            <span>Pharm: ₹{stats?.breakdown.pharmacyCollected || 0}</span>
          </div>
        </div>

        {/* Card 4: Inventory Alerts */}
        <div className="bg-white p-5 rounded-none border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-500 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Pharmacy Alerts
            </span>
            <div className="w-9 h-9 rounded-none bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 tracking-tight">{stats?.lowStockCount || 0}</div>
          <div className="mt-2.5 text-xs text-slate-500 font-medium">
            Medicines below reorder threshold
          </div>
        </div>
      </div>

      {/* Main Content Row: Today's Appointments & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Appointments Schedule */}
        <div className="lg:col-span-2 bg-white rounded-none border border-slate-200 shadow-xs p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Today's Appointment Queue</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live schedule for Dental and Orthopedic consultations</p>
              </div>
              <button
                onClick={() => onNavigate('appointments')}
                className="text-xs font-bold text-[#0090e7] hover:underline cursor-pointer"
              >
                View Full Calendar →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentAppointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No appointments booked for today yet. Use quick actions to book an appointment.
                </div>
              ) : (
                recentAppointments.map((apt) => (
                  <div key={apt.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-none bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs">
                        {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{apt.patient.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-slate-100 text-slate-700 font-mono border border-slate-200">
                            {apt.patient.patientCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {apt.doctor?.user?.fullName} ({apt.specialization})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-none font-bold uppercase tracking-wider ${
                          apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : apt.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-300'
                            : 'bg-sky-50 text-[#0090e7] border border-sky-300'
                        }`}
                      >
                        {apt.status}
                      </span>
                      <button
                        onClick={() => onNavigate('patients', apt.patient.id)}
                        className="text-xs p-1.5 text-slate-400 hover:text-[#0090e7] rounded-none transition cursor-pointer"
                        title="View Patient 360 Profile"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Real-time WebSocket feed active</span>
            <span className="font-semibold text-slate-700">{recentAppointments.length} Active Slots</span>
          </div>
        </div>

        {/* Right Column: Receptionist Quick Action Palette */}
        <div className="bg-white rounded-none border border-slate-200 shadow-xs p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-wide">Receptionist Quick Actions</h3>
            <p className="text-xs text-slate-500 mb-4">Fast entry shortcuts for daily clinical front-desk</p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('patients')}
                className="w-full p-3 rounded-none border border-slate-200 hover:border-[#0090e7] hover:bg-sky-50/40 text-left transition flex items-center gap-3 cursor-pointer shadow-2xs"
              >
                <div className="w-8 h-8 rounded-none bg-sky-100 text-[#0090e7] flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Register New Patient</div>
                  <div className="text-[10px] text-slate-500">Auto sequential ID generation</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('appointments')}
                className="w-full p-3 rounded-none border border-slate-200 hover:border-[#0090e7] hover:bg-sky-50/40 text-left transition flex items-center gap-3 cursor-pointer shadow-2xs"
              >
                <div className="w-8 h-8 rounded-none bg-sky-100 text-[#0090e7] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Book Doctor Slot</div>
                  <div className="text-[10px] text-slate-500">Dental or Ortho with overlap check</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('clinical-notes')}
                className="w-full p-3 rounded-none border border-slate-200 hover:border-[#0090e7] hover:bg-sky-50/40 text-left transition flex items-center gap-3 cursor-pointer shadow-2xs"
              >
                <div className="w-8 h-8 rounded-none bg-sky-100 text-[#0090e7] flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Record Doctor Notes</div>
                  <div className="text-[10px] text-slate-500">9-Field doctor paper prescription entry</div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('pharmacy')}
                className="w-full p-3 rounded-none border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition flex items-center gap-3 cursor-pointer shadow-2xs"
              >
                <div className="w-8 h-8 rounded-none bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Dispense Pharmacy Sale</div>
                  <div className="text-[10px] text-slate-500">FEFO batch deduction & GST bill</div>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Database records update permanently in PostgreSQL. All changes broadcast across connected terminals in real time.
          </div>
        </div>
      </div>

      {/* NEW BOTTOM SECTION: CLINICAL DEPARTMENT OVERVIEW & REVENUE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Operations Stream */}
        <div className="lg:col-span-2 bg-white rounded-none border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Clinical Departments & Active Workflows</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status across Dental and Orthodontics operations</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-[#0090e7] border border-sky-200 uppercase tracking-wider">
              Operational Hub
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dental Division Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Dental Department</span>
                <span className="text-xs font-bold text-[#0090e7]">{stats?.dentalToday || 0} Visits</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Root canal, scaling, tooth extractions, and routine oral exams.</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                <div
                  className="bg-[#0090e7] h-full transition-all duration-500"
                  style={{
                    width: `${stats?.todayAppointments ? Math.min(100, Math.round(((stats.dentalToday || 0) / stats.todayAppointments) * 100)) : 50}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-500 flex justify-between font-mono">
                <span>Active Slots: {stats?.dentalToday || 0}</span>
                <span>Dr. Rajesh Sharma</span>
              </div>
            </div>

            {/* Orthodontic Division Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Orthodontic Department</span>
                <span className="text-xs font-bold text-teal-600">{stats?.orthoToday || 0} Visits</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Braces tightening, aligner adjustments, and retainer check-ups.</p>
              <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                <div
                  className="bg-teal-500 h-full transition-all duration-500"
                  style={{
                    width: `${stats?.todayAppointments ? Math.min(100, Math.round(((stats.orthoToday || 0) / stats.todayAppointments) * 100)) : 50}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[10px] text-slate-500 flex justify-between font-mono">
                <span>Active Slots: {stats?.orthoToday || 0}</span>
                <span>Dr. Ananya Roy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Ledger Card */}
        <div className="bg-white rounded-none border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Daily Collections Ledger</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time revenue breakdown</p>
              </div>
              <span className="text-xs font-bold text-emerald-600">
                ₹{(stats?.totalRevenueToday || 0).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Consultation Fees</span>
                  <span className="font-bold text-slate-900">₹{stats?.breakdown.consultationCollected || 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-none overflow-hidden">
                  <div
                    className="bg-[#0090e7] h-full"
                    style={{
                      width: `${stats?.totalRevenueToday ? Math.min(100, Math.round(((stats.breakdown.consultationCollected || 0) / stats.totalRevenueToday) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Pharmacy Sales</span>
                  <span className="font-bold text-slate-900">₹{stats?.breakdown.pharmacyCollected || 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-none overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${stats?.totalRevenueToday ? Math.min(100, Math.round(((stats.breakdown.pharmacyCollected || 0) / stats.totalRevenueToday) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Procedure & Operations</span>
                  <span className="font-bold text-slate-900">₹{stats?.breakdown.operationCollected || 0}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-none overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{
                      width: `${stats?.totalRevenueToday ? Math.min(100, Math.round(((stats.breakdown.operationCollected || 0) / stats.totalRevenueToday) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">GST & Receipts:</span>
            <span className="text-[#0090e7] font-bold">Compliant & Auto-calculated</span>
          </div>
        </div>
      </div>
    </div>
  );
};

