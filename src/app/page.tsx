'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { CommercialDashboard } from '@/components/dashboard/CommercialDashboard';
import { AcceleratorsView } from '@/components/dashboard/AcceleratorsView';
import { QuotasModal } from '@/components/quotas/QuotasModal';
import { ImportData } from '@/components/import/ImportData';
import { DCTeamTargets } from '@/components/dc/DCTeamTargets';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { TerritorialView } from '@/components/territorial/TerritorialView';
import { WelcomeLogin } from '@/components/layout/WelcomeLogin';
import { CommercialUser, QuotaProgress } from '@/types';
import { CURRENT_FISCAL_YEAR } from '@/lib/constants';
import { getCommercialQuotas, getUserSales } from '@/lib/storage';
import { calculateQuotaProgress, calculateAccelerators } from '@/lib/calculations';
import { logout } from '@/lib/auth';

const SESSION_STORAGE_USER_KEY = 'solitium_authenticated_user';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<CommercialUser | null>(null);
  const [fiscalYear, setFiscalYear] = useState<string>(CURRENT_FISCAL_YEAR);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isQuotasModalOpen, setIsQuotasModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de métricas dinámicas
  const [progressList, setProgressList] = useState<QuotaProgress[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTargetCurrency: 0,
    totalActualCurrency: 0,
    overallPercentage: 0,
    remainingToGlobal: 0,
    tiers: [] as any[],
  });

  // Restaurar sesión al cargar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        // Redirigir según el rol
        applyInitialTabForRole(parsed.role);
      }
    } catch (err) {
      console.error('Error restaurando sesión:', err);
    }
  }, []);

  const applyInitialTabForRole = (role: string) => {
    if (role === 'admin') {
      setActiveTab('admin');
    } else if (role === 'director_territorial') {
      setActiveTab('territorial');
    } else if (role === 'director_comercial') {
      setActiveTab('dc-team');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleUserLogin = (user: CommercialUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error(err);
    }
    applyInitialTabForRole(user.role);
  };

  const handleLogout = async () => {
    await logout();
    try {
      localStorage.removeItem(SESSION_STORAGE_USER_KEY);
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Cargar datos dinámicos cada vez que cambia el usuario o el año fiscal
  const loadUserData = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // 1. Obtener cuotas desde Supabase / storage
      const quotas = await getCommercialQuotas(currentUser.id, fiscalYear);

      // 2. Obtener ventas consolidadas
      const sales = await getUserSales(currentUser.id, currentUser.vendor_code, fiscalYear);

      // 3. Calcular en tiempo real
      const calculatedProgress = calculateQuotaProgress(quotas, sales);
      const calculatedAccelerators = calculateAccelerators(calculatedProgress);

      setProgressList(calculatedProgress);
      setOverallStats(calculatedAccelerators);
    } catch (err) {
      console.error('Error calculando datos dinámicos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser, fiscalYear]);

  // Si no ha iniciado sesión, mostrar pantalla de inicio de sesión real
  if (!currentUser) {
    return (
      <WelcomeLogin 
        onSelectUser={handleUserLogin} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar fijo con logotipo */}
      <Sidebar
        currentUser={currentUser}
        fiscalYear={fiscalYear}
        onFiscalYearChange={setFiscalYear}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQuotasModal={() => setIsQuotasModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentUser={currentUser}
          fiscalYear={fiscalYear}
          onOpenQuotasModal={() => setIsQuotasModalOpen(true)}
          onLogout={handleLogout}
          onOpenAdmin={currentUser.role === 'admin' ? () => setActiveTab('admin') : undefined}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* 3. Vistas según el rol y navegación */}
          {activeTab === 'admin' && currentUser.role === 'admin' && (
            <AdminPanel />
          )}

          {activeTab === 'territorial' && (currentUser.role === 'director_territorial' || currentUser.role === 'admin') && (
            <TerritorialView
              fiscalYear={fiscalYear}
            />
          )}

          {activeTab === 'dc-team' && (currentUser.role === 'director_comercial' || currentUser.role === 'admin') && (
            <DCTeamTargets
              fiscalYear={fiscalYear}
              onRefresh={loadUserData}
            />
          )}

          {activeTab === 'dashboard' && (
            <CommercialDashboard
              userName={currentUser.name}
              vendorCode={currentUser.vendor_code}
              fiscalYear={fiscalYear}
              progressList={progressList}
              overallStats={overallStats}
              onOpenQuotasModal={() => setIsQuotasModalOpen(true)}
              onNavigateToImport={() => setActiveTab('import')}
            />
          )}

          {activeTab === 'import' && (
            <ImportData
              fiscalYear={fiscalYear}
              onImportComplete={loadUserData}
            />
          )}

          {activeTab === 'accelerators' && (
            <AcceleratorsView
              userName={currentUser.name}
              overallPercentage={overallStats.overallPercentage}
              totalActual={overallStats.totalActualCurrency}
              totalTarget={overallStats.totalTargetCurrency}
              remainingToGlobal={overallStats.remainingToGlobal}
              tiers={overallStats.tiers}
            />
          )}
        </main>
      </div>

      {/* Modal de Configuración de Cuotas / Mis Objetivos */}
      <QuotasModal
        isOpen={isQuotasModalOpen}
        onClose={() => setIsQuotasModalOpen(false)}
        userId={currentUser.id}
        userName={currentUser.name}
        fiscalYear={fiscalYear}
        onSaved={loadUserData}
      />
    </div>
  );
}
