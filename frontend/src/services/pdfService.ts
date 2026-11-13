import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// 1. PATIENT 360 COMPREHENSIVE PDF REPORT
// ==========================================
export const generatePatientReportPDF = (patientProfile: any) => {
  const doc = new jsPDF();
  const p = patientProfile.patient;
  const fin = patientProfile.financialSummary || {
    totalOutstanding: 0,
    consultationPending: 0,
    pharmacyPending: 0,
    operationPending: 0,
  };

  const formatDateSafe = (d: any) => {
    if (!d) return '—';
    try {
      const str = String(d).substring(0, 10);
      if (str.includes('-')) {
        const [y, m, day] = str.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
      return new Date(d).toLocaleDateString();
    } catch {
      return String(d).substring(0, 10);
    }
  };

  const formatTimeSafe = (d: any) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMIT DENTAL & ORTHOPEDIC CLINIC', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Comprehensive 360 Medical & Financial Patient Dossier', 14, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${p.name} (${p.patientCode})`, 18, 47);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Age: ${p.age} yrs | Gender: ${p.gender} | Mobile: ${p.mobile}`, 18, 54);
  doc.text(`Address: ${p.address || 'N/A'} | Registered: ${formatDateSafe(p.registrationDate)}`, 18, 60);

  if (p.medicalAlerts) {
    doc.setTextColor(185, 28, 28); // red
    doc.setFont('helvetica', 'bold');
    doc.text(`Medical Alerts: ${p.medicalAlerts}`, 18, 65);
  }

  // Financial Summary Tiles
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 72, 182, 14, 1, 1, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Financial Due: Rs. ${fin.totalOutstanding} (Consult: Rs.${fin.consultationPending} | Pharm: Rs.${fin.pharmacyPending} | OT: Rs.${fin.operationPending})`,
    18,
    81
  );

  let currentY = 92;

  // 1. Appointments History Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Appointment History & Scheduled Visits', 14, currentY);

  const aptRows = (p.appointments || []).map((apt: any) => [
    apt.appointmentCode || 'APT',
    formatDateSafe(apt.appointmentDate),
    formatTimeSafe(apt.startTime),
    `Dr. ${apt.doctor?.user?.fullName || 'Doctor'}`,
    apt.specialization || 'DENTAL',
    apt.procedureName || apt.visitType || 'General',
    apt.status || 'SCHEDULED',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['APT #', 'Date', 'Time', 'Doctor', 'Dept', 'Visit / Procedure', 'Status']],
    body: aptRows.length > 0 ? aptRows : [['No appointments recorded yet', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [0, 144, 231], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 2. Clinical Notes Table
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Clinical Notes & Doctor Diagnoses', 14, currentY);

  const notesRows = (p.clinicalNotes || []).map((cn: any) => [
    formatDateSafe(cn.consultationDate),
    `Dr. ${cn.doctor?.user?.fullName || 'Doctor'}`,
    cn.chiefComplaints || '-',
    cn.diagnosis || '-',
    cn.treatmentRecommendations || cn.advice || '-',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date', 'Doctor', 'Chief Complaints', 'Diagnosis', 'Recommendations']],
    body: notesRows.length > 0 ? notesRows : [['No clinical notes recorded yet', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Clinical Procedures History Table (All procedures with tooth numbers)
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Dental & Surgical Procedures History', 14, currentY);

  const allProcRows = (p.procedures || []).map((pr: any) => [
    formatDateSafe(pr.procedureDate),
    pr.procedureName || pr.procedureMaster?.name || 'Procedure',
    `Dr. ${pr.doctor?.user?.fullName || pr.dentistName || 'Dentist'}`,
    pr.toothNumber ? `Tooth #${pr.toothNumber}` : '—',
    pr.clinicalNotes || '—',
    (pr.status || 'PLANNED').toUpperCase(),
    pr.operationInvoice ? `Rs. ${pr.operationInvoice.totalAmount} (${pr.operationInvoice.paymentStatus})` : '—',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date', 'Procedure', 'Dentist', 'Tooth #', 'Clinical Notes', 'Status', 'Bill Status']],
    body: allProcRows.length > 0 ? allProcRows : [['No procedures recorded yet', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Consultation Invoices Table
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Consultation Bills & Invoices', 14, currentY);

  const billsRows = (p.consultationBills || []).map((b: any) => [
    b.invoiceNumber,
    formatDateSafe(b.billDate),
    `Dr. ${b.doctor?.user?.fullName || 'Doctor'}`,
    `Rs. ${b.consultationFee}`,
    `Rs. ${b.totalAmount}`,
    `Rs. ${b.paidAmount}`,
    `Rs. ${b.pendingBalance}`,
    b.paymentStatus,
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Invoice #', 'Date', 'Doctor', 'Fee', 'Total', 'Paid', 'Due', 'Status']],
    body: billsRows.length > 0 ? billsRows : [['No consultation bills generated yet', '', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 5. Pharmacy Dispensed Sales
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Pharmacy Medication Dispensed', 14, currentY);

  const pharmRows = (p.pharmacySales || []).map((s: any) => [
    s.invoiceNumber,
    formatDateSafe(s.saleDate),
    (s.items || []).map((it: any) => `${it.medicine?.medicineName || 'Med'} (x${it.quantity})`).join(', ') || '—',
    `Rs. ${s.grandTotal}`,
    `Rs. ${s.paidAmount}`,
    s.paymentStatus,
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Pharm Invoice', 'Date', 'Medicines Dispensed', 'Total', 'Paid', 'Status']],
    body: pharmRows.length > 0 ? pharmRows : [['No pharmacy sales for this patient', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SUMMIT Clinic Management System • Confidential Patient Record • Page ${i} of ${pageCount}`,
      14,
      290
    );
  }

  doc.save(`${p.patientCode}_Medical_History.pdf`);
};

// ==========================================
// 2. OFFICIAL CONSULTATION INVOICE PDF
// ==========================================
export const generateBillingInvoicePDF = (bill: any, payments: any[] = []) => {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMIT DENTAL & ORTHOPEDIC CLINIC', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Multispeciality Dental, Implant & Orthopedic Centre', 14, 22);
  doc.text('Phone: +91 98765 43210 | GSTIN: 29ABCDE1234F1Z5', 14, 28);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE / RECEIPT - CONSULTATION', 14, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${bill.invoiceNumber}`, 14, 55);
  doc.text(`Invoice Date: ${new Date(bill.billDate).toLocaleDateString()}`, 14, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Billed To (Patient):', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bill.patient.name}`, 130, 54);
  doc.text(`Patient ID: ${bill.patient.patientCode}`, 130, 59);
  doc.text(`Phone: ${bill.patient.mobile}`, 130, 64);

  doc.setFont('helvetica', 'bold');
  doc.text(`Attending Doctor: ${bill.doctor.user.fullName} (${bill.doctor.specialization})`, 14, 72);

  autoTable(doc, {
    startY: 78,
    head: [['Description', 'Doctor Specialization', 'Gross Fee', 'Discount', 'Tax Rate', 'Net Amount']],
    body: [
      [
        'Doctor Professional Consultation & Examination',
        bill.doctor.specialization,
        `Rs. ${bill.consultationFee.toFixed(2)}`,
        `Rs. ${bill.discount.toFixed(2)}`,
        `${bill.taxRate}% GST`,
        `Rs. ${bill.totalAmount.toFixed(2)}`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Amount: Rs. ${bill.totalAmount.toFixed(2)}`, 124, finalY + 8);
  doc.setTextColor(16, 185, 129);
  doc.text(`Paid Amount: Rs. ${bill.paidAmount.toFixed(2)}`, 124, finalY + 16);
  doc.setTextColor(bill.pendingBalance > 0 ? 225 : 71, bill.pendingBalance > 0 ? 29 : 85, 72);
  doc.text(`Balance Due: Rs. ${bill.pendingBalance.toFixed(2)}`, 124, finalY + 24);

  if (payments && payments.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Receipts Collected:', 14, finalY + 5);

    const payRows = payments.map((p: any) => [
      p.receiptNumber,
      new Date(p.paymentDate).toLocaleDateString(),
      p.paymentMode,
      `Rs. ${p.amount.toFixed(2)}`,
      p.referenceNumber || 'Success',
    ]);

    autoTable(doc, {
      startY: finalY + 8,
      margin: { right: 95 },
      head: [['Receipt #', 'Date', 'Mode', 'Amount', 'Ref']],
      body: payRows,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory / Receptionist', 130, finalY + 60);
  doc.line(130, finalY + 55, 190, finalY + 55);

  doc.save(`${bill.invoiceNumber}_Invoice.pdf`);
};

// ==========================================
// 3. OFFICIAL OPERATION / PROCEDURE INVOICE PDF
// ==========================================
export const generateProcedureInvoicePDF = (opBill: any, payments: any[] = []) => {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMIT DENTAL & ORTHOPEDIC CLINIC', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Minor Operation Theatre & Surgical Procedures Wing', 14, 22);
  doc.text('Phone: +91 98765 43210 | GSTIN: 29ABCDE1234F1Z5', 14, 28);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE / RECEIPT - OPERATION / PROCEDURE', 14, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${opBill.invoiceNumber}`, 14, 55);
  doc.text(`Procedure Code: ${opBill.procedure?.procedureCode || 'PROC'}`, 14, 60);
  doc.text(`Billing Date: ${new Date(opBill.billDate).toLocaleDateString()}`, 14, 65);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient Details:', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`${opBill.procedure?.patient?.name || 'Patient'}`, 130, 54);
  doc.text(`Patient ID: ${opBill.procedure?.patient?.patientCode || ''}`, 130, 59);
  doc.text(`Phone: ${opBill.procedure?.patient?.mobile || ''}`, 130, 64);

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Attending Surgeon: Dr. ${opBill.procedure?.doctor?.user?.fullName || 'Surgeon'} (${
      opBill.procedure?.doctor?.specialization || 'Clinical'
    })`,
    14,
    74
  );

  autoTable(doc, {
    startY: 80,
    head: [['Procedure / Surgical Service', 'Consumables / OT', 'Discounts', 'GST Tax', 'Total Billed']],
    body: [
      [
        opBill.procedure?.procedureMaster?.name || 'Clinical Procedure',
        `Rs. ${opBill.consumablesFee.toFixed(2)}`,
        `Rs. ${opBill.discount.toFixed(2)}`,
        `${opBill.taxRate}% (Rs. ${opBill.taxAmount.toFixed(2)})`,
        `Rs. ${opBill.totalAmount.toFixed(2)}`,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Amount: Rs. ${opBill.totalAmount.toFixed(2)}`, 124, finalY + 8);
  doc.setTextColor(16, 185, 129);
  doc.text(`Paid Amount: Rs. ${opBill.paidAmount.toFixed(2)}`, 124, finalY + 16);
  doc.setTextColor(opBill.pendingBalance > 0 ? 225 : 71, opBill.pendingBalance > 0 ? 29 : 85, 72);
  doc.text(`Balance Due: Rs. ${opBill.pendingBalance.toFixed(2)}`, 124, finalY + 24);

  if (payments && payments.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Receipts Collected:', 14, finalY + 5);

    const payRows = payments.map((p: any) => [
      p.receiptNumber,
      new Date(p.paymentDate).toLocaleDateString(),
      p.paymentMode,
      `Rs. ${p.amount.toFixed(2)}`,
      p.referenceNumber || 'Success',
    ]);

    autoTable(doc, {
      startY: finalY + 8,
      margin: { right: 95 },
      head: [['Receipt #', 'Date', 'Mode', 'Amount', 'Ref']],
      body: payRows,
      theme: 'grid',
      headStyles: { fillColor: [180, 83, 9], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory / OT Billing Desk', 130, finalY + 60);
  doc.line(130, finalY + 55, 190, finalY + 55);

  doc.save(`${opBill.invoiceNumber}_Procedure_Invoice.pdf`);
};
