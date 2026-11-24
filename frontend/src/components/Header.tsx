import React from 'react';
import { Calendar, UserPlus, LogOut } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onQuickAction: (action: string) => void;
  activeTabName: string;
  onLogout: () => void;
  isSocketConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ user, onQuickAction, activeTabName, onLogout, isSocketConnected }) => {
  const isDashboard = activeTabName.toLowerCase() === 'dashboard';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <header className="no-print bg-white border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-2xs">
      <div>
        <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
          {isDashboard ? (
            <>
              Good {getGreeting()},{' '}
              <span className="text-[#0284c7]">{user.fullName || 'Clinic Administrator'}</span>
            </>
          ) : (
            <span className="capitalize">{activeTabName}</span>
          )}
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">HospAI Real-Time Dental Clinical Operations Hub</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick action buttons */}
        <button
          onClick={() => onQuickAction('register-patient')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2]" />
          <span className="hidden sm:inline">New Patient</span>
        </button>

        <button
          onClick={() => onQuickAction('book-appointment')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#e6fcf5] hover:bg-[#d1fae5] text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-300 cursor-pointer shadow-2xs"
        >
          <Calendar className="w-4 h-4 stroke-[2] text-emerald-600" />
          <span className="hidden sm:inline">Book Appointment</span>
        </button>

        <div className="flex items-center gap-2.5 ml-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs shadow-2xs">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <span className="text-xs font-bold text-slate-800 block leading-tight">{user.fullName}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>
                {user.role === 'ADMIN'
                  ? 'Clinic Admin / Desk'
                  : user.role === 'RECEPTIONIST'
                  ? 'Receptionist'
                  : user.role === 'DOCTOR_DENTAL'
                  ? 'Consulting Doctor (Dental)'
                  : user.role === 'DOCTOR_ORTHO'
                  ? 'Consulting Doctor (Ortho)'
                  : user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Top-Right Log Out Button */}
        <button
          onClick={onLogout}
          title="Sign out of HospAI"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-200/90 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
