// Utility to format WhatsApp share links for clinical receipts and bills

export const sendWhatsAppMessage = (phone: string, message: string) => {
  // Clean phone number: remove non-digits
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`; // Default to Indian country code +91
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(url, '_blank');
};

export const createConsultationBillMessage = (bill: any) => {
  return `*SUMMIT Dental & Orthopedic Clinic*
*Consultation Tax Invoice & Receipt*
----------------------------------------
Invoice No: ${bill.invoiceNumber}
Date: ${new Date(bill.billDate).toLocaleDateString()}
Patient: ${bill.patient?.name} (${bill.patient?.patientCode})
Doctor: Dr. ${bill.doctor?.user?.fullName} (${bill.doctor?.specialization})
----------------------------------------
Consultation Fee: Rs. ${bill.consultationFee}
Discount: Rs. ${bill.discount || 0}
Total Amount: Rs. ${bill.totalAmount}
Paid Amount: Rs. ${bill.paidAmount}
Pending Balance: Rs. ${bill.pendingBalance}
Payment Status: ${bill.paymentStatus}
----------------------------------------
Thank you for visiting SUMMIT Clinic!
For queries, contact: +91 98765 43210`;
};

export const createProcedureBillMessage = (opBill: any) => {
  return `*SUMMIT Dental & Orthopedic Clinic*
*Procedure & Minor OT Invoice*
----------------------------------------
Invoice No: ${opBill.invoiceNumber}
Date: ${new Date(opBill.billDate).toLocaleDateString()}
Patient: ${opBill.procedure?.patient?.name} (${opBill.procedure?.patient?.patientCode})
Procedure: ${opBill.procedure?.procedureMaster?.name}
Surgeon: Dr. ${opBill.procedure?.doctor?.user?.fullName}
----------------------------------------
Procedure Fee: Rs. ${opBill.procedureFee}
Consumables / OT: Rs. ${opBill.consumablesFee || 0}
Discount: Rs. ${opBill.discount || 0}
Total Amount: Rs. ${opBill.totalAmount}
Amount Paid: Rs. ${opBill.paidAmount}
Balance Due: Rs. ${opBill.pendingBalance}
Status: ${opBill.paymentStatus}
----------------------------------------
Wishing you a speedy recovery!
SUMMIT Dental & Orthopedic Clinic`;
};

export const createPharmacySaleMessage = (sale: any) => {
  const itemsText = (sale.items || [])
    .map((it: any) => `• ${it.medicine?.medicineName || 'Medicine'} (x${it.quantity}) - Rs. ${it.totalAmount}`)
    .join('\n');

  return `*SUMMIT Dental & Orthopedic Clinic - Pharmacy*
*Pharmacy Cash Memo & Tax Invoice*
----------------------------------------
Invoice No: ${sale.invoiceNumber}
Date: ${new Date(sale.saleDate).toLocaleDateString()}
Patient: ${sale.patient ? `${sale.patient.name} (${sale.patient.patientCode})` : 'Walk-in Customer'}
----------------------------------------
Medicines Dispensed:
${itemsText}
----------------------------------------
Subtotal: Rs. ${sale.subTotal}
Total Tax: Rs. ${sale.totalGst}
Discount: Rs. ${sale.discount || 0}
Grand Total: Rs. ${sale.grandTotal}
Amount Paid: Rs. ${sale.paidAmount}
Payment Status: ${sale.paymentStatus}
----------------------------------------
Please take medications as directed by your doctor.
SUMMIT Clinic Pharmacy: +91 98765 43210`;
};

