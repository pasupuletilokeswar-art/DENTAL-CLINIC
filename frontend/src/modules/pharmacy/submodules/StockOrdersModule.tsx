import React, { useState } from 'react';
import {
  Truck,
  AlertCircle,
  AlertTriangle,
  Clock,
  Phone,
  Share2,
  Copy,
  CheckCircle2,
  Package,
  Check,
  AlertOctagon,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { MedicineMaster } from '../../../types';
import { ReorderItem } from '../types';
import { sendWhatsAppMessage } from '../../../services/whatsappService';

interface StockOrdersModuleProps {
  medicines: MedicineMaster[];
  onOpenReceiveModal: (med: MedicineMaster, defaultQty?: number) => void;
}

export const StockOrdersModule: React.FC<StockOrdersModuleProps> = ({
  medicines,
  onOpenReceiveModal,
}) => {
  const [reorderFilter, setReorderFilter] = useState<
    'ALL' | 'UNORDERED' | 'ORDERED' | 'EXPIRED' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON'
  >('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [orderedStatusMap, setOrderedStatusMap] = useState<Record<string, { date: string; qty: number }>>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_ordered_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [orderSupplierPhone, setOrderSupplierPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('pharmacy_supplier_phone') || '';
    } catch {
      return '';
    }
  });
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [modalSupplierPhone, setModalSupplierPhone] = useState<string>('');
  const [pendingOrderMsg, setPendingOrderMsg] = useState<string>('');
  const [dismissedAlerts, setDismissedAlerts] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pharmacy_alerts_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Dedicated single-item Order Card Modal
  const [orderCardMedicine, setOrderCardMedicine] = useState<ReorderItem | null>(null);
  const [orderCardQty, setOrderCardQty] = useState<number>(50);
  const [orderCardPhone, setOrderCardPhone] = useState<string>('');
  const [orderCardNotes, setOrderCardNotes] = useState<string>('');

  const handleOpenOrderCard = (item: ReorderItem) => {
    const qty = orderQuantities[item.id] || item.suggestedQty || 50;
    setOrderCardMedicine(item);
    setOrderCardQty(qty);
    setOrderCardPhone(orderSupplierPhone || localStorage.getItem('pharmacy_supplier_phone') || '');
    setOrderCardNotes('');
  };

  const handleSendOrderCardWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCardMedicine) return;
    const clean = orderCardPhone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      alert('Please enter a valid 10-digit supplier WhatsApp phone number.');
      return;
    }
    setOrderSupplierPhone(clean);
    try {
      localStorage.setItem('pharmacy_supplier_phone', clean);
    } catch {}

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    let msg = `🏥 *HospAI Dental Clinic - Medicine Purchase Order*\n`;
    msg += `📅 *Order Date:* ${dateStr}\n`;
    msg += `------------------------------------\n`;
    msg += `📦 *Medicine:* ${orderCardMedicine.medicineName} (${orderCardMedicine.medicineType})\n`;
    if (orderCardMedicine.brandName && orderCardMedicine.brandName !== orderCardMedicine.medicineName) {
      msg += `🏷️ *Brand:* ${orderCardMedicine.brandName}\n`;
    }
    if (orderCardMedicine.packageInfo) {
      msg += `💊 *Packaging:* ${orderCardMedicine.packageInfo}\n`;
    }
    msg += `📊 *Current Stock:* ${orderCardMedicine.currentStock} ${orderCardMedicine.sellingUnit}s\n`;
    if (orderCardMedicine.reorderReason === 'EXPIRED') {
      msg += `🛑 *Status:* EXPIRED BATCH (Sale Locked at POS - Urgent Replacement)\n`;
    } else if (orderCardMedicine.reorderReason === 'OUT_OF_STOCK') {
      msg += `⚠️ *Status:* OUT OF STOCK (0 Units Available)\n`;
    } else if (orderCardMedicine.reorderReason === 'LOW_STOCK') {
      msg += `⚠️ *Status:* LOW STOCK (Below Reorder Level of ${orderCardMedicine.reorderLevel})\n`;
    }
    msg += `✅ *Order Quantity Required:* *${orderCardQty} ${orderCardMedicine.sellingUnit}s*\n`;
    if (orderCardNotes.trim()) {
      msg += `📝 *Notes / Instructions:* ${orderCardNotes.trim()}\n`;
    }
    msg += `------------------------------------\n`;
    msg += `Please confirm availability and dispatch earliest.\nHospAI Pharmacy Desk: +91 98765 43210`;

    // Send via universal unsaved-number safe method
    sendWhatsAppMessage(clean, msg);

    // Mark as ordered in status map and local storage
    const today = new Date().toLocaleDateString('en-IN');
    const updated = {
      ...orderedStatusMap,
      [orderCardMedicine.id]: { date: today, qty: orderCardQty },
    };
    setOrderedStatusMap(updated);
    try {
      localStorage.setItem('pharmacy_ordered_status', JSON.stringify(updated));
    } catch {}

    setOrderCardMedicine(null);
  };

  const handleDismissAlerts = () => {
    setDismissedAlerts(true);
    try {
      sessionStorage.setItem('pharmacy_alerts_dismissed', 'true');
    } catch {}
  };

  const handleToggleItemOrdered = (id: string) => {
    const updated = { ...orderedStatusMap };
    if (updated[id]) {
      delete updated[id];
    } else {
      const today = new Date().toLocaleDateString('en-IN');
      const qty = orderQuantities[id] || 20;
      updated[id] = { date: today, qty };
    }
    setOrderedStatusMap(updated);
    try {
      localStorage.setItem('pharmacy_ordered_status', JSON.stringify(updated));
    } catch {}
  };

  const nowMs = Date.now();
  const reorderItems: ReorderItem[] = medicines
    .map((m) => {
      // 1. Check for expired batches with stock > 0 (Most Critical)
      const expiredBatch = m.batches?.find((b) => {
        const expTime = new Date(b.expiryDate).getTime();
        return expTime < nowMs && b.quantityInBase > 0;
      });
      const isExpired = !!expiredBatch;

      // 2. Check for out of stock
      const isOutOfStock = m.currentStock === 0;

      // 3. Check for low stock
      const isLowStock = m.currentStock > 0 && m.currentStock <= m.reorderLevel;

      // 4. Check for expiring soon (within 60 days)
      const expiringSoonBatch = m.batches?.find((b) => {
        const expTime = new Date(b.expiryDate).getTime();
        const diffDays = (expTime - nowMs) / (1000 * 3600 * 24);
        return diffDays > 0 && diffDays <= 60 && b.quantityInBase > 0;
      });
      const isExpiringSoon = !!expiringSoonBatch;

      const needsReorder = isExpired || isOutOfStock || isLowStock || isExpiringSoon;

      let reason: 'EXPIRED' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON' = 'OUT_OF_STOCK';
      if (isExpired) reason = 'EXPIRED';
      else if (isOutOfStock) reason = 'OUT_OF_STOCK';
      else if (isLowStock) reason = 'LOW_STOCK';
      else if (isExpiringSoon) reason = 'EXPIRING_SOON';

      const suggestedQty = Math.max((m.reorderLevel || 20) * 2 - m.currentStock, 20);

      return {
        ...m,
        needsReorder,
        reorderReason: reason,
        expiringBatch: expiredBatch || expiringSoonBatch,
        suggestedQty,
      };
    })
    .filter((m) => m.needsReorder);

  // Distinguish between pending un-ordered items and items where a PO was already dispatched
  const pendingUnorderedItems = reorderItems.filter((m) => !orderedStatusMap[m.id]);
  const orderedItems = reorderItems.filter((m) => !!orderedStatusMap[m.id]);

  const pendingExpCount = pendingUnorderedItems.filter((m) => m.reorderReason === 'EXPIRED').length;
  const pendingOosCount = pendingUnorderedItems.filter((m) => m.reorderReason === 'OUT_OF_STOCK').length;
  const pendingLsCount = pendingUnorderedItems.filter((m) => m.reorderReason === 'LOW_STOCK').length;
  const pendingExpSoonCount = pendingUnorderedItems.filter((m) => m.reorderReason === 'EXPIRING_SOON').length;

  const filteredReorderItems = reorderItems.filter((m) => {
    if (reorderFilter === 'ALL') return true;
    if (reorderFilter === 'UNORDERED') return !orderedStatusMap[m.id];
    if (reorderFilter === 'ORDERED') return !!orderedStatusMap[m.id];
    return m.reorderReason === reorderFilter;
  });

  const expLockedCount = reorderItems.filter((m) => m.reorderReason === 'EXPIRED').length;
  const oosCount = reorderItems.filter((m) => m.reorderReason === 'OUT_OF_STOCK').length;
  const lsCount = reorderItems.filter((m) => m.reorderReason === 'LOW_STOCK').length;
  const expSoonCount = reorderItems.filter((m) => m.reorderReason === 'EXPIRING_SOON').length;

  const handleToggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredReorderItems.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredReorderItems.map((m) => m.id));
    }
  };

  const handleUpdateOrderQty = (id: string, qty: number) => {
    setOrderQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, qty),
    }));
  };

  const buildOrderWhatsAppText = (): string => {
    const itemsToOrder = reorderItems.filter((m) => selectedOrderIds.includes(m.id));
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    let msg = `🏥 *HospAI Dental Clinic - Medicine Purchase Order*\n`;
    msg += `📅 *Order Date:* ${dateStr}\n`;
    msg += `📦 *Total Items Ordered:* ${itemsToOrder.length}\n`;
    msg += `------------------------------------\n`;
    itemsToOrder.forEach((item, index) => {
      const qty = orderQuantities[item.id] || item.suggestedQty;
      msg += `${index + 1}. *${item.medicineName}* (${item.medicineType})\n`;
      if (item.brandName && item.brandName !== item.medicineName) {
        msg += `   Brand: ${item.brandName}\n`;
      }
      msg += `   Order Qty: *${qty} ${item.sellingUnit}s*\n`;
      if (item.reorderReason === 'EXPIRED') msg += `   🛑 [EXPIRED REPLACEMENT: Sale Locked at POS]\n`;
      else if (item.reorderReason === 'OUT_OF_STOCK') msg += `   ⚠️ [URGENT: Stock 0]\n`;
      else if (item.reorderReason === 'EXPIRING_SOON') msg += `   ⏳ [Expiring Batch Replacement]\n`;
      msg += `\n`;
    });
    msg += `------------------------------------\n`;
    msg += `Please confirm order availability and expected delivery. Thank you!`;
    return msg;
  };

  const markSelectedItemsAsOrdered = () => {
    const itemsToOrder = reorderItems.filter((m) => selectedOrderIds.includes(m.id));
    const updatedStatus = { ...orderedStatusMap };
    const today = new Date().toLocaleDateString('en-IN');
    itemsToOrder.forEach((item) => {
      const qty = orderQuantities[item.id] || item.suggestedQty;
      updatedStatus[item.id] = { date: today, qty };
    });
    setOrderedStatusMap(updatedStatus);
    try {
      localStorage.setItem('pharmacy_ordered_status', JSON.stringify(updatedStatus));
    } catch {}
  };

  const handleSendOrderWhatsApp = () => {
    const itemsToOrder = reorderItems.filter((m) => selectedOrderIds.includes(m.id));
    if (itemsToOrder.length === 0) {
      alert('Please select at least one medicine using the checkboxes to generate the order.');
      return;
    }

    const msg = buildOrderWhatsAppText();
    setPendingOrderMsg(msg);

    const cleanPhone = orderSupplierPhone.replace(/[^0-9]/g, '');
    if (cleanPhone && cleanPhone.length >= 10) {
      markSelectedItemsAsOrdered();
      sendWhatsAppMessage(cleanPhone, msg);
    } else {
      setModalSupplierPhone(orderSupplierPhone);
      setShowSupplierModal(true);
    }
  };

  const handleConfirmModalSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = modalSupplierPhone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      alert('Please enter a valid 10-digit WhatsApp phone number.');
      return;
    }
    setOrderSupplierPhone(clean);
    try {
      localStorage.setItem('pharmacy_supplier_phone', clean);
    } catch {}

    markSelectedItemsAsOrdered();
    setShowSupplierModal(false);

    const msg = pendingOrderMsg || buildOrderWhatsAppText();
    sendWhatsAppMessage(clean, msg);
  };

  const handleCopyOrderList = () => {
    const itemsToOrder = reorderItems.filter((m) => selectedOrderIds.includes(m.id));
    if (itemsToOrder.length === 0) {
      alert('Please select at least one medicine using the checkboxes.');
      return;
    }
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    let msg = `🏥 HospAI Dental Clinic - Medicine Purchase Order\nDate: ${dateStr}\n\n`;
    itemsToOrder.forEach((item, index) => {
      const qty = orderQuantities[item.id] || item.suggestedQty;
      msg += `${index + 1}. ${item.medicineName} (${item.medicineType}) - Qty: ${qty} ${item.sellingUnit}s\n`;
    });
    navigator.clipboard.writeText(msg);
    alert('Order list copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. DYNAMIC ALERT NOTIFICATION BANNER                            */}
      {/* ============================================================== */}
      {!dismissedAlerts && pendingExpCount > 0 ? (
        <div className="bg-gradient-to-r from-red-700 via-rose-700 to-rose-800 text-white p-4 rounded-2xl shadow-md border border-red-500/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  Critical Safety Alert: {pendingExpCount} Expired Medicine(s) Require Reorder
                </span>
                <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sale Locked at POS
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Expired batches are strictly blocked from dispensing. Please place supplier orders for replacements.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReorderFilter('EXPIRED')}
              className="px-4 py-2 bg-white text-red-700 hover:bg-rose-50 rounded-xl font-black text-xs transition cursor-pointer shadow-xs shrink-0"
            >
              Review Expired ({pendingExpCount})
            </button>
            <button
              type="button"
              onClick={handleDismissAlerts}
              className="px-3 py-2 bg-black/20 hover:bg-black/30 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Acknowledge and dismiss this notification"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Checked ✕</span>
            </button>
          </div>
        </div>
      ) : !dismissedAlerts && (pendingOosCount > 0 || pendingLsCount > 0) ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs font-bold">
              Stock Alert:{' '}
              {pendingOosCount > 0 && (
                <span className="font-black text-rose-700">{pendingOosCount} item(s) Out of Stock </span>
              )}
              {pendingLsCount > 0 && (
                <span className="font-black text-amber-800">{pendingLsCount} item(s) Low on Stock.</span>
              )}{' '}
              Prompt supplier purchase orders are recommended.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReorderFilter('OUT_OF_STOCK')}
              className="text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer"
            >
              Filter Out of Stock
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={() => setReorderFilter('LOW_STOCK')}
              className="text-[11px] font-extrabold text-amber-700 hover:underline cursor-pointer"
            >
              Filter Low Stock
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={handleDismissAlerts}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-lg cursor-pointer"
            >
              Mark Checked ✕
            </button>
          </div>
        </div>
      ) : orderedItems.length > 0 && pendingUnorderedItems.length === 0 ? (
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-3.5 px-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <div>
              <span className="font-extrabold text-xs">
                All Flagged Items Have Purchase Orders Dispatched ({orderedItems.length} items ordered)
              </span>
              <p className="text-[11px] text-teal-100 mt-0.5">
                Orders have been dispatched. Click &quot;Mark as Received&quot; on any item when deliveries arrive to inward stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReorderFilter('ORDERED')}
            className="px-3.5 py-1.5 bg-white text-teal-800 hover:bg-teal-50 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs shrink-0"
          >
            View Ordered Items ({orderedItems.length})
          </button>
        </div>
      ) : null}

      {/* ============================================================== */}
      {/* 2. REORDER WORKFLOW PIPELINE                                   */}
      {/* ============================================================== */}
      <div className="bg-white p-3.5 px-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0A685D]" />
            <span>Automated Stock Reorder &amp; Procurement Flow</span>
          </span>
          <span className="text-[#0A685D] font-bold">Step 1 to 4 Pipeline</span>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
          {/* Step 1 */}
          <div
            onClick={() => setReorderFilter('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedOrderIds.length === 0
                ? 'bg-[#0A685D] text-white shadow-2xs border-[#0A685D]'
                : 'bg-teal-50/80 text-[#0A685D] border-teal-200 hover:bg-teal-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
            <span>Audit Flagged Items ({reorderItems.length})</span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200 min-w-[15px]" />

          {/* Step 2 */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition shrink-0 ${
              selectedOrderIds.length > 0
                ? 'bg-[#0A685D] text-white shadow-2xs border-[#0A685D]'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">2</span>
            <span>Select &amp; Adjust Quantities ({selectedOrderIds.length} chosen)</span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200 min-w-[15px]" />

          {/* Step 3 */}
          <div
            onClick={handleSendOrderWhatsApp}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedOrderIds.length > 0
                ? 'bg-[#25D366] text-white shadow-2xs border-[#25D366] hover:bg-[#1EBE5D]'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</span>
            <span>Dispatch PO (WhatsApp / Copy)</span>
          </div>

          <div className="flex-1 h-0.5 bg-slate-200 min-w-[15px]" />

          {/* Step 4 */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold shrink-0">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">4</span>
            <span>Inward Restock (Mark as Received)</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. SUMMARY KPI CARDS (4 PRIMARY CARDS)                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Expired Items KPI Card */}
        <div
          onClick={() => setReorderFilter('EXPIRED')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition ${
            reorderFilter === 'EXPIRED'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-400'
              : expLockedCount > 0
              ? 'bg-red-50/60 border-red-200 hover:border-red-400'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div>
            <p className="text-[11px] font-black uppercase text-red-600 tracking-wider flex items-center gap-1.5">
              <span>Expired (Sale Locked)</span>
              {expLockedCount > 0 && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
            </p>
            <p className="text-2xl font-black text-red-700 mt-1">{expLockedCount}</p>
            <p className="text-[10px] text-red-500 font-medium mt-0.5">Dispense strictly blocked</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Out of Stock KPI Card */}
        <div
          onClick={() => setReorderFilter('OUT_OF_STOCK')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition ${
            reorderFilter === 'OUT_OF_STOCK'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400'
              : 'bg-white border-rose-100 hover:border-rose-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-black uppercase text-rose-600 tracking-wider">Out of Stock (0 Units)</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{oosCount}</p>
            <p className="text-[10px] text-rose-400 font-medium mt-0.5">Empty shelf inventory</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock KPI Card */}
        <div
          onClick={() => setReorderFilter('LOW_STOCK')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition ${
            reorderFilter === 'LOW_STOCK'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400'
              : 'bg-white border-amber-100 hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-black uppercase text-amber-600 tracking-wider">Low Stock (&le; Alert Level)</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{lsCount}</p>
            <p className="text-[10px] text-amber-500 font-medium mt-0.5">Below safe clinic threshold</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Expiring Soon KPI Card */}
        <div
          onClick={() => setReorderFilter('EXPIRING_SOON')}
          className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between cursor-pointer transition ${
            reorderFilter === 'EXPIRING_SOON'
              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400'
              : 'bg-white border-orange-100 hover:border-orange-300'
          }`}
        >
          <div>
            <p className="text-[11px] font-black uppercase text-orange-600 tracking-wider">Expiring Soon (&lt; 60d)</p>
            <p className="text-2xl font-black text-orange-700 mt-1">{expSoonCount}</p>
            <p className="text-[10px] text-orange-400 font-medium mt-0.5">FEFO priority batches</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN TABLE CARD                                              */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setReorderFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'ALL'
                  ? 'bg-[#0A685D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Flagged ({reorderItems.length})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('UNORDERED')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'UNORDERED'
                  ? 'bg-amber-600 text-white shadow-2xs font-black'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⏳ Needs Order ({pendingUnorderedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('ORDERED')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'ORDERED'
                  ? 'bg-emerald-700 text-white shadow-2xs font-black'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              ✓ Ordered ({orderedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'EXPIRED'
                  ? 'bg-red-700 text-white shadow-2xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              🛑 Expired ({expLockedCount})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              🔴 Out of Stock ({oosCount})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              🟡 Low Stock ({lsCount})
            </button>
            <button
              type="button"
              onClick={() => setReorderFilter('EXPIRING_SOON')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reorderFilter === 'EXPIRING_SOON'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
              }`}
            >
              🟠 Expiring Soon ({expSoonCount})
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Supplier WhatsApp Phone..."
                value={orderSupplierPhone}
                onChange={(e) => setOrderSupplierPhone(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-48 focus:ring-1 focus:ring-[#0A685D]"
              />
            </div>

            <button
              type="button"
              onClick={handleSendOrderWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Order ({selectedOrderIds.length})</span>
            </button>

            <button
              type="button"
              onClick={handleCopyOrderList}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
              title="Copy Order List to Clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Count & Quick Actions */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllOrders}
              className="text-xs font-bold text-[#0A685D] hover:underline cursor-pointer"
            >
              {selectedOrderIds.length === filteredReorderItems.length
                ? 'Deselect All'
                : `Select All (${filteredReorderItems.length})`}
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">
              {selectedOrderIds.length} item(s) selected for purchase order
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredReorderItems.length} of {reorderItems.length} items needing reorder
          </span>
        </div>

        {/* Table of Reorder Items */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F1F5F9] text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="p-3 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredReorderItems.length > 0 &&
                      selectedOrderIds.length === filteredReorderItems.length
                    }
                    onChange={handleSelectAllOrders}
                    className="rounded text-[#0A685D] focus:ring-[#0A685D] cursor-pointer"
                  />
                </th>
                <th className="p-3">Medicine &amp; Details</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Reason / Alert</th>
                <th className="p-3">Suggested Order Qty</th>
                <th className="p-3">Order Status</th>
                <th className="p-3 text-right pr-4">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReorderItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No items match this filter!</p>
                    <p className="text-[11px]">All clinic stocks are currently within safe operating thresholds.</p>
                  </td>
                </tr>
              ) : (
                filteredReorderItems.map((med) => {
                  const isSelected = selectedOrderIds.includes(med.id);
                  const currentQty = orderQuantities[med.id] || med.suggestedQty;
                  const orderedStatus = orderedStatusMap[med.id];

                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSelected ? 'bg-teal-50/30' : ''
                      }`}
                    >
                      <td className="p-3 pl-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleOrderSelection(med.id)}
                          className="rounded text-[#0A685D] focus:ring-[#0A685D] cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                        <div className="font-extrabold text-slate-900 text-xs">{med.medicineName}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          {med.brandName && <span>Brand: {med.brandName}</span>}
                          <span>&bull;</span>
                          <span className="font-mono text-teal-800">{med.itemCode}</span>
                          {med.packageInfo && (
                            <>
                              <span>&bull;</span>
                              <span>{med.packageInfo}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        {med.reorderReason === 'EXPIRED' ? (
                          <span className="px-2.5 py-1 bg-red-100 border border-red-300 text-red-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            EXPIRED (LOCKED)
                          </span>
                        ) : med.currentStock === 0 ? (
                          <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            0 UNITS (OOS)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                            {med.currentStock} {med.sellingUnit}s left
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {med.reorderReason === 'EXPIRED' && med.expiringBatch && (
                          <div className="text-red-700 font-bold text-[11px]">
                            Expired {Math.abs(Math.round((new Date(med.expiringBatch.expiryDate).getTime() - nowMs) / (1000 * 3600 * 24)))} days ago
                            <div className="text-[10px] text-red-500 font-normal">
                              Batch: {med.expiringBatch.batchNumber} (Exp: {new Date(med.expiringBatch.expiryDate).toLocaleDateString()})
                            </div>
                          </div>
                        )}
                        {med.reorderReason === 'OUT_OF_STOCK' && (
                          <span className="text-rose-600 font-bold text-[11px]">
                            Out of Stock
                          </span>
                        )}
                        {med.reorderReason === 'LOW_STOCK' && (
                          <span className="text-amber-700 font-medium text-[11px]">
                            Min Level: {med.reorderLevel} units
                          </span>
                        )}
                        {med.reorderReason === 'EXPIRING_SOON' && med.expiringBatch && (
                          <span className="text-orange-700 font-medium text-[11px]">
                            Batch {med.expiringBatch.batchNumber} exp {new Date(med.expiringBatch.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderQty(med.id, currentQty - 10)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={currentQty}
                            onChange={(e) =>
                              handleUpdateOrderQty(med.id, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderQty(med.id, currentQty + 10)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-slate-400 text-[10px] ml-1">{med.sellingUnit}s</span>
                        </div>
                      </td>

                      <td className="p-3">
                        {orderedStatus ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-xl text-[10px] font-bold">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Ordered {orderedStatus.qty}u ({orderedStatus.date})</span>
                            <button
                              type="button"
                              onClick={() => handleOpenOrderCard(med)}
                              className="text-emerald-700 hover:text-emerald-900 font-extrabold ml-1 cursor-pointer underline"
                              title="Re-open Order Card"
                            >
                              Reorder
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemOrdered(med.id)}
                              className="text-slate-400 hover:text-rose-600 text-[9px] underline ml-1 cursor-pointer"
                              title="Clear Ordered Status"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenOrderCard(med)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition inline-flex items-center gap-1 shadow-2xs"
                            title="Open WhatsApp Order Card"
                          >
                            <span className="text-emerald-600 font-bold">💬</span>
                            <span>Order on WhatsApp</span>
                          </button>
                        )}
                      </td>

                      <td className="p-3 text-right pr-4">
                        <button
                          type="button"
                          onClick={() => onOpenReceiveModal(med, currentQty)}
                          className="px-3 py-1.5 bg-[#0A685D] hover:bg-[#085249] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                        >
                          <Package className="w-3 h-3" />
                          <span>Mark as Received</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier WhatsApp Phone Input Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Send Order to Supplier WhatsApp</h3>
                  <p className="text-[11px] text-slate-500">Dispatch Purchase Order directly to distributor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmModalSendWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Supplier WhatsApp Number (10 Digits) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    value={modalSupplierPhone}
                    onChange={(e) => setModalSupplierPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saved automatically for future medicine reorders so you don't have to enter it again.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
                <div className="font-bold">Items included in this PO:</div>
                <div className="text-[11px] text-emerald-800">
                  {selectedOrderIds.length} medicine(s) selected with confirmed order quantities.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                >
                  <span>Open & Send on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Interactive Single Medicine Order Card Modal */}
      {orderCardMedicine && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-bold">Distributor Purchase Order Card</h3>
                  <p className="text-[11px] text-slate-400">Dispatch medicine order directly to supplier WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderCardMedicine(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendOrderCardWhatsApp} className="p-6 space-y-4 text-xs">
              {/* Medicine Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-black text-slate-400">Medicine to Reorder</div>
                    <div className="text-base font-black text-slate-900">{orderCardMedicine.medicineName}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                      <span>Type: {orderCardMedicine.medicineType}</span>
                      <span>&bull;</span>
                      <span>Brand: {orderCardMedicine.brandName || 'Generic'}</span>
                      <span>&bull;</span>
                      <span>Pkg: {orderCardMedicine.packageInfo || 'Standard'}</span>
                    </div>
                  </div>
                  {orderCardMedicine.reorderReason === 'EXPIRED' ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[10px] font-black uppercase">
                      Expired (Sale Locked)
                    </span>
                  ) : orderCardMedicine.reorderReason === 'OUT_OF_STOCK' ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black uppercase">
                      Out of Stock (0)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-[10px] font-black uppercase">
                      Low Stock
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Current In-Stock:</span>
                  <span className="font-black text-slate-800">
                    {orderCardMedicine.currentStock} {orderCardMedicine.sellingUnit}s (Reorder Level: {orderCardMedicine.reorderLevel})
                  </span>
                </div>
              </div>

              {/* Order Quantity & Phone Number Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Order Quantity ({orderCardMedicine.sellingUnit}s) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOrderCardQty((prev) => Math.max(1, prev - 10))}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={orderCardQty}
                      onChange={(e) => setOrderCardQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full text-center py-1.5 bg-teal-50 border border-teal-300 rounded-xl font-black text-sm text-[#0A685D] focus:ring-2 focus:ring-[#0A685D]"
                    />
                    <button
                      type="button"
                      onClick={() => setOrderCardQty((prev) => prev + 10)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Distributor WhatsApp Phone *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={orderCardPhone}
                      onChange={(e) => setOrderCardPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="block text-[9px] text-slate-400 mt-1">Works for unsaved distributor numbers</span>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Special Notes / Delivery Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={orderCardNotes}
                  onChange={(e) => setOrderCardNotes(e.target.value)}
                  placeholder="e.g. Urgent morning dispatch required, supply latest batch"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                  <span>💬 WhatsApp Purchase Order Preview:</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-950 bg-white/80 p-2.5 rounded-xl border border-emerald-200/60 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto">
                  🏥 *HospAI Dental Clinic - Purchase Order*
                  {'\n'}📦 Medicine: {orderCardMedicine.medicineName} ({orderCardMedicine.medicineType})
                  {'\n'}✅ Required Qty: {orderCardQty} {orderCardMedicine.sellingUnit}s
                  {'\n'}📊 Stock Status: {orderCardMedicine.currentStock <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                  {orderCardNotes.trim() ? `\n📝 Note: ${orderCardNotes.trim()}` : ''}
                  {'\n'}Please confirm dispatch.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOrderCardMedicine(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold cursor-pointer transition shadow-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Order on WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
