import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { MedicineMaster, Patient } from '../../types';
import { getSocket } from '../../services/socket';
import { PharmacySubTab, ReorderItem } from './types';

// Sub-Modules
import { BillingDeskModule } from './submodules/BillingDeskModule';
import { AddInventoryModule } from './submodules/AddInventoryModule';
import { StockOrdersModule } from './submodules/StockOrdersModule';
import { StockBatchesModule } from './submodules/StockBatchesModule';
import { InvoicesArchiveModule } from './submodules/InvoicesArchiveModule';

// Modals
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { QuickAddPatientModal } from './components/QuickAddPatientModal';
import { ReceiveShipmentModal } from './components/ReceiveShipmentModal';
import {
  SmartCsvMapperModal,
  CSV_FIELD_DEFINITIONS,
  computeSmartCsvMapping,
  parseCsvLine,
  normalizeExpiryDate,
  normalizeMedicineType,
  normalizePrescriptionType,
} from './components/SmartCsvMapperModal';

interface PharmacyModuleProps {
  subTab?: string;
  onSubTabChange?: (tab: string) => void;
  selectedPatientNav?: Patient | null;
  onClearPatientNav?: () => void;
}

export const PharmacyModule: React.FC<PharmacyModuleProps> = ({
  subTab,
  onSubTabChange,
  selectedPatientNav,
  onClearPatientNav,
}) => {
  // Map incoming subTab (e.g. 'pharmacy-billing' or 'pharmacy') to PharmacySubTab
  const parseIncomingTab = (t?: string): PharmacySubTab => {
    if (!t) return 'billing';
    if (t.includes('inventory')) return 'inventory';
    if (t.includes('orders') || t.includes('reorder')) return 'orders';
    if (t.includes('stock')) return 'stock';
    if (t.includes('history') || t.includes('archive')) return 'history';
    return 'billing';
  };

  const [activeTab, setActiveTab] = useState<PharmacySubTab>(() => parseIncomingTab(subTab));

  useEffect(() => {
    if (subTab) {
      setActiveTab(parseIncomingTab(subTab));
    }
  }, [subTab]);

  const handleTabChange = (tab: PharmacySubTab) => {
    setActiveTab(tab);
    if (onSubTabChange) {
      onSubTabChange(`pharmacy-${tab}`);
    }
  };

  // Master Data
  const [medicines, setMedicines] = useState<MedicineMaster[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);

  // Modals state
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);

  // Receive Shipment modal state
  const [receivingMed, setReceivingMed] = useState<MedicineMaster | null>(null);
  const [receiveDefaultQty, setReceiveDefaultQty] = useState<number | undefined>(undefined);

  // Smart CSV modal state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvSuccessMsg, setCsvSuccessMsg] = useState('');
  const [csvErrorMsg, setCsvErrorMsg] = useState('');

  // Fetch Master Data
  const fetchData = async () => {
    try {
      const [medRes, docRes, salesRes] = await Promise.all([
        api.get('/pharmacy/medicines'),
        api.get('/reports/doctors'),
        api.get('/pharmacy/sales'),
      ]);
      if (medRes.data.success) setMedicines(medRes.data.medicines);
      if (salesRes.data.success) setSalesHistory(salesRes.data.sales);
      if (docRes.data.success) setDoctors(docRes.data.doctors);
    } catch (err) {
      console.error('Error fetching pharmacy data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      socket.on('pharmacy:inventory-updated', () => fetchData());
      socket.on('pharmacy:sale-created', () => fetchData());
    }

    return () => {
      if (socket) {
        socket.off('pharmacy:inventory-updated');
        socket.off('pharmacy:sale-created');
      }
    };
  }, []);

  // Compute reorder items count for badge
  const nowMs = Date.now();
  const reorderCount = medicines.filter((m) => {
    const isOutOfStock = m.currentStock === 0;
    const isLowStock = m.currentStock > 0 && m.currentStock <= m.reorderLevel;
    const hasExpiringBatch = m.batches?.some((b) => {
      const expTime = new Date(b.expiryDate).getTime();
      const diffDays = (expTime - nowMs) / (1000 * 3600 * 24);
      return diffDays > 0 && diffDays <= 60;
    });
    return isOutOfStock || isLowStock || hasExpiringBatch;
  }).length;

  // Handle CSV file selected
  const handleCsvFileSelected = (file: File) => {
    setCsvFileName(file.name);
    setCsvSuccessMsg('');
    setCsvErrorMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (rawLines.length <= 1) {
        setCsvErrorMsg('The selected CSV file is empty or only has 1 line.');
        return;
      }

      const headers = parseCsvLine(rawLines[0]);
      setCsvHeaders(headers);

      const rows: string[][] = [];
      for (let i = 1; i < rawLines.length; i++) {
        const parsedRow = parseCsvLine(rawLines[i]);
        if (parsedRow.some((cell) => cell.length > 0)) {
          rows.push(parsedRow);
        }
      }
      setCsvRawRows(rows);

      // Auto-match headers using intelligent 1-to-1 scoring engine
      const initialMapping = computeSmartCsvMapping(headers);
      setCsvMapping(initialMapping);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
  };

  // Confirm Smart Import
  const handleConfirmSmartImport = async () => {
    if (csvRawRows.length === 0) return;
    setImportingCsv(true);
    setCsvErrorMsg('');

    try {
      const headerIndexMap: Record<string, number> = {};
      csvHeaders.forEach((h, idx) => {
        headerIndexMap[h] = idx;
      });

      const items = csvRawRows.map((row, idx) => {
        const getVal = (fieldKey: string) => {
          const header = csvMapping[fieldKey];
          if (!header || headerIndexMap[header] === undefined) return undefined;
          return row[headerIndexMap[header]]?.trim();
        };

        const rawName = getVal('medicineName') || `Medicine-${idx + 1}`;
        const rawBrand = getVal('brandName') || rawName;
        const rawItemCode = getVal('itemCode');
        const rawMfg = getVal('manufacturer');
        const rawStrength = getVal('strength');
        const rawBarcode = getVal('barcode');
        const rawShelf = getVal('shelfNo');
        const rawPkg = getVal('packageInfo');
        const rawHsn = getVal('hsnCode') || '3004 90 00';
        const rawBuyingUnit = getVal('buyingUnit') || 'STRIP';
        const rawSellingUnit = getVal('sellingUnit') || 'TABLET';
        const rawRatio = parseInt(getVal('unitRatio') || '10', 10) || 10;
        const rawReorder = parseInt(getVal('reorderLevel') || '20', 10) || 20;
        const rawBuyingPrice = parseFloat(getVal('buyingPrice') || '0') || 0;
        const rawMrp = parseFloat(getVal('mrp') || '0') || parseFloat(getVal('sellingPrice') || '0') || 0;
        const rawSellingPrice = parseFloat(getVal('sellingPrice') || '0') || rawMrp || 0;
        const rawOpeningStock = parseInt(getVal('openingStock') || '0', 10) || 0;
        const rawBatch = getVal('batchNumber') || (rawOpeningStock > 0 ? `BATCH-${Date.now().toString().slice(-4)}-${idx + 1}` : undefined);
        const rawExp = normalizeExpiryDate(getVal('expiryDate'));
        const matchedType = normalizeMedicineType(getVal('medicineType'));
        const matchedPrescription = normalizePrescriptionType(getVal('prescriptionType'));

        let packageInfo = rawPkg || '10X10';
        if (rawShelf && !packageInfo.includes('Shelf:')) {
          packageInfo = `${packageInfo} | Shelf: ${rawShelf}`;
        }

        return {
          medicineName: rawName,
          brandName: rawBrand,
          itemCode: rawItemCode || undefined,
          manufacturer: rawMfg || undefined,
          strength: rawStrength || undefined,
          barcode: rawBarcode || undefined,
          shelfNo: rawShelf || undefined,
          hsnCode: rawHsn,
          packageInfo,
          medicineType: matchedType,
          buyingUnit: rawBuyingUnit,
          sellingUnit: rawSellingUnit,
          unitRatio: rawRatio,
          reorderLevel: rawReorder,
          buyingPrice: rawBuyingPrice,
          mrp: rawMrp,
          sellingPrice: rawSellingPrice,
          openingStock: rawOpeningStock,
          batchNumber: rawBatch,
          expiryDate: rawExp,
          prescriptionType: matchedPrescription,
        };
      });

      const res = await api.post('/pharmacy/medicines/bulk-import', { items });
      if (res.data.success) {
        setCsvSuccessMsg(`Successfully imported & processed ${items.length} medicines (${res.data.importedCount} added/updated)!`);
        setShowCsvModal(false);
        fetchData();
        setActiveTab('stock');
      }
    } catch (err: any) {
      setCsvErrorMsg(err.response?.data?.message || 'Failed to process bulk import');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Item Name,Brand,Item Code,Manufacturer,Strength,Barcode,Shelf No,Package Info,HSN Code,Medicine Type,Buying Unit,Selling Unit,Unit Ratio,Reorder Level,Buying Price,Buying Tax,MRP,Selling Price,Selling Tax,Opening Stock,Batch Number,Expiry Date,Prescription Type\n' +
      'JOINTRICH TABLET,Jointrich,JOIN633,Apex Labs,500mg,705067,25-B,10X10,3004 90 00,TABLET,STRIP,TABLET,10,20,120,12% GST,180,160,12% GST,100,BATCH-2026-A,2028-12-31,OTC\n' +
      'DOLO 650 TABLET,Dolo,DOLO650,Micro Labs,650mg,8901234567,12-A,15X10,3004 90 00,TABLET,STRIP,TABLET,15,30,25,12% GST,35,32,12% GST,150,DOLO-4421,2027-06-30,OTC\n' +
      'HEXIDINE MOUTHWASH,Hexidine,HEX100,ICPA Health,0.2%,8902345678,04-C,1X100ML,3004 90 00,MOUTHWASH,BOTTLE,BOTTLE,1,10,95,12% GST,130,120,12% GST,50,HEX-8831,2028-03-31,OTC\n' +
      'AUGMENTIN 625 DUO,Augmentin,AUG625,GSK,625mg,8903456789,01-A,10X1,3004 90 00,TABLET,STRIP,TABLET,10,25,145,12% GST,205,190,12% GST,80,AUG-5520,2027-10-31,SCHEDULE_H\n' +
      'DOLOGEL-CT GEL,Dologel,DOLO99,Dr Reddys,Choline Salicylate,8904567890,08-B,1X10G,3004 90 00,DENTAL_GEL,TUBE,TUBE,1,15,68,12% GST,95,88,12% GST,60,DG-2026,2028-06-30,OTC';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pharmacy_inventory_master_template.csv';
    link.click();
  };

  return (
    <div className="space-y-4 max-w-[1680px] mx-auto pb-10">
      {/* ============================================================== */}
      {/* ACTIVE SUB-MODULE RENDERING                                     */}
      {/* ============================================================== */}
      {activeTab === 'billing' && (
        <BillingDeskModule
          medicines={medicines}
          doctors={doctors}
          onRefresh={fetchData}
          onOpenReceipt={(sale) => setActiveReceipt(sale)}
          onOpenAddPatient={() => setShowAddPatientModal(true)}
          selectedPatientFromParent={selectedPatientNav || createdPatient}
          onClearPatientFromParent={() => {
            setCreatedPatient(null);
            if (onClearPatientNav) onClearPatientNav();
          }}
        />
      )}

      {activeTab === 'inventory' && (
        <AddInventoryModule
          onSuccess={fetchData}
          onFileSelect={handleCsvFileSelected}
          onDownloadSampleCsv={handleDownloadSampleCsv}
          csvSuccessMsg={csvSuccessMsg}
          csvErrorMsg={csvErrorMsg}
        />
      )}

      {activeTab === 'orders' && (
        <StockOrdersModule
          medicines={medicines}
          onOpenReceiveModal={(med, defaultQty) => {
            setReceivingMed(med);
            setReceiveDefaultQty(defaultQty);
          }}
        />
      )}

      {activeTab === 'stock' && <StockBatchesModule medicines={medicines} />}

      {activeTab === 'history' && (
        <InvoicesArchiveModule
          salesHistory={salesHistory}
          onOpenReceipt={(sale) => setActiveReceipt(sale)}
        />
      )}

      {/* ============================================================== */}
      {/* 3. REUSABLE MODALS                                             */}
      {/* ============================================================== */}
      <PrintReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />

      <QuickAddPatientModal
        isOpen={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        onPatientCreated={(p) => setCreatedPatient(p)}
      />

      <ReceiveShipmentModal
        medicine={receivingMed}
        defaultQty={receiveDefaultQty}
        onClose={() => setReceivingMed(null)}
        onSuccess={() => fetchData()}
      />

      <SmartCsvMapperModal
        isOpen={showCsvModal}
        fileName={csvFileName}
        headers={csvHeaders}
        rawRows={csvRawRows}
        mapping={csvMapping}
        isImporting={importingCsv}
        errorMsg={csvErrorMsg}
        onMappingChange={(m) => setCsvMapping(m)}
        onConfirmImport={handleConfirmSmartImport}
        onClose={() => setShowCsvModal(false)}
      />
    </div>
  );
};
