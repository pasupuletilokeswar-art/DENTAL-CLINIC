import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Check, Phone, Plus } from 'lucide-react';
import api from '../services/api';
import { Patient } from '../types';

interface PatientSearchSelectProps {
  label?: string;
  placeholder?: string;
  selectedPatient: Patient | null;
  onSelect: (patient: Patient | null) => void;
  onAddNewPatient?: () => void;
  required?: boolean;
  className?: string;
}

export const PatientSearchSelect: React.FC<PatientSearchSelectProps> = ({
  label,
  placeholder = 'Type patient name, phone, or DOC ID...',
  selectedPatient,
  onSelect,
  onAddNewPatient,
  required = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/patients', { params: { search: query.trim(), limit: 10 } });
        if (res.data.success) {
          setResults(res.data.patients);
        }
      } catch (err) {
        console.error('Error searching patients:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {selectedPatient ? (
        <div className="flex items-center justify-between p-2.5 bg-teal-50/80 border border-teal-300 rounded-xl transition">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {selectedPatient.name.charAt(0)}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>{selectedPatient.name}</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-1.5 py-0.2 rounded font-semibold">
                  {selectedPatient.patientCode}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{selectedPatient.gender} • {selectedPatient.age} yrs</span>
                <span>•</span>
                <span>{selectedPatient.mobile}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown List */}
      {isOpen && !selectedPatient && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
          {loading && (
            <div className="p-3 text-center text-xs text-slate-400">Searching patients...</div>
          )}

          {!loading && query.trim().length > 0 && results.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500">No patients found for "{query}"</p>
              {onAddNewPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNewPatient();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register "{query}" as New Patient</span>
                </button>
              )}
            </div>
          )}

          {!loading && results.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                onSelect(p);
                setIsOpen(false);
                setQuery('');
              }}
              className="p-3 hover:bg-teal-50/60 cursor-pointer transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                    {p.patientCode}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{p.gender} • {p.age} yrs</span>
                  <span>•</span>
                  <span>{p.mobile}</span>
                </div>
              </div>
              <span className="text-teal-600 font-bold text-xs">Select →</span>
            </div>
          ))}

          {!loading && query.trim().length === 0 && (
            <div className="p-3 text-center text-xs text-slate-400">
              Start typing name, phone number, or DOC ID...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

