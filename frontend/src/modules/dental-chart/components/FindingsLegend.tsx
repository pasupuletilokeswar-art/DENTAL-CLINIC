import React from 'react';
import { FINDINGS_LEGEND } from '../types/dentalChart.types';

export const FindingsLegend: React.FC = () => {
  const legendItems = Object.entries(FINDINGS_LEGEND);

  return (
    <div className="w-full lg:w-[430px] bg-white border border-slate-200 rounded-3xl p-5 shadow-sm select-none shrink-0 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
          Findings Legend
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
          {legendItems.map(([key, item]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-semibold text-slate-700 truncate">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Selected Tooth Indicator:</span>
        <span className="flex items-center gap-1.5 font-bold text-cyan-600">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-200 animate-pulse" />
          Cyan Outline
        </span>
      </div>
    </div>
  );
};
