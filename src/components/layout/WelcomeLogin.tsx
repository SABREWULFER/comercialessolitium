'use client';

import React, { useState } from 'react';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';
import { CommercialUser } from '@/types';
import { loginWithCredentials } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CURRENT_FISCAL_YEAR } from '@/lib/constants';

interface WelcomeLoginProps {
  onSelectUser: (user: CommercialUser) => void;
}

export const WelcomeLogin: React.FC<WelcomeLoginProps> = ({ onSelectUser }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('admin@solitium.es');
  const [password, setPassword] = useState('AdminSolitium2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConnected = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const { user, error } = await loginWithCredentials(emailOrUsername, password);
      if (error) {
        setErrorMessage(error);
        setIsSubmitting(false);
        return;
      }

      if (user) {
        onSelectUser(user);
      } else {
        setErrorMessage('No fue posible autenticar con las credenciales facilitadas.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado al conectar con el servicio de autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-radial from-solitium-700/20 to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera con logotipo corporativo Grupo Solitium */}
        <div className="p-8 text-center bg-linear-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xs border border-slate-100 mb-4">
            <img 
              src="/logo-solitium.png" 
              alt="Grupo Solitium" 
              className="h-14 w-auto mx-auto object-contain"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Portal Comercial & Incentivos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Inicio de sesión seguro para Comerciales y Dirección
          </p>
        </div>

        {/* Formulario de Login Real */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Campo Usuario / Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Usuario o Correo Corporativo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="ej. admin@solitium.es o usuario"
                className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-solitium-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          {/* Campo Contraseña con botón de visibilidad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contraseña
              </label>
              <span className="text-[11px] text-slate-400">Mín. 8 caracteres alfanuméricos</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-solitium-500 focus:bg-white transition-all text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Alerta de acceso inicial / Seed Admin */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1 text-solitium-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Acceso de Administrador Inicial:
            </p>
            <p className="text-slate-600 font-mono">
              <span className="font-bold text-slate-800">admin@solitium.es</span> &bull; Clave: <span className="font-bold text-slate-800">AdminSolitium2026!</span>
            </p>
          </div>

          {/* Botón Acceder */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-solitium-500 hover:bg-solitium-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <span>{isSubmitting ? 'Verificando credenciales...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-6">
          <span className="flex items-center gap-1.5 font-medium">
            <Database className="w-3 h-3 text-slate-400" />
            {isConnected ? 'Supabase Auth Conectado' : 'Autenticación Local Activa'}
          </span>
          <span>Ejercicio: <strong className="text-slate-700">{CURRENT_FISCAL_YEAR}</strong></span>
        </div>
      </div>
    </div>
  );
};
