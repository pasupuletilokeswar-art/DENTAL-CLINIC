import React, { useState, useMemo } from 'react';
import {
  CLINICAL_CONDITIONS,
  ConditionDefinition,
  getConditionColor,
} from '../types/dentalChart.types';

interface ClinicalFindingsSelectorProps {
  selectedCondition: string;
  onSelectCondition: (conditionName: string) => void;
  className?: string;
}

export const ClinicalFindingsSelector: React.FC<ClinicalFindingsSelectorProps> = ({
  selectedCondition,
  onSelectCondition,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Extract unique categories in original order
  const categories = useMemo(() => {
    const cats: string[] = [];
    CLINICAL_CONDITIONS.forEach((cond) => {
      const cat = cond.category || 'Other';
      if (!cats.includes(cat)) {
        cats.push(cat);
      }
    });
    return cats;
  }, []);

  // Filter conditions based on search query and category
  const filteredConditions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CLINICAL_CONDITIONS.filter((cond) => {
      const matchesCategory =
        selectedCategory === 'ALL' || cond.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;

      const nameMatch = cond.name.toLowerCase().includes(q);
      const catMatch = (cond.category || '').toLowerCase().includes(q);
      const idMatch = cond.id ? String(cond.id) === q || `diagnose ${cond.id}`.includes(q) : false;

      return nameMatch || catMatch || idMatch;
    });
  }, [searchQuery, selectedCategory]);

  // Find currently selected condition object
  const activeConditionObj = useMemo(() => {
    return CLINICAL_CONDITIONS.find(
      (c) => c.name.toLowerCase() === selectedCondition.toLowerCase()
    );
  }, [selectedCondition]);

  return (
    <div
      className={`w-full bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col gap-2.5 ${
        className || ''
      }`}
    >
      {/* Header & Active Selection */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-800 tracking-tight uppercase">
            Clinical Findings & Diagnoses
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {filteredConditions.length} / {CLINICAL_CONDITIONS.length}
          </span>
        </div>

        {/* Current Active Finding Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 border border-teal-200 rounded-lg text-xs">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">
            Selected:
          </span>
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: getConditionColor(selectedCondition) }}
          />
          <span className="font-bold text-teal-900 truncate max-w-[200px]" title={selectedCondition}>
            {activeConditionObj?.id ? `#${activeConditionObj.id} ` : ''}
            {selectedCondition}
          </span>
        </div>
      </div>

      {/* Search Bar & Category Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Search Bar Input */}
        <div className="sm:col-span-7 relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 386 diagnoses (e.g. Caries, Pulpitis, Fracture, Cyst...)"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Select Filter */}
        <div className="sm:col-span-5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white truncate cursor-pointer"
          >
            <option value="ALL">All 17 Categories ({CLINICAL_CONDITIONS.length})</option>
            {categories.map((cat) => {
              const count = CLINICAL_CONDITIONS.filter((c) => c.category === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Scrollable Findings Grid/List */}
      <div className="h-[210px] overflow-y-auto pr-1 border border-slate-100 rounded-xl bg-slate-50/50 p-2 space-y-1.5 focus:outline-none">
        {filteredConditions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-6">
            <svg
              className="w-6 h-6 mb-1 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-slate-500">No findings match "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="mt-2 text-teal-600 font-bold hover:underline cursor-pointer"
            >
              Reset search & filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredConditions.map((cond) => {
              const isSelected =
                cond.name.toLowerCase() === selectedCondition.toLowerCase();
              return (
                <button
                  key={`${cond.name}-${cond.id || ''}`}
                  type="button"
                  onClick={() => onSelectCondition(cond.name)}
                  className={`text-left p-2 rounded-xl border text-xs transition-all flex items-start gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 border-teal-500 shadow-2xs ring-1 ring-teal-500 text-teal-950 font-bold'
                      : 'bg-white border-slate-200/90 hover:border-teal-300 hover:bg-slate-50 text-slate-800 font-medium'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 shadow-2xs"
                    style={{ backgroundColor: cond.legendColor || getConditionColor(cond.name) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 leading-tight">
                      {cond.id && (
                        <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          #{cond.id}
                        </span>
                      )}
                      <span className="truncate" title={cond.name}>
                        {cond.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                      {cond.category}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-teal-600 font-bold shrink-0 ml-1">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
