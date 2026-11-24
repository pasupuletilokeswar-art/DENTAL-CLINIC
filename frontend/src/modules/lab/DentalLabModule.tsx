
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FlaskConical,
  Plus,
  PlusCircle,
  Activity,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  User,
  ArrowRight,
  X,
  Upload,
  Info,
  Check,
  ChevronRight,
  ExternalLink,
  Edit2,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import {
  Patient,
  LabCase,
  LabItem,
  LabDocument,
  LabPhoto,
  Appointment,
} from '../../types';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

interface DentalLabModuleProps {
  onNavigateToPatient?: (patientId: string) => void;
  initialSubModule?: 'dashboard' | 'reports' | 'create';
  onSubModuleChange?: (subModule: 'dashboard' | 'reports' | 'create') => void;
}

// Dental-specific laboratory prosthetics & appliances presets
const DENTAL_LAB_PRESETS = [
  { label: 'Crown (Zirconia / Ceramic / PFM)', value: 'Crown Fabrication', category: 'CROWN' },
  { label: 'Bridge (Fixed Partial Denture)', value: 'Dental Bridge', category: 'BRIDGE' },
  { label: 'Complete Denture (CD)', value: 'Complete Denture', category: 'DENTURE' },
  { label: 'Removable Partial Denture (RPD)', value: 'Removable Partial Denture (RPD)', category: 'DENTURE' },
  { label: 'Cast Partial Denture (CPD)', value: 'Cast Partial Denture (CPD)', category: 'DENTURE' },
  { label: 'Dental Veneer / Laminate', value: 'Dental Veneer / Laminate', category: 'VENEER' },
  { label: 'Clear Aligners', value: 'Clear Aligners', category: 'ALIGNER' },
  { label: 'Orthodontic Retainer / Splint', value: 'Orthodontic Retainer / Splint', category: 'RETAINER' },
  { label: 'Night Guard / Occlusal Splint', value: 'Night Guard / Occlusal Splint', category: 'SPLINT' },
  { label: 'Inlay / Onlay', value: 'Inlay / Onlay', category: 'INLAY' },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DentalLabModule: React.FC<DentalLabModuleProps> = ({
  onNavigateToPatient,
  initialSubModule = 'dashboard',
  onSubModuleChange,
}) => {
  // Navigation tabs: 'dashboard' | 'reports' | 'create'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'create'>(initialSubModule);

  useEffect(() => {
    if (initialSubModule) {
      setActiveTab(initialSubModule);
    }
  }, [initialSubModule]);

  const handleTabSwitch = (tab: 'dashboard' | 'reports' | 'create') => {
    setActiveTab(tab);
    if (onSubModuleChange) {
      onSubModuleChange(tab);
    }
  };

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dashboard Data
  const [dashboardCounts, setDashboardCounts] = useState<{
    totalCases: number;
    totalReports: number;
    reportsThisMonth: number;
    reportsToday: number;
    reportsWithPdf: number;
  }>({
    totalCases: 0,
    totalReports: 0,
    reportsThisMonth: 0,
    reportsToday: 0,
    reportsWithPdf: 0,
  });
  const [recentReports, setRecentReports] = useState<LabCase[]>([]);

  // Reports List & Filters
  const [reports, setReports] = useState<LabCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selected Report for Detailed Modal / View
  const [selectedReport, setSelectedReport] = useState<LabCase | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Editing notes inside Detail Modal
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editableNotes, setEditableNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Lightbox Image Viewer for radiographs/photos
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Document & Photo uploading in Detail Modal
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // CREATE REPORT FORM STATE (Emailed Report Log)
  // -------------------------------------------------------------
  const [formPatient, setFormPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [testType, setTestType] = useState<string>('');
  const [customTestType, setCustomTestType] = useState<string>('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().substring(0, 10));
  const [labName, setLabName] = useState('Diagnostic Laboratory');
  const [labRefNumber, setLabRefNumber] = useState('');
  const [doctorFindings, setDoctorFindings] = useState('');
  const [pendingDocsToUpload, setPendingDocsToUpload] = useState<File[]>([]);
  const [pendingPhotosToUpload, setPendingPhotosToUpload] = useState<File[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchDashboard = async () => {
    try {
      const res = await api.get('/lab/dashboard');
      if (res.data.success) {
        setDashboardCounts(res.data.counts || {});
        setRecentReports(res.data.recentCases || []);
      }
    } catch (err) {
      console.error('Error fetching lab dashboard:', err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter !== 'ALL') params.testType = categoryFilter;
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;

      const res = await api.get('/lab/cases', { params });
      if (res.data.success) {
        setReports(res.data.cases || []);
      }
    } catch (err: any) {
      console.error('Error fetching lab reports:', err);
      setActionError(err.response?.data?.message || 'Failed to load lab reports');
    } finally {
      setLoading(false);
    }
  };

  // Refresh single report in state / modal
  const refreshSelectedReport = async (reportId: string) => {
    try {
      const res = await api.get(`/lab/cases/${reportId}`);
      if (res.data.success) {
        setSelectedReport(res.data.case);
        setReports((prev) =>
          prev.map((c) => (c.id === reportId ? res.data.case : c))
        );
      }
    } catch (err) {
      console.error('Error refreshing report detail:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
    fetchReports();
  }, []);

  // When filters or tab change
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab, categoryFilter, startDateFilter, endDateFilter]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLabUpdate = () => {
      fetchDashboard();
      if (activeTab === 'reports') {
        fetchReports();
      }
    };

    socket.on('lab:created', handleLabUpdate);
    socket.on('lab:updated', handleLabUpdate);
    socket.on('lab:deleted', handleLabUpdate);

    return () => {
      socket.off('lab:created', handleLabUpdate);
      socket.off('lab:updated', handleLabUpdate);
      socket.off('lab:deleted', handleLabUpdate);
    };
  }, [activeTab]);

  // Auto-clear success banner after 5 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // When patient changes in Add form, fetch their appointments
  useEffect(() => {
    if (!formPatient) {
      setPatientAppointments([]);
      setSelectedAppointmentId('');
      return;
    }
    const fetchPatientAppointments = async () => {
      try {
        const res = await api.get(`/appointments/patient/${formPatient.id}`);
        if (res.data.success && Array.isArray(res.data.appointments)) {
          setPatientAppointments(res.data.appointments);
        }
      } catch (err) {
        setPatientAppointments([]);
      }
    };
    fetchPatientAppointments();
  }, [formPatient]);

  // -------------------------------------------------------------
  // RESET FORM
  // -------------------------------------------------------------
  const resetCreateForm = () => {
    setFormPatient(null);
    setPatientAppointments([]);
    setSelectedAppointmentId('');
    setTestType('');
    setCustomTestType('');
    setReportDate(new Date().toISOString().substring(0, 10));
    setLabName('Diagnostic Laboratory');
    setLabRefNumber('');
    setDoctorFindings('');
    setPendingDocsToUpload([]);
    setPendingPhotosToUpload([]);
    setFormError(null);
  };

  // -------------------------------------------------------------
  // SUBMIT NEW LAB REPORT (From Email)
  // -------------------------------------------------------------
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formPatient) {
      setFormError('Please select a registered patient.');
      return;
    }

    const finalTestType = testType === 'CUSTOM' ? customTestType.trim() : (testType || customTestType.trim());
    if (!finalTestType) {
      setFormError('Please select or enter the Investigation / Test Type.');
      return;
    }

    setFormSubmitting(true);
    try {
      // 1. Create Case in database
      const payload = {
        patientId: formPatient.id,
        appointmentId: selectedAppointmentId || null,
        testType: finalTestType,
        labName: labName.trim() || 'Diagnostic Laboratory',
        labRefNumber: labRefNumber.trim() || null,
        sentDate: reportDate,
        generalNotes: doctorFindings.trim() || null,
        status: 'RECEIVED_FROM_LAB',
      };

      const res = await api.post('/lab/cases', payload);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to record lab report');
      }

      const createdCaseId = res.data.case.id;

      // 2. Upload PDF files if any were selected
      if (pendingDocsToUpload.length > 0) {
        const docFormData = new FormData();
        pendingDocsToUpload.forEach((file) => docFormData.append('documents', file));
        await api.post(`/lab/cases/${createdCaseId}/documents`, docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Upload photo/scan files if any were selected
      if (pendingPhotosToUpload.length > 0) {
        const photoFormData = new FormData();
        pendingPhotosToUpload.forEach((file) => photoFormData.append('photos', file));
        await api.post(`/lab/cases/${createdCaseId}/photos`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setActionSuccess(`Lab report for ${formPatient.name} recorded and archived successfully.`);
      resetCreateForm();
      handleTabSwitch('reports');
      fetchReports();
      fetchDashboard();
    } catch (err: any) {
      console.error('Error saving lab report:', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to save lab report.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // DOCUMENT MANAGEMENT IN MODAL
  // -------------------------------------------------------------
  const handleUploadAdditionalDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedReport || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    for (const f of files) {
      if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
        alert(`File "${f.name}" is not a PDF. Only PDF files are accepted.`);
        return;
      }
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));
      await api.post(`/lab/cases/${selectedReport.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshSelectedReport(selectedReport.id);
      setActionSuccess(`${files.length} PDF document(s) uploaded successfully.`);
    } catch (err: any) {
      console.error('Error uploading document:', err);
      alert(err.response?.data?.message || 'Failed to upload PDF document.');
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this PDF document?')) return;
    try {
      await api.delete(`/lab/documents/${docId}`);
      if (selectedReport) {
        await refreshSelectedReport(selectedReport.id);
      }
      setActionSuccess('Document deleted successfully.');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  // -------------------------------------------------------------
  // SAVE EDITED NOTES IN MODAL
  // -------------------------------------------------------------
  const handleSaveNotes = async () => {
    if (!selectedReport) return;
    setSavingNotes(true);
    try {
      const res = await api.put(`/lab/cases/${selectedReport.id}`, {
        generalNotes: editableNotes.trim() || null,
      });
      if (res.data.success) {
        setSelectedReport(res.data.case);
        setReports((prev) =>
          prev.map((c) => (c.id === selectedReport.id ? res.data.case : c))
        );
        setIsEditingNotes(false);
        setActionSuccess('Doctor findings and notes updated.');
      }
    } catch (err: any) {
      console.error('Error updating notes:', err);
      alert(err.response?.data?.message || 'Failed to update notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  // -------------------------------------------------------------
  // DELETE ENTIRE LAB REPORT
  // -------------------------------------------------------------
  const handleDeleteReport = async (report: LabCase) => {
    const confirmMsg = `Are you sure you want to permanently delete the lab report for ${report.patient.name} (${report.caseNumber})? This will delete all attached PDFs.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/lab/cases/${report.id}`);
      if (res.data.success) {
        setActionSuccess(`Lab report ${report.caseNumber} deleted successfully.`);
        if (selectedReport?.id === report.id) {
          setIsDetailModalOpen(false);
          setSelectedReport(null);
        }
        fetchReports();
        fetchDashboard();
      }
    } catch (err: any) {
      console.error('Error deleting report:', err);
      alert(err.response?.data?.message || 'Failed to delete report.');
    }
  };

  // Helper: Extract primary test name from items or notes
  const getPrimaryTestName = (c: LabCase): string => {
    if (c.items && c.items.length > 0) {
      const first = c.items[0];
      return first.customItemName || first.description || first.itemType || 'Diagnostic Report';
    }
    return 'Diagnostic Lab Report';
  };

  // Filtered reports for search
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();
    return reports.filter((c) => {
      const name = c.patient?.name?.toLowerCase() || '';
      const code = c.patient?.patientCode?.toLowerCase() || '';
      const phone = c.patient?.mobile || '';
      const caseNum = c.caseNumber?.toLowerCase() || '';
      const lab = c.labName?.toLowerCase() || '';
      const notes = c.generalNotes?.toLowerCase() || '';
      const ref = c.labRefNumber?.toLowerCase() || '';
      const test = getPrimaryTestName(c).toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        caseNum.includes(q) ||
        lab.includes(q) ||
        notes.includes(q) ||
        ref.includes(q) ||
        test.includes(q)
      );
    });
  }, [reports, searchQuery]);

  // Sub-module navigation tabs config matching Operations Module design
  const subModules = [
    {
      id: 'dashboard' as const,
      label: 'Lab Dashboard & Overview',
      icon: Activity,
    },
    {
      id: 'reports' as const,
      label: 'All Patient Lab Reports',
      icon: FileText,
      badge: dashboardCounts.totalReports || reports.length,
    },
    {
      id: 'create' as const,
      label: 'Add Lab Report',
      icon: PlusCircle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* DENTAL LAB TOP SUB-MODULE NAVIGATION BAR                 */}
      {/* ======================================================== */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              DENTAL LAB MODULE
            </div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">
              Dental Laboratory & Prosthetics Workflow
            </h1>
          </div>
        </div>

        {/* 3 Sub-Module Nav Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto">
          {subModules.map((sm) => {
            const Icon = sm.icon;
            const isActive = activeTab === sm.id;

            return (
              <button
                type="button"
                key={sm.id}
                onClick={() => {
                  if (sm.id === 'create') resetCreateForm();
                  handleTabSwitch(sm.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{sm.label}</span>
                {sm.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {sm.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Success / Error Feedback */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & DASHBOARD                                    */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Live KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Lab Reports
                </span>
                <FlaskConical className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {dashboardCounts.totalReports || 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">All diagnostic reports archived</p>
            </div>

            <div className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Reports This Month
                </span>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-blue-700">
                {dashboardCounts.reportsThisMonth || 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Received in current month</p>
            </div>

            <div className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Reports Today
                </span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700">
                {dashboardCounts.reportsToday || 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Emailed results logged today</p>
            </div>

            <div className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  With Attached PDFs
                </span>
                <FileText className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-700">
                {dashboardCounts.reportsWithPdf || 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Verified PDF files stored</p>
            </div>
          </div>

          {/* Recent Reports Table */}
          <div className="bg-white border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Recent Lab & Diagnostic Reports
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest diagnostic results archived in the clinic
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTabSwitch('reports')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Reports</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentReports.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No lab reports recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Add Lab Report" to log the first emailed test result.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Report # & Date</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Investigation / Test</th>
                      <th className="py-2.5 px-3">Diagnostic Lab</th>
                      <th className="py-2.5 px-3">Doctor Findings</th>
                      <th className="py-2.5 px-3">PDF Report</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentReports.map((c) => {
                      const primaryDoc = c.documents && c.documents.length > 0 ? c.documents[0] : null;
                      const testName = getPrimaryTestName(c);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-indigo-700">{c.caseNumber}</div>
                            <div className="text-[10px] text-slate-400">
                              {c.sentDate ? c.sentDate.substring(0, 10) : ''}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{c.patient?.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {c.patient?.patientCode}
                              {c.patient?.mobile ? ` • ${c.patient.mobile}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                              {testName}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-600">
                            <div>{c.labName}</div>
                            {c.labRefNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Ref: {c.labRefNumber}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 max-w-xs">
                            <p className="text-slate-700 text-xs line-clamp-1 italic">
                              {c.generalNotes || '—'}
                            </p>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {primaryDoc ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`/api/lab/documents/${primaryDoc.id}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                                  title={`View ${primaryDoc.originalName}`}
                                >
                                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                                  <span>View PDF</span>
                                  <Eye className="w-3 h-3 text-rose-500" />
                                </a>

                                <a
                                  href={`/api/lab/documents/${primaryDoc.id}/download`}
                                  download
                                  className="p-1 text-slate-400 hover:text-slate-700 transition"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No PDF attached</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport(c);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ALL PATIENT LAB REPORTS ARCHIVE                         */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="bg-white border border-slate-200 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search Bar */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Patient Name, ID, Mobile, Test Type, Doctor Notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">All Dental Lab Works</option>
                  <option value="Crown">Crowns</option>
                  <option value="Bridge">Bridges</option>
                  <option value="Denture">Dentures (CD / RPD)</option>
                  <option value="Veneer">Veneers & Laminates</option>
                  <option value="Aligner">Clear Aligners</option>
                  <option value="Retainer">Retainers & Splints</option>
                  <option value="Inlay">Inlays / Onlays</option>
                </select>
              </div>
            </div>

            {/* Date range filter row */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Date Range:
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="text-xs px-2 py-1 bg-white border border-slate-300 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="text-xs px-2 py-1 bg-white border border-slate-300 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white border border-slate-200">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Patient Reports ({filteredReports.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Click "View PDF" to open full report directly in browser
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-500" />
                <p className="text-xs font-bold">Loading patient lab reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">No lab reports found matching criteria.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try clearing your search filters or click "Add Lab Report" to record one.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Report # & Date</th>
                      <th className="py-2.5 px-3">Patient Name & ID</th>
                      <th className="py-2.5 px-3">Investigation / Test</th>
                      <th className="py-2.5 px-3">Diagnostic Center</th>
                      <th className="py-2.5 px-3">Clinical Findings / Summary</th>
                      <th className="py-2.5 px-3">PDF Report(s)</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReports.map((c) => {
                      const testName = getPrimaryTestName(c);
                      const hasDocs = c.documents && c.documents.length > 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-indigo-700">{c.caseNumber}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{c.sentDate ? c.sentDate.substring(0, 10) : ''}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900">{c.patient?.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {c.patient?.patientCode}
                              {c.patient?.age ? ` • ${c.patient.age}y` : ''}
                              {c.patient?.gender ? `/${c.patient.gender[0]}` : ''}
                              {c.patient?.mobile ? ` • ${c.patient.mobile}` : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                              {testName}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-600">
                            <div className="font-semibold text-slate-800">{c.labName}</div>
                            {c.labRefNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Ref: {c.labRefNumber}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 max-w-xs">
                            {c.generalNotes ? (
                              <p className="text-slate-700 text-xs line-clamp-2 italic" title={c.generalNotes}>
                                {c.generalNotes}
                              </p>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No findings recorded</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {hasDocs ? (
                              <div className="space-y-1">
                                {c.documents.map((doc) => (
                                  <div key={doc.id} className="flex items-center gap-1.5">
                                    <a
                                      href={`/api/lab/documents/${doc.id}/view`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer max-w-[200px] truncate"
                                      title={`View ${doc.originalName}`}
                                    >
                                      <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                      <span className="truncate">{doc.originalName}</span>
                                      <Eye className="w-3 h-3 text-rose-500 shrink-0" />
                                    </a>

                                    <a
                                      href={`/api/lab/documents/${doc.id}/download`}
                                      download
                                      className="p-1 text-slate-400 hover:text-slate-700 transition"
                                      title="Download PDF"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No PDF attached</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer"
                                title="View details, edit notes, or add files"
                              >
                                Manage
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteReport(c)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete report"
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
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ADD LAB REPORT (FAST SINGLE-STEP FORM)                  */}
      {/* ============================================================== */}
      {activeTab === 'create' && (
        <div className="bg-white border border-slate-200 p-6 max-w-4xl mx-auto shadow-xs">
          <div className="pb-4 border-b border-slate-200 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Log Emailed Patient Lab Report</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the patient's diagnostic results and upload the PDF file received from the laboratory's email.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTabSwitch('reports')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateReport} className="space-y-6">
            {/* 1. SELECT PATIENT */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>1. Select Patient *</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <PatientSearchSelect
                    label="Search & Select Registered Patient"
                    required
                    selectedPatient={formPatient}
                    onSelect={(p) => setFormPatient(p)}
                  />
                </div>

                {/* Optional Appointment Linking */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link to Patient Appointment (Optional)
                  </label>
                  <select
                    value={selectedAppointmentId}
                    onChange={(e) => setSelectedAppointmentId(e.target.value)}
                    disabled={!formPatient || patientAppointments.length === 0}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {!formPatient
                        ? 'Select patient first...'
                        : patientAppointments.length === 0
                        ? 'No appointments found (Optional)'
                        : 'Select Appointment (Optional)'}
                    </option>
                    {patientAppointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.appointmentCode} — {apt.appointmentDate?.substring(0, 10)} ({apt.procedureName || 'Consultation'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. DENTAL LAB WORK & PROSTHETIC ITEM */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Dental Lab Work & Prosthetic Item *</span>
              </h3>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Choose Common Dental Lab Work Preset or Type Custom:
                </label>
                <div className="flex flex-wrap gap-2">
                  {DENTAL_LAB_PRESETS.map((preset) => {
                    const isSelected = testType === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setTestType(preset.value);
                          setCustomTestType(preset.value);
                        }}
                        className={`px-3 py-1.5 text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setTestType('CUSTOM');
                      setCustomTestType('');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                      testType === 'CUSTOM'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    + Other / Custom Work
                  </button>
                </div>
              </div>

              {/* Free-text test type input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dental Work / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zirconia Crown (#16), 3-Unit PFM Bridge (#24-#26), Upper Complete Denture, Clear Aligners Stage 1..."
                  value={customTestType}
                  onChange={(e) => {
                    setCustomTestType(e.target.value);
                    if (testType !== 'CUSTOM') setTestType(e.target.value);
                  }}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Report Date, Lab Name, Lab Ref Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Report Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diagnostic Lab / Center Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Focus Diagnostics, SRL, Max..."
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lab Ref # / Email Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LAB-ORD-8392"
                    value={labRefNumber}
                    onChange={(e) => setLabRefNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 3. ATTACH EMAILED PDF REPORT */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>3. Attach Emailed PDF Report(s)</span>
                </h3>
                <span className="text-[10px] text-slate-500">PDF files up to 20MB</span>
              </div>

              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 text-center">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      const validPdfs = files.filter(
                        (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
                      );
                      if (validPdfs.length !== files.length) {
                        alert('Only PDF files are accepted for lab reports.');
                      }
                      setPendingDocsToUpload((prev) => [...prev, ...validPdfs]);
                    }
                  }}
                  className="hidden"
                  id="pdf-upload-create"
                />
                <label
                  htmlFor="pdf-upload-create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4 text-rose-600" />
                  <span>Select Emailed PDF File(s)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-2">
                  Attach the PDF report you downloaded from the laboratory's email
                </p>
              </div>

              {/* List of files selected for upload */}
              {pendingDocsToUpload.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600">
                    Selected Files ({pendingDocsToUpload.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pendingDocsToUpload.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-rose-50 border border-rose-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="truncate font-semibold text-rose-950" title={f.name}>
                            {f.name}
                          </span>
                          <span className="text-[10px] text-rose-600 shrink-0 font-mono">
                            ({formatBytes(f.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDocsToUpload((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. DOCTOR FINDINGS & CLINICAL NOTES */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>4. Doctor's Clinical Findings & Summary (Optional)</span>
              </h3>

              <div>
                <textarea
                  rows={3}
                  placeholder="Record doctor notes or lab specifications (e.g. Tooth #16 Zirconia shade A2; Margin supragingival; Occlusion checked and approved)..."
                  value={doctorFindings}
                  onChange={(e) => setDoctorFindings(e.target.value)}
                  className="w-full text-xs p-3 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleTabSwitch('reports')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={formSubmitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Archiving Lab Report...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Store Lab Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. REPORT DETAIL & PDF VIEWER MODAL                             */}
      {/* ============================================================== */}
      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-300">
                      {selectedReport.caseNumber}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                      {getPrimaryTestName(selectedReport)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {selectedReport.patient?.name} ({selectedReport.patient?.patientCode})
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedReport(null);
                  setIsEditingNotes(false);
                }}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Patient & Test Overview Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Report Date</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedReport.sentDate ? selectedReport.sentDate.substring(0, 10) : '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Diagnostic Lab</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedReport.labName || '—'}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Lab Ref #</span>
                  <p className="font-bold font-mono text-slate-800 mt-0.5">
                    {selectedReport.labRefNumber || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Patient Contact</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedReport.patient?.mobile || '—'}
                  </p>
                </div>
              </div>

              {/* ATTACHED PDF DOCUMENTS */}
              <div className="border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Emailed PDF Report Files
                    </h4>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2">
                      {selectedReport.documents?.length || 0}
                    </span>
                  </div>

                  {/* Add more PDFs button */}
                  <div>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      onChange={handleUploadAdditionalDocument}
                      className="hidden"
                      id="modal-pdf-upload"
                    />
                    <label
                      htmlFor="modal-pdf-upload"
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDoc ? 'Uploading...' : '+ Add Another PDF'}</span>
                    </label>
                  </div>
                </div>

                {selectedReport.documents && selectedReport.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedReport.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-6 h-6 text-rose-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate" title={doc.originalName}>
                              {doc.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatBytes(doc.sizeBytes)} • Uploaded {doc.uploadedAt ? doc.uploadedAt.substring(0, 10) : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Preview in browser */}
                          <a
                            href={`/api/lab/documents/${doc.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Open & View PDF directly in browser"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Fullscreen</span>
                          </a>

                          {/* Download */}
                          <a
                            href={`/api/lab/documents/${doc.id}/download`}
                            download
                            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition cursor-pointer"
                            title="Download PDF file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete this PDF"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No PDF attached yet. Click "+ Add Another PDF" to upload the document received by email.
                  </p>
                )}
              </div>

              {/* DOCTOR FINDINGS & NOTES (EDITABLE) */}
              <div className="border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Doctor's Clinical Findings & Notes</span>
                  </h4>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditableNotes(selectedReport.generalNotes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Notes</span>
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={3}
                      value={editableNotes}
                      onChange={(e) => setEditableNotes(e.target.value)}
                      placeholder="Doctor's findings, impressions, or notes..."
                      className="w-full text-xs p-2.5 bg-white border border-indigo-400 focus:outline-hidden"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingNotes(false)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 italic whitespace-pre-wrap py-1">
                    {selectedReport.generalNotes || 'No clinical findings recorded for this report.'}
                  </p>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteReport(selectedReport)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR SCAN IMAGES (IF ANY) */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewPhotoUrl}
              alt="Scan Preview"
              className="max-w-full max-h-[85vh] object-contain border border-slate-700"
            />
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-2 right-2 px-3 py-1 bg-black/70 hover:bg-black text-white text-xs font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Close Preview</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
