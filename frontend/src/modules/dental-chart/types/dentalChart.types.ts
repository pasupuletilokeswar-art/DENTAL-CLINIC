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
  | 'Tooth development and eruption disorders'
  | 'Dental caries and tooth decay'
  | 'Diseases of hard tooth tissues'
  | 'Diseases of dental pulp and root-tip tissues'
  | 'Gingival and periodontal diseases'
  | 'Other disorders of gums and tooth-supporting structures'
  | 'Missing teeth, tooth mobility and other tooth-support disorders'
  | 'Dentofacial abnormalities and malocclusion'
  | 'Oral cysts and jaw diseases'
  | 'Diseases of the oral mucosa, lips and cheeks'
  | 'Tongue disorders'
  | 'Salivary gland diseases'
  | 'Temporomandibular joint and jaw disorders'
  | 'Oral cancer and tumors'
  | 'Dental trauma and injuries'
  | 'Oral and dental infections'
  | 'Other dental conditions and complications'
  | 'Dental Restorations & Prosthetics'
  | 'Caries'
  | 'Structural'
  | 'Restorations'
  | 'Endodontic'
  | 'Periodontal'
  | 'Other'
  | string;

export interface ConditionDefinition {
  id?: number;
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
  // Category: Tooth development and eruption disorders
  { id: 1, name: 'Anodontia — absence of all teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 2, name: 'Hypodontia — congenital absence of some teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 3, name: 'Oligodontia — congenital absence of many teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 4, name: 'Supernumerary teeth — extra teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 5, name: 'Macrodontia — unusually large teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 6, name: 'Microdontia — unusually small teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 7, name: 'Peg-shaped lateral incisor', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 8, name: 'Fusion of teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 9, name: 'Gemination of teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 10, name: 'Concrescence of teeth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 11, name: 'Dens invaginatus', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 12, name: 'Dens evaginatus', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 13, name: 'Taurodontism', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 14, name: 'Enamel pearls', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 15, name: 'Molar-incisor hypomineralization', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 16, name: 'Enamel hypoplasia', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 17, name: 'Dentinogenesis imperfecta', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 18, name: 'Amelogenesis imperfecta', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 19, name: 'Dentin dysplasia', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 20, name: 'Regional odontodysplasia', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 21, name: 'Dental fluorosis', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 22, name: 'Delayed tooth eruption', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 23, name: 'Premature tooth eruption', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 24, name: 'Eruption failure', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 25, name: 'Ectopic tooth eruption', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 26, name: 'Impacted tooth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 27, name: 'Embedded tooth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 28, name: 'Retained primary tooth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 29, name: 'Natal tooth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 30, name: 'Neonatal tooth', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 31, name: 'Tooth ankylosis', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 32, name: 'Disturbances in tooth formation', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 33, name: 'Abnormalities of tooth size and form', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  { id: 34, name: 'Hereditary disturbances of tooth structure', category: 'Tooth development and eruption disorders', legendColor: '#64748B' },
  // Category: Dental caries and tooth decay
  { id: 35, name: 'Initial enamel caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 36, name: 'Pit and fissure caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 37, name: 'Smooth surface caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 38, name: 'Proximal caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 39, name: 'Occlusal caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 40, name: 'Root caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 41, name: 'Arrested caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 42, name: 'Recurrent caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 43, name: 'Secondary caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 44, name: 'Rampant caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 45, name: 'Early childhood caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 46, name: 'Nursing bottle caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 47, name: 'Deep dentinal caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 48, name: 'Caries extending into the pulp', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 49, name: 'Caries in a retained primary tooth', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 50, name: 'Caries associated with a defective restoration', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 51, name: 'Caries associated with an exposed root', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { id: 52, name: 'Dental caries, unspecified', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  // Category: Diseases of hard tooth tissues
  { id: 53, name: 'Excessive attrition', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 54, name: 'Dental abrasion', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 55, name: 'Dental erosion', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 56, name: 'Abfraction', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 57, name: 'Cracked tooth syndrome', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 58, name: 'Crown fracture', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 59, name: 'Root fracture', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 60, name: 'Enamel fracture', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 61, name: 'Dentin fracture', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 62, name: 'Tooth discoloration', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 63, name: 'Intrinsic tooth staining', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 64, name: 'Extrinsic tooth staining', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 65, name: 'Tooth sensitivity', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 66, name: 'Pathological tooth resorption', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 67, name: 'Internal root resorption', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 68, name: 'External root resorption', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 69, name: 'External cervical resorption', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 70, name: 'Hypercementosis', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 71, name: 'Ankylosis of teeth', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 72, name: 'Enamel defects', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 73, name: 'Dentin defects', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 74, name: 'Tooth wear from bruxism', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 75, name: 'Tooth wear from acidic exposure', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 76, name: 'Tooth wear from mechanical causes', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 77, name: 'Tooth fracture involving the pulp', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 78, name: 'Tooth fracture not involving the pulp', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 79, name: 'Tooth surface loss', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  { id: 80, name: 'Other diseases of hard tooth tissues', category: 'Diseases of hard tooth tissues', legendColor: '#FFB703' },
  // Category: Diseases of dental pulp and root-tip tissues
  { id: 81, name: 'Reversible pulpitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 82, name: 'Irreversible pulpitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 83, name: 'Acute pulpitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 84, name: 'Chronic pulpitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 85, name: 'Pulp necrosis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 86, name: 'Pulp degeneration', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 87, name: 'Pulp calcification', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 88, name: 'Pulp stones', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 89, name: 'Pulpal hyperplasia', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 90, name: 'Acute apical periodontitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 91, name: 'Chronic apical periodontitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 92, name: 'Acute apical abscess', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 93, name: 'Chronic apical abscess', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 94, name: 'Periapical abscess with sinus tract', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 95, name: 'Periapical abscess without sinus tract', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 96, name: 'Periapical granuloma', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 97, name: 'Radicular cyst', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 98, name: 'Residual radicular cyst', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 99, name: 'Periapical lesion', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 100, name: 'Symptomatic apical periodontitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 101, name: 'Asymptomatic apical periodontitis', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  { id: 102, name: 'Pulpal and periapical diseases, unspecified', category: 'Diseases of dental pulp and root-tip tissues', legendColor: '#06D6A0' },
  // Category: Gingival and periodontal diseases
  { id: 103, name: 'Plaque-induced gingivitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 104, name: 'Non-plaque-induced gingivitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 105, name: 'Acute gingivitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 106, name: 'Chronic gingivitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 107, name: 'Gingival enlargement', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 108, name: 'Gingival recession', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 109, name: 'Gingival abscess', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 110, name: 'Periodontal abscess', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 111, name: 'Acute periodontitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 112, name: 'Chronic periodontitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 113, name: 'Localized periodontitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 114, name: 'Generalized periodontitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 115, name: 'Periodontitis associated with systemic disease', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 116, name: 'Necrotizing ulcerative gingivitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 117, name: 'Necrotizing ulcerative periodontitis', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 118, name: 'Necrotizing periodontal disease', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 119, name: 'Periodontal pocket', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 120, name: 'Gingival bleeding', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 121, name: 'Gingival inflammation', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 122, name: 'Periodontal attachment loss', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 123, name: 'Alveolar bone loss', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 124, name: 'Periodontal furcation involvement', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 125, name: 'Periodontal disease associated with diabetes', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 126, name: 'Periodontal disease associated with smoking', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 127, name: 'Periodontal disease associated with medications', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  { id: 128, name: 'Periodontal disease, unspecified', category: 'Gingival and periodontal diseases', legendColor: '#06B6D4' },
  // Category: Other disorders of gums and tooth-supporting structures
  { id: 129, name: 'Gingival fibromatosis', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 130, name: 'Gingival hyperplasia', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 131, name: 'Gingival recession defect', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 132, name: 'Gingival cleft', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 133, name: 'Gingival enlargement caused by medication', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 134, name: 'Gingival enlargement associated with systemic disease', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 135, name: 'Alveolar ridge atrophy', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 136, name: 'Alveolar ridge resorption', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 137, name: 'Edentulous alveolar ridge', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 138, name: 'Loss of keratinized gingiva', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 139, name: 'Mucogingival deformity', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 140, name: 'Periodontal abscess', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 141, name: 'Peri-implant mucositis', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 142, name: 'Peri-implantitis', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 143, name: 'Peri-implant soft-tissue deficiency', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 144, name: 'Peri-implant bone loss', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  { id: 145, name: 'Other disorders of gingiva and supporting tissues', category: 'Other disorders of gums and tooth-supporting structures', legendColor: '#0891B2' },
  // Category: Missing teeth, tooth mobility and other tooth-support disorders
  { id: 146, name: 'Acquired absence of teeth', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 147, name: 'Partial edentulism', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 148, name: 'Complete edentulism', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 149, name: 'Tooth mobility', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 150, name: 'Tooth displacement', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 151, name: 'Tooth extrusion', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 152, name: 'Tooth intrusion', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 153, name: 'Tooth luxation', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 154, name: 'Tooth avulsion', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 155, name: 'Tooth loss due to trauma', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 156, name: 'Tooth loss due to periodontal disease', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 157, name: 'Tooth loss due to caries', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 158, name: 'Tooth loss due to other causes', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 159, name: 'Residual tooth roots', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 160, name: 'Retained root fragments', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 161, name: 'Dental prosthesis-related complications', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 162, name: 'Failed dental restoration', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 163, name: 'Failed dental crown', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 164, name: 'Failed dental bridge', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 165, name: 'Failed dental implant', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  { id: 166, name: 'Other disorders of teeth and supporting structures', category: 'Missing teeth, tooth mobility and other tooth-support disorders', legendColor: '#B5838D' },
  // Category: Dentofacial abnormalities and malocclusion
  { id: 167, name: 'Crowding', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 168, name: 'Spacing', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 169, name: 'Diastema', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 170, name: 'Overjet', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 171, name: 'Deep overbite', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 172, name: 'Open bite', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 173, name: 'Anterior crossbite', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 174, name: 'Posterior crossbite', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 175, name: 'Scissor bite', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 176, name: 'Class I malocclusion', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 177, name: 'Class II malocclusion', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 178, name: 'Class III malocclusion', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 179, name: 'Increased overjet', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 180, name: 'Reduced overjet', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 181, name: 'Midline discrepancy', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 182, name: 'Rotated tooth', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 183, name: 'Ectopic tooth position', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 184, name: 'Transposition of teeth', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 185, name: 'Protrusion of teeth', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 186, name: 'Retrusion of teeth', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 187, name: 'Maxillary prognathism', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 188, name: 'Mandibular prognathism', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 189, name: 'Maxillary retrognathism', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 190, name: 'Mandibular retrognathism', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 191, name: 'Facial asymmetry', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 192, name: 'Micrognathia', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 193, name: 'Macrognathia', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 194, name: 'Abnormal jaw relationship', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 195, name: 'Dentofacial functional abnormality', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  { id: 196, name: 'Malocclusion, unspecified', category: 'Dentofacial abnormalities and malocclusion', legendColor: '#6366F1' },
  // Category: Oral cysts and jaw diseases
  { id: 197, name: 'Radicular cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 198, name: 'Dentigerous cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 199, name: 'Odontogenic keratocyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 200, name: 'Lateral periodontal cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 201, name: 'Gingival cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 202, name: 'Eruption cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 203, name: 'Residual cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 204, name: 'Nasopalatine duct cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 205, name: 'Traumatic bone cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 206, name: 'Aneurysmal bone cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 207, name: 'Odontogenic cyst, unspecified', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 208, name: 'Periapical cyst', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 209, name: 'Jaw osteomyelitis', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 210, name: 'Osteonecrosis of the jaw', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 211, name: 'Medication-related osteonecrosis of the jaw', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 212, name: 'Osteoradionecrosis of the jaw', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 213, name: 'Fibrous dysplasia of the jaw', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 214, name: 'Ossifying fibroma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 215, name: 'Ameloblastoma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 216, name: 'Odontoma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 217, name: 'Cementoblastoma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 218, name: 'Odontogenic myxoma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 219, name: 'Central giant cell granuloma', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  { id: 220, name: 'Other jawbone lesions', category: 'Oral cysts and jaw diseases', legendColor: '#EC4899' },
  // Category: Diseases of the oral mucosa, lips and cheeks
  { id: 221, name: 'Recurrent aphthous stomatitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 222, name: 'Minor aphthous ulcer', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 223, name: 'Major aphthous ulcer', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 224, name: 'Herpetiform aphthous ulcer', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 225, name: 'Traumatic oral ulcer', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 226, name: 'Chronic oral ulcer', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 227, name: 'Oral candidiasis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 228, name: 'Pseudomembranous candidiasis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 229, name: 'Erythematous candidiasis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 230, name: 'Chronic hyperplastic candidiasis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 231, name: 'Denture stomatitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 232, name: 'Angular cheilitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 233, name: 'Herpes labialis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 234, name: 'Herpetic gingivostomatitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 235, name: 'Oral lichen planus', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 236, name: 'Oral lichenoid reaction', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 237, name: 'Geographic tongue', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 238, name: 'Fissured tongue', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 239, name: 'Burning mouth syndrome', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 240, name: 'Oral mucositis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 241, name: 'Contact stomatitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 242, name: 'Nicotine stomatitis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 243, name: 'Oral submucous fibrosis', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 244, name: 'Leukoplakia', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 245, name: 'Erythroplakia', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 246, name: 'Oral hairy leukoplakia', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 247, name: 'Oral pigmentation', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 248, name: 'Fordyce granules', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 249, name: 'Mucocele', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 250, name: 'Ranula', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 251, name: 'Traumatic fibroma', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 252, name: 'Irritation fibroma', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 253, name: 'Pyogenic granuloma', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 254, name: 'Peripheral giant cell granuloma', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 255, name: 'Oral papilloma', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 256, name: 'Oral lichen planus-like lesions', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 257, name: 'Oral lesions associated with systemic disease', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  { id: 258, name: 'Other diseases of oral mucosa', category: 'Diseases of the oral mucosa, lips and cheeks', legendColor: '#F43F5E' },
  // Category: Tongue disorders
  { id: 259, name: 'Glossitis', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 260, name: 'Atrophic glossitis', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 261, name: 'Median rhomboid glossitis', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 262, name: 'Geographic tongue', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 263, name: 'Fissured tongue', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 264, name: 'Black hairy tongue', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 265, name: 'Hairy tongue', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 266, name: 'Macroglossia', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 267, name: 'Microglossia', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 268, name: 'Ankyloglossia (tongue-tie)', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 269, name: 'Tongue ulcer', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 270, name: 'Tongue trauma', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 271, name: 'Tongue discoloration', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 272, name: 'Tongue paresthesia', category: 'Tongue disorders', legendColor: '#D946EF' },
  { id: 273, name: 'Other tongue disorders', category: 'Tongue disorders', legendColor: '#D946EF' },
  // Category: Salivary gland diseases
  { id: 274, name: 'Xerostomia (dry mouth)', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 275, name: 'Sialorrhea (excessive saliva)', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 276, name: 'Sialadenitis', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 277, name: 'Acute bacterial sialadenitis', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 278, name: 'Chronic sialadenitis', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 279, name: 'Viral sialadenitis', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 280, name: 'Sialolithiasis (salivary stones)', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 281, name: 'Salivary gland obstruction', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 282, name: 'Salivary gland abscess', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 283, name: 'Salivary gland cyst', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 284, name: 'Mucocele', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 285, name: 'Ranula', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 286, name: 'Sjögren syndrome-related dry mouth', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 287, name: 'Salivary gland enlargement', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 288, name: 'Salivary gland dysfunction', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 289, name: 'Salivary gland tumors', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  { id: 290, name: 'Other salivary gland diseases', category: 'Salivary gland diseases', legendColor: '#3B82F6' },
  // Category: Temporomandibular joint and jaw disorders
  { id: 291, name: 'Temporomandibular disorder (TMD)', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 292, name: 'Temporomandibular joint pain', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 293, name: 'Temporomandibular joint clicking', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 294, name: 'Temporomandibular joint locking', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 295, name: 'Temporomandibular joint dislocation', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 296, name: 'Temporomandibular joint arthritis', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 297, name: 'Temporomandibular joint osteoarthritis', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 298, name: 'Temporomandibular joint ankylosis', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 299, name: 'Myofascial pain dysfunction', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 300, name: 'Masticatory muscle pain', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 301, name: 'Trismus', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 302, name: 'Bruxism', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 303, name: 'Jaw deviation', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 304, name: 'Jaw movement restriction', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  { id: 305, name: 'Other temporomandibular disorders', category: 'Temporomandibular joint and jaw disorders', legendColor: '#84CC16' },
  // Category: Oral cancer and tumors
  { id: 306, name: 'Oral squamous cell carcinoma', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 307, name: 'Lip cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 308, name: 'Tongue cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 309, name: 'Floor-of-mouth cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 310, name: 'Buccal mucosa cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 311, name: 'Gingival cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 312, name: 'Hard palate cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 313, name: 'Salivary gland cancer', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 314, name: 'Oral verrucous carcinoma', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 315, name: 'Oral potentially malignant disorder', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 316, name: 'Oral leukoplakia', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 317, name: 'Oral erythroplakia', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 318, name: 'Benign oral tumor', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 319, name: 'Benign salivary gland tumor', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 320, name: 'Malignant salivary gland tumor', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 321, name: 'Odontogenic tumor', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 322, name: 'Jawbone tumor', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 323, name: 'Oral lymphoma', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 324, name: 'Oral metastasis', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  { id: 325, name: 'Other oral neoplasms', category: 'Oral cancer and tumors', legendColor: '#DC2626' },
  // Category: Dental trauma and injuries
  { id: 326, name: 'Dental concussion', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 327, name: 'Subluxation of a tooth', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 328, name: 'Extrusive luxation', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 329, name: 'Lateral luxation', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 330, name: 'Intrusive luxation', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 331, name: 'Avulsion of a tooth', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 332, name: 'Crown fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 333, name: 'Crown-root fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 334, name: 'Root fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 335, name: 'Alveolar bone fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 336, name: 'Mandibular fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 337, name: 'Maxillary fracture', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 338, name: 'Soft-tissue injury of the mouth', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 339, name: 'Lip laceration', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 340, name: 'Tongue laceration', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 341, name: 'Traumatic tooth displacement', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 342, name: 'Dental trauma with pulp exposure', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  { id: 343, name: 'Dental trauma without pulp exposure', category: 'Dental trauma and injuries', legendColor: '#F97316' },
  // Category: Oral and dental infections
  { id: 344, name: 'Dental abscess', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 345, name: 'Periapical abscess', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 346, name: 'Periodontal abscess', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 347, name: 'Pericoronitis', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 348, name: 'Cellulitis of dental origin', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 349, name: 'Facial space infection', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 350, name: 'Ludwig\'s angina', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 351, name: 'Osteomyelitis of the jaw', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 352, name: 'Necrotizing gingivitis', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 353, name: 'Necrotizing periodontitis', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 354, name: 'Oral candidiasis', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 355, name: 'Herpes simplex infection', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 356, name: 'Herpetic gingivostomatitis', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 357, name: 'Oral bacterial infection', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 358, name: 'Oral viral infection', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 359, name: 'Oral fungal infection', category: 'Oral and dental infections', legendColor: '#E11D48' },
  { id: 360, name: 'Other oral infections', category: 'Oral and dental infections', legendColor: '#E11D48' },
  // Category: Other dental conditions and complications
  { id: 361, name: 'Dental anxiety', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 362, name: 'Dental phobia', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 363, name: 'Toothache, unspecified', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 364, name: 'Orofacial pain', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 365, name: 'Postoperative dental pain', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 366, name: 'Dry socket (alveolar osteitis)', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 367, name: 'Delayed socket healing', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 368, name: 'Post-extraction bleeding', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 369, name: 'Postoperative infection', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 370, name: 'Postoperative swelling', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 371, name: 'Oroantral communication', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 372, name: 'Oroantral fistula', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 373, name: 'Sinusitis of dental origin', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 374, name: 'Dental implant failure', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 375, name: 'Implant infection', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 376, name: 'Implant fracture', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 377, name: 'Peri-implant bone loss', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 378, name: 'Denture-related ulcer', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 379, name: 'Denture-related stomatitis', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 380, name: 'Broken denture', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 381, name: 'Broken crown', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 382, name: 'Broken bridge', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 383, name: 'Failed filling', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 384, name: 'Failed root canal treatment', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 385, name: 'Failed orthodontic appliance', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  { id: 386, name: 'Other dental treatment complications', category: 'Other dental conditions and complications', legendColor: '#64748B' },
  // Category: Common Restorations & Base Findings
  { name: 'Dental Caries', category: 'Dental caries and tooth decay', legendColor: '#FF6B6B' },
  { name: 'Composite Restoration', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Amalgam Restoration', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Dental Crown', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Dental Bridge', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Dental Veneer', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Inlay / Onlay', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Dental Implant', category: 'Dental Restorations & Prosthetics', legendColor: '#4D96FF' },
  { name: 'Root Canal Treated Tooth', category: 'Dental Restorations & Prosthetics', legendColor: '#06D6A0' },
  { name: 'Other / Observation', category: 'Other dental conditions and complications', legendColor: '#64748B' },
];

export const RECOMMENDED_TREATMENT_OPTIONS = [
  'Root Canal Treatment (RCT)',
  'Dental Filling',
  'GIC Restoration',
  'Composite Restoration',
  'Tooth Extraction',
  'Surgical Extraction',
  'Dental Scaling',
  'Polishing',
  'Crown Placement',
  'Bridge Placement',
  'Orthodontic Treatment',
  'Denture Treatment',
  'Soft Splint',
  'Periodontal Flap / Gingival Graft',
  'Observation / Monitoring',
  'Other',
];

export function getConditionColor(conditionName: string): string {
  const match = CLINICAL_CONDITIONS.find((c) => c.name.toLowerCase() === conditionName.toLowerCase());
  if (match) return match.legendColor;
  const cLower = conditionName.toLowerCase();
  if (cLower.includes('carie') || cLower.includes('cavity') || cLower.includes('decay')) return '#FF6B6B';
  if (cLower.includes('rct') || cLower.includes('treat') || cLower.includes('pulp') || cLower.includes('endodontic')) return '#06D6A0';
  if (cLower.includes('crown') || cLower.includes('fill') || cLower.includes('restor') || cLower.includes('bridge') || cLower.includes('veneer') || cLower.includes('implant')) return '#4D96FF';
  if (cLower.includes('fracture') || cLower.includes('crack') || cLower.includes('trauma') || cLower.includes('wear') || cLower.includes('erosion') || cLower.includes('abrasion')) return '#FFB703';
  if (cLower.includes('missing') || cLower.includes('extract') || cLower.includes('edentulism') || cLower.includes('loss')) return '#B5838D';
  if (cLower.includes('gingiv') || cLower.includes('periodont')) return '#06B6D4';
  if (cLower.includes('cyst') || cLower.includes('tumor') || cLower.includes('cancer')) return '#DC2626';
  return '#A0AEC0';
}

export function getConditionLegendCategory(conditionName: string): keyof typeof FINDINGS_LEGEND {
  const cLower = conditionName.toLowerCase();
  if (cLower.includes('carie') || cLower.includes('decay') || cLower.includes('cavity')) return 'Caries';
  if (cLower.includes('crown') || cLower.includes('fill') || cLower.includes('restor') || cLower.includes('bridge') || cLower.includes('veneer') || cLower.includes('inlay') || cLower.includes('implant')) return 'Restoration';
  if (cLower.includes('fracture') || cLower.includes('crack') || cLower.includes('trauma') || cLower.includes('wear') || cLower.includes('erosion') || cLower.includes('abrasion') || cLower.includes('attrition') || cLower.includes('abfraction')) return 'Fracture';
  if (cLower.includes('rct') || cLower.includes('root canal') || cLower.includes('pulp') || cLower.includes('apical') || cLower.includes('endodontic') || cLower.includes('treated')) return 'Treated';
  if (cLower.includes('missing') || cLower.includes('extract') || cLower.includes('edentulism') || cLower.includes('anodontia') || cLower.includes('hypodontia') || cLower.includes('avulsion') || cLower.includes('loss')) return 'Missing';
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
