

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  X,
  AlertCircle,
  UserCheck,
  UserPlus,
  Search,
  Zap,
  ShoppingCart,
  Trash2,
  Save,
  ArrowRight,
  Printer,
  AlertTriangle,
  Package,
} from 'lucide-react';
import api from '../../../services/api';
import { MedicineMaster, Patient } from '../../../types';
import { InvoiceItem } from '../types';
import { PatientSearchSelect } from '../../../components/PatientSearchSelect';

export interface BillingDeskModuleProps {
  medicines: MedicineMaster[];
  doctors: any[];
  onRefresh: () => void;
  onOpenReceipt: (sale: any) => void;
  onOpenAddPatient: () => void;
  selectedPatientFromParent?: Patient | null;
  onClearPatientFromParent?: () => void;
}

export const BillingDeskModule: React.FC<BillingDeskModuleProps> = ({
  medicines,
  doctors,
  onRefresh,
  onOpenReceipt,
  onOpenAddPatient,
  selectedPatientFromParent,
  onClearPatientFromParent,
}) => {
  // Mode & Customer info (Registered Patient is first)
  const [customerMode, setCustomerMode] = useState<'registered' | 'walkin'>('registered');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinAge, setWalkinAge] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substring(0, 10));

  // Cart & Search
  const [quickSearchText, setQuickSearchText] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<MedicineMaster[]>([]);
  const [showQuickDropdown, setShowQuickDropdown] = useState(false);
  const quickSearchRef = useRef<HTMLDivElement>(null);

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Settlement
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Split'>('Cash');
  const [payNow1, setPayNow1] = useState<number>(0);
  const [payMode1, setPayMode1] = useState<string>('Cash');
  const [payNow2, setPayNow2] = useState<number>(0);
  const [payMode2, setPayMode2] = useState<string>('UPI');

  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState('');
  const [invoiceError, setInvoiceError] = useState('');

  // Right Shelf Catalog (Toggleable)
  const [showShelfCatalog, setShowShelfCatalog] = useState(false);
  const [shelfCategory, setShelfCategory] = useState<string>('ALL');
  const [shelfSearchQuery, setShelfSearchQuery] = useState('');

  // Sync doctor default
  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors]);

  // Sync selected patient from parent if any
  useEffect(() => {
    if (selectedPatientFromParent) {
      setCustomerMode('registered');
      setSelectedPatient(selectedPatientFromParent);
    }
  }, [selectedPatientFromParent]);

  // Click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target as Node)) {
        setShowQuickDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick search filter
  useEffect(() => {
    if (!quickSearchText.trim()) {
      setQuickSearchResults([]);
      setShowQuickDropdown(false);
      return;
    }

    const q = quickSearchText.toLowerCase();
    const hits = medicines.filter(
      (m) =>
        m.medicineName.toLowerCase().includes(q) ||
        (m.brandName && m.brandName.toLowerCase().includes(q)) ||
        m.itemCode.toLowerCase().includes(q) ||
        (m.barcode && m.barcode.toLowerCase().includes(q))
    );
    setQuickSearchResults(hits.slice(0, 10));
    setShowQuickDropdown(true);
  }, [quickSearchText, medicines]);

  // Add medicine to cart
  const handleAddMedicineToCart = (med: MedicineMaster) => {
    const nowTime = Date.now();
    const validBatches = med.batches.filter(
      (b) => b.quantityInBase > 0 && new Date(b.expiryDate).getTime() >= nowTime
    );
    const expiredBatches = med.batches.filter(
      (b) => b.quantityInBase > 0 && new Date(b.expiryDate).getTime() < nowTime
    );

    if (validBatches.length === 0) {
      if (expiredBatches.length > 0) {
        alert(
          `DISPENSE BLOCKED: "${med.medicineName}" has EXPIRED (Batch ${expiredBatches[0].batchNumber} expired on ${new Date(
            expiredBatches[0].expiryDate
          ).toLocaleDateString()})!\n\nReception is strictly prohibited from dispensing expired medicines.`
        );
        return;
      }
      alert(`"${med.medicineName}" is currently OUT OF STOCK! Please reorder first.`);
      return;
    }

    const chosenBatch = validBatches[0];

    const existingIdx = invoiceItems.findIndex(
      (it) => it.medicineId === med.id && it.selectedBatchId === chosenBatch?.id
    );

    if (existingIdx !== -1) {
      const current = invoiceItems[existingIdx];
      if (current.quantity + 1 > current.availableQty) {
        alert(`Cannot exceed available batch stock of ${current.availableQty} units!`);
        return;
      }
      const updated = [...invoiceItems];
      updated[existingIdx].quantity += 1;
      const sub = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      const disc = (sub * updated[existingIdx].discount) / 100;
      updated[existingIdx].total = Math.round((sub - disc) * 100) / 100;
      setInvoiceItems(updated);
    } else {
      const unitPrice = chosenBatch?.sellingPrice || (med as any).mrp || 0;
      const newItem: InvoiceItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        medicineId: med.id,
        medicineName: med.medicineName,
        brandName: med.brandName,
        selectedBatchId: chosenBatch ? chosenBatch.id : '',
        selectedBatchNo: chosenBatch ? chosenBatch.batchNumber : 'DEFAULT',
        batchExpiry: chosenBatch ? chosenBatch.expiryDate : '',
        availableQty: chosenBatch ? chosenBatch.quantityInBase : med.currentStock,
        quantity: 1,
        unitPrice,
        discount: 0,
        taxRate: 12,
        total: unitPrice,
        allBatches: med.batches,
      };
      setInvoiceItems((prev) => [newItem, ...prev]);
    }

    setQuickSearchText('');
    setShowQuickDropdown(false);
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    const updated = [...invoiceItems];
    const target = updated[idx];
    const newQty = target.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(idx);
      return;
    }
    if (newQty > target.availableQty) {
      alert(`Cannot dispense more than batch stock of ${target.availableQty} units!`);
      return;
    }
    target.quantity = newQty;
    const sub = target.quantity * target.unitPrice;
    const disc = (sub * target.discount) / 100;
    target.total = Math.round((sub - disc) * 100) / 100;
    setInvoiceItems(updated);
  };

  const handleBatchChange = (idx: number, newBatchId: string) => {
    const updated = [...invoiceItems];
    const target = updated[idx];
    const selected = target.allBatches.find((b) => b.id === newBatchId);
    if (selected) {
      if (new Date(selected.expiryDate).getTime() < Date.now()) {
        alert(
          `DISPENSE BLOCKED: Batch "${selected.batchNumber}" has EXPIRED on ${new Date(
            selected.expiryDate
          ).toLocaleDateString()}!\n\nCannot dispense expired batches.`
        );
        return;
      }
      target.selectedBatchId = selected.id;
      target.selectedBatchNo = selected.batchNumber;
      target.batchExpiry = selected.expiryDate;
      target.availableQty = selected.quantityInBase;
      target.unitPrice = selected.sellingPrice || target.unitPrice;
      if (target.quantity > selected.quantityInBase) {
        target.quantity = Math.max(1, selected.quantityInBase);
      }
      const sub = target.quantity * target.unitPrice;
      const disc = (sub * target.discount) / 100;
      target.total = Math.round((sub - disc) * 100) / 100;
      setInvoiceItems(updated);
    }
  };

  const handleRemoveItem = (idx: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    if (invoiceItems.length === 0) return;
    if (window.confirm('Clear all medicines from current billing cart?')) {
      setInvoiceItems([]);
      setOverallDiscount(0);
      setPayNow1(0);
      setPayNow2(0);
    }
  };

  // Totals
  const subTotalAmount = invoiceItems.reduce((acc, it) => acc + it.total, 0);
  const totalTaxAmount = invoiceItems.reduce((acc, it) => {
    const taxablePortion = it.total / (1 + it.taxRate / 100);
    return acc + (it.total - taxablePortion);
  }, 0);
  const finalDiscountAmount = (subTotalAmount * overallDiscount) / 100;
  const grandTotal = Math.max(0, Math.round(subTotalAmount - finalDiscountAmount));

  // Keep single pay mode synchronized
  useEffect(() => {
    if (paymentMode !== 'Split') {
      setPayNow1(grandTotal);
      setPayMode1(paymentMode);
      setPayNow2(0);
    } else {
      if (payNow1 === 0 && payNow2 === 0 && grandTotal > 0) {
        setPayNow1(grandTotal);
        setPayMode1('Cash');
        setPayNow2(0);
        setPayMode2('UPI');
      }
    }
  }, [grandTotal, paymentMode]);

  // Save invoice
  const handleSaveInvoice = async (printAfterSave: boolean = false) => {
    if (invoiceItems.length === 0) {
      setInvoiceError('Cannot generate empty invoice. Add at least one medicine.');
      return;
    }

    // Safety Validation: Reject checkout if any expired batch is in cart
    const expiredItem = invoiceItems.find(
      (it) => it.batchExpiry && new Date(it.batchExpiry).getTime() < Date.now()
    );
    if (expiredItem) {
      setInvoiceError(
        `DISPENSE BLOCKED: "${expiredItem.medicineName}" (Batch ${expiredItem.selectedBatchNo}) has EXPIRED on ${new Date(
          expiredItem.batchExpiry
        ).toLocaleDateString()}! Please remove expired items before billing.`
      );
      return;
    }

    if (customerMode === 'registered' && !selectedPatient) {
      setInvoiceError('Please select a registered patient or switch to Walk-in customer.');
      return;
    }

    if (paymentMode === 'Split' && payNow1 + payNow2 !== grandTotal) {
      setInvoiceError(
        `Split payments (₹${payNow1} + ₹${payNow2} = ₹${payNow1 + payNow2}) must match Grand Total ₹${grandTotal}`
      );
      return;
    }

    setSavingInvoice(true);
    setInvoiceError('');
    setInvoiceSuccess('');

    try {
      let mappedPaymentMode = 'CASH';
      if (paymentMode === 'UPI') mappedPaymentMode = 'UPI';
      else if (paymentMode === 'Card') mappedPaymentMode = 'CARD';
      else if (paymentMode === 'Split') mappedPaymentMode = 'CASH';

      const itemsPayload = invoiceItems.map((it) => ({
        medicineId: it.medicineId,
        batchStockId: it.selectedBatchId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        gstRate: it.taxRate ?? 12,
        taxRate: it.taxRate ?? 12,
      }));

      const payload = {
        patientId: customerMode === 'registered' ? selectedPatient?.id : undefined,
        customerName: customerMode === 'walkin' ? (walkinName.trim() || undefined) : undefined,
        customerPhone: customerMode === 'walkin' ? (walkinPhone.trim() || undefined) : undefined,
        customerAge: customerMode === 'walkin' ? (walkinAge.trim() || undefined) : undefined,
        doctorId: selectedDoctorId || undefined,
        saleDate: invoiceDate,
        subTotal: subTotalAmount,
        discount: finalDiscountAmount,
        taxAmount: totalTaxAmount,
        grandTotal,
        paymentMode: mappedPaymentMode,
        paidAmount: grandTotal,
        items: itemsPayload,
      };

      const res = await api.post('/pharmacy/sales', payload);
      if (res.data.success) {
        const savedSale = res.data.sale;
        setInvoiceSuccess(`Invoice ${savedSale.invoiceNumber} saved & billed successfully!`);

        if (printAfterSave) {
          const receiptToOpen = {
            ...savedSale,
            customerName:
              customerMode === 'walkin'
                ? walkinName.trim() || 'Walk-in Customer'
                : savedSale.patient?.name || 'Registered Patient',
            customerPhone:
              customerMode === 'walkin'
                ? walkinPhone.trim()
                : savedSale.patient?.mobile || '',
            customerAge:
              customerMode === 'walkin'
                ? walkinAge.trim()
                : savedSale.patient?.age ? `${savedSale.patient.age}` : '',
          };
          onOpenReceipt(receiptToOpen);
        }

        setInvoiceItems([]);
        setSelectedPatient(null);
        if (onClearPatientFromParent) onClearPatientFromParent();
        setWalkinName('');
        setWalkinPhone('');
        setWalkinAge('');
        setPayNow1(0);
        setPayNow2(0);
        onRefresh();
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        'Error generating invoice';
      setInvoiceError(errorMsg);
    } finally {
      setSavingInvoice(false);
    }
  };

  // Filter shelf catalog
  const filteredShelfMedicines = medicines.filter((m) => {
    const matchesSearch =
      !shelfSearchQuery ||
      m.medicineName.toLowerCase().includes(shelfSearchQuery.toLowerCase()) ||
      (m.brandName && m.brandName.toLowerCase().includes(shelfSearchQuery.toLowerCase())) ||
      m.itemCode.toLowerCase().includes(shelfSearchQuery.toLowerCase()) ||
      (m.barcode && m.barcode.toLowerCase().includes(shelfSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (shelfCategory !== 'ALL' && m.medicineType !== shelfCategory) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {invoiceSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{invoiceSuccess}</span>
          </div>
          <button onClick={() => setInvoiceSuccess('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {invoiceError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{invoiceError}</span>
          </div>
          <button onClick={() => setInvoiceError('')} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Pharmacy Billing Header with Toggle Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Pharmacy Billing Desk</h2>
            <p className="text-[11px] text-slate-500 font-medium">Full-Width Clinical Dispensing &amp; Instant Settlement</p>
          </div>
        </div>

        {/* Toggle Button for Shelf Catalog */}
        <button
          type="button"
          onClick={() => setShowShelfCatalog(!showShelfCatalog)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
            showShelfCatalog
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
          title={showShelfCatalog ? 'Hide catalog to give maximum room to billing table' : 'Browse medicine shelf catalog'}
        >
          <Package className="w-4 h-4 text-current" />
          <span>{showShelfCatalog ? 'Hide Medicine Catalog' : 'Browse Medicine Catalog'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            showShelfCatalog ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800'
          }`}>
            {filteredShelfMedicines.length} in stock
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================== */}
        {/* BILLING INVOICE DESK                       */}
        {/* ========================================== */}
        <div className={`${showShelfCatalog ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4 sm:space-y-5 transition-all duration-300`}>
          {/* Top Customer / Doctor Bar */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerMode('registered')}
                  className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                    customerMode === 'registered'
                      ? 'bg-emerald-600 text-white shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Registered Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('walkin');
                    setSelectedPatient(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                    customerMode === 'walkin'
                      ? 'bg-slate-900 text-white shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Walk-out / Walk-in Patient</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Prescribing Doctor:</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {doctors.map((doc) => {
                    const rawName = doc.user?.fullName || doc.name || 'Doctor';
                    const cleanName = rawName.replace(/^Dr\.?\s*/i, '');
                    return (
                      <option key={doc.id} value={doc.id}>
                        Dr. {cleanName} ({doc.specialization || 'Dental'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {customerMode === 'registered' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <PatientSearchSelect
                    onSelect={(p) => setSelectedPatient(p)}
                    selectedPatient={selectedPatient}
                    placeholder="Search patient by Name, UHID, or Mobile No..."
                  />
                </div>
                <button
                  type="button"
                  onClick={onOpenAddPatient}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="Customer Name (e.g. Ramesh)"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <input
                  type="text"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="WhatsApp Mobile (for Receipt)"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                />
                <input
                  type="text"
                  value={walkinAge}
                  onChange={(e) => setWalkinAge(e.target.value)}
                  placeholder="Age / Note"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            )}
          </div>

          {/* Quick Search Bar */}
          <div ref={quickSearchRef} className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickSearchText}
                  onChange={(e) => setQuickSearchText(e.target.value)}
                  onFocus={() => {
                    if (quickSearchText.trim()) setShowQuickDropdown(true);
                  }}
                  placeholder="Scan Barcode or Search Medicine by Name, Brand, Formula..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-emerald-500/80 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (quickSearchResults.length > 0) {
                    handleAddMedicineToCart(quickSearchResults[0]);
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Fast Search</span>
              </button>
            </div>

            {showQuickDropdown && quickSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {quickSearchResults.map((med) => {
                  const isOOS = med.currentStock <= 0;
                  return (
                    <div
                      key={med.id}
                      onClick={() => !isOOS && handleAddMedicineToCart(med)}
                      className={`p-3 flex items-center justify-between transition cursor-pointer ${
                        isOOS ? 'bg-slate-50 opacity-60 cursor-not-allowed' : 'hover:bg-teal-50/50'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{med.medicineName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{med.medicineType}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-teal-800">{med.itemCode}</span>
                          {med.packageInfo && (
                            <>
                              <span>&bull;</span>
                              <span>{med.packageInfo}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-sm text-emerald-700">
                          ₹{med.batches[0]?.sellingPrice || (med as any).mrp || 0}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isOOS
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOOS ? 'Out of Stock' : `${med.currentStock} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5F9] text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 pl-4">Medicine &amp; Batch</th>
                  <th className="p-3 text-center w-28">Quantity</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right w-20">Discount</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <ShoppingCart className="w-6 h-6 stroke-1" />
                        </div>
                        <p className="font-bold text-xs text-slate-600">Billing Cart is Empty</p>
                        <p className="text-[11px] text-slate-400">
                          Search medicine above or click any product tile from the Right Shelf Catalog
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoiceItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 pl-4">
                        <div className="font-extrabold text-slate-900 text-xs">{item.medicineName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.allBatches.length > 1 ? (
                            <select
                              value={item.selectedBatchId}
                              onChange={(e) => handleBatchChange(idx, e.target.value)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 font-mono text-slate-700 font-bold"
                            >
                              {item.allBatches.map((b) => {
                                const isExpired = new Date(b.expiryDate).getTime() < Date.now();
                                return (
                                  <option key={b.id} value={b.id} disabled={isExpired}>
                                    Batch: {b.batchNumber} (Qty: {b.quantityInBase}) {isExpired ? '[EXPIRED - LOCKED]' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Batch: {item.selectedBatchNo}
                            </span>
                          )}
                          {item.batchExpiry && (
                            <span className="text-[10px] text-slate-400">
                              Exp: {new Date(item.batchExpiry).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, -1)}
                            className="w-5 h-5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <span className="font-black text-xs w-6 text-center text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(idx, 1)}
                            className="w-5 h-5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-right font-medium text-slate-800">₹{item.unitPrice}</td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...invoiceItems];
                              updated[idx].discount = Math.min(100, Math.max(0, val));
                              const sub = updated[idx].quantity * updated[idx].unitPrice;
                              const disc = (sub * updated[idx].discount) / 100;
                              updated[idx].total = Math.round((sub - disc) * 100) / 100;
                              setInvoiceItems(updated);
                            }}
                            className="w-12 px-1.5 py-0.5 text-right bg-slate-50 border border-slate-200 rounded-md font-bold text-xs"
                          />
                          <span className="text-slate-400 text-[10px]">%</span>
                        </div>
                      </td>

                      <td className="p-3 text-right font-black text-slate-900">₹{item.total}</td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Breakdown & Settlement Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Payment Settlement Mode
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {(['Cash', 'UPI', 'Card', 'Split'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMode(m)}
                    className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                      paymentMode === m
                        ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {m === 'UPI' ? 'UPI / QR' : m}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === 'Split' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-emerald-200/80">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">PART 1: CASH</label>
                  <input
                    type="number"
                    value={payNow1}
                    onChange={(e) => setPayNow1(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">PART 2: UPI / QR</label>
                  <input
                    type="number"
                    value={payNow2}
                    onChange={(e) => setPayNow2(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block">Items Subtotal: ₹{subTotalAmount.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400">Includes 12% GST: ₹{totalTaxAmount.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Grand Total Bill</span>
                <span className="text-2xl font-black text-emerald-700">₹{grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleClearCart}
              disabled={invoiceItems.length === 0}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-40"
            >
              Clear Cart
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveInvoice(false)}
                disabled={savingInvoice || invoiceItems.length === 0}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveInvoice(true)}
                disabled={savingInvoice || invoiceItems.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs transition cursor-pointer disabled:opacity-40 flex items-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <span>Save &amp; Print Receipt</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: SHELF CATALOG (TOGGLEABLE)    */}
        {/* ========================================== */}
        {showShelfCatalog && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Header: Clean Clinical Green */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-3.5 px-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xs tracking-wider uppercase">Pharmacy Shelf Catalog</h3>
                <p className="text-[10px] text-emerald-100/90">Click any tile to instantly dispense &amp; add to cart</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20">
                  {filteredShelfMedicines.length} in stock
                </span>
                <button
                  type="button"
                  onClick={() => setShowShelfCatalog(false)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
                  title="Close catalog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3.5 space-y-3 bg-slate-50/50 flex-1">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'TABLET', label: 'Tablets' },
                { id: 'CAPSULE', label: 'Capsules' },
                { id: 'SYRUP', label: 'Syrups' },
                { id: 'DENTAL_GEL', label: 'Gels' },
                { id: 'MOUTHWASH', label: 'Mouthwash' },
                { id: 'OTHER', label: 'Other' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setShelfCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    shelfCategory === c.id
                      ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={shelfSearchQuery}
                onChange={(e) => setShelfSearchQuery(e.target.value)}
                placeholder="Filter catalog tiles..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* 2-Column Product Tiles Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredShelfMedicines.map((med) => {
                const nowTime = Date.now();
                const validBatches = med.batches.filter(
                  (b) => b.quantityInBase > 0 && new Date(b.expiryDate).getTime() >= nowTime
                );
                const expiredBatches = med.batches.filter(
                  (b) => b.quantityInBase > 0 && new Date(b.expiryDate).getTime() < nowTime
                );
                const validQty = validBatches.reduce((sum, b) => sum + b.quantityInBase, 0);
                const hasValidStock = validBatches.length > 0;
                const isOnlyExpired = !hasValidStock && expiredBatches.length > 0;
                const isOOS = !hasValidStock && !isOnlyExpired;
                const isDisabled = !hasValidStock;

                return (
                  <div
                    key={med.id}
                    onClick={() => !isDisabled && handleAddMedicineToCart(med)}
                    className={`bg-white p-2.5 rounded-xl border transition flex flex-col justify-between ${
                      isOnlyExpired
                        ? 'opacity-70 border-red-300 bg-red-50/40 cursor-not-allowed'
                        : isOOS
                        ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50/50'
                        : 'border-slate-200/90 hover:border-emerald-400 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded uppercase">
                          {med.medicineType}
                        </span>
                        {isOnlyExpired ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-red-600 text-white animate-pulse">
                            EXPIRED - LOCKED
                          </span>
                        ) : isOOS ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                            0 left
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {validQty} left
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-xs text-slate-900 mt-1 line-clamp-1">
                        {med.medicineName}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{med.brandName}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {med.packageInfo || 'Shelf: Main'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                      <span className="font-black text-sm text-emerald-700">
                        ₹{validBatches[0]?.sellingPrice || (med as any).mrp || med.batches[0]?.sellingPrice || 0}
                      </span>
                      <button
                        type="button"
                        disabled={isDisabled}
                        title={
                          isOnlyExpired
                            ? 'Dispensing strictly blocked: Expired medicine'
                            : isOOS
                            ? 'Out of stock'
                            : 'Add to cart'
                        }
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                          isOnlyExpired
                            ? 'bg-red-100 text-red-500 cursor-not-allowed font-black'
                            : isDisabled
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white cursor-pointer'
                        }`}
                      >
                        {isOnlyExpired ? '✕' : '+'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
