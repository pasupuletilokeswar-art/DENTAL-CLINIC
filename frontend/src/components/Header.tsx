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
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs">
      <div>
        <h2 className="text-base font-black text-slate-900 capitalize tracking-tight">{activeTabName}</h2>
        <p className="text-xs text-slate-500 font-medium">HospAI Real-Time Dental Clinical Operations Hub</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick action buttons for Receptionist */}
        <button
          onClick={() => onQuickAction('register-patient')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Patient</span>
        </button>

        <button
          onClick={() => onQuickAction('book-appointment')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-[#0090e7] rounded-xl text-xs font-bold transition border border-sky-200 cursor-pointer shadow-2xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Book Appointment</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-black text-xs shadow-2xs">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <span className="text-xs font-bold text-slate-800 block leading-tight">{user.fullName}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-teal-700 font-bold uppercase tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{user.role}</span>
            </div>
          </div>
        </div>

        {/* Top-Right Log Out Button */}
        <button
          onClick={onLogout}
          title="Sign out of HospAI"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ml-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
