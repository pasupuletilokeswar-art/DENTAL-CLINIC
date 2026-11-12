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
} from 'lucide-react';
import api from '../../services/api';

export const ReportsModule: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/reports/analytics');
      if (res.data.success) {
        setAnalytics(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading comprehensive financial analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Total Financial Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-tr from-teal-700 to-teal-900 rounded-2xl p-6 text-white shadow-lg shadow-teal-900/20">
          <span className="text-xs uppercase font-semibold text-teal-200">Total Net Collections</span>
          <div className="text-3xl font-extrabold mt-1">₹{analytics.totalRevenueCollected.toLocaleString()}</div>
          <p className="text-[11px] text-teal-300 mt-2">Aggregated Consultation, Pharmacy & OT Revenue</p>
        </div>

        <div className="bg-gradient-to-tr from-rose-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-rose-950/20">
          <span className="text-xs uppercase font-semibold text-rose-200">Total Outstanding Receivables</span>
          <div className="text-3xl font-extrabold mt-1">₹{analytics.totalOutstanding.toLocaleString()}</div>
          <p className="text-[11px] text-rose-300 mt-2">Active pending balances across all patients</p>
        </div>

        <div className="bg-gradient-to-tr from-sky-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg shadow-sky-950/20">
          <span className="text-xs uppercase font-semibold text-sky-200">New Patient Registrations</span>
          <div className="text-3xl font-extrabold mt-1">{analytics.totalPatientsRegistered}</div>
          <p className="text-[11px] text-sky-300 mt-2">Unique patient profiles created this period</p>
        </div>
      </div>

      {/* Doctor Performance & Consultation Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
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
              {analytics.doctorReport.map((doc: any) => (
                <tr key={doc.doctorId} className="hover:bg-slate-50/60 transition">
                  <td className="p-3 pl-5 font-bold text-slate-800">{doc.doctorName}</td>
                  <td className="p-3 font-semibold text-teal-700">{doc.specialization}</td>
                  <td className="p-3 font-semibold">{doc.totalConsultations} visits</td>
                  <td className="p-3 font-bold text-emerald-600">₹{doc.revenueCollected.toLocaleString()}</td>
                  <td className="p-3 pr-5 font-bold text-rose-600">₹{doc.pendingBalance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pharmacy & Operation Analytics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pharmacy Financials */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600" />
            Pharmacy Sales & Purchases Summary
          </h4>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-600">Total Pharmacy Sales Billed:</span>
              <span className="font-bold text-slate-800">₹{analytics.pharmacy.totalSales.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-600">Pharmacy Collections Realized:</span>
              <span className="font-bold text-emerald-600">₹{analytics.pharmacy.salesCollected.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-600">GST Collected on Dispensing:</span>
              <span className="font-bold text-teal-700">₹{analytics.pharmacy.gstCollected.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex justify-between">
              <span className="text-slate-600">Total Inward Supplier Purchases:</span>
              <span className="font-bold text-slate-800">₹{analytics.pharmacy.totalPurchases.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Operations Financials */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-indigo-600" />
            Operations & Procedures Summary
          </h4>

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
  );
};

