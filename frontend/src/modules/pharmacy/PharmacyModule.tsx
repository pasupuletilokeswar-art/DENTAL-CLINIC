import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  RotateCcw,
  Save,
  Search,
  Calculator,
  Upload,
  UserCheck,
  History,
  Printer,
  Share2,
} from 'lucide-react';
import api from '../../services/api';
import { MedicineMaster, Patient, Doctor } from '../../types';
import { getSocket } from '../../services/socket';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';
import { sendWhatsAppMessage, createPharmacySaleMessage } from '../../services/whatsappService';

export const PharmacyModule: React.FC = () => {
  // Navigation Tabs: Add New Invoice vs. Previous Invoices History vs. Add Inventory Master
  const [activeTab, setActiveTab] = useState<'invoice' | 'history' | 'inventory'>('invoice');

  // Master Data
  const [medicines, setMedicines] = useState<MedicineMaster[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [inventoryTabMode, setInventoryTabMode] = useState<'INVENTORY' | 'PRESCRIPTION'>('INVENTORY');

  // ==========================================
  // SCREEN 1: ADD NEW INVOICE STATE
  // ==========================================
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [walkinDetails, setWalkinDetails] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().substring(0, 10));

  // Invoice Items Table
  interface InvoiceItem {
    id: string;
    medicineId: string;
    medicineName: string;
    brandName?: string | null;
    selectedBatchId: string;
    selectedBatchNo: string;
    batchExpiry: string;
    availableQty: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    total: number;
    allBatches: any[];
  }

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [payNow1, setPayNow1] = useState<number>(0);
  const [payMode1, setPayMode1] = useState<string>('Cash');
  const [payNow2, setPayNow2] = useState<number>(0);
  const [payMode2, setPayMode2] = useState<string>('Cash');
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState('');
  const [invoiceError, setInvoiceError] = useState('');

  // ==========================================
  // SCREEN 2: ADD INVENTORY MASTER STATE
  // ==========================================
  const [invForm, setInvForm] = useState({
    itemName: '',
    itemCode: '',
    brandName: '',
    barcode: '',
    shelfNo: '',
    hsnCode: '3004',
    packageInfo: '10X10',
    manufacturer: '',
    buyingUnit: 'STRIP',
    sellingUnit: 'TABLET',
    unitRatio: 10,
    reorderLevel: 20,
    strength: '',
    buyingPriceBeforeTax: 0,
    buyingTax: '12% GST',
    mrp: 0,
    sellingTax: '12% GST',
    sellingPriceBeforeTax: 0,
    medicineType: 'TABLET',
    openingStock: 100,
    batchNumber: '',
    expiryDate: '',
    itemType: 'Drug',
    prescriptionType: 'OTC',
  });

  const [calcMrp, setCalcMrp] = useState(0);
  const [calcTax, setCalcTax] = useState(12);

  const fetchData = async () => {
    try {
      const [medRes, docRes, salesRes] = await Promise.all([
        api.get('/pharmacy/medicines'),
        api.get('/reports/doctors'),
        api.get('/pharmacy/sales'),
      ]);
      if (medRes.data.success) setMedicines(medRes.data.medicines);
      if (salesRes.data.success) setSalesHistory(salesRes.data.sales);
      if (docRes.data.success) {
        setDoctors(docRes.data.doctors);
        if (docRes.data.doctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docRes.data.doctors[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchData();
    };

    socket.on('pharmacy:inventory-updated', handleUpdate);
    return () => {
      socket.off('pharmacy:inventory-updated', handleUpdate);
    };
  }, []);

  const handleSelectMedicineFromRightPalette = (med: MedicineMaster) => {
    if (med.batches.length === 0) {
      alert(`No active batches in stock for ${med.medicineName}!`);
      return;
    }

    const batch = med.batches[0];

    const newItem: InvoiceItem = {
      id: `${med.id}-${Date.now()}`,
      medicineId: med.id,
      medicineName: med.medicineName,
      brandName: med.brandName,
      selectedBatchId: batch.id,
      selectedBatchNo: batch.batchNumber,
      batchExpiry: batch.expiryDate,
      availableQty: batch.quantityInBase,
      quantity: 1,
      unitPrice: batch.sellingPrice,
      discount: 0,
      taxRate: 12,
      total: batch.sellingPrice,
      allBatches: med.batches,
    };

    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleBatchChange = (rowId: string, batchId: string) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === rowId) {
          const matchedBatch = item.allBatches.find((b) => b.id === batchId);
          if (matchedBatch) {
            const lineGross = item.quantity * matchedBatch.sellingPrice - item.discount;
            return {
              ...item,
              selectedBatchId: matchedBatch.id,
              selectedBatchNo: matchedBatch.batchNumber,
              batchExpiry: matchedBatch.expiryDate,
              availableQty: matchedBatch.quantityInBase,
              unitPrice: matchedBatch.sellingPrice,
              total: lineGross + (lineGross * item.taxRate) / 100,
            };
          }
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (rowId: string, qty: number) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === rowId) {
          const validQty = Math.max(1, Math.min(item.availableQty, qty));
          const lineGross = validQty * item.unitPrice - item.discount;
          return {
            ...item,
            quantity: validQty,
            total: Math.round((lineGross + (lineGross * item.taxRate) / 100) * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const handleItemDiscountChange = (rowId: string, disc: number) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === rowId) {
          const lineGross = item.quantity * item.unitPrice - disc;
          return {
            ...item,
            discount: disc,
            total: Math.round((lineGross + (lineGross * item.taxRate) / 100) * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const totalItemPrice = invoiceItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const totalDiscount = invoiceItems.reduce((acc, i) => acc + i.discount, 0) + overallDiscount;
  const totalTax = invoiceItems.reduce((acc, i) => {
    const gross = i.quantity * i.unitPrice - i.discount;
    return acc + (gross * i.taxRate) / 100;
  }, 0);
  const grandTotal = Math.max(0, Math.round((totalItemPrice - totalDiscount + totalTax) * 100) / 100);

  useEffect(() => {
    if (invoiceItems.length > 0 && payNow1 === 0 && payNow2 === 0) {
      setPayNow1(grandTotal);
    }
  }, [grandTotal]);

  const handleSaveInvoice = async () => {
    if (invoiceItems.length === 0) {
      alert('Please add at least one product to the invoice.');
      return;
    }

    setInvoiceError('');
    setInvoiceSuccess('');
    setSavingInvoice(true);

    try {
      const payload = {
        patientId: selectedPatient ? selectedPatient.id : undefined,
        discount: totalDiscount,
        paidAmount: payNow1 + payNow2,
        paymentMode: payMode1.toUpperCase(),
        items: invoiceItems.map((i) => ({
          medicineId: i.medicineId,
          batchStockId: i.selectedBatchId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          gstRate: i.taxRate,
        })),
      };

      const res = await api.post('/pharmacy/sales', payload);
      if (res.data.success) {
        setInvoiceSuccess(`Invoice ${res.data.sale.invoiceNumber} saved & stock deducted in real time!`);

        // Option to share on WhatsApp immediately
        if (selectedPatient && selectedPatient.mobile) {
          const msg = createPharmacySaleMessage(res.data.sale);
          sendWhatsAppMessage(selectedPatient.mobile, msg);
        }

        setInvoiceItems([]);
        setSelectedPatient(null);
        setWalkinDetails('');
        setPayNow1(0);
        setPayNow2(0);
        fetchData();
      }
    } catch (err: any) {
      setInvoiceError(err.response?.data?.message || 'Error generating invoice');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const medRes = await api.post('/pharmacy/medicines', {
        medicineName: invForm.itemName,
        brandName: invForm.brandName || invForm.itemName,
        manufacturer: invForm.manufacturer || undefined,
        barcode: invForm.barcode || undefined,
        hsnCode: invForm.hsnCode || '3004',
        packageInfo: invForm.packageInfo || '10X10',
        buyingUnit: invForm.buyingUnit,
        sellingUnit: invForm.sellingUnit,
        unitRatio: parseInt(invForm.unitRatio.toString(), 10) || 1,
        medicineType: invForm.medicineType,
        strength: invForm.strength || undefined,
        prescriptionType: invForm.prescriptionType,
        reorderLevel: parseInt(invForm.reorderLevel.toString(), 10) || 20,
      });

      if (medRes.data.success && invForm.openingStock > 0 && invForm.batchNumber) {
        const supRes = await api.get('/pharmacy/suppliers');
        const supplierId = supRes.data.suppliers[0]?.id;

        if (supplierId) {
          await api.post('/pharmacy/purchases', {
            supplierId,
            invoiceNumber: `OPEN-${Date.now().toString().slice(-6)}`,
            invoiceDate: new Date().toISOString().substring(0, 10),
            items: [
              {
                medicineId: medRes.data.medicine.id,
                batchNumber: invForm.batchNumber,
                expiryDate: invForm.expiryDate || '2028-12-31',
                quantityUnits: parseInt(invForm.openingStock.toString(), 10),
                purchaseRate: invForm.buyingPriceBeforeTax || 10,
                mrp: invForm.mrp || 15,
                sellingPrice: invForm.sellingPriceBeforeTax || 14,
                discountPercent: 0,
                gstPercent: 12,
              },
            ],
          });
        }
      }

      alert('Item added to Inventory Master successfully!');
      fetchData();
      setActiveTab('invoice');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error adding inventory item');
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    if (!medicineSearchQuery) return true;
    const q = medicineSearchQuery.toLowerCase();
    return (
      m.medicineName.toLowerCase().includes(q) ||
      (m.brandName && m.brandName.toLowerCase().includes(q)) ||
      m.itemCode.toLowerCase().includes(q) ||
      (m.barcode && m.barcode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Clinical Header Bar with Sub-tabs */}
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-6">
          <span className="font-bold tracking-wide text-teal-400 uppercase">
            SUMMIT Dental and Orthopedic Clinic Pharmacy
          </span>
          <div className="flex items-center gap-1 text-slate-300">
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1 rounded font-semibold transition ${
                activeTab === 'invoice' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              Add New Invoice
            </button>

            {/* TAB: PREVIOUS INVOICES ARCHIVE */}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Previous Invoices ({salesHistory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1 rounded font-semibold transition ${
                activeTab === 'inventory' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              Add Inventory
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">Receptionist Terminal</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {invoiceSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{invoiceSuccess}</span>
        </div>
      )}

      {invoiceError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {invoiceError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ADD NEW INVOICE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">ADD NEW INVOICE</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInvoiceItems([]);
                    setSelectedPatient(null);
                    setWalkinDetails('');
                    setInvoiceSuccess('');
                    setInvoiceError('');
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refresh / Clear</span>
                </button>
                <button
                  onClick={handleSaveInvoice}
                  disabled={savingInvoice || invoiceItems.length === 0}
                  className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingInvoice ? 'Saving...' : 'Save and Add New Invoice'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Customer Details:- Name, Age, Phone (Walk-in OTC)
                </label>
                <input
                  type="text"
                  value={walkinDetails}
                  onChange={(e) => {
                    setWalkinDetails(e.target.value);
                    if (e.target.value) setSelectedPatient(null);
                  }}
                  placeholder="Enter walk-in details if not a registered patient..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-1 text-center font-bold text-slate-400 text-xs">OR</div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Search Patient By Name, Phone, DOC ID
                </label>
                <PatientSearchSelect
                  placeholder="Start typing patient name or phone..."
                  selectedPatient={selectedPatient}
                  onSelect={(p) => {
                    setSelectedPatient(p);
                    if (p) setWalkinDetails('');
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Doctor Name</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.fullName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 pl-4">Products / Batch</th>
                    <th className="p-3 w-28 text-center">Quantity</th>
                    <th className="p-3 w-24 text-right">Price (₹)</th>
                    <th className="p-3 w-28 text-center">Discount</th>
                    <th className="p-3 w-20 text-center">Tax (%)</th>
                    <th className="p-3 w-28 text-right">Total (₹)</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No products added yet. Click items from the right-hand Inventory palette to add to this invoice.
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 pl-4">
                          <div className="font-bold text-slate-900">{item.brandName || item.medicineName}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Batch:</span>
                            <select
                              value={item.selectedBatchId}
                              onChange={(e) => handleBatchChange(item.id, e.target.value)}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-teal-800 font-semibold"
                            >
                              {item.allBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNumber} (Qty:{b.quantityInBase} | Exp:
                                  {new Date(b.expiryDate).toLocaleDateString()})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.availableQty}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10) || 1)}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold"
                          />
                          <div className="text-[9px] text-rose-600 font-bold mt-0.5">MAX {item.availableQty} QTY</div>
                        </td>

                        <td className="p-3 text-right font-semibold text-slate-800">₹{item.unitPrice}</td>

                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => handleItemDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                            placeholder="add discount"
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-[11px]"
                          />
                        </td>

                        <td className="p-3 text-center font-mono text-slate-600">{item.taxRate}%</td>

                        <td className="p-3 text-right font-bold text-slate-900 text-sm">₹{item.total}</td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => setInvoiceItems(invoiceItems.filter((i) => i.id !== item.id))}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Price</span>
                <span className="font-bold text-slate-800 text-sm">₹{totalItemPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Discount</span>
                <span className="font-bold text-slate-800 text-sm">₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Tax</span>
                <span className="font-bold text-slate-800 text-sm">₹{totalTax.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Grand Total</span>
                <span className="font-extrabold text-rose-600 text-lg">₹{grandTotal}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-2 font-bold text-xs uppercase tracking-wide">
                GENERATE RECEIPT
              </div>

              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                  <span className="sm:col-span-3 font-bold text-slate-700">PAY NOW (Primary Payment)</span>
                  <div className="sm:col-span-5">
                    <input
                      type="number"
                      min="0"
                      value={payNow1}
                      onChange={(e) => setPayNow1(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={payMode1}
                      onChange={(e) => setPayMode1(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                  <span className="sm:col-span-3 font-bold text-slate-700">PAY NOW (2nd Payment Split)</span>
                  <div className="sm:col-span-5">
                    <input
                      type="number"
                      min="0"
                      value={payNow2}
                      onChange={(e) => setPayNow2(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={payMode2}
                      onChange={(e) => setPayMode2(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-[750px]">
            <div className="flex border-b border-slate-200 mb-3 text-xs font-bold">
              <button
                onClick={() => setInventoryTabMode('INVENTORY')}
                className={`flex-1 py-1.5 text-center transition ${
                  inventoryTabMode === 'INVENTORY'
                    ? 'border-b-2 border-slate-900 text-slate-900 font-extrabold'
                    : 'text-slate-400'
                }`}
              >
                INVENTORY
              </button>
              <button
                onClick={() => setInventoryTabMode('PRESCRIPTION')}
                className={`flex-1 py-1.5 text-center transition ${
                  inventoryTabMode === 'PRESCRIPTION'
                    ? 'border-b-2 border-slate-900 text-slate-900 font-extrabold'
                    : 'text-slate-400'
                }`}
              >
                PRESCRIPTION
              </button>
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                value={medicineSearchQuery}
                onChange={(e) => setMedicineSearchQuery(e.target.value)}
                placeholder="SEARCH MEDICINES"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {filteredMedicines.map((med) => (
                <div
                  key={med.id}
                  onClick={() => handleSelectMedicineFromRightPalette(med)}
                  className="py-2.5 px-2 hover:bg-teal-50 cursor-pointer rounded transition group"
                >
                  <div className="font-bold text-slate-800 group-hover:text-teal-700">
                    {med.brandName || med.medicineName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    BARCODE: {med.barcode || 'N/A'} | DRUG TYPE: {med.medicineType}
                  </div>
                  <div className="text-[10px] text-teal-800 font-semibold mt-0.5 flex justify-between">
                    <span>Stock: {med.currentStock} {med.sellingUnit}s</span>
                    <span>₹{med.batches[0]?.sellingPrice || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PREVIOUS INVOICES ARCHIVE (Historical Pharmacy Invoices + Sharing) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Previous Pharmacy Invoices Archive</h3>
              <p className="text-xs text-slate-500">
                Permanently saved sales records with instant WhatsApp sharing and thermal/receipt print
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-lg">
              Total Invoices: {salesHistory.length}
            </span>
          </div>

          {salesHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No pharmacy invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-4">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Patient / Customer</th>
                    <th className="p-3">Medicines Dispensed</th>
                    <th className="p-3">Grand Total</th>
                    <th className="p-3">Paid / Status</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesHistory.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 pl-4 font-mono font-bold text-slate-900">{sale.invoiceNumber}</td>
                      <td className="p-3 text-slate-500">{new Date(sale.saleDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{sale.patient?.name || 'Walk-in Customer'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sale.patient?.mobile || 'OTC Sale'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {sale.items?.map((item: any) => (
                            <div key={item.id} className="text-[11px] text-slate-700">
                              • {item.medicine?.medicineName} (x{item.quantity})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">₹{sale.grandTotal}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-right space-x-1.5">
                        {/* WhatsApp Share Button */}
                        <button
                          onClick={() => {
                            const phone = sale.patient?.mobile || '';
                            const msg = createPharmacySaleMessage(sale);
                            if (phone) {
                              sendWhatsAppMessage(phone, msg);
                            } else {
                              const inputPhone = prompt('Enter patient 10-digit mobile number for WhatsApp share:');
                              if (inputPhone) sendWhatsAppMessage(inputPhone, msg);
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                          title="Share Invoice via WhatsApp"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
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
      {/* TAB 3: ADD INVENTORY                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide pb-3 border-b border-slate-100 mb-5">
              Add Inventory
            </h3>

            <form onSubmit={handleSaveInventory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ITEM NAME *</label>
                  <input
                    type="text"
                    required
                    value={invForm.itemName}
                    onChange={(e) => setInvForm({ ...invForm, itemName: e.target.value })}
                    placeholder="e.g. JOINTRICH TABLET"
                    className="w-full px-3 py-2 bg-sky-50 border border-sky-300 rounded-xl focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">REORDER LEVEL</label>
                  <input
                    type="number"
                    value={invForm.reorderLevel}
                    onChange={(e) => setInvForm({ ...invForm, reorderLevel: parseInt(e.target.value, 10) || 0 })}
                    placeholder="Item reorder alert level"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ITEM CODE</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invForm.itemCode}
                      onChange={(e) => setInvForm({ ...invForm, itemCode: e.target.value })}
                      placeholder="e.g. JOIN633"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setInvForm({ ...invForm, itemCode: '' })}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">STRENGTH</label>
                  <input
                    type="text"
                    value={invForm.strength}
                    onChange={(e) => setInvForm({ ...invForm, strength: e.target.value })}
                    placeholder="Strength of the medicine (e.g. 500mg)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ALIAS/BRAND NAME</label>
                  <input
                    type="text"
                    value={invForm.brandName}
                    onChange={(e) => setInvForm({ ...invForm, brandName: e.target.value })}
                    placeholder="Brand name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">BUYING PRICE BEFORE TAX (₹)</label>
                  <input
                    type="number"
                    value={invForm.buyingPriceBeforeTax}
                    onChange={(e) => setInvForm({ ...invForm, buyingPriceBeforeTax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">BARCODE</label>
                  <input
                    type="text"
                    value={invForm.barcode}
                    onChange={(e) => setInvForm({ ...invForm, barcode: e.target.value })}
                    placeholder="Barcode string"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">BUYING TAX</label>
                  <select
                    value={invForm.buyingTax}
                    onChange={(e) => setInvForm({ ...invForm, buyingTax: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="5% GST">5% GST</option>
                    <option value="12% GST">12% GST</option>
                    <option value="18% GST">18% GST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SHELF NO</label>
                  <input
                    type="text"
                    value={invForm.shelfNo}
                    onChange={(e) => setInvForm({ ...invForm, shelfNo: e.target.value })}
                    placeholder="Example: 25-B"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">MRP (Display Purpose Only)</label>
                  <input
                    type="number"
                    value={invForm.mrp}
                    onChange={(e) => setInvForm({ ...invForm, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN CODE</label>
                  <input
                    type="text"
                    value={invForm.hsnCode}
                    onChange={(e) => setInvForm({ ...invForm, hsnCode: e.target.value })}
                    placeholder="Example: 3004 90 00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">SELLING TAX</label>
                  <select
                    value={invForm.sellingTax}
                    onChange={(e) => setInvForm({ ...invForm, sellingTax: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="5% GST">5% GST</option>
                    <option value="12% GST">12% GST</option>
                    <option value="18% GST">18% GST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PACKAGE</label>
                  <input
                    type="text"
                    value={invForm.packageInfo}
                    onChange={(e) => setInvForm({ ...invForm, packageInfo: e.target.value })}
                    placeholder="Example: 10X10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">SELLING PRICE BEFORE TAX</label>
                  <input
                    type="number"
                    value={invForm.sellingPriceBeforeTax}
                    onChange={(e) => setInvForm({ ...invForm, sellingPriceBeforeTax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">MANUFACTURER</label>
                  <input
                    type="text"
                    value={invForm.manufacturer}
                    onChange={(e) => setInvForm({ ...invForm, manufacturer: e.target.value })}
                    placeholder="Manufacturer name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">MEDICINE TYPE</label>
                  <select
                    value={invForm.medicineType}
                    onChange={(e) => setInvForm({ ...invForm, medicineType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="SYRUP">Syrup</option>
                    <option value="INJECTION">Injection</option>
                    <option value="DENTAL_GEL">Dental Gel</option>
                    <option value="MOUTHWASH">Mouthwash</option>
                    <option value="BANDAGE_SPLINT">Bandage / Splint</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">BUYING UNIT</label>
                  <input
                    type="text"
                    value={invForm.buyingUnit}
                    onChange={(e) => setInvForm({ ...invForm, buyingUnit: e.target.value })}
                    placeholder="Example: Box, strips, etc"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">OPENING STOCK</label>
                  <input
                    type="number"
                    value={invForm.openingStock}
                    onChange={(e) => setInvForm({ ...invForm, openingStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SELLING UNIT</label>
                  <input
                    type="text"
                    value={invForm.sellingUnit}
                    onChange={(e) => setInvForm({ ...invForm, sellingUnit: e.target.value })}
                    placeholder="Bottles, strips, etc"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">BATCH NUMBER</label>
                  <input
                    type="text"
                    value={invForm.batchNumber}
                    onChange={(e) => setInvForm({ ...invForm, batchNumber: e.target.value })}
                    placeholder="OPENING BATCH NUMBER"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UNIT RATIO</label>
                  <input
                    type="number"
                    min="1"
                    value={invForm.unitRatio}
                    onChange={(e) => setInvForm({ ...invForm, unitRatio: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">EXPIRY DATE</label>
                  <input
                    type="date"
                    value={invForm.expiryDate}
                    onChange={(e) => setInvForm({ ...invForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-sm cursor-pointer"
                >
                  Save to Inventory Master
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-teal-600" />
                MRP CALCULATOR
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">MRP</label>
                  <input
                    type="number"
                    value={calcMrp}
                    onChange={(e) => setCalcMrp(parseFloat(e.target.value) || 0)}
                    placeholder="Enter MRP"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">TAX (%)</label>
                  <input
                    type="number"
                    value={calcTax}
                    onChange={(e) => setCalcTax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="pt-2">
                  <label className="block font-bold text-slate-600 mb-1">PRICE BEFORE TAX</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={calcMrp > 0 ? (calcMrp / (1 + calcTax / 100)).toFixed(2) : '0'}
                      className="flex-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-teal-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const calculated = calcMrp > 0 ? calcMrp / (1 + calcTax / 100) : 0;
                        setInvForm({
                          ...invForm,
                          sellingPriceBeforeTax: Math.round(calculated * 100) / 100,
                          mrp: calcMrp,
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                IMPORT ITEMS
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">CSV FILE</label>
                  <input
                    type="file"
                    accept=".csv"
                    className="w-full text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg font-bold"
                  >
                    IMPORT NOW
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                  >
                    SAMPLE CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
