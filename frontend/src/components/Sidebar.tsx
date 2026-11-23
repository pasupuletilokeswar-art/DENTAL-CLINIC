import React, { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ShieldCheck,
  Stethoscope,
  History,
  ShoppingCart,
  PlusCircle,
  Truck,
  Package,
  FlaskConical,
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
  isSocketConnected = true,
}) => {
  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hospai_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [operationsExpanded, setOperationsExpanded] = useState<boolean>(() => activeTab.startsWith('operations'));
  const [collapsedOpsOpen, setCollapsedOpsOpen] = useState<boolean>(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const [pharmacyExpanded, setPharmacyExpanded] = useState<boolean>(() => activeTab.startsWith('pharmacy'));
  const [collapsedPharmacyOpen, setCollapsedPharmacyOpen] = useState<boolean>(false);
  const pharmacyFlyoutRef = useRef<HTMLDivElement>(null);

  const [labExpanded, setLabExpanded] = useState<boolean>(() => activeTab.startsWith('dental-lab'));
  const [collapsedLabOpen, setCollapsedLabOpen] = useState<boolean>(false);
  const labFlyoutRef = useRef<HTMLDivElement>(null);

  // Sub-menus remain closed by default and only open when clicked / active
  useEffect(() => {
    if (activeTab.startsWith('operations')) {
      setOperationsExpanded(true);
      setPharmacyExpanded(false);
      setLabExpanded(false);
    } else if (activeTab.startsWith('pharmacy')) {
      setPharmacyExpanded(true);
      setOperationsExpanded(false);
      setLabExpanded(false);
    } else if (activeTab.startsWith('dental-lab')) {
      setLabExpanded(true);
      setOperationsExpanded(false);
      setPharmacyExpanded(false);
    } else {
      setOperationsExpanded(false);
      setPharmacyExpanded(false);
      setLabExpanded(false);
    }
  }, [activeTab]);

  // Close collapsed flyout when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setCollapsedOpsOpen(false);
      }
      if (pharmacyFlyoutRef.current && !pharmacyFlyoutRef.current.contains(e.target as Node)) {
        setCollapsedPharmacyOpen(false);
      }
      if (labFlyoutRef.current && !labFlyoutRef.current.contains(e.target as Node)) {
        setCollapsedLabOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hospai_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const pharmacySubItems = [
    {
      id: 'pharmacy-billing',
      label: 'Billing Desk (POS)',
      icon: ShoppingCart,
    },
    {
      id: 'pharmacy-inventory',
      label: 'Add Inventory Master',
      icon: PlusCircle,
    },
    {
      id: 'pharmacy-orders',
      label: 'Stock Orders & POs',
      icon: Truck,
    },
    {
      id: 'pharmacy-stock',
      label: 'Batch Stock & FEFO',
      icon: Package,
    },
    {
      id: 'pharmacy-history',
      label: 'Invoices History',
      icon: History,
    },
  ];

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

  const isDoctor = user.role === 'DOCTOR_DENTAL' || user.role === 'DOCTOR_ORTHO';

  const allMenuItems: Array<{
    id: string;
    label: string;
    icon: any;
    hasSubModules?: boolean;
    subItems?: Array<{ id: string; label: string; icon: any }>;
    isExpanded?: boolean;
    setExpanded?: (val: boolean) => void;
    defaultTab?: string;
    activePrefix?: string;
    roles?: string[];
  }> = [
    { id: 'dashboard', label: 'Reception Dashboard', icon: Activity, roles: ['ADMIN', 'RECEPTIONIST'] },
    {
      id: 'appointments',
      label: isDoctor ? 'My Doctor Queue' : 'Appointments & Slots',
      icon: Calendar,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR_DENTAL', 'DOCTOR_ORTHO'],
    },
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
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR_DENTAL', 'DOCTOR_ORTHO'],
    },
    {
      id: 'patients',
      label: 'Patient Directory',
      icon: Users,
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR_DENTAL', 'DOCTOR_ORTHO'],
    },
    { id: 'billing', label: 'Consultation Billing', icon: CreditCard, roles: ['ADMIN', 'RECEPTIONIST'] },
    {
      id: 'pharmacy',
      label: 'Pharmacy & Stock (FEFO)',
      icon: Pill,
      hasSubModules: true,
      subItems: pharmacySubItems,
      isExpanded: pharmacyExpanded,
      setExpanded: setPharmacyExpanded,
      defaultTab: 'pharmacy-billing',
      activePrefix: 'pharmacy',
      roles: ['ADMIN', 'RECEPTIONIST'],
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
      roles: ['ADMIN', 'RECEPTIONIST', 'DOCTOR_DENTAL', 'DOCTOR_ORTHO'],
    },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['ADMIN', 'RECEPTIONIST'] },
    { id: 'admin', label: 'Admin & Staff Setup', icon: ShieldCheck, roles: ['ADMIN', 'RECEPTIONIST'] },
  ];

  const parseAllowedModules = (raw: any): string[] => {
    if (!raw) return ['appointments', 'operations', 'patients', 'dental-lab'];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['appointments', 'operations', 'patients', 'dental-lab'];
  };

  const doctorAllowed = isDoctor ? parseAllowedModules(user.allowedModules) : null;

  const menuItems = allMenuItems.filter((item) => {
    if (isDoctor && doctorAllowed) {
      return doctorAllowed.includes(item.id);
    }
    return !item.roles || item.roles.includes(user.role);
  });

  return (
    <aside
      className={`relative bg-slate-50 border-r border-slate-200 text-slate-800 flex flex-col shrink-0 rounded-none font-sans select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header: Original HospAI Dental Logo (Untouched, perfectly centered) */}
      <div className="h-28 px-3 flex items-center justify-center border-b border-slate-200 bg-white shadow-xs shrink-0">
        <img
          src="/assets/hospai-logo.png"
          alt="HospAI Dental"
          className={`${
            isCollapsed ? 'h-12 w-auto max-w-[56px]' : 'h-20 w-auto max-w-[225px]'
          } object-contain transition-all duration-300 hover:scale-105`}
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden relative z-10">
        {/* Module Header Bar with Blue Toggle Button */}
        {!isCollapsed ? (
          <div className="px-3 pb-2 pt-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="text-blue-900/60 font-bold">Clinical Workflows</span>
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-6 h-6 rounded-md border border-blue-200 bg-blue-50/90 hover:bg-blue-100 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[3] text-blue-600 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center pb-2 pt-1 mb-2 border-b border-slate-200/80">
            <button
              type="button"
              onClick={toggleCollapse}
              className="w-7 h-7 rounded-lg border border-blue-200 bg-blue-50/90 hover:bg-blue-100 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4 stroke-[3] text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;

          // Special handling for modules with sub-modules (Pharmacy, Operations, Dental Lab)
          if (item.hasSubModules && item.subItems) {
            const isPharmacy = item.id === 'pharmacy';
            const isLab = item.id === 'dental-lab';
            const isItemActive = activeTab.startsWith(item.activePrefix || item.id);
            const subItems = item.subItems;
            const isExpanded = item.isExpanded ?? false;
            const setExpanded = item.setExpanded;
            const defaultTab = item.defaultTab || subItems[0]?.id;

            const isFlyoutOpen = isPharmacy
              ? collapsedPharmacyOpen
              : isLab
              ? collapsedLabOpen
              : collapsedOpsOpen;
            const setFlyoutOpen = isPharmacy
              ? setCollapsedPharmacyOpen
              : isLab
              ? setCollapsedLabOpen
              : setCollapsedOpsOpen;
            const itemFlyoutRef = isPharmacy
              ? pharmacyFlyoutRef
              : isLab
              ? labFlyoutRef
              : flyoutRef;

            // Theme colors: Green for pharmacy, indigo for lab, blue for operations
            const activeGradient = isPharmacy
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-bold'
              : isLab
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs font-bold'
              : 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-xs font-bold';

            const activeSolid = isPharmacy
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : isLab
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'bg-blue-600 text-white font-bold shadow-xs';

            const hoverSub = isPharmacy
              ? 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
              : isLab
              ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80'
              : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/80';

            const iconColor = isPharmacy
              ? 'text-emerald-600'
              : isLab
              ? 'text-indigo-600'
              : 'text-blue-600';

            const parentActiveStyle = isPharmacy
              ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-2xs'
              : isLab
              ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200/80 shadow-2xs'
              : 'bg-blue-50 text-blue-900 font-bold border border-blue-200/80 shadow-2xs';

            const borderLColor = isPharmacy
              ? 'border-emerald-200'
              : isLab
              ? 'border-indigo-200'
              : 'border-blue-200';

            // Collapsed Mode: Flyout Menu
            if (isCollapsed) {
              return (
                <div key={item.id} className="relative group" ref={itemFlyoutRef}>
                  <button
                    type="button"
                    onClick={() => setFlyoutOpen(!isFlyoutOpen)}
                    className={`w-full h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                      isItemActive
                        ? activeGradient
                        : isPharmacy
                        ? 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                        : isLab
                        ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/70'
                        : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                  </button>

                  {/* Flyout Popover on Hover or Click */}
                  <div className="absolute left-full top-0 ml-2.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2 px-2 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-900 border-b border-slate-100 mb-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    {subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === sub.id ||
                        (activeTab === item.id && sub.id === defaultTab);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(sub.id);
                            setFlyoutOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                            isSubActive ? activeSolid : hoverSub
                          }`}
                        >
                          <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-white' : iconColor}`} />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Expanded Mode: Accordion List
            return (
              <div key={item.id} className="space-y-1">
                <div
                  onClick={() => {
                    if (!isItemActive) {
                      setActiveTab(defaultTab);
                    }
                    if (setExpanded) {
                      setExpanded(!isExpanded);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isItemActive
                      ? parentActiveStyle
                      : isPharmacy
                      ? 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                      : isLab
                      ? 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isItemActive ? iconColor : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setExpanded) {
                        setExpanded(!isExpanded);
                      }
                    }}
                    className={`p-1 rounded text-slate-500 cursor-pointer transition-colors ${
                      isPharmacy
                        ? 'hover:bg-emerald-100/70 hover:text-emerald-700'
                        : isLab
                        ? 'hover:bg-indigo-100/70 hover:text-indigo-700'
                        : 'hover:bg-blue-100/70 hover:text-blue-700'
                    }`}
                    title={isExpanded ? 'Collapse sub-modules' : 'Expand sub-modules'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className={`ml-3 pl-2.5 border-l-2 ${borderLColor} space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150`}>
                    {subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        activeTab === sub.id ||
                        (activeTab === item.id && sub.id === defaultTab);

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-left ${
                            isSubActive ? activeGradient : hoverSub
                          }`}
                        >
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive ? 'text-white' : iconColor
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

          // Standard Menu Items
          const isActive = activeTab === item.id;

          // Collapsed Mode: Centered icon with floating tooltip
          if (isCollapsed) {
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                </button>

                {/* Floating Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              </div>
            );
          }

          // Expanded Mode: Full row
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-sm shadow-blue-500/20 font-bold'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
            </button>
          );
        })}
      </nav>

      {/* Translucent Dental Tooth Watermark Symbol at Bottom Right */}
      <div
        className={`absolute bottom-12 right-2 pointer-events-none select-none transition-all duration-300 z-0 ${
          isCollapsed ? 'opacity-20 scale-75' : 'opacity-40'
        }`}
        aria-hidden="true"
      >
        <img
          src="/assets/dental-tooth-symbol.png"
          alt=""
          className="w-24 h-24 object-contain"
        />
      </div>

      {/* Bottom Footer: Live Sync Status */}
      <div className="relative p-3 border-t border-slate-200 bg-white/80 overflow-hidden shrink-0 z-10 backdrop-blur-xs">
        <div
          className={`relative z-10 flex items-center transition-all ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSocketConnected ? 'bg-sky-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSocketConnected ? 'bg-sky-600' : 'bg-amber-500'
                }`}
              />
            </span>
            {!isCollapsed && (
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isSocketConnected ? 'Live Sync Active' : 'Reconnecting...'}
              </span>
            )}
          </div>

          {!isCollapsed && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
              {user.role === 'ADMIN' ? 'Admin / Desk' : user.role === 'RECEPTIONIST' ? 'Receptionist' : 'Clinic Desk'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
