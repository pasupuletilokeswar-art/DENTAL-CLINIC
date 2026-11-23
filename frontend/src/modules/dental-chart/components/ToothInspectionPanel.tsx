import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ToothDefinition,
  ToothSurface,
  DentalFindingItem,
  CLINICAL_CONDITIONS,
  getAdjacentToothFDI,
  getConditionColor,
} from '../types/dentalChart.types';
import { ToothPreview3D } from './ToothPreview3D';

interface ToothInspectionPanelProps {
  tooth: ToothDefinition;
  onSelectTooth: (fdi: number) => void;
  onClose?: () => void;
  patientId: string;
  onSaveFinding: (finding: {
    toothNumber: number;
    toothName: string;
    surface: ToothSurface;
    condition: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical' | 'N/A';
    treatment?: string;
    notes?: string;
  }) => Promise<void>;
  toothHistory: DentalFindingItem[];
  isLoadingHistory?: boolean;
}

export const ToothInspectionPanel: React.FC<ToothInspectionPanelProps> = ({
  tooth,
  onSelectTooth,
  onClose,
  onSaveFinding,
  toothHistory,
  isLoadingHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'Surface' | 'Details' | 'History'>('Surface');

  // Surface Selection (Defaults to Occlusal for posterior, Incisal for anterior)
  const defaultSurface: ToothSurface = tooth.isAnterior ? 'Incisal' : 'Occlusal';
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface>(defaultSurface);

  // Form State
  const [selectedCondition, setSelectedCondition] = useState<string>('Dental Caries');
  const [selectedSeverity, setSelectedSeverity] = useState<'Mild' | 'Moderate' | 'Severe' | 'Critical' | 'N/A'>('Moderate');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Update surface when tooth changes
  useEffect(() => {
    setSelectedSurface(tooth.isAnterior ? 'Incisal' : 'Occlusal');
  }, [tooth]);

  // Navigate Previous / Next tooth
  const handlePrevTooth = () => {
    const prevFdi = getAdjacentToothFDI(tooth.fdi, 'prev');
    onSelectTooth(prevFdi);
  };

  const handleNextTooth = () => {
    const nextFdi = getAdjacentToothFDI(tooth.fdi, 'next');
    onSelectTooth(nextFdi);
  };

  // Save Finding Action
  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveFinding({
        toothNumber: tooth.fdi,
        toothName: tooth.name,
        surface: selectedSurface,
        condition: selectedCondition,
        severity: selectedSeverity,
        treatment: selectedTreatment,
        notes,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save dental finding:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add Another Finding (reset form for immediate next finding on same tooth)
  const handleAddAnother = () => {
    handleSave();
    setSelectedSurface(tooth.isAnterior ? 'Labial' : 'Mesial');
    setNotes('');
  };

  // Severity badge colors
  const severityBadgeColors: Record<string, string> = {
    Mild: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Moderate: 'bg-amber-50 text-amber-800 border-amber-200',
    Severe: 'bg-orange-50 text-orange-800 border-orange-200',
    Critical: 'bg-red-50 text-red-800 border-red-200',
    'N/A': 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <div className="w-full lg:w-[430px] bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col gap-4 select-none shrink-0 transition-all">
      {/* 1. Panel Header */}
      <div className="flex items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-teal-700">
          <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3c-3 1-4 5-2 9 1 2 1 9 4 9 2 0 1-6 3-6s1 6 3 6c3 0 3-7 4-9 2-4 1-8-2-9-2-1-3 1-5 1S9 2 7 3Z" />
          </svg>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Tooth Inspection</h2>
        </div>
      </div>

      {/* 2. Tooth Header with Previous / Next Buttons */}
      <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
        <button
          type="button"
          onClick={handlePrevTooth}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition shadow-2xs cursor-pointer"
          title="Previous Tooth (FDI)"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-3 text-center">
          {/* Tooth Icon Thumbnail */}
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-teal-700 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 3c-3 1-4 5-2 9 1 2 1 9 4 9 2 0 1-6 3-6s1 6 3 6c3 0 3-7 4-9 2-4 1-8-2-9-2-1-3 1-5 1S9 2 7 3Z" />
            </svg>
          </div>

          <div className="text-left">
            <h3 className="text-lg font-black text-slate-900 leading-none">
              Tooth {tooth.fdi}
            </h3>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[210px] mt-0.5">
              {tooth.name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextTooth}
          className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition shadow-2xs cursor-pointer"
          title="Next Tooth (FDI)"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* 3. Inspection Tabs */}
      <div className="flex items-center border-b border-slate-200 text-xs font-bold">
        {(['Surface', 'Details', 'History'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center transition cursor-pointer relative ${
              activeTab === tab
                ? 'text-[#008f8c] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008f8c] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'Surface' && (
        <div className="flex flex-col gap-4">
          {/* Surface Inspection Row: 3D Tooth Canvas on Left + Surface Buttons on Right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {/* Left: 3D Tooth Preview */}
            <ToothPreview3D
              tooth={tooth}
              selectedSurface={selectedSurface}
              onSelectSurface={(surf) => setSelectedSurface(surf)}
            />

            {/* Right: Select Affected Surface */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-700">
                Select Affected Surface
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                {tooth.surfaces.map((surf) => {
                  const isSelected = surf === selectedSurface;

                  return (
                    <button
                      key={surf}
                      type="button"
                      onClick={() => setSelectedSurface(surf)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#008f8c] text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 3c-3 1-4 5-2 9 1 2 1 9 4 9 2 0 1-6 3-6s1 6 3 6c3 0 3-7 4-9 2-4 1-8-2-9-2-1-3 1-5 1S9 2 7 3Z" />
                      </svg>
                      <span className="truncate">{surf}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical Finding & Severity Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Condition Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Clinical Finding
              </label>
              <div className="relative">
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
                >
                  {CLINICAL_CONDITIONS.map((cond) => (
                    <option key={cond.name} value={cond.name}>
                      {cond.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Severity Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Severity
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className={`w-full border rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer ${
                  severityBadgeColors[selectedSeverity] || 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Critical">Critical</option>
                <option value="N/A">Not Applicable</option>
              </select>
            </div>
          </div>

          {/* Treatment Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Recommended Treatment (Optional)
            </label>
            <select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- No Treatment / Observation Only --</option>
              <option value="Restoration">Restoration (Composite / Amalgam)</option>
              <option value="Root Canal Treatment">Root Canal Treatment (Endodontic)</option>
              <option value="Crown">Crown / Prosthetic Cap</option>
              <option value="Extraction">Extraction (Routine / Surgical)</option>
              <option value="Scaling">Scaling & Deep Periodontal Cleaning</option>
              <option value="Periodontal Treatment">Periodontal Flap / Gingival Graft</option>
              <option value="Observation">Observation / Re-evaluate at next visit</option>
              <option value="Other">Other Clinical Action</option>
            </select>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Caries on occlusal surface. No pulpal involvement."
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleAddAnother}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#008f8c] text-[#008f8c] bg-white hover:bg-teal-50/60 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Another Finding</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 ${
                savedSuccess
                  ? 'bg-emerald-600'
                  : 'bg-[#008f8c] hover:bg-[#007b78]'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{saving ? 'Saving...' : savedSuccess ? 'Saved ✓' : 'Save Finding'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'Details' && (
        <div className="flex flex-col gap-3 py-1">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Universal Number:</span>
              <span className="font-bold text-slate-800">#{tooth.universal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">FDI Notation:</span>
              <span className="font-bold text-teal-700">Tooth {tooth.fdi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quadrant & Arch:</span>
              <span className="font-bold text-slate-800">{tooth.quadrant} • {tooth.arch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Classification:</span>
              <span className="font-bold text-slate-800">{tooth.toothClass} ({tooth.isAnterior ? 'Anterior' : 'Posterior'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Supported Surfaces:</span>
              <span className="font-semibold text-slate-700 text-[11px]">{tooth.surfaces.join(', ')}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">Recorded Findings for this Tooth</h4>
            {toothHistory.length > 0 ? (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {toothHistory.map((item) => (
                  <div key={item.id} className="p-2 bg-white border border-slate-200 rounded-xl text-xs space-y-0.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.surface} — {item.condition}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${severityBadgeColors[item.severity] || ''}`}>
                        {item.severity}
                      </span>
                    </div>
                    {item.notes && <p className="text-[11px] text-slate-500 italic">{item.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No existing findings recorded on Tooth {tooth.fdi}.</p>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'History' && (
        <div className="flex flex-col gap-2 py-1 max-h-[300px] overflow-y-auto">
          {isLoadingHistory ? (
            <p className="text-xs text-slate-500 text-center py-4">Loading tooth clinical timeline...</p>
          ) : toothHistory.length > 0 ? (
            toothHistory.map((h) => (
              <div key={h.id} className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{h.condition}</span>
                  <span className="text-[10px] text-slate-400">
                    {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center gap-2">
                  <span>Surface: <strong>{h.surface}</strong></span>
                  <span>•</span>
                  <span>Severity: <strong>{h.severity}</strong></span>
                  {h.treatment && (
                    <>
                      <span>•</span>
                      <span>Tx: <strong>{h.treatment}</strong></span>
                    </>
                  )}
                </div>
                {h.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-white p-1 rounded border border-slate-100">
                    {h.notes}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-400">
              <RotateCcw className="w-6 h-6 mx-auto mb-1 text-slate-300 stroke-1" />
              <p className="text-xs">No prior treatment history on Tooth {tooth.fdi}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
