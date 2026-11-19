import React from 'react';
import { ADULT_TEETH, DentalFindingItem, ToothDefinition, getConditionColor } from '../types/dentalChart.types';

interface DentalChart2DProps {
  selectedFDI: number;
  onSelectTooth: (fdi: number) => void;
  findings: DentalFindingItem[];
}

export const DentalChart2D: React.FC<DentalChart2DProps> = ({
  selectedFDI,
  onSelectTooth,
  findings,
}) => {
  const upperTeeth = ADULT_TEETH.filter((t) => t.arch === 'UPPER');
  const lowerTeeth = ADULT_TEETH.filter((t) => t.arch === 'LOWER');

  // Surface conditions map: key is `${toothNumber}_${surface}`
  const surfaceFindingsMap = new Map<string, string>();
  const wholeToothFindingsMap = new Map<number, string>();

  findings.forEach((f) => {
    const key = `${f.toothNumber}_${f.surface}`;
    surfaceFindingsMap.set(key, getConditionColor(f.condition));
    if (!wholeToothFindingsMap.has(f.toothNumber)) {
      wholeToothFindingsMap.set(f.toothNumber, getConditionColor(f.condition));
    }
  });

  // Render individual 2D tooth with 5-segment anatomical diagram
  const renderToothDiagram = (tooth: ToothDefinition) => {
    const isSelected = tooth.fdi === selectedFDI;
    const wholeColor = wholeToothFindingsMap.get(tooth.fdi);

    const occSurface = tooth.isAnterior ? 'Incisal' : 'Occlusal';
    const bucSurface = tooth.isAnterior ? 'Labial' : 'Buccal';

    const occColor = surfaceFindingsMap.get(`${tooth.fdi}_${occSurface}`) || surfaceFindingsMap.get(`${tooth.fdi}_Occlusal`) || surfaceFindingsMap.get(`${tooth.fdi}_Incisal`);
    const bucColor = surfaceFindingsMap.get(`${tooth.fdi}_${bucSurface}`) || surfaceFindingsMap.get(`${tooth.fdi}_Buccal`) || surfaceFindingsMap.get(`${tooth.fdi}_Labial`);
    const linColor = surfaceFindingsMap.get(`${tooth.fdi}_Lingual`);
    const mesColor = surfaceFindingsMap.get(`${tooth.fdi}_Mesial`);
    const disColor = surfaceFindingsMap.get(`${tooth.fdi}_Distal`);

    return (
      <div
        key={tooth.fdi}
        onClick={() => onSelectTooth(tooth.fdi)}
        className={`flex flex-col items-center p-2 rounded-xl transition cursor-pointer group ${
          isSelected
            ? 'bg-teal-50 border-2 border-teal-500 shadow-sm scale-105'
            : 'bg-white border border-slate-200 hover:border-teal-300 hover:bg-slate-50'
        }`}
      >
        <span className="text-[11px] font-black text-slate-800 mb-1">
          {tooth.fdi}
        </span>

        {/* 5-Segment Anatomical Odontogram SVG */}
        <svg viewBox="0 0 40 40" className="w-9 h-9">
          {/* Top segment: Buccal / Labial */}
          <polygon
            points="0,0 40,0 28,12 12,12"
            fill={bucColor || '#f8fafc'}
            stroke="#94a3b8"
            strokeWidth="0.8"
            className="hover:opacity-80 transition"
          />

          {/* Bottom segment: Lingual */}
          <polygon
            points="0,40 40,40 28,28 12,28"
            fill={linColor || '#f8fafc'}
            stroke="#94a3b8"
            strokeWidth="0.8"
            className="hover:opacity-80 transition"
          />

          {/* Left segment: Mesial */}
          <polygon
            points="0,0 12,12 12,28 0,40"
            fill={mesColor || '#f8fafc'}
            stroke="#94a3b8"
            strokeWidth="0.8"
            className="hover:opacity-80 transition"
          />

          {/* Right segment: Distal */}
          <polygon
            points="40,0 28,12 28,28 40,40"
            fill={disColor || '#f8fafc'}
            stroke="#94a3b8"
            strokeWidth="0.8"
            className="hover:opacity-80 transition"
          />

          {/* Center segment: Occlusal / Incisal */}
          <rect
            x="12"
            y="12"
            width="16"
            height="16"
            fill={occColor || (wholeColor && !bucColor && !linColor ? wholeColor : '#ffffff')}
            stroke="#64748b"
            strokeWidth="1.0"
            className="hover:opacity-80 transition"
          />
        </svg>

        <span className="text-[9px] text-slate-400 font-semibold mt-1">
          #{tooth.universal}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-[500px] lg:min-h-[560px] bg-slate-100/90 rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-around select-none">
      {/* Maxillary (Upper) Arch */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-teal-800 uppercase tracking-wider">
            Maxillary Arch (Upper Teeth 18 – 28)
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">
            Right Quadrant 1 • Left Quadrant 2
          </span>
        </div>

        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          {upperTeeth.map(renderToothDiagram)}
        </div>
      </div>

      {/* Midline Divider */}
      <div className="my-2 border-t-2 border-dashed border-slate-300 flex items-center justify-center">
        <span className="bg-slate-200 text-slate-600 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider -mt-3">
          Occlusal Plane Midline
        </span>
      </div>

      {/* Mandibular (Lower) Arch */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-teal-800 uppercase tracking-wider">
            Mandibular Arch (Lower Teeth 48 – 38)
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">
            Right Quadrant 4 • Left Quadrant 3
          </span>
        </div>

        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          {lowerTeeth.map(renderToothDiagram)}
        </div>
      </div>
    </div>
  );
};
