export type ArchType = 'UPPER' | 'LOWER';
export type QuadrantType = 'UR' | 'UL' | 'LL' | 'LR';
export type ToothClass = 'INCISOR' | 'CANINE' | 'PREMOLAR' | 'MOLAR';

export type ToothSurface =
  | 'Occlusal'
  | 'Incisal'
  | 'Buccal'
  | 'Labial'
  | 'Lingual'
  | 'Mesial'
  | 'Distal'
  | 'Root'
  | 'General';

export type ConditionCategory =
  | 'Caries'
  | 'Structural'
  | 'Restorations'
  | 'Endodontic'
  | 'Periodontal'
  | 'Other';

export interface ConditionDefinition {
  name: string;
  category: ConditionCategory;
  legendColor: string; // Hex color for 3D/2D legend
  defaultTreatment?: string;
}

export interface ToothDefinition {
  fdi: number;
  universal: number;
  name: string;
  arch: ArchType;
  quadrant: QuadrantType;
  toothClass: ToothClass;
  isAnterior: boolean;
  surfaces: ToothSurface[];
}

export interface DentalFindingItem {
  id: string;
  patientId: string;
  consultationId?: string | null;
  toothNumber: number;
  dentitionType: 'ADULT' | 'PEDIATRIC';
  toothName: string;
  surface: ToothSurface;
  condition: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical' | 'N/A';
  treatment?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'RESOLVED' | 'OBSERVATION';
  createdAt?: string;
  updatedAt?: string;
}

export type CameraViewPreset = 'front' | 'right' | 'left' | 'upper' | 'lower';

export const FINDINGS_LEGEND: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  Caries: {
    label: 'Caries',
    color: '#FF6B6B',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-700',
  },
  Restoration: {
    label: 'Restoration (Filling/Crown)',
    color: '#4D96FF',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-700',
  },
  Fracture: {
    label: 'Fracture/Crack',
    color: '#FFB703',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-700',
  },
  Treated: {
    label: 'Treated (RCT, etc.)',
    color: '#06D6A0',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-700',
  },
  Missing: {
    label: 'Missing/Extracted',
    color: '#B5838D',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-700',
  },
  Other: {
    label: 'Other',
    color: '#A0AEC0',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-700',
  },
};

export const CLINICAL_CONDITIONS: ConditionDefinition[] = [
  // Dental Caries
  { name: 'Dental Caries', category: 'Caries', legendColor: '#FF6B6B', defaultTreatment: 'Restoration' },
  { name: 'Initial Caries', category: 'Caries', legendColor: '#FF6B6B', defaultTreatment: 'Observation' },
  { name: 'Moderate Caries', category: 'Caries', legendColor: '#FF6B6B', defaultTreatment: 'Restoration' },
  { name: 'Advanced Caries', category: 'Caries', legendColor: '#FF6B6B', defaultTreatment: 'Root Canal Treatment' },
  { name: 'Recurrent Caries', category: 'Caries', legendColor: '#FF6B6B', defaultTreatment: 'Restoration' },

  // Structural Conditions
  { name: 'Tooth Fracture', category: 'Structural', legendColor: '#FFB703', defaultTreatment: 'Crown' },
  { name: 'Cracked Tooth', category: 'Structural', legendColor: '#FFB703', defaultTreatment: 'Crown' },
  { name: 'Enamel Erosion', category: 'Structural', legendColor: '#FFB703', defaultTreatment: 'Observation' },
  { name: 'Tooth Wear', category: 'Structural', legendColor: '#FFB703', defaultTreatment: 'Restoration' },
  { name: 'Tooth Abrasion', category: 'Structural', legendColor: '#FFB703', defaultTreatment: 'Restoration' },

  // Restorations
  { name: 'Composite Restoration', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },
  { name: 'Amalgam Restoration', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },
  { name: 'Crown', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },
  { name: 'Veneer', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },
  { name: 'Inlay / Onlay', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },
  { name: 'Bridge', category: 'Restorations', legendColor: '#4D96FF', defaultTreatment: 'Observation' },

  // Endodontic Conditions
  { name: 'Root Canal Treated', category: 'Endodontic', legendColor: '#06D6A0', defaultTreatment: 'Crown' },
  { name: 'Pulp Involvement', category: 'Endodontic', legendColor: '#06D6A0', defaultTreatment: 'Root Canal Treatment' },
  { name: 'Periapical Finding', category: 'Endodontic', legendColor: '#06D6A0', defaultTreatment: 'Root Canal Treatment' },

  // Periodontal Conditions
  { name: 'Gingival Recession', category: 'Periodontal', legendColor: '#FFB703', defaultTreatment: 'Periodontal Treatment' },
  { name: 'Tooth Mobility', category: 'Periodontal', legendColor: '#FFB703', defaultTreatment: 'Periodontal Treatment' },
  { name: 'Gingival Inflammation', category: 'Periodontal', legendColor: '#FFB703', defaultTreatment: 'Scaling' },
  { name: 'Periodontal Involvement', category: 'Periodontal', legendColor: '#FFB703', defaultTreatment: 'Periodontal Treatment' },

  // Other Conditions
  { name: 'Implant', category: 'Other', legendColor: '#4D96FF', defaultTreatment: 'Crown' },
  { name: 'Missing Tooth', category: 'Other', legendColor: '#B5838D', defaultTreatment: 'Restoration' },
  { name: 'Extracted Tooth', category: 'Other', legendColor: '#B5838D', defaultTreatment: 'Other' },
  { name: 'Impacted Tooth', category: 'Other', legendColor: '#A0AEC0', defaultTreatment: 'Extraction' },
  { name: 'Supernumerary Tooth', category: 'Other', legendColor: '#A0AEC0', defaultTreatment: 'Observation' },
  { name: 'Other', category: 'Other', legendColor: '#A0AEC0', defaultTreatment: 'Observation' },
];

export function getConditionColor(conditionName: string): string {
  const match = CLINICAL_CONDITIONS.find((c) => c.name.toLowerCase() === conditionName.toLowerCase());
  if (match) return match.legendColor;
  if (conditionName.toLowerCase().includes('carie') || conditionName.toLowerCase().includes('cavity')) return '#FF6B6B';
  if (conditionName.toLowerCase().includes('rct') || conditionName.toLowerCase().includes('treat')) return '#06D6A0';
  if (conditionName.toLowerCase().includes('crown') || conditionName.toLowerCase().includes('fill') || conditionName.toLowerCase().includes('restor')) return '#4D96FF';
  if (conditionName.toLowerCase().includes('fracture') || conditionName.toLowerCase().includes('crack')) return '#FFB703';
  if (conditionName.toLowerCase().includes('missing') || conditionName.toLowerCase().includes('extract')) return '#B5838D';
  return '#A0AEC0';
}

export function getConditionLegendCategory(conditionName: string): keyof typeof FINDINGS_LEGEND {
  const match = CLINICAL_CONDITIONS.find((c) => c.name.toLowerCase() === conditionName.toLowerCase());
  if (match) {
    if (match.category === 'Caries') return 'Caries';
    if (match.category === 'Restorations') return 'Restoration';
    if (match.category === 'Structural') return 'Fracture';
    if (match.category === 'Endodontic') return 'Treated';
    if (match.name.includes('Missing') || match.name.includes('Extracted')) return 'Missing';
    return 'Other';
  }
  return 'Other';
}

// 32 Permanent Adult Teeth
export const ADULT_TEETH: ToothDefinition[] = [
  // Upper Right (Quadrant 1): 18 -> 11
  { fdi: 18, universal: 1, name: 'Upper Right Third Molar (Wisdom Tooth)', arch: 'UPPER', quadrant: 'UR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 17, universal: 2, name: 'Upper Right Second Molar', arch: 'UPPER', quadrant: 'UR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 16, universal: 3, name: 'Upper Right First Molar', arch: 'UPPER', quadrant: 'UR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 15, universal: 4, name: 'Upper Right Second Premolar', arch: 'UPPER', quadrant: 'UR', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 14, universal: 5, name: 'Upper Right First Premolar', arch: 'UPPER', quadrant: 'UR', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 13, universal: 6, name: 'Upper Right Canine', arch: 'UPPER', quadrant: 'UR', toothClass: 'CANINE', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 12, universal: 7, name: 'Upper Right Lateral Incisor', arch: 'UPPER', quadrant: 'UR', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 11, universal: 8, name: 'Upper Right Central Incisor', arch: 'UPPER', quadrant: 'UR', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },

  // Upper Left (Quadrant 2): 21 -> 28
  { fdi: 21, universal: 9, name: 'Upper Left Central Incisor', arch: 'UPPER', quadrant: 'UL', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 22, universal: 10, name: 'Upper Left Lateral Incisor', arch: 'UPPER', quadrant: 'UL', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 23, universal: 11, name: 'Upper Left Canine', arch: 'UPPER', quadrant: 'UL', toothClass: 'CANINE', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 24, universal: 12, name: 'Upper Left First Premolar', arch: 'UPPER', quadrant: 'UL', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 25, universal: 13, name: 'Upper Left Second Premolar', arch: 'UPPER', quadrant: 'UL', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 26, universal: 14, name: 'Upper Left First Molar', arch: 'UPPER', quadrant: 'UL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 27, universal: 15, name: 'Upper Left Second Molar', arch: 'UPPER', quadrant: 'UL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 28, universal: 16, name: 'Upper Left Third Molar (Wisdom Tooth)', arch: 'UPPER', quadrant: 'UL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },

  // Lower Left (Quadrant 3): 38 -> 31
  { fdi: 38, universal: 17, name: 'Lower Left Third Molar (Wisdom Tooth)', arch: 'LOWER', quadrant: 'LL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 37, universal: 18, name: 'Lower Left Second Molar', arch: 'LOWER', quadrant: 'LL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 36, universal: 19, name: 'Lower Left First Molar', arch: 'LOWER', quadrant: 'LL', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 35, universal: 20, name: 'Lower Left Second Premolar', arch: 'LOWER', quadrant: 'LL', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 34, universal: 21, name: 'Lower Left First Premolar', arch: 'LOWER', quadrant: 'LL', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 33, universal: 22, name: 'Lower Left Canine', arch: 'LOWER', quadrant: 'LL', toothClass: 'CANINE', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 32, universal: 23, name: 'Lower Left Lateral Incisor', arch: 'LOWER', quadrant: 'LL', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 31, universal: 24, name: 'Lower Left Central Incisor', arch: 'LOWER', quadrant: 'LL', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },

  // Lower Right (Quadrant 4): 41 -> 48
  { fdi: 41, universal: 25, name: 'Lower Right Central Incisor', arch: 'LOWER', quadrant: 'LR', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 42, universal: 26, name: 'Lower Right Lateral Incisor', arch: 'LOWER', quadrant: 'LR', toothClass: 'INCISOR', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 43, universal: 27, name: 'Lower Right Canine', arch: 'LOWER', quadrant: 'LR', toothClass: 'CANINE', isAnterior: true, surfaces: ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 44, universal: 28, name: 'Lower Right First Premolar', arch: 'LOWER', quadrant: 'LR', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 45, universal: 29, name: 'Lower Right Second Premolar', arch: 'LOWER', quadrant: 'LR', toothClass: 'PREMOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 46, universal: 30, name: 'Lower Right First Molar', arch: 'LOWER', quadrant: 'LR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 47, universal: 31, name: 'Lower Right Second Molar', arch: 'LOWER', quadrant: 'LR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
  { fdi: 48, universal: 32, name: 'Lower Right Third Molar (Wisdom Tooth)', arch: 'LOWER', quadrant: 'LR', toothClass: 'MOLAR', isAnterior: false, surfaces: ['Occlusal', 'Buccal', 'Lingual', 'Mesial', 'Distal', 'Root'] },
];

export function getToothByFDI(fdi: number): ToothDefinition | undefined {
  return ADULT_TEETH.find((t) => t.fdi === fdi);
}

export function getAdjacentToothFDI(currentFDI: number, direction: 'prev' | 'next'): number {
  const idx = ADULT_TEETH.findIndex((t) => t.fdi === currentFDI);
  if (idx === -1) return currentFDI;
  if (direction === 'prev') {
    return idx > 0 ? ADULT_TEETH[idx - 1].fdi : ADULT_TEETH[ADULT_TEETH.length - 1].fdi;
  } else {
    return idx < ADULT_TEETH.length - 1 ? ADULT_TEETH[idx + 1].fdi : ADULT_TEETH[0].fdi;
  }
}

export const UPPER_TEETH_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function getNavigatedFDI(currentFDI: number, direction: 'left' | 'right' | 'up' | 'down'): number {
  const uIdx = UPPER_TEETH_FDI.indexOf(currentFDI);
  const lIdx = LOWER_TEETH_FDI.indexOf(currentFDI);

  if (uIdx !== -1) {
    switch (direction) {
      case 'left':
        return uIdx > 0 ? UPPER_TEETH_FDI[uIdx - 1] : UPPER_TEETH_FDI[0];
      case 'right':
        return uIdx < UPPER_TEETH_FDI.length - 1 ? UPPER_TEETH_FDI[uIdx + 1] : UPPER_TEETH_FDI[UPPER_TEETH_FDI.length - 1];
      case 'down':
        return LOWER_TEETH_FDI[uIdx];
      case 'up':
        return currentFDI;
    }
  } else if (lIdx !== -1) {
    switch (direction) {
      case 'left':
        return lIdx > 0 ? LOWER_TEETH_FDI[lIdx - 1] : LOWER_TEETH_FDI[0];
      case 'right':
        return lIdx < LOWER_TEETH_FDI.length - 1 ? LOWER_TEETH_FDI[lIdx + 1] : LOWER_TEETH_FDI[LOWER_TEETH_FDI.length - 1];
      case 'up':
        return UPPER_TEETH_FDI[lIdx];
      case 'down':
        return currentFDI;
    }
  }
  return currentFDI;
}
