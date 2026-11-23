import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Scissors,
  History,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { Procedure, Patient } from '../../types';
import { ClinicalExaminationSubModule } from './ClinicalExaminationSubModule';
import { ProceduresTreatmentsSubModule, PROCEDURE_CATEGORIES, ProcedureCategoryGroup } from './ProceduresTreatmentsSubModule';
import { ClinicalHistorySubModule } from './ClinicalHistorySubModule';

export { PROCEDURE_CATEGORIES };
export type { ProcedureCategoryGroup };

export type OperationsSubModuleType = 'examination' | 'procedures' | 'history';

interface OperationsModuleProps {
  onNavigateToBillingProcedure?: (procedure: Procedure) => void;
  onNavigateToAppointments?: (patientId?: string) => void;
  initialSubModule?: OperationsSubModuleType;
  initialPatientId?: string | null;
  onSubModuleChange?: (subModule: OperationsSubModuleType) => void;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({
  onNavigateToBillingProcedure,
  onNavigateToAppointments,
  initialSubModule = 'examination',
  initialPatientId = null,
  onSubModuleChange,
}) => {
  const [activeSubModule, setActiveSubModule] = useState<OperationsSubModuleType>(initialSubModule);
  const [activePatientContext, setActivePatientContext] = useState<Patient | null>(null);

  React.useEffect(() => {
    if (initialSubModule) {
      setActiveSubModule(initialSubModule);
    }
  }, [initialSubModule]);

  // Load patient context if initialPatientId is passed from other modules
  useEffect(() => {
    if (initialPatientId && (!activePatientContext || activePatientContext.id !== initialPatientId)) {
      api.get(`/patients/${initialPatientId}`)
        .then((res) => {
          if (res.data.success && res.data.patient) {
            setActivePatientContext(res.data.patient);
          }
        })
        .catch(() => null);
    }
  }, [initialPatientId]);

  const handleSubModuleSwitch = (sm: OperationsSubModuleType) => {
    setActiveSubModule(sm);
    if (onSubModuleChange) {
      onSubModuleChange(sm);
    }
  };

  // Sub-module navigation tabs config
  const subModules = [
    {
      id: 'examination' as OperationsSubModuleType,
      label: 'Clinical Notes & Examination',
      shortLabel: 'Examination',
      icon: Stethoscope,
      description: 'Patient complaints, consulting doctor, clinical findings & recommended treatments',
    },
    {
      id: 'procedures' as OperationsSubModuleType,
      label: 'Procedures & Treatments',
      shortLabel: 'Procedures',
      icon: Scissors,
      description: 'Record actual dental procedures performed, tooth numbers, status & charges',
    },
    {
      id: 'history' as OperationsSubModuleType,
      label: 'Clinical & Treatment History',
      shortLabel: 'Clinical History',
      icon: History,
      description: 'Visit-grouped historical clinical notes, examination findings & performed procedures',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* OPERATIONS & PROCEDURES TOP SUB-MODULE NAVIGATION BAR    */}
      {/* ======================================================== */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operations & Procedures Module
            </div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">Clinical Care Workflow</h1>
          </div>
        </div>

        {/* 3 Sub-Module Nav Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto">
          {subModules.map((sm) => {
            const Icon = sm.icon;
            const isActive = activeSubModule === sm.id;

            return (
              <button
                type="button"
                key={sm.id}
                onClick={() => handleSubModuleSwitch(sm.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{sm.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ACTIVE SUB-MODULE PAGE CONTAINER                         */}
      {/* ======================================================== */}
      <div className="w-full">
        {/* SUB-MODULE 1: CLINICAL NOTES & EXAMINATION */}
        {activeSubModule === 'examination' && (
          <ClinicalExaminationSubModule
            initialPatient={activePatientContext}
            onNavigateToAppointments={onNavigateToAppointments}
            onNavigateToProcedures={(p) => {
              setActivePatientContext(p);
              handleSubModuleSwitch('procedures');
            }}
            onNavigateToHistory={(p) => {
              setActivePatientContext(p);
              handleSubModuleSwitch('history');
            }}
          />
        )}

        {/* SUB-MODULE 2: PROCEDURES & TREATMENTS */}
        {activeSubModule === 'procedures' && (
          <ProceduresTreatmentsSubModule
            initialPatient={activePatientContext}
            onNavigateToBillingProcedure={onNavigateToBillingProcedure}
            onNavigateToAppointments={onNavigateToAppointments}
            onNavigateToHistory={(p) => {
              setActivePatientContext(p);
              handleSubModuleSwitch('history');
            }}
          />
        )}

        {/* SUB-MODULE 3: CLINICAL & TREATMENT HISTORY */}
        {activeSubModule === 'history' && (
          <ClinicalHistorySubModule
            initialPatient={activePatientContext}
            onNavigateToExamination={(p) => {
              setActivePatientContext(p);
              handleSubModuleSwitch('examination');
            }}
            onNavigateToProcedure={(p) => {
              setActivePatientContext(p);
              handleSubModuleSwitch('procedures');
            }}
          />
        )}
      </div>
    </div>
  );
};
