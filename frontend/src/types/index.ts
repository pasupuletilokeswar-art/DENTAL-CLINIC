export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'RECEPTIONIST' | 'DOCTOR_DENTAL' | 'DOCTOR_ORTHO' | 'ADMIN';
  doctorProfile?: Doctor | null;
}

export interface Doctor {
  id: string;
  userId: string;
  specialization: 'DENTAL' | 'ORTHOPEDIC';
  licenseNumber?: string | null;
  consultationFee: number;
  user: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  };
}

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  mobile: string;
  email?: string | null;
  dob?: string | null;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  registrationDate: string;
  address?: string | null;
  medicalAlerts?: string | null;
}

export interface Appointment {
  id: string;
  appointmentCode: string;
  patientId: string;
  patient: Patient;
  doctorId: string;
  doctor: Doctor;
  specialization: 'DENTAL' | 'ORTHOPEDIC';
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  visitType: 'NEW_VISIT' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE_CHECKUP';
  procedureName?: string | null;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  reasonForVisit?: string | null;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor: Doctor;
  appointmentId?: string | null;
  consultationDate: string;
  chiefComplaints: string;
  detailedMedicalHistory?: string | null;
  teethChart?: Record<string, string> | null;
  observations?: string | null;
  investigations?: string | null;
  diagnosis: string;
  treatmentRecommendations?: string | null;
  notes?: string | null;
  advice?: string | null;
}

export interface ConsultationBill {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patient: Patient;
  doctorId: string;
  doctor: Doctor;
  appointmentId?: string | null;
  billDate: string;
  consultationFee: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingBalance: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

export interface MedicineMaster {
  id: string;
  itemCode: string;
  medicineName: string;
  brandName?: string | null;
  manufacturer?: string | null;
  barcode?: string | null;
  hsnCode?: string | null;
  packageInfo?: string | null;
  buyingUnit: string;
  sellingUnit: string;
  unitRatio: number;
  medicineType: string;
  strength?: string | null;
  prescriptionType: string;
  reorderLevel: number;
  specialization?: 'DENTAL' | 'ORTHOPEDIC' | null;
  currentStock: number;
  isLowStock: boolean;
  batches: MedicineBatchStock[];
}

export interface MedicineBatchStock {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantityInBase: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
}

export interface ProcedureMaster {
  id: string;
  code: string;
  name: string;
  specialization: 'DENTAL' | 'ORTHOPEDIC';
  standardCharge: number;
  estimatedMins: number;
}

export interface Procedure {
  id: string;
  procedureCode: string;
  patientId: string;
  patient: Patient;
  doctorId?: string | null;
  doctor?: Doctor | null;
  dentistName?: string | null;
  procedureMasterId?: string | null;
  procedureMaster?: ProcedureMaster | null;
  procedureName?: string | null;
  toothNumber?: string | null;
  procedureDate: string;
  charges: number;
  status: 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  clinicalNotes?: string | null;
  operationInvoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingBalance: number;
    paymentStatus: string;
  } | null;
}

