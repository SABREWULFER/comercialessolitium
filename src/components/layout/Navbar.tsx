'use client';

import React from 'react';
import { Target, Bell, Database } from 'lucide-react';
import { CommercialUser } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  currentUser: CommercialUser;
  fiscalYear: string;
  onOpenQuotasModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  fiscalYear,
  onOpenQuotasModal,
}) => {
  const isOnline = isSupabaseConfigured();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* 2. a) Cabecera superior Navbar principal con logotipo */}
      <div className="flex items-center gap-4">
        <img 
          src="/logo-solitium.png" 
          alt="Grupo Solitium" 
          className="h-8 w-auto md:hidden"
        />
        <div>
          <h1 className="text-base font-bold text-slate-800">
            Portal de Incentivos y Cuotas Dinámicas
          </h1>
          <p className="text-xs text-slate-500">
            Ejercicio {fiscalYear} &bull; {currentUser.role === 'director' ? 'Panel de Dirección Comercial' : `Comercial: ${currentUser.name}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Indicador de conexión Supabase */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isOnline 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <Database className="w-3.5 h-3.5" />
          <span>{isOnline ? 'Supabase Conectado' : 'Modo Offline / Caché Local'}</span>
        </div>

        {/* Botón rápido Mis Objetivos */}
        <button
          onClick={onOpenQuotasModal}
          className="flex items-center gap-2 bg-solitium-500 hover:bg-solitium-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Target className="w-4 h-4" />
          <span>Configurar Cuotas</span>
        </button>
      </div>
    </header>
  );
};
