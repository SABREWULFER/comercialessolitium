'use client';

import React from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Target, 
  UploadCloud, 
  Users, 
  Award, 
  LogOut,
  Calendar,
  UserCheck
} from 'lucide-react';
import { CommercialUser } from '@/types';
import { DEMO_USERS, AVAILABLE_FISCAL_YEARS } from '@/lib/constants';

interface SidebarProps {
  currentUser: CommercialUser;
  onUserChange: (user: CommercialUser) => void;
  fiscalYear: string;
  onFiscalYearChange: (fy: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenQuotasModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onUserChange,
  fiscalYear,
  onFiscalYearChange,
  activeTab,
  onTabChange,
  onOpenQuotasModal,
}) => {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* 2. a) Cabecera superior del Sidebar con referencia al logotipo de Grupo Solitium */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-solitium.png" 
            alt="Grupo Solitium Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>
      </div>

      {/* Selector de Ejercicio Fiscal */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-solitium-500" />
          Ejercicio Fiscal
        </label>
        <select
          value={fiscalYear}
          onChange={(e) => onFiscalYearChange(e.target.value)}
          className="w-full text-sm font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-solitium-500"
        >
          {AVAILABLE_FISCAL_YEARS.map(year => (
            <option key={year} value={year}>{year} (Actual)</option>
          ))}
        </select>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-solitium-50 text-solitium-600 font-semibold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-solitium-500" />
          Dashboard Comercial
        </button>

        <button
          onClick={onOpenQuotasModal}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-emerald-600" />
            <span>Mis Cuotas / Objetivos</span>
          </div>
          <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full group-hover:bg-emerald-200 transition-colors">
            Configurar
          </span>
        </button>

        <button
          onClick={() => onTabChange('import')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'import'
              ? 'bg-solitium-50 text-solitium-600 font-semibold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-blue-500" />
          Importar Liquidación (Excel/HTML)
        </button>

        {currentUser.role === 'director' && (
          <button
            onClick={() => onTabChange('dc-team')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dc-team'
                ? 'bg-solitium-50 text-solitium-600 font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Objetivos del Equipo (DC)</span>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">
              DC
            </span>
          </button>
        )}

        <button
          onClick={() => onTabChange('accelerators')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'accelerators'
              ? 'bg-solitium-50 text-solitium-600 font-semibold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          Aceleradores & Bonos
        </button>
      </nav>

      {/* Switcher de Usuario Activo (Para probar entre comerciales y el DC) */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-solitium-500" />
          Simular Usuario Activo
        </label>
        <select
          value={currentUser.id}
          onChange={(e) => {
            const user = DEMO_USERS.find(u => u.id === e.target.value);
            if (user) onUserChange(user);
          }}
          className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-solitium-500 mb-3"
        >
          {DEMO_USERS.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role === 'director' ? 'Director Comercial' : user.vendor_code})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-solitium-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {currentUser.name.slice(0, 2)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
