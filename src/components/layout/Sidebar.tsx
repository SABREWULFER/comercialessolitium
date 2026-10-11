'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Target, 
  UploadCloud, 
  Users, 
  Award, 
  LogOut,
  Calendar,
  Shield,
  Building2
} from 'lucide-react';
import { CommercialUser } from '@/types';
import { AVAILABLE_FISCAL_YEARS } from '@/lib/constants';

interface SidebarProps {
  currentUser: CommercialUser;
  fiscalYear: string;
  onFiscalYearChange: (fy: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenQuotasModal: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  fiscalYear,
  onFiscalYearChange,
  activeTab,
  onTabChange,
  onOpenQuotasModal,
  onLogout,
}) => {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Cabecera superior del Sidebar con referencia al logotipo de Grupo Solitium */}
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
            <option key={year} value={year}>{year} (Activo)</option>
          ))}
        </select>
      </div>

      {/* Menú de Navegación por Rol */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Vista Admin */}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => onTabChange('admin')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'admin'
                ? 'bg-rose-50 text-rose-700 font-bold shadow-sm'
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Panel de Administración</span>
            </div>
            <span className="text-[10px] bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded">
              ADMIN
            </span>
          </button>
        )}

        {/* Vista Territorial */}
        {(currentUser.role === 'director_territorial' || currentUser.role === 'admin') && (
          <button
            onClick={() => onTabChange('territorial')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'territorial'
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Vista 4 Grupos Territoriales</span>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
              DT
            </span>
          </button>
        )}

        {/* Vista Director Comercial */}
        {(currentUser.role === 'director_comercial' || currentUser.role === 'admin') && (
          <button
            onClick={() => onTabChange('dc-team')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dc-team'
                ? 'bg-purple-50 text-purple-700 font-bold shadow-sm'
                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
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

        {/* Vista Comercial General */}
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
          Importar Liquidación (Excel)
        </button>

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

      {/* Perfil del Usuario Activo & Botón Cerrar Sesión */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-solitium-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
              {currentUser.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">
                {currentUser.role === 'admin' ? 'Administrador' : 
                 currentUser.role === 'director_territorial' ? 'Dir. Territorial' :
                 currentUser.role === 'director_comercial' ? 'Dir. Comercial' : 
                 `Comercial (${currentUser.vendor_code})`}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Botón de Cerrar Sesión Funcional */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200/60"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
