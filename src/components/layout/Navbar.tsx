'use client';

import React from 'react';
import { Target, Bell, Database, LogOut, Shield } from 'lucide-react';
import { CommercialUser } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  currentUser: CommercialUser;
  fiscalYear: string;
  onOpenQuotasModal: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  fiscalYear,
  onOpenQuotasModal,
  onLogout,
  onOpenAdmin,
}) => {
  const isOnline = isSupabaseConfigured();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <img 
          src="/logo-solitium.png" 
          alt="Grupo Solitium" 
          className="h-8 w-auto md:hidden"
        />
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Portal de Incentivos y Cuotas Dinámicas</span>
            {currentUser.role === 'admin' && (
              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase">
                Modo Admin
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            Ejercicio {fiscalYear} &bull; {
              currentUser.role === 'admin' ? 'Administración General del Sistema' :
              currentUser.role === 'director_territorial' ? 'Dirección Territorial (4 Grupos)' :
              currentUser.role === 'director_comercial' ? 'Dirección Comercial de Grupo' :
              `Comercial: ${currentUser.name} (${currentUser.vendor_code})`
            }
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Indicador de conexión Supabase */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isOnline 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <Database className="w-3.5 h-3.5" />
          <span>{isOnline ? 'Supabase Conectado' : 'Modo Seguro Local'}</span>
        </div>

        {/* Botón rápido Mis Objetivos */}
        <button
          onClick={onOpenQuotasModal}
          className="flex items-center gap-2 bg-solitium-500 hover:bg-solitium-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Target className="w-4 h-4" />
          <span className="hidden sm:inline">Configurar Cuotas</span>
        </button>

        {/* Botón rápido Acceso Admin */}
        {currentUser.role === 'admin' && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Administración</span>
          </button>
        )}

        {/* 3. Botón de Cerrar Sesión en Navbar */}
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
