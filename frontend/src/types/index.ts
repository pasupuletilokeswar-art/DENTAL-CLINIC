export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'RECEPTIONIST' | 'DOCTOR_DENTAL' | 'DOCTOR_ORTHO' | 'ADMIN';
  allowedModules?: string[] | string | null;
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
  visitType: 'NEW_VISIT' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE_CHECKUP' | 'PROCEDURE';
  procedureName?: string | null;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  reasonForVisit?: string | null;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  consultationBill?: ConsultationBill | null;
}

export type QuadrantType = 'UR' | 'UL' | 'LL' | 'LR';
export type DentitionType = 'permanent' | 'primary';

export interface SelectedTooth {
  quadrant: QuadrantType;
  position: number;
  fdi: number;
  dentition?: DentitionType;
}

export interface ClinicalFinding {
  finding: string;
  toothNumber?: string | null;
  selectedTeeth?: SelectedTooth[] | null;
  teeth?: (string | number)[] | null;
  chartType?: DentitionType | null;
  severity?: 'Mild' | 'Moderate' | 'Severe' | string | null;
  details?: string | null;
  observations?: string | null;
}

export interface RecommendedTreatment {
  treatment: string;
  priority?: 'Immediate' | 'High' | 'Normal' | 'Low' | string | null;
  advice?: string | null;
  plannedDate?: string | null;
  followUpDate?: string | null;
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
  durationOfComplaint?: string | null;
  patientDescription?: string | null;
  clinicalFindings?: ClinicalFinding[] | null;
  recommendedTreatments?: RecommendedTreatment[] | null;
  followUpDate?: string | null;
  procedures?: Procedure[];
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
  category: string;
  specialization: 'DENTAL' | 'ORTHOPEDIC';
  description?: string | null;
  standardCharge: number;
  estimatedMins: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrescribedMedication {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  notes?: string | null;
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
  clinicalNoteId?: string | null;
  prescribedMedications?: PrescribedMedication[] | null;
  operationInvoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingBalance: number;
    paymentStatus: string;
  } | null;
}

export interface VisitHistoryRecord {
  id: string;
  visitDate: string;
  patientId: string;
  patient: Patient;
  consultingDoctors: Array<{
    id: string | null;
    name: string;
    specialization: string;
  }>;
  clinicalNotes: ClinicalNote[];
  procedures: Procedure[];
  prescriptions: any[];
  prescribedMedications?: PrescribedMedication[];
  appointment?: Appointment | null;
}

// Dental Lab Work Types
export type LabCaseStatus =
  | 'SENT_TO_LAB'
  | 'RECEIVED_FROM_LAB'
  | 'READY_FOR_HANDOVER'
  | 'HANDED_OVER'
  | 'CANCELLED';

export type LabItemType =
  | 'CROWN'
  | 'BRIDGE'
  | 'DENTURE'
  | 'VENEER'
  | 'RETAINER'
  | 'SPLINT'
  | 'OTHER';

export interface LabItem {
  id?: string;
  labCaseId?: string;
  itemType: LabItemType;
  customItemName?: string | null;
  toothNumber: string;
  material?: string | null;
  shade?: string | null;
  description?: string | null;
  status?: LabCaseStatus;
  receivedDate?: string | null;
  handoverDate?: string | null;
}

export interface LabDocument {
  id: string;
  labCaseId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface LabPhoto {
  id: string;
  labCaseId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes?: string | null;
  receivedDate?: string | null;
  uploadedAt: string;
}

export interface LabCase {
  id: string;
  caseNumber: string;
  patientId: string;
  patient: Patient;
  appointmentId?: string | null;
  appointment?: Appointment | null;
  labName: string;
  labContact?: string | null;
  labPhone?: string | null;
  labEmail?: string | null;
  labRefNumber?: string | null;
  status: LabCaseStatus;
  sentDate: string;
  expectedDate?: string | null;
  receivedDate?: string | null;
  handoverDate?: string | null;
  handoverNotes?: string | null;
  generalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: LabItem[];
  documents: LabDocument[];
  photos: LabPhoto[];
  _count?: {
    documents: number;
    photos: number;
  };
}

