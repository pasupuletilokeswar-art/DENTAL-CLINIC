import { MedicineMaster, Patient, Doctor } from '../../types';

export interface InvoiceItem {
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

export interface ReorderItem extends MedicineMaster {
  needsReorder: boolean;
  reorderReason: 'EXPIRED' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON';
  expiringBatch?: any;
  suggestedQty: number;
}

export type PharmacySubTab = 'billing' | 'inventory' | 'orders' | 'stock' | 'history';

