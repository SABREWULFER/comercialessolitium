'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Target, 
  Save, 
  TrendingUp, 
  Award, 
  DollarSign, 
  CheckCircle2, 
  Edit3,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { GroupTarget, CommercialUser, BusinessLineId, BUSINESS_LINES } from '@/types';
import { DEMO_USERS } from '@/lib/constants';
import { getGroupTarget, saveGroupTarget, getCommercialQuotas, saveCommercialQuotas } from '@/lib/storage';
import { calculateDCBonus } from '@/lib/calculations';

interface DCTeamTargetsProps {
  fiscalYear: string;
  onRefresh: () => void;
}

export const DCTeamTargets: React.FC<DCTeamTargetsProps> = ({
  fiscalYear,
  onRefresh,
}) => {
  const [groupTarget, setGroupTarget] = useState<GroupTarget | null>(null);
  const [teamQuotas, setTeamQuotas] = useState<Record<string, Record<BusinessLineId, number>>>({});
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<CommercialUser | null>(null);
  const [editedUserQuotas, setEditedUserQuotas] = useState<Record<BusinessLineId, number>>({} as any);
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState(false);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const teamMembers = DEMO_USERS.filter(u => u.role === 'commercial');

  useEffect(() => {
    loadData();
  }, [fiscalYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const gt = await getGroupTarget('grp-norte', fiscalYear);
      setGroupTarget(gt);

      const qMap: Record<string, Record<BusinessLineId, number>> = {};
      for (const m of teamMembers) {
        qMap[m.id] = await getCommercialQuotas(m.id, fiscalYear);
      }
      setTeamQuotas(qMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar configuración propia del Director Comercial
  const handleSaveGroupTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTarget) return;
    setSavingTarget(true);
    try {
      await saveGroupTarget(groupTarget);
      setNotification('¡Objetivos y métricas del Director Comercial guardados con éxito!');
      onRefresh();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTarget(false);
    }
  };

  // Abrir editor de cuotas para un comercial específico del equipo
  const handleOpenEditUser = (user: CommercialUser) => {
    setSelectedUserForEdit(user);
    setEditedUserQuotas({ ...teamQuotas[user.id] });
  };

  // Guardar cuotas editadas para ese comercial
  const handleSaveUserQuotas = async () => {
    if (!selectedUserForEdit) return;
    setSavingCommercial(true);
    try {
      await saveCommercialQuotas(selectedUserForEdit.id, fiscalYear, editedUserQuotas);
      await loadData();
      setSelectedUserForEdit(null);
      setNotification(`Objetivos de ${selectedUserForEdit.name} actualizados correctamente.`);
      onRefresh();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCommercial(false);
    }
  };

  // 3. El objetivo total del grupo se calcula automáticamente como la suma de los objetivos individuales + cuota DC
  const individualSumCurrency = teamMembers.reduce((acc, member) => {
    const uQuotas = teamQuotas[member.id] || {};
    const memberTotal = BUSINESS_LINES
      .filter(b => b.isCurrency)
      .reduce((s, b) => s + (uQuotas[b.id] || 0), 0);
    return acc + memberTotal;
  }, 0);

  const dcExtra = groupTarget?.dc_extra_quota || 0;
  const totalGroupTargetCalculated = individualSumCurrency + dcExtra;

  // Simulación de cálculo de bono del DC para vista previa
  const dcBonusPreview = groupTarget ? calculateDCBonus(
    groupTarget,
    totalGroupTargetCalculated,
    totalGroupTargetCalculated * 0.96, // 96% de cumplimiento estimado de muestra
    26.5, // 26.5% Servicios gestionados
    19,   // 19 nuevos clientes
    9,    // 9 leads SAGE
    14000 // 14.000€ BOL
  ) : null;

  if (loading || !groupTarget) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-3 border-solitium-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Cargando gestión de equipo del Director Comercial...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificación flotante */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Panel DC */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded uppercase">
              Dirección Comercial
            </span>
            <span className="text-xs text-slate-500 font-medium">Ejercicio {fiscalYear}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Objetivos del Equipo y Configuración del Director
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervisa y edita las cuotas de cada comercial, y define las métricas estratégicas del grupo.
          </p>
        </div>

        {/* Resumen Automático del Objetivo Grupal */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-6">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Objetivo Total Calculado</p>
            <p className="text-xl font-black text-emerald-400">
              {totalGroupTargetCalculated.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="text-right border-l border-slate-700 pl-4 text-xs text-slate-300">
            <p>Suma Comerciales: <span className="font-bold text-white">{individualSumCurrency.toLocaleString('es-ES')} €</span></p>
            <p>Cuota DC/Televenta: <span className="font-bold text-white">{dcExtra.toLocaleString('es-ES')} €</span></p>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Comerciales Asignados para ver y editar cuotas individuales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Comerciales Asignados al Grupo ({teamMembers.length})
            </h3>
            <p className="text-xs text-slate-500">
              Haz clic en "Editar Cuotas" para ajustar los objetivos individuales de cualquier vendedor en Supabase.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5">Comercial</th>
                <th className="p-3.5">Cód. Vendedor</th>
                <th className="p-3.5">Ofimática (OFI)</th>
                <th className="p-3.5">Sistemas TI</th>
                <th className="p-3.5">DocuWare</th>
                <th className="p-3.5">Total Cuota (€)</th>
                <th className="p-3.5">SAGE Nuevos</th>
                <th className="p-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {teamMembers.map(member => {
                const q = teamQuotas[member.id] || {};
                const totalComm = BUSINESS_LINES
                  .filter(b => b.isCurrency)
                  .reduce((sum, b) => sum + (q[b.id] || 0), 0);

                return (
                  <tr key={member.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{member.name}</div>
                      <div className="text-[11px] text-slate-400">{member.email}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded">
                        {member.vendor_code}
                      </span>
                    </td>
                    <td className="p-3.5">{(q['OFI'] || 0).toLocaleString('es-ES')} €</td>
                    <td className="p-3.5">{(q['SISTEMAS'] || 0).toLocaleString('es-ES')} €</td>
                    <td className="p-3.5">{(q['DW'] || 0).toLocaleString('es-ES')} €</td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {totalComm.toLocaleString('es-ES')} €
                    </td>
                    <td className="p-3.5 text-emerald-700 font-bold">
                      {q['SAGE_CLIENTS'] || 0} clientes
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenEditUser(member)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-solitium-50 hover:bg-solitium-100 text-solitium-600 font-bold rounded-lg transition-colors border border-solitium-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Cuotas</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Formulario de Configuración de Objetivos Propios del Director Comercial */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Configuración de Métricas Estratégicas y Bono Anual del DC
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Define el bono base anual y las 4 submétricas clave del plan de remuneración directivo de Solitium.
          </p>
        </div>

        <form onSubmit={handleSaveGroupTarget} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bono Anual Base */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Bono Anual Base (€)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Importe base sujeto a escala de facturación (90%-130%+)</p>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  value={groupTarget.annual_base_bonus}
                  onChange={(e) => setGroupTarget({ ...groupTarget, annual_base_bonus: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            {/* Target Servicios Gestionados */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Target Servicios Gestionados (%)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Porcentaje mínimo de ventas en Mantenimiento y Software</p>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={groupTarget.managed_services_pct}
                  onChange={(e) => setGroupTarget({ ...groupTarget, managed_services_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Target Nuevos Clientes */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Target Nuevos Clientes (Unidades)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Número de clientes nuevos a captar por el grupo</p>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={groupTarget.new_client_units}
                  onChange={(e) => setGroupTarget({ ...groupTarget, new_client_units: parseInt(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-14 focus:ring-2 focus:ring-solitium-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Clientes</span>
              </div>
            </div>

            {/* Turbo Boost SAGE Leads */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Turbo Boost SAGE Leads
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Leads cualificados generados para el ecosistema SAGE</p>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={groupTarget.turbo_sage_leads}
                  onChange={(e) => setGroupTarget({ ...groupTarget, turbo_sage_leads: parseInt(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-solitium-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">Leads</span>
              </div>
            </div>

            {/* Turbo Boost BOL/SVM */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Turbo Boost BOL / SVM (€)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Objetivo de venta en soluciones de alto margen</p>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  value={groupTarget.turbo_bol_svm}
                  onChange={(e) => setGroupTarget({ ...groupTarget, turbo_bol_svm: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            {/* Cuota Asignada Propia DC / Televenta */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                Cuota Asignada Propia DC / Televenta (€)
              </label>
              <p className="text-[11px] text-purple-700 mb-2">Aportación directa que se suma al objetivo del grupo</p>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  value={groupTarget.dc_extra_quota}
                  onChange={(e) => setGroupTarget({ ...groupTarget, dc_extra_quota: parseFloat(e.target.value) || 0 })}
                  className="w-full text-sm font-bold bg-white border border-purple-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-purple-500">€</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingTarget}
              className="flex items-center gap-2 px-6 py-2.5 bg-solitium-500 hover:bg-solitium-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingTarget ? 'Guardando en Supabase...' : 'Guardar Configuración DC'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal para editar cuotas de un comercial del equipo */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold">
                  Editar Cuotas de: {selectedUserForEdit.name}
                </h4>
                <p className="text-xs text-slate-400">
                  Código: {selectedUserForEdit.vendor_code} &bull; Ejercicio: {fiscalYear}
                </p>
              </div>
              <button 
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {BUSINESS_LINES.map(line => (
                <div key={line.id} className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{line.name} ({line.shortName})</p>
                    <p className="text-[10px] text-slate-400">{line.group}</p>
                  </div>
                  <div className="w-40 relative">
                    <input
                      type="number"
                      step={line.isCurrency ? "100" : "1"}
                      value={editedUserQuotas[line.id] || 0}
                      onChange={(e) => setEditedUserQuotas({
                        ...editedUserQuotas,
                        [line.id]: parseFloat(e.target.value) || 0
                      })}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded p-1.5 pr-8 text-right"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">
                      {line.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUserQuotas}
                disabled={savingCommercial}
                className="flex items-center gap-2 px-5 py-2 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{savingCommercial ? 'Guardando...' : 'Actualizar en Supabase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
