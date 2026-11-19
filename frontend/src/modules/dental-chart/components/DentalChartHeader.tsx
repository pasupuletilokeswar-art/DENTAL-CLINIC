import React from 'react';
import { LayoutGrid, ArrowLeft, User as UserIcon } from 'lucide-react';

interface PatientOption {
  id: string;
  name: string;
  patientCode: string;
  age: number;
  gender: string;
}

interface DentalChartHeaderProps {
  viewMode: '3D' | '2D';
  onViewModeChange: (mode: '3D' | '2D') => void;
  selectedPatient: PatientOption | null;
  patients: PatientOption[];
  onSelectPatient: (patient: PatientOption) => void;
  onBack?: () => void;
}

export const DentalChartHeader: React.FC<DentalChartHeaderProps> = ({
  viewMode,
  onViewModeChange,
  selectedPatient,
  patients,
  onSelectPatient,
  onBack,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 select-none shrink-0 shadow-2xs">
      {/* Left: Tooth Logo & Title */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Return to Clinic Dashboard"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-2xs">
          {/* Stylized Tooth SVG matching reference */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3c-3 1-4 5-2 9 1 2 1 9 4 9 2 0 1-6 3-6s1 6 3 6c3 0 3-7 4-9 2-4 1-8-2-9-2-1-3 1-5 1S9 2 7 3Z" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dental Charting</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 border border-teal-200">
              Interactive 3D Odontogram
            </span>
          </h1>
        </div>
      </div>

      {/* Center: Patient Quick Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <UserIcon className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-slate-500 font-medium">Patient:</span>
          {patients.length > 0 ? (
            <select
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const p = patients.find((pat) => pat.id === e.target.value);
                if (p) onSelectPatient(p);
              }}
              className="font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              {patients.map((pat) => (
                <option key={pat.id} value={pat.id}>
                  {pat.name} ({pat.patientCode}) — {pat.age}y {pat.gender}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-slate-700">Loading patients...</span>
          )}
        </div>
      </div>

      {/* Right: 3D View / 2D Chart Toggle Switch */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
          {/* 3D View Toggle */}
          <button
            type="button"
            onClick={() => onViewModeChange('3D')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === '3D'
                ? 'bg-[#008f8c] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3c-3 1-4 5-2 9 1 2 1 9 4 9 2 0 1-6 3-6s1 6 3 6c3 0 3-7 4-9 2-4 1-8-2-9-2-1-3 1-5 1S9 2 7 3Z" />
            </svg>
            <span>3D View</span>
          </button>

          {/* 2D Chart Toggle */}
          <button
            type="button"
            onClick={() => onViewModeChange('2D')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === '2D'
                ? 'bg-[#008f8c] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2D Chart</span>
          </button>
        </div>
      </div>
    </header>
  );
};
