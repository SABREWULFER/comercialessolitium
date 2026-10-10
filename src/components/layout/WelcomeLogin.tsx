'use client';

import React, { useState } from 'react';
import { LogIn, Shield, Users, ArrowRight, Database } from 'lucide-react';
import { CommercialUser } from '@/types';
import { DEMO_USERS, CURRENT_FISCAL_YEAR } from '@/lib/constants';

interface WelcomeLoginProps {
  onSelectUser: (user: CommercialUser) => void;
}

export const WelcomeLogin: React.FC<WelcomeLoginProps> = ({ onSelectUser }) => {
  const [selectedId, setSelectedId] = useState(DEMO_USERS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DEMO_USERS.find(u => u.id === selectedId);
    if (user) {
      onSelectUser(user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* 2. b) Logotipo corporativo de Grupo Solitium en la pantalla de bienvenida e inicio de sesión */}
        <div className="p-8 text-center bg-linear-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xs border border-slate-100 mb-4">
            <img 
              src="/logo-solitium.png" 
              alt="Grupo Solitium" 
              className="h-14 w-auto mx-auto object-contain"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Portal Comercial Solitium
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión 100% Dinámica de Cuotas, Liquidación & Incentivos
          </p>
        </div>

        {/* Formulario de acceso */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selecciona tu Perfil Comercial
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-solitium-500 focus:bg-white transition-all"
            >
              {DEMO_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role === 'director' ? 'Director Comercial' : `Vendedor ${user.vendor_code}`})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4 text-solitium-500" />
              Objetivos Dinámicos en Supabase:
            </p>
            <p className="text-[11px] text-blue-800">
              No hay cuotas fijas en código. Cada comercial y director dispone de su panel para configurar y actualizar metas por línea de negocio.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <span>Acceder al Portal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="p-4 bg-slate-50 text-center border-t border-slate-100 text-[11px] text-slate-400">
          Ejercicio Fiscal Activo: <span className="font-semibold text-slate-600">{CURRENT_FISCAL_YEAR}</span>
        </div>
      </div>
    </div>
  );
};
