import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Pill,
  Scissors,
  Users,
  Calendar,
  DollarSign,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  FlaskConical,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';

interface ReportsModuleProps {
  onNavigateTab?: (tab: string) => void;
}

type PeriodType = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';
type ReportTabType =
  | 'overview'
  | 'patients'
  | 'appointments'
  | 'clinical'
  | 'dentallab'
  | 'billing'
  | 'pharmacy'
  | 'procedures';

export const ReportsModule: React.FC<ReportsModuleProps> = ({ onNavigateTab }) => {
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<ReportTabType>('overview');

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    else setLoading(true);

    try {
      const params: any = { period };
      if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.get('/reports/analytics', { params });
      if (res.data.success) {
        setAnalytics(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom' || (startDate && endDate)) {
      fetchAnalytics();
    }
  }, [period, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    if (period === 'today') return 'Today';
    if (period === 'this_week') return 'This Week';
    if (period === 'this_month') return 'This Month';
    if (period === 'this_year') return 'This Year';
    if (period === 'custom') return `${startDate || 'Start Date'} to ${endDate || 'End Date'}`;
    return period;
  };

  const handleExportCsv = () => {
    if (!analytics) return;
    const rows = [
      ['HospAI Dental - Comprehensive Analytics & Reports'],
      [`Reporting Period: ${period.toUpperCase()}`],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['=== TOTAL FINANCIAL SUMMARY ==='],
      ['Metric', 'Value (INR / Count)'],
      ['Total Net Collections', analytics.totalRevenueCollected],
      ['Total Outstanding Receivables', analytics.totalOutstanding],
      ['New Patient Registrations', analytics.totalPatientsRegistered],
      ['Total Registered Patients (All Time)', analytics.totalRegisteredPatientsAllTime],
      ['Unique Patient Visits (This Period)', analytics.uniqueVisitsInPeriod],
      [],
      ['=== DOCTOR CONSULTATION PERFORMANCE ==='],
      ['Doctor Name', 'Specialization', 'Consultations', 'Total Collected (INR)', 'Pending (INR)'],
      ...analytics.doctorReport.map((d: any) => [
        d.doctorName,
        d.specialization,
        d.totalConsultations,
        d.revenueCollected,
        d.pendingBalance,
      ]),
      [],
      ['=== PHARMACY & FEFO SUMMARY ==='],
      ['Total Pharmacy Sales Billed', analytics.pharmacy.totalSales],
      ['Pharmacy Collections Realized', analytics.pharmacy.salesCollected],
      ['GST Collected on Dispensing', analytics.pharmacy.gstCollected],
      ['Total Inward Supplier Purchases', analytics.pharmacy.totalPurchases],
      ['Expired Batches (FEFO Alert)', analytics.pharmacy.expiredBatchesCount],
      ['Near-Expiry Batches (Next 90 Days)', analytics.pharmacy.nearExpiryBatchesCount],
      [],
      ['=== OPERATIONS & PROCEDURES ==='],
      ['Completed Procedures Count', analytics.operations.totalProcedures],
      ['Total Procedure Value Billed', analytics.operations.billed],
      ['Procedure Collections Realized', analytics.operations.collected],
      ['Pending Procedure Dues', analytics.operations.pending],
      [],
      ['=== DENTAL LAB REPORTS ==='],
      ['Total Lab Cases in Period', analytics.dentalLab.totalLabCases],
      ['Physical Dental Items Received', analytics.dentalLab.physicalItemsReceived],
      ['Items Awaiting Patient Handover', analytics.dentalLab.itemsAwaitingHandover],
      ['Items Handed Over to Patient', analytics.dentalLab.itemsHandedOver],
      ['Uploaded PDF Lab Documents', analytics.dentalLab.pdfReportsUploaded],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hospai_dental_reports_${period}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !analytics) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
        <span>Loading comprehensive financial analytics & reports...</span>
      </div>
    );
  }

  return (
    <div>
      {/* ======================================================== */}
      {/* SCREEN UI: Interactive Dashboard (Hidden during print)    */}
      {/* ======================================================== */}
      <div className="reports-screen-ui space-y-6">
        {/* ======================================================== */}
        {/* FILTER BAR & REPORT CONTROLS (Preserving Existing UI)     */}
        {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Reporting Period:</span>
          </span>

          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setPeriod(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === btn.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Refresh real-time report data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Download report data as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Print or save PDF of current report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* REPORT SUB-SECTION TABS                                   */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Overview Dashboard', icon: BarChart3 },
            { id: 'patients', label: 'Patient Reports', icon: Users },
            { id: 'appointments', label: 'Appointments & Visits', icon: Calendar },
            { id: 'clinical', label: 'Clinical & Notes', icon: FileText },
            { id: 'dentallab', label: 'Dental Lab Reports', icon: FlaskConical },
            { id: 'billing', label: 'Billing & Collections', icon: CreditCard },
            { id: 'pharmacy', label: 'Pharmacy & Stock (FEFO)', icon: Pill },
            { id: 'procedures', label: 'Operations & Procedures', icon: Scissors },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW DASHBOARD (Exact Screenshot Reference)   */}
      {/* ======================================================== */}
      {activeReportTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Total Financial Summary Banner (3 Gradient Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              onClick={() => setActiveReportTab('billing')}
              className="bg-gradient-to-tr from-teal-700 to-teal-900 rounded-2xl p-6 text-white shadow-lg shadow-teal-900/20 cursor-pointer transition hover:scale-[1.01]"
              title="Click to view Billing & Collections breakdown"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-teal-200">Total Net Collections</span>
                <ArrowUpRight className="w-4 h-4 text-teal-300 opacity-80" />
              </div>
              <div className="text-3xl font-extrabold mt-1">₹{analytics.totalRevenueCollected.toLocaleString()}</div>
              <p className="text-[11px] text-teal-300 mt-2">Aggregated Consultation, Pharmacy & OT Revenue</p>
            </div>

            <div
              onClick={() => setActiveReportTab('billing')}
              className="bg-gradient-to-tr from-rose-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-rose-950/20 cursor-pointer transition hover:scale-[1.01]"
              title="Click to view Outstanding Receivables breakdown"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-rose-200">Total Outstanding Receivables</span>
                <ArrowUpRight className="w-4 h-4 text-rose-300 opacity-80" />
              </div>
              <div className="text-3xl font-extrabold mt-1">₹{analytics.totalOutstanding.toLocaleString()}</div>
              <p className="text-[11px] text-rose-300 mt-2">Active pending balances across all patients</p>
            </div>

            <div
              onClick={() => setActiveReportTab('patients')}
              className="bg-gradient-to-tr from-sky-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg shadow-sky-950/20 cursor-pointer transition hover:scale-[1.01]"
              title="Click to view Patient Reports & Demographics"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-semibold text-sky-200">New Patient Registrations</span>
                <ArrowUpRight className="w-4 h-4 text-sky-300 opacity-80" />
              </div>
              <div className="text-3xl font-extrabold mt-1">{analytics.totalPatientsRegistered}</div>
              <p className="text-[11px] text-sky-300 mt-2">Unique patient profiles created this period</p>
            </div>
          </div>

          {/* Doctor Performance & Consultation Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Doctor Consultation Performance (Dental & Orthopedic)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-5">Doctor Name</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Consultations Handled</th>
                    <th className="p-3">Total Collected</th>
                    <th className="p-3 pr-5">Pending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.doctorReport && analytics.doctorReport.length > 0 ? (
                    analytics.doctorReport.map((doc: any) => (
                      <tr key={doc.doctorId} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 pl-5 font-bold text-slate-800">{doc.doctorName}</td>
                        <td className="p-3 font-semibold text-teal-700">{doc.specialization}</td>
                        <td className="p-3 font-semibold">{doc.totalConsultations} visits</td>
                        <td className="p-3 font-bold text-emerald-600">₹{doc.revenueCollected.toLocaleString()}</td>
                        <td className="p-3 pr-5 font-bold text-rose-600">₹{doc.pendingBalance.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No doctor consultations recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pharmacy & Operation Analytics Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pharmacy Financials */}
            <div
              onClick={() => setActiveReportTab('pharmacy')}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 cursor-pointer transition hover:border-slate-300"
              title="Click to view detailed Pharmacy & FEFO Stock Reports"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  Pharmacy Sales & Purchases Summary
                </h4>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Total Pharmacy Sales Billed:</span>
                  <span className="font-bold text-slate-800">₹{analytics.pharmacy.totalSales.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Pharmacy Collections Realized:</span>
                  <span className="font-bold text-emerald-600">
                    ₹{analytics.pharmacy.salesCollected.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">GST Collected on Dispensing:</span>
                  <span className="font-bold text-teal-700">₹{analytics.pharmacy.gstCollected.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Total Inward Supplier Purchases:</span>
                  <span className="font-bold text-slate-800">
                    ₹{analytics.pharmacy.totalPurchases.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Operations Financials */}
            <div
              onClick={() => setActiveReportTab('procedures')}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 cursor-pointer transition hover:border-slate-300"
              title="Click to view detailed Procedures & Operations Reports"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-600" />
                  Operations & Procedures Summary
                </h4>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Procedures Billed:</span>
                  <span className="font-bold text-slate-800">{analytics.operations.totalProcedures} completed</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Total Procedure Value:</span>
                  <span className="font-bold text-slate-800">₹{analytics.operations.billed.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Procedure Collections:</span>
                  <span className="font-bold text-emerald-600">₹{analytics.operations.collected.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
                  <span className="text-slate-600">Pending Operation Dues:</span>
                  <span className="font-bold text-rose-600">₹{analytics.operations.pending.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PATIENT REPORTS & DEMOGRAPHICS                    */}
      {/* ======================================================== */}
      {activeReportTab === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Registered (All Time)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {analytics.totalRegisteredPatientsAllTime}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total active patient directory profiles</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <span className="text-xs font-bold text-teal-600 uppercase">New Registrations in Period</span>
              <div className="text-2xl font-black text-teal-800 mt-1">{analytics.totalPatientsRegistered}</div>
              <p className="text-[11px] text-slate-400 mt-1">First-time registered during selected dates</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <span className="text-xs font-bold text-indigo-600 uppercase">Patient Consultations in Period</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">{analytics.uniqueVisitsInPeriod}</div>
              <p className="text-[11px] text-slate-400 mt-1">Unique patients who received consultations</p>
            </div>
          </div>

          {/* Age & Gender Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Patient Age Distribution (Dentition Demographics)</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-amber-900">Pediatric (0–12 years - Primary/Mixed Dentition):</span>
                  <span className="font-black text-amber-800">
                    {analytics.patientDemographics?.ageDistribution?.pediatric || 0} patients
                  </span>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-blue-900">Teens (13–19 years - Permanent Dentition):</span>
                  <span className="font-black text-blue-800">
                    {analytics.patientDemographics?.ageDistribution?.teens || 0} patients
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Adults (20–59 years):</span>
                  <span className="font-black text-slate-800">
                    {analytics.patientDemographics?.ageDistribution?.adults || 0} patients
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Seniors (60+ years):</span>
                  <span className="font-black text-slate-800">
                    {analytics.patientDemographics?.ageDistribution?.seniors || 0} patients
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Gender Breakdown</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                  <span className="text-slate-600">Male Patients:</span>
                  <span className="font-bold text-slate-800">
                    {analytics.patientDemographics?.genderDistribution?.male || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                  <span className="text-slate-600">Female Patients:</span>
                  <span className="font-bold text-slate-800">
                    {analytics.patientDemographics?.genderDistribution?.female || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                  <span className="text-slate-600">Other / Unspecified:</span>
                  <span className="font-bold text-slate-800">
                    {analytics.patientDemographics?.genderDistribution?.other || 0}
                  </span>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('patients')}
                  className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Patient Directory</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: APPOINTMENTS & VISITS                             */}
      {/* ======================================================== */}
      {activeReportTab === 'appointments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Booked</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{analytics.appointments?.total || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Appointments in selected period</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/30">
              <span className="text-xs font-bold text-emerald-700 uppercase">Completed</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {analytics.appointments?.completed || 0}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">Patient consultations finished</p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs bg-rose-50/30">
              <span className="text-xs font-bold text-rose-700 uppercase">Cancelled</span>
              <div className="text-2xl font-black text-rose-800 mt-1">{analytics.appointments?.cancelled || 0}</div>
              <p className="text-[11px] text-rose-600/80 mt-1">Patient or clinic cancellations</p>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs bg-amber-50/30">
              <span className="text-xs font-bold text-amber-700 uppercase">Missed / No-Show</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{analytics.appointments?.noShow || 0}</div>
              <p className="text-[11px] text-amber-600/80 mt-1">Patient did not attend</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Looking for scheduled appointments and slot planner?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage appointment timeslots, check-ins, and doctor calendars in the Appointments module.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('appointments')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Go to Appointments</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CLINICAL & EXAMINATION NOTES                      */}
      {/* ======================================================== */}
      {activeReportTab === 'clinical' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-teal-700 uppercase">Consultations Recorded</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {analytics.clinical?.totalConsultations || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Completed patient clinical records</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-indigo-700 uppercase">Findings Documented</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {analytics.clinical?.findingsRecorded || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Observed dental conditions & pathologies</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-amber-700 uppercase">Treatment Recommendations</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {analytics.clinical?.treatmentsRecommended || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Planned treatment advice (not completed procedures)</p>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            <strong>Clinical Distinction Note:</strong> Treatment recommendations recorded in clinical examination notes
            represent planned therapies. Actual procedures performed and completed are tracked separately in the Operations & Procedures module.
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: DENTAL LAB REPORTS                                */}
      {/* ======================================================== */}
      {activeReportTab === 'dentallab' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Lab Cases</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {analytics.dentalLab?.totalLabCases || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Orders sent to dental laboratories</p>
            </div>

            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs bg-blue-50/30">
              <span className="text-xs font-bold text-blue-700 uppercase">Physical Items Received</span>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {analytics.dentalLab?.physicalItemsReceived || 0}
              </div>
              <p className="text-[11px] text-blue-600/80 mt-1">Crowns, dentures, aligners in clinic</p>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs bg-amber-50/30">
              <span className="text-xs font-bold text-amber-700 uppercase">Awaiting Handover</span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {analytics.dentalLab?.itemsAwaitingHandover || 0}
              </div>
              <p className="text-[11px] text-amber-600/80 mt-1">Items waiting for patient delivery</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/30">
              <span className="text-xs font-bold text-emerald-700 uppercase">Handed Over to Patient</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {analytics.dentalLab?.itemsHandedOver || 0}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">Prosthetics delivered & verified</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Emailed Diagnostic PDF Reports Uploaded: {analytics.dentalLab?.pdfReportsUploaded || 0}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived dental laboratory results and attachments received via clinic email.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('dental-lab-reports')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Dental Lab Module</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: BILLING & COLLECTIONS                            */}
      {/* ======================================================== */}
      {activeReportTab === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-teal-50 border border-teal-200 rounded-2xl">
              <span className="text-xs uppercase font-bold text-teal-700">Total Collections Realized</span>
              <div className="text-2xl font-black text-teal-900 mt-1">
                ₹{analytics.totalRevenueCollected.toLocaleString()}
              </div>
              <p className="text-[11px] text-teal-700/80 mt-1">Actual payment receipts deposited in period</p>
            </div>

            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-xs uppercase font-bold text-rose-700">Total Active Receivables</span>
              <div className="text-2xl font-black text-rose-900 mt-1">
                ₹{analytics.totalOutstanding.toLocaleString()}
              </div>
              <p className="text-[11px] text-rose-700/80 mt-1">
                Outstanding balances across {analytics.receivables?.unpaidInvoicesCount || 0} invoices
              </p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs uppercase font-bold text-slate-600">Consultation Collections</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{(analytics.collections?.consultation || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Realized from doctor consultation visits</p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span>Realized Collections by Payment Method</span>
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {analytics.collections?.paymentModes && Object.keys(analytics.collections.paymentModes).length > 0 ? (
                Object.entries(analytics.collections.paymentModes).map(([mode, data]: [string, any]) => (
                  <div key={mode} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-slate-700 uppercase text-[11px]">{mode}</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">₹{data.amount.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-400">{data.count} receipts</span>
                  </div>
                ))
              ) : (
                <div className="col-span-4 p-4 text-center text-slate-400 bg-slate-50 rounded-xl">
                  No payment receipts recorded in this period.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: PHARMACY & STOCK (FEFO)                          */}
      {/* ======================================================== */}
      {activeReportTab === 'pharmacy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Pharmacy Sales Billed</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{analytics.pharmacy.totalSales.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{analytics.pharmacy.salesCount || 0} sales transactions</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/30">
              <span className="text-xs font-bold text-emerald-700 uppercase">Realized Cash Collections</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                ₹{analytics.pharmacy.salesCollected.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">Actual collected pharmacy revenue</p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs bg-rose-50/30">
              <span className="text-xs font-bold text-rose-700 uppercase">Expired Batches (FEFO Alert)</span>
              <div className="text-2xl font-black text-rose-800 mt-1">
                {analytics.pharmacy.expiredBatchesCount || 0}
              </div>
              <p className="text-[11px] text-rose-600/80 mt-1">Requires immediate disposal</p>
            </div>

            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs bg-amber-50/30">
              <span className="text-xs font-bold text-amber-700 uppercase">Near-Expiry Batches (&lt;90 days)</span>
              <div className="text-2xl font-black text-amber-800 mt-1">
                {analytics.pharmacy.nearExpiryBatchesCount || 0}
              </div>
              <p className="text-[11px] text-amber-600/80 mt-1">Prioritize dispensing via FEFO</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Total Inward Supplier Purchases: ₹{analytics.pharmacy.totalPurchases.toLocaleString()}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Total medicine procurement invoices received from suppliers during selected period.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('pharmacy')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Pharmacy & FEFO Stock</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: PROCEDURES & OPERATIONS                          */}
      {/* ======================================================== */}
      {activeReportTab === 'procedures' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Completed Procedures</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {analytics.operations.totalProcedures}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Actual treatments performed</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Value Billed</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{analytics.operations.billed.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Invoiced operation procedure value</p>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/30">
              <span className="text-xs font-bold text-emerald-700 uppercase">Procedure Collections</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                ₹{analytics.operations.collected.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-1">Realized payments for procedures</p>
            </div>

            <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs bg-rose-50/30">
              <span className="text-xs font-bold text-rose-700 uppercase">Pending Dues</span>
              <div className="text-2xl font-black text-rose-800 mt-1">
                ₹{analytics.operations.pending.toLocaleString()}
              </div>
              <p className="text-[11px] text-rose-600/80 mt-1">Outstanding balances on procedures</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Operations & Procedures Clinical Module</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Record actual dental treatments performed, select tooth numbers, and view complete visit history.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('operations')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Go to Operations Module</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ======================================================== */}
      {/* PRINT-ONLY FORMAL CLINICAL & FINANCIAL REPORT DATA       */}
      {/* (Only rendered during print, replaces dashboard preview)  */}
      {/* ======================================================== */}
      <div className="reports-print-document p-4 text-slate-900 bg-white">
        {/* Clinic Official Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                HospAI Dental &amp; Orthopedic Clinic
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Real-Time Clinical Operations, Financial Performance &amp; Audit Statement
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                License No: HP-DEN-2026-0881 | Contact: +91 98495 67876 | Email: clinical@hospai-dental.com
              </p>
            </div>
            <div className="text-right text-[11px] space-y-0.5">
              <div className="font-bold text-slate-800">
                Reporting Period: <span className="uppercase text-teal-800 font-black">{getPeriodLabel()}</span>
              </div>
              <div className="text-slate-600">
                Generated Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Audit Category: {activeReportTab === 'overview' ? 'Comprehensive Master Report' : activeReportTab.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: EXECUTIVE FINANCIAL SUMMARY TABLE */}
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
            1. Financial Collections &amp; Outstanding Dues Summary
          </h2>
          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-700">
                <th className="p-1.5 text-left border border-slate-300 w-1/2">Revenue / Receivables Category</th>
                <th className="p-1.5 text-right border border-slate-300 w-1/4">Amount (INR)</th>
                <th className="p-1.5 text-left border border-slate-300 w-1/4">Operational Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1.5 border border-slate-300 font-bold text-slate-800">Total Net Collections Realized</td>
                <td className="p-1.5 border border-slate-300 text-right font-black text-slate-900">₹{analytics?.totalRevenueCollected?.toLocaleString() || 0}</td>
                <td className="p-1.5 border border-slate-300 text-slate-600">Realized deposit across consultations, pharmacy &amp; OT</td>
              </tr>
              <tr>
                <td className="p-1.5 border border-slate-300">Doctor Consultation Collections</td>
                <td className="p-1.5 border border-slate-300 text-right font-semibold">₹{(analytics?.collections?.consultation || 0).toLocaleString()}</td>
                <td className="p-1.5 border border-slate-300 text-slate-600">OPD consultations fee receipts</td>
              </tr>
              <tr>
                <td className="p-1.5 border border-slate-300">Dental Operations &amp; Procedures Collections</td>
                <td className="p-1.5 border border-slate-300 text-right font-semibold">₹{(analytics?.collections?.operations || 0).toLocaleString()}</td>
                <td className="p-1.5 border border-slate-300 text-slate-600">Minor &amp; major oral surgical procedures</td>
              </tr>
              <tr>
                <td className="p-1.5 border border-slate-300">Pharmacy Medicine Collections</td>
                <td className="p-1.5 border border-slate-300 text-right font-semibold">₹{(analytics?.collections?.pharmacy || 0).toLocaleString()}</td>
                <td className="p-1.5 border border-slate-300 text-slate-600">Direct prescription dispensing receipts</td>
              </tr>
              <tr className="bg-rose-50/40">
                <td className="p-1.5 border border-slate-300 font-bold text-rose-900">Total Active Outstanding Receivables</td>
                <td className="p-1.5 border border-slate-300 text-right font-black text-rose-900">₹{analytics?.totalOutstanding?.toLocaleString() || 0}</td>
                <td className="p-1.5 border border-slate-300 text-rose-800 font-medium">Pending balances across {analytics?.receivables?.unpaidInvoicesCount || 0} active invoices</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 2: DOCTOR CONSULTATION PERFORMANCE TABLE */}
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
            2. Doctor Consultation &amp; Clinical Performance Breakdown
          </h2>
          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-50 font-bold text-slate-700">
                <th className="p-1.5 text-left border border-slate-300">Doctor Name</th>
                <th className="p-1.5 text-left border border-slate-300">Specialization / Department</th>
                <th className="p-1.5 text-center border border-slate-300">Consultations</th>
                <th className="p-1.5 text-right border border-slate-300">Revenue Realized (INR)</th>
                <th className="p-1.5 text-right border border-slate-300">Pending Dues (INR)</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.doctorReport && analytics.doctorReport.length > 0 ? (
                analytics.doctorReport.map((doc: any) => (
                  <tr key={doc.doctorId}>
                    <td className="p-1.5 border border-slate-300 font-bold">{doc.doctorName}</td>
                    <td className="p-1.5 border border-slate-300">{doc.specialization}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-semibold">{doc.totalConsultations}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-bold">₹{doc.revenueCollected?.toLocaleString() || 0}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-medium text-rose-700">₹{doc.pendingBalance?.toLocaleString() || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-slate-500 border border-slate-300">
                    No doctor consultations recorded in this reporting period.
                  </td>
                </tr>
              )}
            </tbody>
            {analytics?.doctorReport && analytics.doctorReport.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-1.5 border border-slate-300 text-right">Total Aggregate:</td>
                  <td className="p-1.5 border border-slate-300 text-center">{analytics.doctorReport.reduce((acc: number, d: any) => acc + (d.totalConsultations || 0), 0)}</td>
                  <td className="p-1.5 border border-slate-300 text-right">₹{analytics.doctorReport.reduce((acc: number, d: any) => acc + (d.revenueCollected || 0), 0).toLocaleString()}</td>
                  <td className="p-1.5 border border-slate-300 text-right text-rose-700">₹{analytics.doctorReport.reduce((acc: number, d: any) => acc + (d.pendingBalance || 0), 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* SECTION 3 & 4 IN TWO COLUMNS */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Operations & Dental Procedures */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
              3. Operations &amp; Dental Procedures Data
            </h2>
            <table className="w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="p-1.5 border border-slate-300 font-semibold">Completed Procedures</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold">{analytics?.operations?.totalProcedures || 0} procedures</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Total Procedure Value Billed</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold">₹{analytics?.operations?.billed?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Procedure Collections Realized</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-emerald-800">₹{analytics?.operations?.collected?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Pending Procedure Dues</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-rose-700">₹{analytics?.operations?.pending?.toLocaleString() || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pharmacy & FEFO Stock */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
              4. Pharmacy &amp; FEFO Stock Inventory
            </h2>
            <table className="w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="p-1.5 border border-slate-300 font-semibold">Pharmacy Sales Billed</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold">₹{analytics?.pharmacy?.totalSales?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Realized Cash Collections</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-emerald-800">₹{analytics?.pharmacy?.salesCollected?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Total Inward Purchases</td>
                  <td className="p-1.5 border border-slate-300 text-right font-semibold">₹{analytics?.pharmacy?.totalPurchases?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300 text-rose-700 font-semibold">Expired Batches (FEFO Alert)</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-rose-700">{analytics?.pharmacy?.expiredBatchesCount || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5 & 6 IN TWO COLUMNS */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Patient Demographics & Age Distribution */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
              5. Patient Volume &amp; Demographics
            </h2>
            <table className="w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="p-1.5 border border-slate-300 font-semibold">Total Registered (All-Time)</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold">{analytics?.totalRegisteredPatientsAllTime || 0} patients</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300 font-semibold">New Patients in Period</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-teal-800">{analytics?.totalPatientsRegistered || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Pediatric (0–12 yrs, Primary Dentition)</td>
                  <td className="p-1.5 border border-slate-300 text-right">{analytics?.patientDemographics?.ageDistribution?.pediatric || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Adults (20–59 yrs) / Seniors (60+)</td>
                  <td className="p-1.5 border border-slate-300 text-right">
                    {(analytics?.patientDemographics?.ageDistribution?.adults || 0) + (analytics?.patientDemographics?.ageDistribution?.seniors || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Appointments & Dental Lab Data */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-1 border border-slate-300 border-b-0">
              6. Appointments &amp; Dental Lab Status
            </h2>
            <table className="w-full text-xs border border-slate-300">
              <tbody>
                <tr>
                  <td className="p-1.5 border border-slate-300 font-semibold">Total Appointments Booked</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold">{analytics?.appointments?.total || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Completed Consultations</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-emerald-800">{analytics?.appointments?.completed || 0}</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Dental Lab Cases Sent</td>
                  <td className="p-1.5 border border-slate-300 text-right font-semibold">{analytics?.dentalLab?.totalLabCases || 0} cases</td>
                </tr>
                <tr>
                  <td className="p-1.5 border border-slate-300">Lab Items Received / Delivered</td>
                  <td className="p-1.5 border border-slate-300 text-right font-semibold">
                    {analytics?.dentalLab?.physicalItemsReceived || 0} received / {analytics?.dentalLab?.itemsHandedOver || 0} delivered
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* OFFICIAL SIGNATURES & VERIFICATION */}
        <div className="mt-8 pt-4 border-t border-slate-400">
          <div className="flex justify-between items-end text-xs">
            <div className="text-center w-48">
              <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">Clinic Front Desk / Reception</div>
              <p className="text-[10px] text-slate-500">Prepared &amp; Audited By</p>
            </div>
            <div className="text-center w-52">
              <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">Authorized Dental Surgeon</div>
              <p className="text-[10px] text-slate-500">Medical Director / Clinic Seal</p>
            </div>
          </div>
          <div className="text-center text-[9px] text-slate-400 mt-4">
            *** This is an official computer-generated audit report from HospAI Real-Time Dental Clinical Operations Hub. ***
          </div>
        </div>
      </div>
    </div>
  );
};
