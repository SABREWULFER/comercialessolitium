'use client';

import React from 'react';
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { QuotaProgress, BusinessLineId } from '@/types';

interface CommercialDashboardProps {
  userName: string;
  vendorCode: string;
  fiscalYear: string;
  progressList: QuotaProgress[];
  overallStats: {
    totalTargetCurrency: number;
    totalActualCurrency: number;
    overallPercentage: number;
    remainingToGlobal: number;
  };
  onOpenQuotasModal: () => void;
  onNavigateToImport: () => void;
}

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({
  userName,
  vendorCode,
  fiscalYear,
  progressList,
  overallStats,
  onOpenQuotasModal,
  onNavigateToImport,
}) => {
  // Comprobar si el comercial aún no ha introducido sus objetivos
  const hasConfiguredQuotas = progressList.some(p => p.target > 0);

  return (
    <div className="space-y-6">
      {/* 4. Si un comercial no ha introducido aún sus objetivos, mostrar un aviso amigable */}
      {!hasConfiguredQuotas && (
        <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-5 rounded-xl bg-white shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Define tus objetivos anuales para comenzar
                </h3>
                <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                  Aún no has introducido tus cuotas para el ejercicio <span className="font-bold">{fiscalYear}</span>. En Solitium los objetivos son 100% dinámicos y personalizables: haz clic en el botón para rellenar tus metas por línea de negocio.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenQuotasModal}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Target className="w-4 h-4" />
              <span>Configurar Mis Cuotas Ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Facturación Acumulada</span>
            <TrendingUp className="w-4 h-4 text-solitium-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {overallStats.totalActualCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Ventas consolidadas ({vendorCode})
          </p>
        </div>

        {/* Cuota Total Anual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cuota Total Asignada</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {overallStats.totalTargetCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500">10 líneas de negocio</span>
            <button 
              onClick={onOpenQuotasModal}
              className="text-[11px] text-solitium-600 hover:underline font-bold"
            >
              Editar
            </button>
          </div>
        </div>

        {/* Consecución Global */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">% Consecución Global</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-solitium-600">
              {overallStats.overallPercentage.toFixed(1)} %
            </p>
            {overallStats.overallPercentage >= 100 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                ¡Club 100%!
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallStats.overallPercentage >= 100 ? 'bg-emerald-500' : 'bg-solitium-500'
              }`}
              style={{ width: `${Math.min(100, overallStats.overallPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Remanente para Cuota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Restante para Objetivo</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {overallStats.remainingToGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {overallStats.remainingToGlobal === 0 
              ? '🎯 ¡Objetivo anual alcanzado!' 
              : 'Para completar el 100% de cuota'}
          </p>
        </div>
      </div>

      {/* Grid de las 10 Líneas de Negocio + Clientes Nuevos SAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Desglose y Cumplimiento Dinámico por Línea de Negocio
            </h3>
            <p className="text-xs text-slate-500">
              Comparativa en tiempo real de facturación vs cuota guardada en Supabase
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToImport}
              className="text-xs font-semibold text-solitium-600 hover:text-solitium-700 hover:underline flex items-center gap-1"
            >
              Importar ventas desde Excel
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressList.map(item => {
            const isInformative = item.line.hasTarget === false;
            const isFinished = item.isCompleted;
            const hasTarget = item.target > 0;

            return (
              <div 
                key={item.line.id}
                className={`p-4 rounded-xl border transition-all ${
                  isInformative
                    ? 'bg-slate-50/50 border-slate-200'
                    : isFinished 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : hasTarget 
                        ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-50' 
                        : 'bg-white border-dashed border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-solitium-600 bg-solitium-50 px-2 py-0.5 rounded">
                      {item.line.group}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {item.line.name}
                    </h4>
                  </div>
                  {isInformative ? (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Informativa
                    </span>
                  ) : isFinished ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      100% OK
                    </span>
                  ) : null}
                </div>

                {/* Métricas clave de la línea */}
                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Facturado / Real:</span>
                    <span className="font-bold text-slate-900">
                      {item.line.isCurrency 
                        ? `${item.actual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                        : `${item.actual} ${item.line.unit}`}
                    </span>
                  </div>
                  
                  {isInformative ? (
                    <div className="p-2 bg-blue-50/60 rounded-lg text-[11px] text-blue-700 font-medium">
                      Línea de facturación real informativa. No computa para aceleradores ni cuotas asignables.
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Objetivo / Cuota:</span>
                        <span className="font-semibold text-slate-700">
                          {hasTarget 
                            ? (item.line.isCurrency 
                                ? `${item.target.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                : `${item.target} ${item.line.unit}`)
                            : <span className="text-slate-400 italic">No fijado</span>}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="text-slate-600 font-medium">Falta para cuota:</span>
                        <span className={`font-bold ${isFinished ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {isFinished 
                            ? '0 (Completado)'
                            : (item.line.isCurrency 
                                ? `${item.remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                : `${item.remaining} ${item.line.unit}`)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Condición especial MI: Core MO-IN vs Umbral 80% */}
                  {item.line.id === 'MI' && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 bg-slate-100/70 p-2 rounded-lg text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-semibold">Core MO-IN:</span>
                        <span className="font-bold">{(item.moInActual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Bolsas / Consumo (BOL):</span>
                        <span>{(item.bolActual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-bold">
                        <span>Umbral Core (80%):</span>
                        <span className={(item.moInActual || 0) >= (item.moInTarget80 || 0) ? 'text-emerald-700' : 'text-amber-700'}>
                          {(item.moInActual || 0) >= (item.moInTarget80 || 0) ? '✅ Superado (≥80%)' : `⚠️ Pendiente (Meta: ${(item.moInTarget80 || 0).toLocaleString('es-ES')} €)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de progreso */}
                {!isInformative && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-500">Consecución:</span>
                      <span className={item.percentage >= 100 ? 'text-emerald-700 font-black' : 'text-slate-800'}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.percentage >= 100 
                            ? 'bg-emerald-500' 
                            : item.percentage >= 60 
                              ? 'bg-solitium-500' 
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
