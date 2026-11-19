import React from 'react';
import { ClipboardList, Edit3, Trash2 } from 'lucide-react';
import { DentalFindingItem, getConditionColor } from '../types/dentalChart.types';

interface DentalChartSummaryProps {
  findings: DentalFindingItem[];
  onSelectTooth: (fdi: number) => void;
  onDeleteFinding: (id: string) => void;
}

export const DentalChartSummary: React.FC<DentalChartSummaryProps> = ({
  findings,
  onSelectTooth,
  onDeleteFinding,
}) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-sm select-none flex flex-col justify-between">
      <div>
        {/* Card Header matching reference image */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <ClipboardList className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Dental Chart Summary</h3>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                <th className="pb-2.5 font-bold">Tooth</th>
                <th className="pb-2.5 font-bold">Surface</th>
                <th className="pb-2.5 font-bold">Condition</th>
                <th className="pb-2.5 font-bold">Severity</th>
                <th className="pb-2.5 font-bold">Notes</th>
                <th className="pb-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {findings.length > 0 ? (
                findings.map((item) => {
                  const condColor = getConditionColor(item.condition);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectTooth(item.toothNumber)}
                    >
                      <td className="py-2.5 font-black text-slate-900">
                        {item.toothNumber}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-600">
                        {item.surface}
                      </td>
                      <td className="py-2.5">
                        <span
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold inline-block"
                          style={{
                            backgroundColor: `${condColor}20`,
                            color: condColor,
                            border: `1px solid ${condColor}40`,
                          }}
                        >
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-600">
                        {item.severity}
                      </td>
                      <td className="py-2.5 text-slate-500 max-w-[200px] truncate text-[11px]">
                        {item.notes || '—'}
                      </td>
                      <td className="py-2.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectTooth(item.toothNumber)}
                          className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition cursor-pointer"
                          title="Inspect Tooth"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFinding(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Delete Finding"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                    No clinical findings recorded for this patient yet. Select a tooth to chart a condition.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
