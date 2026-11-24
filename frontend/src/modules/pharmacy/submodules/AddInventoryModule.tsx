import React, { useState } from 'react';
import { Package, FileSpreadsheet, Download, Save, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

interface AddInventoryModuleProps {
  onSuccess: () => void;
  onFileSelect: (file: File) => void;
  onDownloadSampleCsv: () => void;
  csvSuccessMsg?: string;
  csvErrorMsg?: string;
}

export const AddInventoryModule: React.FC<AddInventoryModuleProps> = ({
  onSuccess,
  onFileSelect,
  onDownloadSampleCsv,
  csvSuccessMsg,
  csvErrorMsg,
}) => {
  const [invForm, setInvForm] = useState({
    itemName: '',
    itemCode: '',
    brandName: '',
    barcode: '',
    shelfNo: '',
    hsnCode: '3004 90 00',
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

  const [saving, setSaving] = useState(false);

  // Helper to extract numeric tax percent
  const getTaxRate = (taxStr: string): number => {
    return parseFloat(String(taxStr).replace(/[^0-9.]/g, '')) || 0;
  };

  // Independent inputs - NO reverse calculation overwriting other fields!
  const handleMrpChange = (newMrp: number) => {
    setInvForm((prev) => ({ ...prev, mrp: newMrp }));
  };

  const handleSellingTaxChange = (newTax: string) => {
    setInvForm((prev) => ({ ...prev, sellingTax: newTax }));
  };

  const handlePriceBeforeTaxChange = (newBase: number) => {
    setInvForm((prev) => ({ ...prev, sellingPriceBeforeTax: newBase }));
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.itemName.trim()) {
      alert('Item Name is required.');
      return;
    }

    setSaving(true);
    try {
      const parsedGst = getTaxRate(invForm.sellingTax) || 12;
      const payload = {
        medicineName: invForm.itemName.trim(),
        brandName: invForm.brandName.trim() || invForm.itemName.trim(),
        itemCodeCustom: invForm.itemCode.trim() || undefined,
        manufacturer: invForm.manufacturer.trim() || undefined,
        barcode: invForm.barcode.trim() || undefined,
        hsnCode: invForm.hsnCode.trim() || '3004 90 00',
        packageInfo: invForm.shelfNo ? `${invForm.packageInfo} | Shelf: ${invForm.shelfNo}` : invForm.packageInfo,
        buyingUnit: invForm.buyingUnit,
        sellingUnit: invForm.sellingUnit,
        unitRatio: parseInt(invForm.unitRatio.toString(), 10) || 1,
        medicineType: invForm.medicineType,
        strength: invForm.strength.trim() || undefined,
        prescriptionType: invForm.prescriptionType,
        reorderLevel: parseInt(invForm.reorderLevel.toString(), 10) || 20,
        openingStock: parseInt(invForm.openingStock.toString(), 10) || 0,
        batchNumber: invForm.batchNumber.trim() || (invForm.openingStock > 0 ? `BATCH-${Date.now().toString().slice(-4)}` : undefined),
        expiryDate: invForm.expiryDate || undefined,
        buyingPrice: parseFloat(invForm.buyingPriceBeforeTax.toString()) || 0,
        mrp: parseFloat(invForm.mrp.toString()) || 0,
        sellingPrice: parseFloat(invForm.sellingPriceBeforeTax.toString()) || parseFloat(invForm.mrp.toString()) || 0,
        gstRate: parsedGst,
      };

      const res = await api.post('/pharmacy/medicines', payload);
      if (res.data.success) {
        alert(`Medicine "${invForm.itemName}" saved to Inventory successfully!`);
        setInvForm({
          itemName: '',
          itemCode: '',
          brandName: '',
          barcode: '',
          shelfNo: '',
          hsnCode: '3004 90 00',
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
        onSuccess();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving medicine');
    } finally {
      setSaving(false);
    }
  };

  const currentTaxRate = getTaxRate(invForm.sellingTax);
  const calculatedTaxAmount = invForm.sellingPriceBeforeTax > 0 && currentTaxRate > 0
    ? (invForm.sellingPriceBeforeTax * currentTaxRate) / 100
    : 0;
  const calculatedFinalSellingPrice = invForm.sellingPriceBeforeTax + calculatedTaxAmount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Form: Inventory Master (8 Cols) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0A685D]" />
            Add Inventory Master
          </h3>
          <p className="text-xs text-slate-500">
            Register items with opening stock, batch number, and tax rates
          </p>
        </div>

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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A685D] font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">REORDER LEVEL</label>
              <input
                type="number"
                value={invForm.reorderLevel}
                onChange={(e) =>
                  setInvForm({ ...invForm, reorderLevel: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ITEM CODE (OPTIONAL)</label>
              <input
                type="text"
                value={invForm.itemCode}
                onChange={(e) => setInvForm({ ...invForm, itemCode: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">STRENGTH / DOSAGE</label>
              <input
                type="text"
                value={invForm.strength}
                onChange={(e) => setInvForm({ ...invForm, strength: e.target.value })}
                placeholder="e.g. 500mg, 10ml"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">BRAND / ALIAS NAME</label>
              <input
                type="text"
                value={invForm.brandName}
                onChange={(e) => setInvForm({ ...invForm, brandName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">BUYING PRICE BEFORE TAX (₹)</label>
                <div className="flex items-center gap-1">
                  {[0, 5, 12, 18, 28].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInvForm({ ...invForm, buyingTax: `${t}% GST` })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        invForm.buyingTax === `${t}% GST` ? 'bg-[#0A685D] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={invForm.buyingPriceBeforeTax || ''}
                onChange={(e) =>
                  setInvForm({ ...invForm, buyingPriceBeforeTax: parseFloat(e.target.value) || 0 })
                }
                placeholder="Purchase cost from supplier"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                PRINTED PACK MRP (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={invForm.mrp || ''}
                onChange={(e) => handleMrpChange(parseFloat(e.target.value) || 0)}
                placeholder="Printed maximum retail price"
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-300 rounded-xl font-black text-sm text-amber-900 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">SHELF NO</label>
              <input
                type="text"
                value={invForm.shelfNo}
                onChange={(e) => setInvForm({ ...invForm, shelfNo: e.target.value })}
                placeholder="e.g. 25-B, Shelf 3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">SELLING PRICE (₹) *</label>
                <div className="flex items-center gap-1">
                  {[0, 5, 12, 18, 28].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSellingTaxChange(`${t}% GST`)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        invForm.sellingTax === `${t}% GST` ? 'bg-[#0A685D] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={invForm.sellingPriceBeforeTax || ''}
                onChange={(e) => handlePriceBeforeTaxChange(parseFloat(e.target.value) || 0)}
                placeholder="Direct selling price (e.g. 160)"
                className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl font-black text-sm text-emerald-900 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Real-Time Selling Price + Tax Breakdown Card */}
          {(invForm.sellingPriceBeforeTax > 0 || invForm.mrp > 0) && (
            <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Entered Selling Price</span>
                  <span className="font-extrabold text-slate-800">₹{invForm.sellingPriceBeforeTax.toFixed(2)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">+ Sale Tax ({currentTaxRate}%)</span>
                  <span className="font-bold text-teal-700">+₹{calculatedTaxAmount.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">= Final Rate (In Billing)</span>
                  <span className="font-black text-emerald-700 text-sm">₹{calculatedFinalSellingPrice.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-teal-200/60">
                <span>Printed Pack MRP: <strong>₹{invForm.mrp.toFixed(2)}</strong></span>
                <span className="text-emerald-700 font-semibold">✓ Multiplies automatically by quantity during billing</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">HSN CODE</label>
              <input
                type="text"
                value={invForm.hsnCode}
                onChange={(e) => setInvForm({ ...invForm, hsnCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PACKAGE INFO</label>
              <input
                type="text"
                value={invForm.packageInfo}
                onChange={(e) => setInvForm({ ...invForm, packageInfo: e.target.value })}
                placeholder="e.g. 10X10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">MEDICINE TYPE</label>
              <select
                value={invForm.medicineType}
                onChange={(e) => setInvForm({ ...invForm, medicineType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="SYRUP">Syrup</option>
                <option value="INJECTION">Injection</option>
                <option value="OINTMENT">Ointment</option>
                <option value="DROPS">Drops</option>
                <option value="DENTAL_GEL">Dental Gel</option>
                <option value="MOUTHWASH">Mouthwash</option>
                <option value="BANDAGE_SPLINT">Bandage / Splint</option>
                <option value="OTHER">Other</option>
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">OPENING STOCK (Units)</label>
              <input
                type="number"
                value={invForm.openingStock}
                onChange={(e) =>
                  setInvForm({ ...invForm, openingStock: parseInt(e.target.value, 10) || 0 })
                }
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">BATCH NUMBER</label>
              <input
                type="text"
                value={invForm.batchNumber}
                onChange={(e) => setInvForm({ ...invForm, batchNumber: e.target.value })}
                placeholder="e.g. BATCH-2026-A"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
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
                onChange={(e) =>
                  setInvForm({ ...invForm, unitRatio: parseInt(e.target.value, 10) || 1 })
                }
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

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0A685D] hover:bg-[#08544B] disabled:opacity-50 text-white rounded-xl font-bold shadow-2xs cursor-pointer flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Smart CSV (4 Cols) */}
      <div className="lg:col-span-4 space-y-5">
        {/* Smart CSV Import Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Smart CSV Import
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
              Auto-Detects
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Upload ANY distributor CSV. Our smart engine auto-matches synonyms, handles missing columns safely, and shows a preview.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
            className="w-full text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-800 cursor-pointer"
          />

          {csvSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
              {csvSuccessMsg}
            </div>
          )}

          {csvErrorMsg && (
            <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold">
              {csvErrorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onDownloadSampleCsv}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
