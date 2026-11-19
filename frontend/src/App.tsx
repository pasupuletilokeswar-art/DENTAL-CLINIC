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
import { DentalLabModule } from './modules/lab/DentalLabModule';
import { ReportsModule } from './modules/reports/ReportsModule';
import { AdminModule } from './modules/admin/AdminModule';
import { DentalChartModule } from './modules/dental-chart/DentalChartModule';
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
    // If URL has ?login or ?logout, clear session and stay on login
    const params = new URLSearchParams(window.location.search);
    if (params.has('login') || params.has('logout') || params.has('auth')) {
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
      setUser(null);
      return;
    }

    // Check existing session
    const savedUser = localStorage.getItem('clinic_user');
    const token = localStorage.getItem('clinic_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }

    if (params.get('tab')) {
      setActiveTab(params.get('tab')!);
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

  const getTabTitle = (tab: string) => {
    if (tab === 'operations' || tab === 'operations-examination') return 'Operations: Clinical Notes & Examination';
    if (tab === 'operations-procedures') return 'Operations: Procedures & Treatments';
    if (tab === 'operations-history') return 'Operations: Clinical & Treatment History';
    if (tab === 'clinical-notes') return '9-Field Clinical Notes';
    if (tab === 'dental-lab' || tab === 'dental-lab-dashboard') return 'Dental Lab: Overview & Dashboard';
    if (tab === 'dental-lab-reports') return 'Dental Lab: Patient Lab Reports';
    if (tab === 'dental-lab-create') return 'Dental Lab: Add Lab Report';
    return tab.replace('-', ' ');
  };

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  // Full-width 3D Dental Charting Workspace (Bypasses sidebar and clinic layout)
  if (activeTab === 'dental-chart') {
    return (
      <DentalChartModule
        initialPatientId={selectedPatientNav || undefined}
        onBack={() => setActiveTab('dashboard')}
      />
    );
  }

  return (
    <div className="clinic-app-layout flex h-screen bg-slate-100 font-sans antialiased text-slate-800 overflow-hidden">
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
          activeTabName={getTabTitle(activeTab)}
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
            {activeTab.startsWith('operations') && (
              <OperationsModule
                initialSubModule={
                  activeTab === 'operations-procedures'
                    ? 'procedures'
                    : activeTab === 'operations-history'
                    ? 'history'
                    : 'examination'
                }
                onSubModuleChange={(sm) => {
                  if (sm === 'examination') setActiveTab('operations-examination');
                  else if (sm === 'procedures') setActiveTab('operations-procedures');
                  else if (sm === 'history') setActiveTab('operations-history');
                }}
                onNavigateToBillingProcedure={(proc) => {
                  setPendingProcedureToBill(proc);
                  setActiveTab('billing');
                }}
              />
            )}
            {activeTab.startsWith('dental-lab') && (
              <DentalLabModule
                initialSubModule={
                  activeTab === 'dental-lab-reports'
                    ? 'reports'
                    : activeTab === 'dental-lab-create'
                    ? 'create'
                    : 'dashboard'
                }
                onSubModuleChange={(sm) => {
                  if (sm === 'reports') setActiveTab('dental-lab-reports');
                  else if (sm === 'create') setActiveTab('dental-lab-create');
                  else setActiveTab('dental-lab-dashboard');
                }}
                onNavigateToPatient={(patientId) => {
                  if (patientId) setSelectedPatientNav(patientId);
                  setActiveTab('patients');
                }}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsModule onNavigateTab={(t) => setActiveTab(t as any)} />
            )}
            {activeTab === 'admin' && <AdminModule />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
