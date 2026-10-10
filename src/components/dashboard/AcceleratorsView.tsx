'use client';

import React from 'react';
import { Award, Zap, CheckCircle2, TrendingUp, ShieldCheck, Star } from 'lucide-react';
import { AcceleratorTier } from '@/types';

interface AcceleratorsViewProps {
  userName: string;
  overallPercentage: number;
  totalActual: number;
  totalTarget: number;
  remainingToGlobal: number;
  tiers: AcceleratorTier[];
}

export const AcceleratorsView: React.FC<AcceleratorsViewProps> = ({
  userName,
  overallPercentage,
  totalActual,
  totalTarget,
  remainingToGlobal,
  tiers,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">
              Plan de Compensación
            </span>
            <span className="text-xs text-slate-500 font-medium">{userName}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Aceleradores Anuales & Club 100% Solitium
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Los aceleradores se activan dinámicamente al superar el 95%, 100% y 120% de tu cuota anual total guardada.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-5">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Cumplimiento Global</p>
            <p className="text-2xl font-black text-amber-400">
              {overallPercentage.toFixed(1)} %
            </p>
          </div>
          <div className="border-l border-slate-800 pl-4 text-xs text-slate-300">
            <p>Ventas: <span className="font-bold text-white">{totalActual.toLocaleString('es-ES')} €</span></p>
            <p>Cuota: <span className="font-bold text-white">{totalTarget.toLocaleString('es-ES')} €</span></p>
          </div>
        </div>
      </div>

      {/* Tarjetas de los 3 Tiers de Aceleradores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier, idx) => {
          const targetEuroAtTier = totalTarget * tier.threshold;
          const remainingEuroToTier = Math.max(0, targetEuroAtTier - totalActual);

          return (
            <div 
              key={idx}
              className={`p-6 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                tier.achieved 
                  ? 'bg-linear-to-b from-amber-500/10 to-emerald-500/10 border-emerald-400 shadow-md ring-1 ring-emerald-400' 
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    tier.achieved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {idx === 0 ? <TrendingUp className="w-5 h-5" /> : idx === 1 ? <ShieldCheck className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                  </div>
                  {tier.achieved ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ¡CONSEGUIDO!
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      Pendiente
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{tier.label}</h3>
                <p className="text-xs text-slate-500 mt-1">{tier.extraRewardDescription}</p>

                <div className="my-5 p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Umbral Requerido:</span>
                    <span className="font-bold text-slate-800">
                      {(tier.threshold * 100).toFixed(0)}% ({targetEuroAtTier.toLocaleString('es-ES')} €)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Multiplicador:</span>
                    <span className="font-bold text-solitium-600">
                      x{tier.multiplier.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Falta para el nivel:</span>
                    <span className={`font-bold ${tier.achieved ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {tier.achieved ? '0 €' : `${remainingEuroToTier.toLocaleString('es-ES')} €`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso hacia este tier */}
              <div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      tier.achieved ? 'bg-emerald-500' : 'bg-solitium-500'
                    }`}
                    style={{ width: `${Math.min(100, (overallPercentage / (tier.threshold * 100)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
