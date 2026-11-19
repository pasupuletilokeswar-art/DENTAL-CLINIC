import api from '../../../services/api';
import { DentalFindingItem } from '../types/dentalChart.types';

export interface PatientChartResponse {
  success: boolean;
  patient: {
    id: string;
    name: string;
    patientCode: string;
    age: number;
    gender: string;
  };
  findings: DentalFindingItem[];
  totalFindings: number;
}

export const dentalChartService = {
  // Fetch complete dental chart for a patient
  getPatientChart: async (patientId: string): Promise<PatientChartResponse> => {
    const res = await api.get(`/dental-chart/patient/${patientId}`);
    return res.data;
  },

  // Fetch tooth clinical history
  getToothHistory: async (patientId: string, toothNumber: number): Promise<DentalFindingItem[]> => {
    const res = await api.get(`/dental-chart/patient/${patientId}/tooth/${toothNumber}`);
    return res.data.history || [];
  },

  // Create new clinical finding
  saveFinding: async (payload: {
    patientId: string;
    consultationId?: string | null;
    toothNumber: number;
    dentitionType?: 'ADULT' | 'PEDIATRIC';
    toothName: string;
    surface: string;
    condition: string;
    severity: string;
    treatment?: string | null;
    notes?: string | null;
  }): Promise<{ success: boolean; finding: DentalFindingItem; message: string }> => {
    const res = await api.post('/dental-chart', payload);
    return res.data;
  },

  // Update existing finding
  updateFinding: async (
    id: string,
    payload: {
      surface?: string;
      condition?: string;
      severity?: string;
      treatment?: string | null;
      notes?: string | null;
      status?: string;
    }
  ): Promise<{ success: boolean; finding: DentalFindingItem; message: string }> => {
    const res = await api.put(`/dental-chart/${id}`, payload);
    return res.data;
  },

  // Delete finding
  deleteFinding: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/dental-chart/${id}`);
    return res.data;
  },
};
