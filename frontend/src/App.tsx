import React, { useState, useEffect } from 'react';
import { LoginPage } from './modules/auth/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './modules/dashboard/DashboardOverview';
import { PatientModule } from './modules/patients/PatientModule';
import { AppointmentModule } from './modules/appointments/AppointmentModule';
import { ClinicalNotesModule } from './modules/clinical-notes/ClinicalNotesModule';
import { ConsultationBillingModule } from './modules/billing/ConsultationBillingModule';
import { PharmacyModule } from './modules/pharmacy/PharmacyModule';
import { OperationsModule } from './modules/operations/OperationsModule';
import { ReportsModule } from './modules/reports/ReportsModule';
import { AdminModule } from './modules/admin/AdminModule';
import { User } from './types';
import { getSocket } from './services/socket';
import api from './services/api';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [selectedPatientNav, setSelectedPatientNav] = useState<string | null>(null);
  const [pendingProcedureToBill, setPendingProcedureToBill] = useState<any | null>(null);
  const [pendingAppointmentToBill, setPendingAppointmentToBill] = useState<any | null>(null);

  useEffect(() => {
    // Check existing session
    const savedUser = localStorage.getItem('clinic_user');
    const token = localStorage.getItem('clinic_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }

    // Connect socket
    const socket = getSocket();
    setIsSocketConnected(socket.connected);

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user');
    setUser(null);
  };

  const handleNavigate = (tab: string, param?: any) => {
    if (tab === 'patients' && param) {
      setSelectedPatientNav(param);
    }
    setActiveTab(tab);
  };

  const handleQuickAction = (action: string) => {
    if (action === 'register-patient') {
      setActiveTab('patients');
    } else if (action === 'book-appointment') {
      setActiveTab('appointments');
    }
  };

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        isSocketConnected={isSocketConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          user={user}
          onQuickAction={handleQuickAction}
          activeTabName={activeTab.replace('-', ' ')}
          onLogout={handleLogout}
          isSocketConnected={isSocketConnected}
        />

        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <div className="w-full h-full">
            {activeTab === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
            {activeTab === 'patients' && (
              <PatientModule
                initialPatientId={selectedPatientNav}
                onNavigateToNotes={() => setActiveTab('clinical-notes')}
                onNavigateToBilling={() => setActiveTab('billing')}
                onNavigateToPharmacy={() => setActiveTab('pharmacy')}
                onNavigateToAppointment={(patientId) => {
                  if (patientId) setSelectedPatientNav(patientId);
                  setActiveTab('appointments');
                }}
              />
            )}
            {activeTab === 'appointments' && (
              <AppointmentModule
                onNavigateToNotes={(patientId) => {
                  if (patientId) setSelectedPatientNav(patientId);
                  setActiveTab('clinical-notes');
                }}
                onNavigateToBilling={(aptOrPatientId) => {
                  if (typeof aptOrPatientId === 'string') {
                    setSelectedPatientNav(aptOrPatientId);
                  } else if (aptOrPatientId && typeof aptOrPatientId === 'object') {
                    setPendingAppointmentToBill(aptOrPatientId);
                    if (aptOrPatientId.patientId) setSelectedPatientNav(aptOrPatientId.patientId);
                  }
                  setActiveTab('billing');
                }}
                onNavigateToPatient={(patientId) => {
                  if (patientId) setSelectedPatientNav(patientId);
                  setActiveTab('patients');
                }}
              />
            )}
            {activeTab === 'clinical-notes' && <ClinicalNotesModule />}
            {activeTab === 'billing' && (
              <ConsultationBillingModule
                initialTab={pendingProcedureToBill ? 'procedure' : 'consultation'}
                pendingProcedureToBill={pendingProcedureToBill}
                onClearPendingProcedure={() => setPendingProcedureToBill(null)}
                pendingAppointmentToBill={pendingAppointmentToBill}
                onClearPendingAppointment={() => setPendingAppointmentToBill(null)}
                onNavigateToPharmacy={(patientId) => {
                  if (patientId) setSelectedPatientNav(patientId);
                  setActiveTab('pharmacy');
                }}
              />
            )}
            {activeTab === 'pharmacy' && <PharmacyModule />}
            {activeTab === 'operations' && (
              <OperationsModule
                onNavigateToBillingProcedure={(proc) => {
                  setPendingProcedureToBill(proc);
                  setActiveTab('billing');
                }}
              />
            )}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'admin' && <AdminModule />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
