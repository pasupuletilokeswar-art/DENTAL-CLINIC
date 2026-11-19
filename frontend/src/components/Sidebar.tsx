import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Pill,
  Scissors,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Stethoscope,
  History,
  FlaskConical,
  PlusCircle,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout?: () => void;
  isSocketConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
}) => {
  const [operationsExpanded, setOperationsExpanded] = useState(true);
  const [labExpanded, setLabExpanded] = useState(true);

  // Auto-expand sub-menus when any matching tab is active
  useEffect(() => {
    if (activeTab.startsWith('operations')) {
      setOperationsExpanded(true);
    }
    if (activeTab.startsWith('dental-lab')) {
      setLabExpanded(true);
    }
  }, [activeTab]);

  const operationsSubItems = [
    {
      id: 'operations-examination',
      label: 'Clinical Notes & Examination',
      icon: Stethoscope,
    },
    {
      id: 'operations-procedures',
      label: 'Procedures & Treatments',
      icon: Scissors,
    },
    {
      id: 'operations-history',
      label: 'Clinical & Treatment History',
      icon: History,
    },
  ];

  const labSubItems = [
    {
      id: 'dental-lab-dashboard',
      label: 'Lab Dashboard & Overview',
      icon: Activity,
    },
    {
      id: 'dental-lab-reports',
      label: 'All Patient Lab Reports',
      icon: FileText,
    },
    {
      id: 'dental-lab-create',
      label: 'Add Lab Report',
      icon: PlusCircle,
    },
  ];

  const menuItems: Array<{
    id: string;
    label: string;
    icon: any;
    hasSubModules?: boolean;
    subItems?: Array<{ id: string; label: string; icon: any }>;
    isExpanded?: boolean;
    setExpanded?: (val: boolean) => void;
    defaultTab?: string;
    activePrefix?: string;
  }> = [
    { id: 'dashboard', label: 'Reception Dashboard', icon: Activity },
    { id: 'patients', label: 'Patient Directory', icon: Users },
    { id: 'appointments', label: 'Appointments & Slots', icon: Calendar },
    { id: 'clinical-notes', label: '9-Field Clinical Notes', icon: FileText },
    { id: 'dental-chart', label: '3D Dental Charting', icon: Stethoscope },
    { id: 'billing', label: 'Consultation Billing', icon: CreditCard },
    { id: 'pharmacy', label: 'Pharmacy & Stock (FEFO)', icon: Pill },
    {
      id: 'operations',
      label: 'Operations & Procedures',
      icon: Scissors,
      hasSubModules: true,
      subItems: operationsSubItems,
      isExpanded: operationsExpanded,
      setExpanded: setOperationsExpanded,
      defaultTab: 'operations-examination',
      activePrefix: 'operations',
    },
    {
      id: 'dental-lab',
      label: 'Dental Lab',
      icon: FlaskConical,
      hasSubModules: true,
      subItems: labSubItems,
      isExpanded: labExpanded,
      setExpanded: setLabExpanded,
      defaultTab: 'dental-lab-dashboard',
      activePrefix: 'dental-lab',
    },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    ...(user.role === 'ADMIN' ? [{ id: 'admin', label: 'Admin: Manage Users', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 text-slate-800 flex flex-col shrink-0 rounded-none font-sans select-none">
      {/* Brand Header: Crisp HospAI Dental Logo on White-Grey */}
      <div className="h-28 px-3 flex items-center justify-center border-b border-slate-200 bg-white shadow-xs shrink-0">
        <img
          src="/assets/hospai-logo.png"
          alt="HospAI Dental"
          className="h-20 w-auto max-w-[225px] object-contain transition-transform hover:scale-105"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Clinical Workflows</span>
          <span className="w-8 h-px bg-slate-200" />
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;

          // Special rendering for Modules with sub-modules (Operations and Dental Lab)
          if (item.hasSubModules && item.subItems) {
            const isGroupActive = activeTab.startsWith(item.activePrefix || item.id);
            const isExpanded = item.isExpanded ?? true;

            return (
              <div key={item.id} className="space-y-1">
                {/* Parent Module Item */}
                <div
                  onClick={() => {
                    if (!isGroupActive && item.defaultTab) {
                      setActiveTab(item.defaultTab);
                    }
                    if (item.setExpanded) {
                      item.setExpanded(!isExpanded);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isGroupActive
                      ? 'bg-slate-200/90 text-slate-900 font-bold border border-slate-300/70 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isGroupActive ? 'text-blue-600' : 'text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.setExpanded) {
                        item.setExpanded(!isExpanded);
                      }
                    }}
                    className="p-1 hover:bg-slate-300/60 rounded text-slate-500 cursor-pointer"
                    title={isExpanded ? 'Collapse sub-modules' : 'Expand sub-modules'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </button>
                </div>

                {/* Sub-Modules Navigation List */}
                {isExpanded && (
                  <div className="ml-3 pl-2.5 border-l-2 border-blue-200/80 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {item.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === sub.id ||
                        (activeTab === item.id && sub.id === item.defaultTab);

                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-gradient-to-r from-teal-600 to-sky-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                          }`}
                        >
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive ? 'text-white' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Standard Menu Item
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-teal-600 to-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
