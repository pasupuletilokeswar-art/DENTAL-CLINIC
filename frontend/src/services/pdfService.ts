import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// 1. PATIENT 360 COMPREHENSIVE PDF REPORT
// ==========================================
export const parseExactDateTime = (dateVal: any, timeVal?: any) => {
  let ts = 0;
  let dStr = '—';
  let tStr = '—';

  if (!dateVal && !timeVal) {
    return { timestamp: 0, dateStr: '—', timeStr: '—', fullStr: '—' };
  }

  try {
    const rawDate = dateVal ? String(dateVal) : '';
    const rawTime = timeVal ? String(timeVal) : '';

    let year = 1970, month = 0, day = 1, hours = 0, minutes = 0;
    let hasDate = false;
    let hasTime = false;

    if (rawDate.includes('T') && rawDate.includes(':')) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        ts = d.getTime();
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
        hours = d.getHours();
        minutes = d.getMinutes();
        hasDate = true;
        if (hours !== 0 || minutes !== 0) hasTime = true;
      }
    } else if (rawDate.includes('-')) {
      const parts = rawDate.substring(0, 10).split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
        hasDate = true;
      }
    }

    if (rawTime) {
      if (rawTime.includes('T') && rawTime.includes(':')) {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          hours = d.getHours();
          minutes = d.getMinutes();
          hasTime = true;
          if (!hasDate) {
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
            hasDate = true;
          }
        }
      } else if (rawTime.includes(':')) {
        const parts = rawTime.split(':');
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
        hasTime = true;
      }
    }

    const finalDate = new Date(year, month, day, hours, minutes);
    ts = finalDate.getTime();

    dStr = finalDate.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (hasTime) {
      tStr = finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      tStr = 'Scheduled';
    }

    return {
      timestamp: ts,
      dateStr: dStr,
      timeStr: tStr,
      fullStr: hasTime ? `${dStr} ${tStr}` : dStr,
    };
  } catch {
    return { timestamp: 0, dateStr: String(dateVal || '—'), timeStr: '—', fullStr: String(dateVal || '—') };
  }
};

export const generatePatientReportPDF = (patientProfile: any) => {
  const doc = new jsPDF();
  const p = patientProfile.patient;
  const fin = patientProfile.financialSummary || {
    totalOutstanding: 0,
    consultationPending: 0,
    pharmacyPending: 0,
    operationPending: 0,
  };

  // Header Banner
  doc.setFillColor(10, 104, 93); // #0A685D Medical Teal
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMIT DENTAL & ORTHOPEDIC CLINIC', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(216, 245, 238);
  doc.text('Chronological 360° Medical & Financial Patient Dossier (Sorted by Date & Time)', 14, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 38, 182, 30, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${p.name} (${p.patientCode})`, 18, 47);

  const regDt = parseExactDateTime(p.registrationDate || p.createdAt);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Age: ${p.age} yrs | Gender: ${p.gender} | Mobile: ${p.mobile}`, 18, 54);
  doc.text(`Address: ${p.address || 'N/A'} | Registered: ${regDt.fullStr}`, 18, 60);

  if (p.medicalAlerts) {
    doc.setTextColor(185, 28, 28); // red
    doc.setFont('helvetica', 'bold');
    doc.text(`Medical Alerts: ${p.medicalAlerts}`, 18, 65);
  }

  // Financial Summary Tiles
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(153, 246, 228);
  doc.roundedRect(14, 72, 182, 14, 1, 1, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 104, 93);
  doc.text(
    `Financial Due: Rs. ${fin.totalOutstanding} (Consultation: Rs.${fin.consultationPending} | Pharmacy: Rs.${fin.pharmacyPending} | Surgery/OT: Rs.${fin.operationPending})`,
    18,
    81
  );

  let currentY = 92;

  // ==============================================================
  // A. MASTER CHRONOLOGICAL 360° ACTIVITY TIMELINE (STRICT DATE & TIME ORDER)
  // ==============================================================
  const masterTimeline: any[] = [];

  // 1. Intake
  if (p.registrationDate || p.createdAt) {
    const dt = parseExactDateTime(p.registrationDate || p.createdAt);
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '1. REGISTRATION',
      dept: 'Intake Desk',
      details: `Registered Patient Code ${p.patientCode} (${p.gender}, ${p.age} yrs)`,
      status: 'COMPLETED',
    });
  }

  // 2. Appointments
  (p.appointments || []).forEach((apt: any) => {
    const dt = parseExactDateTime(apt.appointmentDate, apt.startTime);
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '2. APPOINTMENT',
      dept: `Dr. ${apt.doctor?.user?.fullName || 'Doctor'} (${apt.specialization || 'DENTAL'})`,
      details: `${apt.procedureName || apt.visitType || 'General Consultation'} (Slot: ${apt.timeSlot || 'Scheduled'})`,
      status: apt.status || 'SCHEDULED',
    });
  });

  // 3. Clinical Notes
  (p.clinicalNotes || []).forEach((cn: any) => {
    const dt = parseExactDateTime(cn.consultationDate || cn.createdAt);
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '3. CLINICAL NOTE',
      dept: `Dr. ${cn.doctor?.user?.fullName || 'Doctor'}`,
      details: `Complaint: ${cn.chiefComplaints || 'Checkup'}${cn.diagnosis ? ` | Diagnosis: ${cn.diagnosis}` : ''}`,
      status: 'RECORDED',
    });
  });

  // 4. Procedures
  (p.procedures || []).forEach((proc: any) => {
    const dt = parseExactDateTime(proc.procedureDate || proc.createdAt);
    const procName = proc.procedureName || proc.procedureMaster?.name || 'Procedure';
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '4. PROCEDURE',
      dept: `Dr. ${proc.doctor?.user?.fullName || proc.dentistName || 'Dentist'}`,
      details: `${procName}${proc.toothNumber ? ` (Tooth #${proc.toothNumber})` : ''}`,
      status: (proc.status || 'PLANNED').toUpperCase(),
    });
  });

  // 5. Consultation Bills
  (p.consultationBills || []).forEach((bill: any) => {
    const dt = parseExactDateTime(bill.billDate || bill.createdAt);
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '5. CONSULT BILL',
      dept: `Invoice #${bill.invoiceNumber}`,
      details: `Fee: Rs.${bill.consultationFee} | Total: Rs.${bill.totalAmount} | Paid: Rs.${bill.paidAmount}`,
      status: bill.paymentStatus || 'PENDING',
    });
  });

  // 6. Pharmacy Sales
  (p.pharmacySales || []).forEach((sale: any) => {
    const dt = parseExactDateTime(sale.saleDate || sale.createdAt);
    const meds = (sale.items || []).map((it: any) => `${it.medicine?.medicineName || 'Med'} (x${it.quantity})`).join(', ');
    masterTimeline.push({
      timestamp: dt.timestamp,
      dateFormatted: dt.fullStr,
      type: '6. PHARMACY',
      dept: `Pharm #${sale.invoiceNumber}`,
      details: meds ? `Items: ${meds} | Rs.${sale.grandTotal}` : `Medication Dispensed: Rs.${sale.grandTotal}`,
      status: sale.paymentStatus || 'PAID',
    });
  });

  // Sort STRICTLY Chronological by Date & Time (earliest to latest)
  masterTimeline.sort((a, b) => a.timestamp - b.timestamp);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 104, 93);
  doc.text('Master 360° Chronological Activity Flow (Ordered by Date & Time)', 14, currentY);

  const timelineRows = masterTimeline.map((item) => [
    item.dateFormatted,
    item.type,
    item.dept,
    item.details,
    item.status,
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date & Time', 'Event Type', 'Provider / Dept / Invoice', 'Clinical Details & Scope', 'Status']],
    body: timelineRows.length > 0 ? timelineRows : [['No chronological activity recorded yet', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [10, 104, 93], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 30 },
      2: { cellWidth: 42 },
      3: { cellWidth: 52 },
      4: { cellWidth: 20 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ==============================================================
  // B. DETAILED APPOINTMENTS TABLE (SORTED BY DATE & TIME)
  // ==============================================================
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Appointment History (Sorted by Date & Time)', 14, currentY);

  const sortedApts = [...(p.appointments || [])].sort((a: any, b: any) => {
    return parseExactDateTime(a.appointmentDate, a.startTime).timestamp - parseExactDateTime(b.appointmentDate, b.startTime).timestamp;
  });

  const aptRows = sortedApts.map((apt: any) => {
    const dt = parseExactDateTime(apt.appointmentDate, apt.startTime);
    return [
      apt.appointmentCode || 'APT',
      dt.dateStr,
      dt.timeStr,
      `Dr. ${apt.doctor?.user?.fullName || 'Doctor'}`,
      apt.specialization || 'DENTAL',
      apt.procedureName || apt.visitType || 'General Consultation',
      apt.status || 'SCHEDULED',
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['APT #', 'Date', 'Time', 'Doctor', 'Dept', 'Visit / Procedure', 'Status']],
    body: aptRows.length > 0 ? aptRows : [['No appointments recorded yet', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ==============================================================
  // C. DETAILED CLINICAL NOTES (SORTED BY DATE & TIME)
  // ==============================================================
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Clinical Notes & Doctor Diagnoses (Sorted by Date & Time)', 14, currentY);

  const sortedNotes = [...(p.clinicalNotes || [])].sort((a: any, b: any) => {
    return parseExactDateTime(a.consultationDate || a.createdAt).timestamp - parseExactDateTime(b.consultationDate || b.createdAt).timestamp;
  });

  const notesRows = sortedNotes.map((cn: any) => {
    const dt = parseExactDateTime(cn.consultationDate || cn.createdAt);
    return [
      dt.fullStr,
      `Dr. ${cn.doctor?.user?.fullName || 'Doctor'}`,
      cn.chiefComplaints || '-',
      cn.diagnosis || '-',
      cn.treatmentRecommendations || cn.advice || '-',
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date & Time', 'Doctor', 'Chief Complaints', 'Diagnosis', 'Recommendations']],
    body: notesRows.length > 0 ? notesRows : [['No clinical notes recorded yet', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ==============================================================
  // D. DETAILED PROCEDURES HISTORY (SORTED BY DATE & TIME)
  // ==============================================================
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Dental & Surgical Procedures History (Sorted by Date & Time)', 14, currentY);

  const sortedProcs = [...(p.procedures || [])].sort((a: any, b: any) => {
    return parseExactDateTime(a.procedureDate || a.createdAt).timestamp - parseExactDateTime(b.procedureDate || b.createdAt).timestamp;
  });

  const allProcRows = sortedProcs.map((pr: any) => {
    const dt = parseExactDateTime(pr.procedureDate || pr.createdAt);
    return [
      dt.fullStr,
      pr.procedureName || pr.procedureMaster?.name || 'Procedure',
      `Dr. ${pr.doctor?.user?.fullName || pr.dentistName || 'Dentist'}`,
      pr.toothNumber ? `Tooth #${pr.toothNumber}` : '—',
      pr.clinicalNotes || '—',
      (pr.status || 'PLANNED').toUpperCase(),
      pr.operationInvoice ? `Rs. ${pr.operationInvoice.totalAmount} (${pr.operationInvoice.paymentStatus})` : '—',
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Date & Time', 'Procedure', 'Dentist', 'Tooth #', 'Clinical Notes', 'Status', 'Bill Status']],
    body: allProcRows.length > 0 ? allProcRows : [['No procedures recorded yet', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ==============================================================
  // E. CONSULTATION INVOICES & BILLS (SORTED BY DATE & TIME)
  // ==============================================================
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Consultation Bills & Invoices (Sorted by Date & Time)', 14, currentY);

  const sortedBills = [...(p.consultationBills || [])].sort((a: any, b: any) => {
    return parseExactDateTime(a.billDate || a.createdAt).timestamp - parseExactDateTime(b.billDate || b.createdAt).timestamp;
  });

  const billsRows = sortedBills.map((b: any) => {
    const dt = parseExactDateTime(b.billDate || b.createdAt);
    return [
      b.invoiceNumber,
      dt.fullStr,
      `Dr. ${b.doctor?.user?.fullName || 'Doctor'}`,
      `Rs. ${b.consultationFee}`,
      `Rs. ${b.totalAmount}`,
      `Rs. ${b.paidAmount}`,
      `Rs. ${b.pendingBalance}`,
      b.paymentStatus,
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Invoice #', 'Date & Time', 'Doctor', 'Fee', 'Total', 'Paid', 'Due', 'Status']],
    body: billsRows.length > 0 ? billsRows : [['No consultation bills generated yet', '', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [180, 83, 9], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ==============================================================
  // F. PHARMACY DISPENSED (SORTED BY DATE & TIME)
  // ==============================================================
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Pharmacy Medication Dispensed (Sorted by Date & Time)', 14, currentY);

  const sortedSales = [...(p.pharmacySales || [])].sort((a: any, b: any) => {
    return parseExactDateTime(a.saleDate || a.createdAt).timestamp - parseExactDateTime(b.saleDate || b.createdAt).timestamp;
  });

  const pharmRows = sortedSales.map((s: any) => {
    const dt = parseExactDateTime(s.saleDate || s.createdAt);
    return [
      s.invoiceNumber,
      dt.fullStr,
      (s.items || []).map((it: any) => `${it.medicine?.medicineName || 'Med'} (x${it.quantity})`).join(', ') || '—',
      `Rs. ${s.grandTotal}`,
      `Rs. ${s.paidAmount}`,
      s.paymentStatus,
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Pharm Invoice', 'Date & Time', 'Medicines Dispensed', 'Total', 'Paid', 'Status']],
    body: pharmRows.length > 0 ? pharmRows : [['No pharmacy sales for this patient', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
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

// ==========================================
// 4. OFFICIAL PHARMACY CASH RECEIPT / TAX INVOICE PDF
// ==========================================
export const generatePharmacyReceiptPDF = (sale: any) => {
  const doc = new jsPDF();

  // Header Banner - Pharmacy Teal/Slate
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMIT DENTAL & ORTHOPEDIC CLINIC', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Licensed In-House Pharmacy & Clinical Dispensary', 14, 22);
  doc.text('GSTIN: 29AABCS1429B1Z | Drug Lic: KA-B2-124987 | Phone: +91 98765 43210', 14, 28);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RETAIL TAX INVOICE / CASH MEMO', 14, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${sale.invoiceNumber}`, 14, 55);
  doc.text(
    `Invoice Date: ${new Date(sale.saleDate).toLocaleDateString()} ${new Date(sale.saleDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    14,
    60
  );

  // Customer Details (Supports Registered or Walk-out / Walk-in)
  const custName = sale.patient?.name || sale.customerName || 'Walk-in Customer';
  const custPhone = sale.patient?.mobile || sale.customerPhone || 'N/A';
  const custAge =
    sale.patient?.age || sale.customerAge ? `${sale.patient?.age || sale.customerAge} yrs` : '—';
  const custId = sale.patient?.patientCode ? ` (${sale.patient.patientCode})` : ' (Walk-out OTC)';

  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details:', 130, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`${custName}${custId}`, 130, 54);
  doc.text(`Phone: ${custPhone} | Age: ${custAge}`, 130, 59);

  const items = sale.items || [];
  const tableRows = items.map((it: any, idx: number) => {
    const medName = it.medicine?.medicineName || 'Medicine';
    const batchNo = it.batchStock?.batchNumber || it.batchNumber || '—';
    const expDate = it.batchStock?.expiryDate ? new Date(it.batchStock.expiryDate).toLocaleDateString() : '—';
    const rate = Number(it.unitPrice || 0).toFixed(2);
    const qty = it.quantity || 1;
    const disc = Number(it.discount || 0).toFixed(2);
    const gst = `${it.gstRate || 12}%`;
    const lineTotal = Number(
      it.totalAmount || (it.quantity * it.unitPrice - (it.discount || 0))
    ).toFixed(2);

    return [idx + 1, medName, batchNo, expDate, `Rs. ${rate}`, qty, `Rs. ${disc}`, gst, `Rs. ${lineTotal}`];
  });

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Medicine / Product', 'Batch #', 'Expiry', 'MRP/Rate', 'Qty', 'Disc', 'GST', 'Total']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No medicines listed', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [10, 104, 93], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Card Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, finalY, 76, 32, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`Subtotal: Rs. ${Number(sale.subTotal || sale.grandTotal).toFixed(2)}`, 124, finalY + 8);
  if (sale.discount > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Discount: -Rs. ${Number(sale.discount).toFixed(2)}`, 124, finalY + 14);
  }
  doc.setTextColor(10, 104, 93);
  doc.setFontSize(10);
  doc.text(`Grand Total: Rs. ${Number(sale.grandTotal).toFixed(2)}`, 124, finalY + 22);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: ${(sale.paymentStatus || 'PAID').toUpperCase()}`, 124, finalY + 28);

  // Footer notes
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Thank you for choosing SUMMIT Clinic & Pharmacy! Medicines sold are non-returnable after 7 days.',
    14,
    finalY + 45
  );
  doc.text('Authorized Pharmacist / Dispensary Desk', 130, finalY + 45);
  doc.line(130, finalY + 42, 190, finalY + 42);

  doc.save(`${sale.invoiceNumber}_Pharmacy_Receipt.pdf`);
};
