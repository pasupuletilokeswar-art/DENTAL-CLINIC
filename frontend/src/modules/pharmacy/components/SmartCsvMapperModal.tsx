import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Sparkles,
  AlertCircle,
  Layers,
  FileText,
  RefreshCw,
  ArrowDownToLine,
  CheckCircle2,
  HelpCircle,
  Tag,
  DollarSign,
  Calendar,
} from 'lucide-react';

export interface FieldDefinition {
  key: string;
  label: string;
  category: 'IDENTIFICATION' | 'STORAGE' | 'STOCK' | 'PRICING';
  required: boolean;
  defaultVal: string;
  synonyms: string[];
  negativeKeywords?: string[];
}

export const CSV_FIELD_DEFINITIONS: FieldDefinition[] = [
  // 1. Identification
  {
    key: 'medicineName',
    label: 'Item / Medicine Name',
    category: 'IDENTIFICATION',
    required: true,
    defaultVal: '',
    synonyms: [
      'item name', 'medicine name', 'drug name', 'product name', 'item description',
      'product description', 'particulars', 'medicine', 'drug', 'item', 'product'
    ],
    negativeKeywords: [
      'vendor', 'supplier', 'distributor', 'party', 'customer', 'patient', 'doctor',
      'dealer', 'agency', 'rep', 'salesman', 'warehouse', 'branch', 'user', 'bill', 'invoice'
    ],
  },
  {
    key: 'brandName',
    label: 'Brand / Alias Name',
    category: 'IDENTIFICATION',
    required: false,
    defaultVal: '(Same as Item Name)',
    synonyms: ['brand', 'brand name', 'trade name', 'alias', 'alias name', 'trade'],
    negativeKeywords: ['vendor', 'supplier', 'distributor', 'company name', 'mfg', 'manufacturer'],
  },
  {
    key: 'itemCode',
    label: 'Item Code / SKU',
    category: 'IDENTIFICATION',
    required: false,
    defaultVal: 'Auto-generated (MED-XXXXX)',
    synonyms: ['item code', 'item_code', 'item code custom', 'sku', 'product code', 'item id', 'mat code', 'item no'],
    negativeKeywords: ['hsn', 'sac', 'tax', 'gst', 'vendor', 'supplier', 'batch', 'lot', 'invoice', 'bill', 'barcode', 'bar code'],
  },
  {
    key: 'manufacturer',
    label: 'Manufacturer / Company',
    category: 'IDENTIFICATION',
    required: false,
    defaultVal: 'N/A',
    synonyms: ['manufacturer', 'mfg', 'mfg by', 'mfg name', 'producer', 'lab', 'make'],
    negativeKeywords: ['vendor', 'supplier', 'distributor', 'dealer', 'party', 'agency', 'seller'],
  },
  {
    key: 'strength',
    label: 'Strength (e.g. 500mg, 10ml)',
    category: 'IDENTIFICATION',
    required: false,
    defaultVal: 'N/A',
    synonyms: ['strength', 'power', 'potency', 'dosage', 'dose', 'mg', 'ml', 'strength dosage'],
    negativeKeywords: ['stock', 'qty', 'price', 'tax'],
  },
  {
    key: 'barcode',
    label: 'Barcode / UPC / EAN',
    category: 'IDENTIFICATION',
    required: false,
    defaultVal: 'N/A',
    synonyms: ['barcode', 'bar code', 'upc', 'ean', 'qr code', 'gtin'],
    negativeKeywords: ['item code', 'hsn', 'batch'],
  },

  // 2. Storage & Packaging
  {
    key: 'shelfNo',
    label: 'Shelf / Rack Location',
    category: 'STORAGE',
    required: false,
    defaultVal: 'Main Shelf',
    synonyms: ['shelf no', 'shelf', 'rack', 'rack no', 'location', 'bin', 'bin no', 'storage location'],
    negativeKeywords: ['qty', 'stock', 'price'],
  },
  {
    key: 'packageInfo',
    label: 'Package Info (e.g. 10X10)',
    category: 'STORAGE',
    required: false,
    defaultVal: '10X10',
    synonyms: ['package info', 'package', 'packaging', 'packing', 'pack info', 'pack size description', 'pkg', 'packing size'],
    negativeKeywords: ['type', 'price', 'cost'],
  },
  {
    key: 'medicineType',
    label: 'Medicine Type (Form)',
    category: 'STORAGE',
    required: false,
    defaultVal: 'TABLET',
    synonyms: ['medicine type', 'type', 'form', 'dosage form', 'category', 'item type', 'presentation'],
    negativeKeywords: ['tax', 'prescription', 'rx'],
  },
  {
    key: 'buyingUnit',
    label: 'Buying Unit',
    category: 'STORAGE',
    required: false,
    defaultVal: 'STRIP',
    synonyms: ['buying unit', 'purchase unit', 'buy unit', 'b unit', 'b.unit', 'pack unit', 'p unit'],
    negativeKeywords: ['selling', 'sale', 'price', 'rate'],
  },
  {
    key: 'sellingUnit',
    label: 'Selling Unit',
    category: 'STORAGE',
    required: false,
    defaultVal: 'TABLET',
    synonyms: ['selling unit', 'sale unit', 'sell unit', 's unit', 's.unit', 'dispense unit', 'base unit'],
    negativeKeywords: ['buying', 'purchase', 'price', 'rate'],
  },
  {
    key: 'unitRatio',
    label: 'Unit Ratio (Units / Pack)',
    category: 'STORAGE',
    required: false,
    defaultVal: '10',
    synonyms: ['unit ratio', 'pack size', 'pkg size', 'units/pack', 'strip size', 'units per pack', 'conversion factor', 'ratio'],
    negativeKeywords: ['price', 'rate', 'mrp', 'stock'],
  },

  // 3. Stock & Batches
  {
    key: 'openingStock',
    label: 'Opening Stock (Units)',
    category: 'STOCK',
    required: false,
    defaultVal: '0 Units',
    synonyms: ['opening stock', 'stock', 'quantity', 'qty', 'units', 'pack qty', 'balance qty', 'bal qty', 'closing stock', 'total qty', 'available qty'],
    negativeKeywords: ['price', 'rate', 'cost', 'amt', 'amount', 'mrp', 'tax', 'disc', 'level', 'reorder'],
  },
  {
    key: 'batchNumber',
    label: 'Batch Number',
    category: 'STOCK',
    required: false,
    defaultVal: 'Auto-generated BATCH-YYYY-XXXX',
    synonyms: ['batch number', 'batch no', 'batch', 'lot no', 'lot', 'b.no', 'b. no', 'batch#', 'lot#', 'batch code', 'lot number'],
    negativeKeywords: ['invoice', 'inv', 'bill', 'challan', 'po', 'order', 'dc', 'serial', 'token', 'receipt'],
  },
  {
    key: 'expiryDate',
    label: 'Expiry Date',
    category: 'STOCK',
    required: false,
    defaultVal: '2 Years From Today',
    synonyms: ['expiry date', 'exp date', 'expiry', 'exp', 'valid till', 'exp.', 'exp dt', 'exp_date', 'expiration'],
    negativeKeywords: ['mfg date', 'manufacturing', 'inv date', 'bill date', 'entry date'],
  },
  {
    key: 'reorderLevel',
    label: 'Reorder Alert Level',
    category: 'STOCK',
    required: false,
    defaultVal: '20 Units',
    synonyms: ['reorder level', 'min stock', 'reorder', 'alert qty', 'min level', 'reorder qty', 'safety stock', 'min balance'],
    negativeKeywords: ['current', 'opening', 'closing', 'batch', 'price', 'rate'],
  },

  // 4. Pricing, Tax & Prescription
  {
    key: 'buyingPrice',
    label: 'Buying Price Before Tax (₹)',
    category: 'PRICING',
    required: false,
    defaultVal: '0.00',
    synonyms: ['buying price', 'purchase price', 'purchase rate', 'cost price', 'cost', 'buy rate', 'p rate', 'p.rate', 'pur rate', 'buying price before tax'],
    negativeKeywords: ['mrp', 'selling', 'sale', 'tax', 'gst', 'discount', 'disc', 'stock', 'qty'],
  },
  {
    key: 'buyingTax',
    label: 'Buying Tax (GST %)',
    category: 'PRICING',
    required: false,
    defaultVal: '12% GST',
    synonyms: ['buying tax', 'purchase tax', 'buy tax', 'purchase gst', 'p gst'],
    negativeKeywords: ['selling', 'sale'],
  },
  {
    key: 'mrp',
    label: 'MRP (₹)',
    category: 'PRICING',
    required: false,
    defaultVal: 'Same as Selling Price',
    synonyms: ['mrp', 'max retail price', 'maximum retail price', 'm.r.p.', 'retail price'],
    negativeKeywords: ['buying', 'purchase', 'cost', 'rate', 'selling price', 'stock', 'qty'],
  },
  {
    key: 'sellingPrice',
    label: 'Selling Price Before Tax (₹)',
    category: 'PRICING',
    required: false,
    defaultVal: 'Same as MRP',
    synonyms: ['selling price', 'sale rate', 'sell rate', 's rate', 's.rate', 'sell price', 'sale price', 'retail rate', 'selling price before tax'],
    negativeKeywords: ['buying', 'purchase', 'cost', 'mrp', 'tax', 'gst', 'stock', 'qty'],
  },
  {
    key: 'sellingTax',
    label: 'Selling Tax (GST %)',
    category: 'PRICING',
    required: false,
    defaultVal: '12% GST',
    synonyms: ['selling tax', 'sale tax', 'sell tax', 'sales gst', 'sale tax%'],
    negativeKeywords: ['buying', 'purchase'],
  },
  {
    key: 'hsnCode',
    label: 'HSN / SAC Code',
    category: 'PRICING',
    required: false,
    defaultVal: '3004 90 00',
    synonyms: ['hsn code', 'hsn', 'hsn/sac', 'sac code', 'sac', 'tariff'],
    negativeKeywords: ['item code', 'barcode', 'bar code'],
  },
  {
    key: 'prescriptionType',
    label: 'Prescription Type (OTC/Rx)',
    category: 'PRICING',
    required: false,
    defaultVal: 'OTC',
    synonyms: ['prescription type', 'prescription', 'otc/rx', 'rx type', 'drug schedule', 'schedule', 'rx'],
    negativeKeywords: ['medicine type', 'form'],
  },
];

/**
 * Intelligent 1-to-1 CSV column auto-mapping engine.
 * Solves column order variations, excludes vendor/supplier columns from medicine fields,
 * and uses confidence scoring with negative keyword disqualification.
 */
export const computeSmartCsvMapping = (headers: string[]): Record<string, string> => {
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const getTokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);

  interface Candidate {
    fieldKey: string;
    header: string;
    score: number;
  }

  const candidates: Candidate[] = [];

  headers.forEach((h) => {
    const cleanH = cleanStr(h);
    const tokensH = getTokens(h);
    if (!cleanH) return;

    CSV_FIELD_DEFINITIONS.forEach((def) => {
      // 1. Negative exclusion check: if header triggers a negative keyword, disqualify completely
      if (
        def.negativeKeywords &&
        def.negativeKeywords.some((neg) => {
          const cleanNeg = cleanStr(neg);
          return cleanH.includes(cleanNeg) || tokensH.includes(neg.toLowerCase());
        })
      ) {
        return;
      }

      let bestScore = 0;

      def.synonyms.forEach((syn) => {
        const cleanSyn = cleanStr(syn);
        const tokensSyn = getTokens(syn);

        // Tier 1: Exact match (100)
        if (cleanH === cleanSyn) {
          bestScore = Math.max(bestScore, 100);
          return;
        }

        // Tier 2: Token set match (all synonym tokens exist in header) (85)
        if (tokensSyn.length > 1 && tokensSyn.every((t) => tokensH.includes(t))) {
          bestScore = Math.max(bestScore, 85);
          return;
        }

        // Tier 3: Prefix / Suffix match with long distinctive word (75)
        if (cleanSyn.length >= 4 && (cleanH.startsWith(cleanSyn) || cleanSyn.startsWith(cleanH))) {
          bestScore = Math.max(bestScore, 75);
          return;
        }

        // Tier 4: Substring match only for long distinctive keywords (>= 5 chars) (65)
        if (cleanSyn.length >= 5 && cleanH.includes(cleanSyn)) {
          bestScore = Math.max(bestScore, 65);
          return;
        }
      });

      if (bestScore >= 50) {
        candidates.push({ fieldKey: def.key, header: h, score: bestScore });
      }
    });
  });

  // Sort candidate mappings by score descending
  candidates.sort((a, b) => b.score - a.score);

  const assignedFields = new Set<string>();
  const assignedHeaders = new Set<string>();
  const mapping: Record<string, string> = {};

  candidates.forEach((cand) => {
    if (!assignedFields.has(cand.fieldKey) && !assignedHeaders.has(cand.header)) {
      assignedFields.add(cand.fieldKey);
      assignedHeaders.add(cand.header);
      mapping[cand.fieldKey] = cand.header;
    }
  });

  return mapping;
};

export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
};

export const normalizeExpiryDate = (val?: string): string => {
  if (!val || !val.trim()) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().substring(0, 10);
  }

  const clean = val.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // MM/YYYY or MM-YYYY (e.g. 12/2028)
  const myMatch = clean.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    const year = parseInt(myMatch[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // MM/YY or MM-YY (e.g. 12/28)
  const myShortMatch = clean.match(/^(\d{1,2})[\/\-](\d{2})$/);
  if (myShortMatch) {
    const month = parseInt(myShortMatch[1], 10);
    const year = 2000 + parseInt(myShortMatch[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (e.g. 31/12/2028)
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }

  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().substring(0, 10);
};

export const normalizeMedicineType = (val?: string): string => {
  if (!val) return 'TABLET';
  const clean = val.toUpperCase().trim();
  if (clean.includes('TAB')) return 'TABLET';
  if (clean.includes('CAP')) return 'CAPSULE';
  if (clean.includes('SYR') || clean.includes('LIQ') || clean.includes('SUSP')) return 'SYRUP';
  if (clean.includes('INJ')) return 'INJECTION';
  if (clean.includes('OINT') || clean.includes('CREAM')) return 'OINTMENT';
  if (clean.includes('DROP')) return 'DROPS';
  if (clean.includes('GEL')) return 'DENTAL_GEL';
  if (clean.includes('MOUTH') || clean.includes('WASH') || clean.includes('GARG')) return 'MOUTHWASH';
  if (clean.includes('BAND') || clean.includes('SPLINT') || clean.includes('GAUZE')) return 'BANDAGE_SPLINT';
  return 'OTHER';
};

export const normalizePrescriptionType = (val?: string): string => {
  if (!val) return 'OTC';
  const clean = val.toUpperCase().trim();
  if (clean.includes('RX') || clean.includes('SCH') || clean.includes('PRESCRIP')) return 'SCHEDULE_H';
  return 'OTC';
};

interface SmartCsvMapperModalProps {
  isOpen: boolean;
  fileName: string;
  headers: string[];
  rawRows: string[][];
  mapping: Record<string, string>;
  isImporting: boolean;
  errorMsg: string;
  onMappingChange: (newMapping: Record<string, string>) => void;
  onConfirmImport: () => void;
  onClose: () => void;
}

export const SmartCsvMapperModal: React.FC<SmartCsvMapperModalProps> = ({
  isOpen,
  fileName,
  headers,
  rawRows,
  mapping,
  isImporting,
  errorMsg,
  onMappingChange,
  onConfirmImport,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  // Identify mapped vs unmapped columns
  const mappedCsvHeaders = new Set(Object.values(mapping).filter((v) => v && v.trim() !== ''));
  const extraCsvHeaders = headers.filter((h) => !mappedCsvHeaders.has(h));
  const mappedFieldsCount = Object.keys(mapping).filter((k) => mapping[k] && mapping[k] !== '').length;

  const categories = [
    { id: 'ALL', label: `All Fields (${CSV_FIELD_DEFINITIONS.length})` },
    { id: 'IDENTIFICATION', label: 'Identification (6)' },
    { id: 'STORAGE', label: 'Storage & Packaging (6)' },
    { id: 'STOCK', label: 'Stock & Batches (4)' },
    { id: 'PRICING', label: 'Pricing & Tax (7)' },
  ];

  const visibleDefinitions = CSV_FIELD_DEFINITIONS.filter(
    (def) => activeCategory === 'ALL' || def.category === activeCategory
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Smart CSV Column Auto-Mapper</h3>
              <p className="text-[11px] text-slate-400">
                File: <span className="font-mono text-indigo-300 font-bold">{fileName}</span> &bull;{' '}
                <span className="text-emerald-400 font-bold">{rawRows.length} rows</span> &bull;{' '}
                <span className="text-slate-300">{headers.length} CSV columns</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMappingChange(computeSmartCsvMapping(headers))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-400/30"
              title="Recalculate automatic 1-to-1 column mappings"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Re-Auto Map</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* Status Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Auto-matching intelligence banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0A685D] shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-[#0A685D] text-xs">
                  {mappedFieldsCount} / {CSV_FIELD_DEFINITIONS.length} Inventory Fields Mapped
                </p>
                <p className="text-[11px] text-teal-900/80 mt-0.5">
                  Missing columns in your file are fully allowed! Safe defaults (e.g. 12% GST, Tablet, 20 Min Level) will automatically apply.
                </p>
              </div>
            </div>

            {/* Extra supplier columns banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-800 text-xs">
                  {extraCsvHeaders.length} Extra Supplier Columns Safely Ignored
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {extraCsvHeaders.length > 0 ? (
                    extraCsvHeaders.slice(0, 6).map((h) => (
                      <span key={h} className="text-[9px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {h}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">All CSV columns mapped</span>
                  )}
                  {extraCsvHeaders.length > 6 && (
                    <span className="text-[9px] text-slate-400 font-bold">+{extraCsvHeaders.length - 6} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  activeCategory === c.id
                    ? 'bg-[#0A685D] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Column Mapping Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleDefinitions.map((def) => {
              const currentMapping = mapping[def.key] || '';
              return (
                <div
                  key={def.key}
                  className={`p-3 rounded-2xl border transition ${
                    currentMapping
                      ? 'bg-teal-50/20 border-teal-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label className="font-extrabold text-slate-900 text-[11px] truncate" title={def.label}>
                      {def.label} {def.required && <span className="text-rose-500">*</span>}
                    </label>
                    {currentMapping ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 shrink-0">
                        Mapped
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 bg-slate-200/60 text-slate-600 rounded shrink-0">
                        Default
                      </span>
                    )}
                  </div>

                  <select
                    value={currentMapping}
                    onChange={(e) =>
                      onMappingChange({ ...mapping, [def.key]: e.target.value })
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#0A685D] cursor-pointer"
                  >
                    <option value="">(None / Use Default: {def.defaultVal})</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        CSV Column: {header}
                      </option>
                    ))}
                  </select>

                  {!currentMapping && (
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                      <HelpCircle className="w-2.5 h-2.5 shrink-0" />
                      <span>Fallback: {def.defaultVal}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 3-Row Live Import Preview */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h4 className="font-black text-slate-900 uppercase tracking-wide text-[11px] flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Live 3-Row Import Preview (Resolved Values)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#F1F5F9] text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 pl-3">Item Name</th>
                    <th className="p-2.5">Brand</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Shelf</th>
                    <th className="p-2.5 text-right">Opening Qty</th>
                    <th className="p-2.5 text-right">Buy Rate (₹)</th>
                    <th className="p-2.5 text-right">MRP (₹)</th>
                    <th className="p-2.5 text-right">Sell Rate (₹)</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5 pr-3">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rawRows.slice(0, 3).map((row, rIdx) => {
                    const getVal = (k: string) => {
                      const h = mapping[k];
                      const idx = h ? headers.indexOf(h) : -1;
                      return idx !== -1 ? row[idx] : null;
                    };

                    const resolvedName = getVal('medicineName') || `Medicine ${rIdx + 1}`;
                    const resolvedBrand = getVal('brandName') || resolvedName;
                    const resolvedType = normalizeMedicineType(getVal('medicineType') || undefined);
                    const resolvedShelf = getVal('shelfNo') || 'Main';
                    const resolvedQty = getVal('openingStock') || '0';
                    const resolvedBuyPrice = getVal('buyingPrice') || '0';
                    const resolvedMrp = getVal('mrp') || getVal('sellingPrice') || '0';
                    const resolvedSellPrice = getVal('sellingPrice') || getVal('mrp') || '0';
                    const resolvedBatch = getVal('batchNumber') || `BATCH-2026-${rIdx + 1}`;
                    const resolvedExp = normalizeExpiryDate(getVal('expiryDate') || undefined);

                    return (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        <td className="p-2.5 pl-3 font-bold text-slate-900">{resolvedName}</td>
                        <td className="p-2.5 text-slate-500">{resolvedBrand}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">
                            {resolvedType}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono text-[10px]">{resolvedShelf}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{resolvedQty}</td>
                        <td className="p-2.5 text-right text-slate-600">₹{resolvedBuyPrice}</td>
                        <td className="p-2.5 text-right font-medium">₹{resolvedMrp}</td>
                        <td className="p-2.5 text-right font-black text-[#0A685D]">₹{resolvedSellPrice}</td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-700">{resolvedBatch}</td>
                        <td className="p-2.5 pr-3 text-slate-600 font-mono text-[10px]">{resolvedExp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmImport}
            disabled={isImporting}
            className="px-6 py-2.5 bg-[#0A685D] hover:bg-[#08544B] disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing {rawRows.length} Medicines...</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                <span>Confirm &amp; Import All {rawRows.length} Medicines</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
