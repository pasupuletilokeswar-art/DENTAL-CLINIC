import React, { useState } from 'react';
import { History, Printer, Share2, Search } from 'lucide-react';
import { sendWhatsAppMessage, createPharmacySaleMessage } from '../../../services/whatsappService';

interface InvoicesArchiveModuleProps {
  salesHistory: any[];
  onOpenReceipt: (sale: any) => void;
}

export const InvoicesArchiveModule: React.FC<InvoicesArchiveModuleProps> = ({
  salesHistory,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSales = salesHistory.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const invMatch = s.invoiceNumber?.toLowerCase().includes(q);
    const patientMatch = s.patient?.name?.toLowerCase().includes(q);
    const phoneMatch = s.patient?.mobile?.includes(q);
    const itemMatch = s.items?.some((it: any) =>
      it.medicine?.medicineName?.toLowerCase().includes(q)
    );
    return invMatch || patientMatch || phoneMatch || itemMatch;
  });

  const handleShareWhatsApp = (sale: any) => {
    const msg = createPharmacySaleMessage(sale);
    const mobile = sale.patient?.mobile;
    if (!mobile || mobile.length < 10) {
      const enteredPhone = prompt('Enter 10-digit WhatsApp phone number to send receipt:', '');
      if (enteredPhone && enteredPhone.trim()) {
        const p = enteredPhone.trim().replace(/[^0-9]/g, '');
        const ip = p.length === 10 ? `91${p}` : p;
        sendWhatsAppMessage(ip, msg);
      }
      return;
    }

    sendWhatsAppMessage(mobile, msg);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-[#0A685D]" />
            Previous Invoices Archive
          </h3>
          <p className="text-xs text-slate-500">
            Permanently saved sales records with reprint and WhatsApp sharing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-64"
            />
          </div>
          <span className="text-xs font-mono font-bold bg-teal-50 text-[#0A685D] px-3 py-1 rounded-xl border border-teal-200">
            Total Sales: {salesHistory.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F1F5F9] text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
            <tr>
              <th className="p-3 pl-4">Invoice #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Dispensed Items</th>
              <th className="p-3 text-right">Grand Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                <td className="p-3 pl-4 font-mono font-bold text-slate-900">{sale.invoiceNumber}</td>
                <td className="p-3 text-slate-500">{new Date(sale.saleDate).toLocaleDateString()}</td>
                <td className="p-3 font-bold text-slate-800">
                  {sale.patient?.name || sale.customerName || 'Walk-in Customer'}
                  {(sale.patient?.mobile || sale.customerPhone) && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sale.patient?.mobile || sale.customerPhone}
                    </div>
                  )}
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
                <td className="p-3 text-right font-black text-slate-900 text-sm">₹{sale.grandTotal}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    PAID ({sale.paymentMode})
                  </span>
                </td>
                <td className="p-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(sale)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                      title="Print Thermal Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(sale)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                      title="Share Receipt via WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
