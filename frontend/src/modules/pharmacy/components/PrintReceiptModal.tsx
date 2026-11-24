import React from 'react';
import { Printer, Download, X } from 'lucide-react';
import { generatePharmacyReceiptPDF } from '../../../services/pdfService';

interface PrintReceiptModalProps {
  receipt: any;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  let customerName = receipt.patient?.name || receipt.customerName;
  let customerPhone = receipt.patient?.mobile || receipt.customerPhone;
  let customerAge = receipt.patient?.age || receipt.customerAge;

  if (!customerName && receipt.payments?.[0]?.notes) {
    try {
      const parsed = JSON.parse(receipt.payments[0].notes);
      if (parsed.customerName) {
        customerName = parsed.customerName;
        customerPhone = parsed.customerPhone;
        customerAge = parsed.customerAge;
      }
    } catch {}
  }
  if (!customerName) customerName = 'Walk-in Customer';

  const enrichedReceipt = {
    ...receipt,
    customerName,
    customerPhone,
    customerAge,
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <span className="font-bold text-xs flex items-center gap-2">
            <Printer className="w-4 h-4 text-teal-400" />
            Pharmacy Receipt &bull; {receipt.invoiceNumber}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-xs text-slate-800 space-y-4 printable-receipt">
          <div className="text-center border-b border-slate-200 pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase">
              SUMMIT DENTAL AND ORTHOPEDIC CLINIC
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Multi-Speciality Care &amp; In-House Pharmacy</p>
            <p className="text-[9px] text-slate-400 mt-0.5">GSTIN: 29AABCS1429B1Z | Drug Lic: KA-B2-124987</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-slate-100">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Customer Details:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-extrabold text-slate-900 text-xs">
                  {customerName}
                </span>
                {receipt.patient?.patientCode ? (
                  <span className="text-[9px] font-mono font-bold bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded border border-teal-200">
                    {receipt.patient.patientCode}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                    Walk-out
                  </span>
                )}
              </div>
              {customerPhone && (
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                  Phone: <strong>{customerPhone}</strong>
                </div>
              )}
              {customerAge && (
                <div className="text-[10px] text-slate-400">
                  Age: {customerAge} yrs
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Invoice Details:</span>
              <span className="font-mono font-bold text-slate-900">{receipt.invoiceNumber}</span>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {new Date(receipt.saleDate).toLocaleDateString()} {new Date(receipt.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-teal-700 font-bold uppercase mt-0.5">
                Mode: {receipt.payments?.[0]?.paymentMode || 'Cash'}
              </div>
            </div>
          </div>

          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-slate-200 text-slate-400 uppercase text-[9px] font-bold">
              <tr>
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Rate</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1.5">
                    <div className="font-bold text-slate-900">{item.medicine?.medicineName}</div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      Batch: {item.batchStock?.batchNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-1.5 text-right font-medium">₹{item.unitPrice}</td>
                  <td className="py-1.5 text-right font-bold">₹{item.total || item.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-bold">₹{receipt.subTotal?.toFixed(2) || receipt.grandTotal}</span>
            </div>
            {receipt.totalGst > 0 && (
              <div className="flex justify-between text-teal-700">
                <span>GST Tax:</span>
                <span>+₹{receipt.totalGst.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span>-₹{receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-1.5">
              <span>Grand Total:</span>
              <span className="text-[#0A685D]">₹{receipt.grandTotal}</span>
            </div>
          </div>

          <div className="text-center pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            <p>Thank you for choosing SUMMIT Clinic. Wish you a speedy recovery!</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => generatePharmacyReceiptPDF(enrichedReceipt)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#0A685D] hover:bg-[#08544B] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

