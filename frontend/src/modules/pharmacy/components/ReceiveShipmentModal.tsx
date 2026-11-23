import React, { useState, useEffect } from 'react';
import { Package, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { MedicineMaster } from '../../../types';

interface ReceiveShipmentModalProps {
  medicine: MedicineMaster | null;
  defaultQty?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveShipmentModal: React.FC<ReceiveShipmentModalProps> = ({
  medicine,
  defaultQty,
  onClose,
  onSuccess,
}) => {
  const [batchNo, setBatchNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [qty, setQty] = useState<number>(50);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (medicine) {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())
        .toISOString()
        .substring(0, 10);
      setBatchNo(`BATCH-${Date.now().toString().slice(-4)}`);
      setExpiry(nextYear);
      setQty(defaultQty || (medicine.reorderLevel * 2) || 50);

      const latestBatch = medicine.batches?.[0];
      setPurchasePrice(latestBatch?.purchasePrice || 0);
      setMrp(latestBatch?.mrp || latestBatch?.sellingPrice || 0);
      setSellingPrice(latestBatch?.sellingPrice || latestBatch?.mrp || 0);
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [medicine, defaultQty]);

  if (!medicine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNo.trim() || qty <= 0) {
      setErrorMsg('Please enter a valid batch number and quantity.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/pharmacy/medicines/${medicine.id}/batches`, {
        batchNumber: batchNo.trim(),
        expiryDate: expiry || undefined,
        quantityUnits: qty,
        purchasePrice,
        mrp,
        sellingPrice,
      });

      if (res.data.success) {
        setSuccessMsg(`Successfully restocked ${qty} units of ${medicine.medicineName}!`);
        // Remove from ordered status in localStorage
        try {
          const saved = localStorage.getItem('pharmacy_ordered_status');
          if (saved) {
            const map = JSON.parse(saved);
            delete map[medicine.id];
            localStorage.setItem('pharmacy_ordered_status', JSON.stringify(map));
          }
        } catch {}

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1100);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to add batch to inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Mark Stock Shipment as Received</h3>
              <p className="text-[11px] text-slate-400">Instantly inward batch into live POS inventory</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
            <div className="text-[10px] uppercase font-black text-slate-500">Selected Medicine</div>
            <div className="text-sm font-black text-slate-900">{medicine.medicineName}</div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span>Type: {medicine.medicineType}</span>
              <span>&bull;</span>
              <span>Shelf: {medicine.packageInfo || 'Main'}</span>
              <span>&bull;</span>
              <span className="font-bold text-slate-700">
                Current Stock: {medicine.currentStock} {medicine.sellingUnit}s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">BATCH NUMBER *</label>
              <input
                type="text"
                required
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. BATCH-2026-X"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-[#0A685D]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">EXPIRY DATE *</label>
              <input
                type="date"
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0A685D]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              QUANTITY RECEIVED ({medicine.sellingUnit}S) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 bg-teal-50/50 border border-teal-200 rounded-xl font-black text-[#0A685D] text-base focus:ring-2 focus:ring-[#0A685D]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-slate-600 text-[10px] mb-1">BUYING RATE (₹)</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 text-[10px] mb-1">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                value={mrp}
                onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 text-[10px] mb-1">SELLING RATE (₹)</label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0A685D]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#0A685D] hover:bg-[#08544B] disabled:opacity-50 text-white rounded-xl font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding to Stock...</span>
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Add to Inventory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

