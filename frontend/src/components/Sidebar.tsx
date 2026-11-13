import React from 'react';
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
  ShieldCheck,
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
  const menuItems = [
    { id: 'dashboard', label: 'Reception Dashboard', icon: Activity },
    { id: 'patients', label: 'Patient Directory', icon: Users },
    { id: 'appointments', label: 'Appointments & Slots', icon: Calendar },
    { id: 'clinical-notes', label: '9-Field Clinical Notes', icon: FileText },
    { id: 'billing', label: 'Consultation Billing', icon: CreditCard },
    { id: 'pharmacy', label: 'Pharmacy & Stock (FEFO)', icon: Pill },
    { id: 'operations', label: 'Operations & Procedures', icon: Scissors },
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
