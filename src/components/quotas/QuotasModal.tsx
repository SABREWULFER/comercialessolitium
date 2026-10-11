'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { BusinessLineId, BUSINESS_LINES } from '@/types';
import { getCommercialQuotas, saveCommercialQuotas } from '@/lib/storage';

interface QuotasModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  fiscalYear: string;
  onSaved: () => void;
}

export const QuotasModal: React.FC<QuotasModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  fiscalYear,
  onSaved,
}) => {
  const [quotas, setQuotas] = useState<Record<BusinessLineId, number>>({} as any);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUserQuotas();
    }
  }, [isOpen, userId, fiscalYear]);

  const loadUserQuotas = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const data = await getCommercialQuotas(userId, fiscalYear);
      setQuotas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (lineId: BusinessLineId, value: string) => {
    const clean = value.trim().replace(/\s+/g, '').replace(',', '.');
    const num = clean === '' ? 0 : (parseFloat(clean) || 0);
    setQuotas(prev => ({
      ...prev,
      [lineId]: num,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const success = await saveCommercialQuotas(userId, fiscalYear, quotas);
      if (success) {
        setSaveSuccess(true);
        onSaved();
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      } else {
        setSaveError('Error al guardar en Supabase. Verifica tu conexión o políticas RLS.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error inesperado al guardar cuotas');
    } finally {
      setSaving(false);
    }
  };

  // Cálculo de totales dinámicos en el modal
  const totalAmount = BUSINESS_LINES
    .filter(b => b.isCurrency)
    .reduce((acc, curr) => acc + (quotas[curr.id] || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-6 bg-linear-to-r from-solitium-700 to-solitium-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mis Cuotas / Objetivos Anuales</h2>
              <p className="text-xs text-blue-100">
                Comercial: <span className="font-semibold text-white">{userName}</span> &bull; Ejercicio: <span className="font-semibold text-white">{fiscalYear}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-solitium-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Requisito Dinámico Solitium:</p>
              <p>
                Los objetivos anuales se almacenan en la tabla <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-solitium-600">commercial_quotas</code> de Supabase vinculados a tu ID y ejercicio fiscal. Puedes ajustarlos siempre que se revise tu plan de compensación.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-solitium-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Cargando objetivos desde Supabase...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUSINESS_LINES.map(line => (
                <div 
                  key={line.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor={`quota-${line.id}`} 
                      className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-solitium-500"></span>
                      {line.name} ({line.shortName})
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {line.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">{line.description}</p>
                  
                  <div className="relative">
                    <input
                      id={`quota-${line.id}`}
                      type="number"
                      step="any"
                      min="0"
                      value={quotas[line.id] ?? 0}
                      onChange={(e) => handleInputChange(line.id, e.target.value)}
                      className="w-full text-sm font-semibold bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                      {line.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen del objetivo global fijado */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Total Cuota Global (Líneas Monetarias)</p>
              <p className="text-2xl font-black text-white">
                {totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold">Objetivo SAGE Nuevos</p>
              <p className="text-xl font-bold text-emerald-400">
                {quotas['SAGE_CLIENTS'] || 0} Clientes
              </p>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ¡Objetivos actualizados correctamente en Supabase!
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600" />
              {saveError}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando en Supabase...' : 'Guardar Objetivos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
