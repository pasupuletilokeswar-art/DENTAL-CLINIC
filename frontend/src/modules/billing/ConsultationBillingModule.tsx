import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Printer,
  DollarSign,
  FileText,
  Scissors,
  Share2,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Doctor, ConsultationBill, Procedure } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { generateBillingInvoicePDF, generateProcedureInvoicePDF } from '../../services/pdfService';
import {
  sendWhatsAppMessage,
  createConsultationBillMessage,
  createProcedureBillMessage,
} from '../../services/whatsappService';

interface BillingModuleProps {
  initialTab?: 'consultation' | 'procedure';
  pendingProcedureToBill?: Procedure | null;
  onClearPendingProcedure?: () => void;
}

export const ConsultationBillingModule: React.FC<BillingModuleProps> = ({
  initialTab = 'consultation',
  pendingProcedureToBill,
  onClearPendingProcedure,
}) => {
  // Sub-tabs: Consultation Billing vs. Procedure / Minor OT Billing
  const [billingTab, setBillingTab] = useState<'consultation' | 'procedure'>(initialTab);

  // Consultation Bills State
  const [bills, setBills] = useState<ConsultationBill[]>([]);
  const [procedureBills, setProcedureBills] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Consultation Invoice Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationFee, setConsultationFee] = useState(600);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // GST %
  const [paidAmount, setPaidAmount] = useState(600);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Complete Procedure Billing Modal (When coming from Operations)
  const [activeProcedureToBill, setActiveProcedureToBill] = useState<Procedure | null>(null);
  const [procConsumablesFee, setProcConsumablesFee] = useState(500);
  const [procDiscount, setProcDiscount] = useState(0);
  const [procTaxRate, setProcTaxRate] = useState(0);
  const [procPaidAmount, setProcPaidAmount] = useState(0);
  const [procPaymentMode, setProcPaymentMode] = useState('CASH');
  const [procSubmitting, setProcSubmitting] = useState(false);

  // Settle Consultation Balance Modal
  const [settleBill, setSettleBill] = useState<ConsultationBill | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleMode, setSettleMode] = useState('CASH');

  // Settle Procedure Balance Modal
  const [settleProcBill, setSettleProcBill] = useState<any | null>(null);
  const [settleProcAmount, setSettleProcAmount] = useState(0);
  const [settleProcMode, setSettleProcMode] = useState('CASH');

  // Handle passed pending procedure
  useEffect(() => {
    if (pendingProcedureToBill) {
      setBillingTab('procedure');
      setActiveProcedureToBill(pendingProcedureToBill);
      setProcPaidAmount(pendingProcedureToBill.charges + 500);
    }
  }, [pendingProcedureToBill]);

  const fetchBills = async () => {
    try {
      const [consultRes, procRes] = await Promise.all([
        api.get('/billing/consultation'),
        api.get('/billing/procedure/operations'),
      ]);
      if (consultRes.data.success) {
        setBills(consultRes.data.bills);
      }
      if (procRes.data.success) {
        setProcedureBills(procRes.data.bills);
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
        if (docRes.data.doctors.length > 0) {
          setSelectedDoctorId(docRes.data.doctors[0].id);
          setConsultationFee(docRes.data.doctors[0].consultationFee || 600);
          setPaidAmount(docRes.data.doctors[0].consultationFee || 600);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchDoctors();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleBillUpdate = () => {
      fetchBills();
    };

    socket.on('billing:consultation-created', handleBillUpdate);
    socket.on('billing:payment-received', handleBillUpdate);
    socket.on('procedure:completed', handleBillUpdate);

    return () => {
      socket.off('billing:consultation-created', handleBillUpdate);
      socket.off('billing:payment-received', handleBillUpdate);
      socket.off('procedure:completed', handleBillUpdate);
    };
  }, []);

  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find((d) => d.id === docId);
    if (doc) {
      setConsultationFee(doc.consultationFee);
      setPaidAmount(doc.consultationFee);
    }
  };

  const calculateTotal = () => {
    const subTotal = Math.max(0, consultationFee - discount);
    const tax = (subTotal * taxRate) / 100;
    return Math.round((subTotal + tax) * 100) / 100;
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFormError('Please search and select a patient first.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        consultationFee,
        discount,
        taxRate,
        paidAmount,
        paymentMode,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      };

      const res = await api.post('/billing/consultation', payload);
      if (res.data.success) {
        setShowModal(false);
        setSelectedPatient(null);
        fetchBills();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error generating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeProcedureBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcedureToBill) return;

    setProcSubmitting(true);
    try {
      const res = await api.post(`/procedures/${activeProcedureToBill.id}/complete`, {
        consumablesFee: procConsumablesFee,
        discount: procDiscount,
        taxRate: procTaxRate,
        paidAmount: procPaidAmount,
        paymentMode: procPaymentMode,
      });

      if (res.data.success) {
        setActiveProcedureToBill(null);
        if (onClearPendingProcedure) onClearPendingProcedure();
        fetchBills();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error completing procedure billing');
    } finally {
      setProcSubmitting(false);
    }
  };

  const handleSettleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBill) return;

    try {
      const res = await api.post(`/billing/consultation/${settleBill.id}/payment`, {
        amount: settleAmount,
        paymentMode: settleMode,
      });

      if (res.data.success) {
        setSettleBill(null);
        fetchBills();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording consultation payment');
    }
  };

  const handleSettleProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleProcBill) return;

    try {
      const res = await api.post(`/billing/procedure/operation/${settleProcBill.id}/payment`, {
        amount: settleProcAmount,
        paymentMode: settleProcMode,
      });

      if (res.data.success) {
        setSettleProcBill(null);
        fetchBills();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording procedure payment');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs: Consultation Invoices vs. Procedure Invoices */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setBillingTab('consultation')}
          className={`pb-3 px-5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            billingTab === 'consultation'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Doctor Consultation Invoices ({bills.length})</span>
        </button>

        <button
          onClick={() => setBillingTab('procedure')}
          className={`pb-3 px-5 text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            billingTab === 'procedure'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scissors className="w-4 h-4 text-amber-600" />
          <span>Procedure & Surgical OT Invoices ({procedureBills.length})</span>
        </button>
      </div>

      {/* Action Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {billingTab === 'consultation'
              ? 'Doctor Consultation Billing & Receipts'
              : 'Post-Procedure Patient Billing & Payment Collection'}
          </h3>
          <p className="text-xs text-slate-500">
            {billingTab === 'consultation'
              ? 'OPD fee collection with official thermal/PDF print and instant WhatsApp invoice share'
              : 'Independent records for completed surgical procedures, RCTs, Implants & Injections with WhatsApp sharing'}
          </p>
        </div>

        {billingTab === 'consultation' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation Invoice</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. CONSULTATION BILLS TABLE                                               */}
      {/* ========================================================================= */}
      {billingTab === 'consultation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Consultation Invoices ({bills.length})</span>
            <span className="text-[11px] text-slate-500">Includes partial collections & balances</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : bills.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No consultation invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-5">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Fee / Disc</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Paid / Pending</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 pl-5 font-mono font-bold text-slate-900">{bill.invoiceNumber}</td>
                      <td className="p-3 text-slate-500">{new Date(bill.billDate).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        <div>{bill.patient.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{bill.patient.patientCode}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{bill.doctor.user.fullName}</div>
                        <div className="text-[10px] text-teal-600">{bill.doctor.specialization}</div>
                      </td>
                      <td className="p-3">
                        <div>₹{bill.consultationFee}</div>
                        {bill.discount > 0 && <div className="text-[10px] text-rose-500">-₹{bill.discount} Disc</div>}
                      </td>
                      <td className="p-3 font-bold text-slate-900">₹{bill.totalAmount}</td>
                      <td className="p-3">
                        <div className="text-emerald-600 font-medium">₹{bill.paidAmount} Paid</div>
                        {bill.pendingBalance > 0 && (
                          <div className="text-rose-600 font-bold text-[11px]">₹{bill.pendingBalance} Due</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            bill.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bill.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {bill.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 pr-5 text-right space-x-1.5">
                        {/* WhatsApp Share Button */}
                        <button
                          onClick={() => {
                            const msg = createConsultationBillMessage(bill);
                            sendWhatsAppMessage(bill.patient.mobile, msg);
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Send Invoice to Patient via WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => generateBillingInvoicePDF(bill, (bill as any).payments || [])}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Print Consultation Tax Invoice PDF"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>Print</span>
                        </button>

                        {bill.pendingBalance > 0 && (
                          <button
                            onClick={() => {
                              setSettleBill(bill);
                              setSettleAmount(bill.pendingBalance);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] transition cursor-pointer"
                          >
                            Settle Due
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROCEDURE / MINOR OT BILLS TABLE                                       */}
      {/* ========================================================================= */}
      {billingTab === 'procedure' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Completed Procedure Bills ({procedureBills.length})
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">Separate OT & Surgical Charges</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading procedure bills...</div>
          ) : procedureBills.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No procedure invoices found. Go to "Operations & Procedures", schedule and click "Complete & Bill" to finalize billing here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-5">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Procedure Name</th>
                    <th className="p-3">Surgeon</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Paid / Pending</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {procedureBills.map((opBill) => (
                    <tr key={opBill.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 pl-5 font-mono font-bold text-amber-900">{opBill.invoiceNumber}</td>
                      <td className="p-3 text-slate-500">{new Date(opBill.billDate).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold text-slate-800">
                        <div>{opBill.procedure?.patient?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {opBill.procedure?.patient?.patientCode}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{opBill.procedure?.procedureMaster?.name}</div>
                        <div className="text-[10px] text-amber-700 font-mono">{opBill.procedure?.procedureCode}</div>
                      </td>
                      <td className="p-3 text-slate-700">{opBill.procedure?.doctor?.user?.fullName}</td>
                      <td className="p-3 font-bold text-slate-900">₹{opBill.totalAmount}</td>
                      <td className="p-3">
                        <div className="text-emerald-600 font-medium">₹{opBill.paidAmount} Paid</div>
                        {opBill.pendingBalance > 0 && (
                          <div className="text-rose-600 font-bold text-[11px]">₹{opBill.pendingBalance} Due</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            opBill.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {opBill.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 pr-5 text-right space-x-1.5">
                        {/* WhatsApp Share Button */}
                        <button
                          onClick={() => {
                            const msg = createProcedureBillMessage(opBill);
                            sendWhatsAppMessage(opBill.procedure?.patient?.mobile || '', msg);
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Send Procedure Invoice to Patient via WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => generateProcedureInvoicePDF(opBill, opBill.payments || [])}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Print Procedure Tax Invoice PDF"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>Print</span>
                        </button>

                        {opBill.pendingBalance > 0 && (
                          <button
                            onClick={() => {
                              setSettleProcBill(opBill);
                              setSettleProcAmount(opBill.pendingBalance);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] transition cursor-pointer"
                          >
                            Collect Due
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dedicated Post-Procedure Billing Modal */}
      {activeProcedureToBill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Finalize Procedure Billing & Collect Payment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Patient: <strong>{activeProcedureToBill.patient.name}</strong> ({activeProcedureToBill.patient.patientCode}) •
              Procedure: <strong>{activeProcedureToBill.procedureMaster.name}</strong>
            </p>

            <form onSubmit={handleFinalizeProcedureBilling} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Procedure Fee</label>
                  <input
                    type="text"
                    disabled
                    value={`₹${activeProcedureToBill.charges}`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consumables / OT Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={procConsumablesFee}
                    onChange={(e) => setProcConsumablesFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">Total Procedure Invoice:</span>
                <span className="font-extrabold text-amber-950 text-base">
                  ₹{activeProcedureToBill.charges + procConsumablesFee - procDiscount}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid by Patient Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={procPaidAmount}
                    onChange={(e) => setProcPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={procPaymentMode}
                    onChange={(e) => setProcPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProcedureToBill(null);
                    if (onClearPendingProcedure) onClearPendingProcedure();
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={procSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {procSubmitting ? 'Finalizing Bill...' : 'Save & Generate Procedure Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Consultation Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Generate Consultation Invoice</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBill} className="mt-4 space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.user.fullName} ({doc.specialization}) - Standard Fee: ₹{doc.consultationFee}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-Fetched Doctor Practice & Consultation Fee Details */}
              {(() => {
                const currentDoc = doctors.find((d) => d.id === selectedDoctorId);
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 border border-teal-200/60 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-teal-900">Total Invoice Amount:</span>
                <span className="font-bold text-teal-800 text-sm">₹{calculateTotal()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="UPI Ref ID, card transaction number..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Generating...' : 'Generate Invoice & Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Consultation Balance Modal */}
      {settleBill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Settle Consultation Balance</h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice: {settleBill.invoiceNumber} • Patient: {settleBill.patient.name}
            </p>

            <form onSubmit={handleSettleConsultation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pending Amount: ₹{settleBill.pendingBalance}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={settleBill.pendingBalance}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={settleMode}
                  onChange={(e) => setSettleMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettleBill(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Procedure Balance Modal */}
      {settleProcBill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Collect Procedure Balance</h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice: {settleProcBill.invoiceNumber} • Patient: {settleProcBill.procedure?.patient?.name}
            </p>

            <form onSubmit={handleSettleProcedure} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pending Due: ₹{settleProcBill.pendingBalance}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={settleProcBill.pendingBalance}
                  value={settleProcAmount}
                  onChange={(e) => setSettleProcAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={settleProcMode}
                  onChange={(e) => setSettleProcMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettleProcBill(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Collect Procedure Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
