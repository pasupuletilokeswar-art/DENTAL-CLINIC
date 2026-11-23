import React, { useState } from 'react';
import { Package, Calculator, FileSpreadsheet, Download, Save, RefreshCw } from 'lucide-react';
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

  const [calcMrp, setCalcMrp] = useState<number>(0);
  const [calcTax, setCalcTax] = useState<number>(12);
  const [saving, setSaving] = useState(false);

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.itemName.trim()) {
      alert('Item Name is required.');
      return;
    }

    setSaving(true);
    try {
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
        mrp: parseFloat(invForm.mrp.toString()) || parseFloat(invForm.sellingPriceBeforeTax.toString()) || 0,
        sellingPrice: parseFloat(invForm.sellingPriceBeforeTax.toString()) || parseFloat(invForm.mrp.toString()) || 0,
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
              <label className="block font-bold text-slate-700 mb-1">ITEM CODE</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invForm.itemCode}
                  onChange={(e) => setInvForm({ ...invForm, itemCode: e.target.value })}
                  placeholder="e.g. JOIN633"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
                <button
                  type="button"
                  onClick={() => setInvForm({ ...invForm, itemCode: '' })}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
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
              <label className="block font-bold text-slate-700 mb-1">BUYING PRICE BEFORE TAX (₹)</label>
              <input
                type="number"
                step="0.01"
                value={invForm.buyingPriceBeforeTax}
                onChange={(e) =>
                  setInvForm({ ...invForm, buyingPriceBeforeTax: parseFloat(e.target.value) || 0 })
                }
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
              <label className="block font-bold text-slate-700 mb-1">BUYING TAX (%)</label>
              <input
                type="text"
                value={invForm.buyingTax}
                onChange={(e) => setInvForm({ ...invForm, buyingTax: e.target.value })}
                placeholder="e.g. 12% GST or 12"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
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
              <label className="block font-bold text-slate-700 mb-1">SELLING TAX (%)</label>
              <input
                type="text"
                value={invForm.sellingTax}
                onChange={(e) => setInvForm({ ...invForm, sellingTax: e.target.value })}
                placeholder="e.g. 12% GST or 12"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                value={invForm.mrp}
                onChange={(e) => setInvForm({ ...invForm, mrp: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">SELLING PRICE BEFORE TAX (₹)</label>
              <input
                type="number"
                step="0.01"
                value={invForm.sellingPriceBeforeTax}
                onChange={(e) =>
                  setInvForm({
                    ...invForm,
                    sellingPriceBeforeTax: parseFloat(e.target.value) || 0,
                  })
                }
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

      {/* Right Column: MRP Calculator & Smart CSV (4 Cols) */}
      <div className="lg:col-span-4 space-y-5">
        {/* MRP Calculator */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#0A685D]" />
            MRP Calculator
          </h4>

          <div>
            <label className="block font-bold text-slate-600 text-xs mb-1">MRP</label>
            <input
              type="number"
              value={calcMrp || ''}
              onChange={(e) => setCalcMrp(parseFloat(e.target.value) || 0)}
              placeholder="Enter MRP"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 text-xs mb-1">Tax (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={calcTax || ''}
              onChange={(e) => setCalcTax(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 text-xs mb-1">Price Before Tax</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={calcMrp > 0 ? (calcMrp / (1 + calcTax / 100)).toFixed(2) : '0.00'}
                className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-black text-[#0A685D] text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const calculated = calcMrp > 0 ? calcMrp / (1 + calcTax / 100) : 0;
                  setInvForm({
                    ...invForm,
                    sellingPriceBeforeTax: Math.round(calculated * 100) / 100,
                    mrp: calcMrp,
                    sellingTax: `${calcTax}% GST`,
                  });
                  alert('Copied to form!');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

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

