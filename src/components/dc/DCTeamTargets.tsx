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
  Zap,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { GroupTarget, CommercialUser, BusinessLineId, BUSINESS_LINES, CommercialGroup, SalesRecord } from '@/types';
import { getGroupTarget, saveGroupTarget, getCommercialQuotas, saveCommercialQuotas, getAllUsers, getCommercialGroups, getAllSalesForFiscalYear } from '@/lib/storage';
import { calculateDCBonus } from '@/lib/calculations';

interface DCTeamTargetsProps {
  currentUser: CommercialUser;
  fiscalYear: string;
  onRefresh: () => void;
}

function cleanParseNumber(val: string | number): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).trim().replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export const DCTeamTargets: React.FC<DCTeamTargetsProps> = ({
  currentUser,
  fiscalYear,
  onRefresh,
}) => {
  const [groups, setGroups] = useState<CommercialGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupTarget, setGroupTarget] = useState<GroupTarget | null>(null);
  const [teamQuotas, setTeamQuotas] = useState<Record<string, Record<BusinessLineId, number>>>({});
  const [dcUser, setDcUser] = useState<CommercialUser | null>(null);
  const [dcPersonalQuotas, setDcPersonalQuotas] = useState<Record<BusinessLineId, number>>({} as any);

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<CommercialUser | null>(null);
  const [editedUserQuotas, setEditedUserQuotas] = useState<Record<BusinessLineId, number>>({} as any);
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState(false);
  const [savingCommercial, setSavingCommercial] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [teamMembers, setTeamMembers] = useState<CommercialUser[]>([]);
  const [groupSales, setGroupSales] = useState<SalesRecord[]>([]);

  useEffect(() => {
    loadData();
  }, [fiscalYear, currentUser.id, currentUser.group_id]);

  const loadData = async (overrideGroupId?: string) => {
    setLoading(true);
    try {
      const allGroups = await getCommercialGroups();
      setGroups(allGroups);

      // Determinar qué grupo mostrar según rol
      let targetGroupId = overrideGroupId || selectedGroupId;
      if (!targetGroupId) {
        if (currentUser.role === 'director_comercial') {
          // El Director Comercial ve ÚNICAMENTE su grupo asignado
          const myGroup = allGroups.find(g => g.director_commercial_id === currentUser.id || g.id === currentUser.group_id);
          targetGroupId = myGroup ? myGroup.id : (currentUser.group_id || allGroups[0]?.id || '');
        } else {
          // Admin o Director Territorial
          targetGroupId = currentUser.group_id || allGroups[0]?.id || '';
        }
      }

      setSelectedGroupId(targetGroupId);

      if (targetGroupId) {
        const gt = await getGroupTarget(targetGroupId, fiscalYear);
        const groupObj = allGroups.find(g => g.id === targetGroupId);
        if (groupObj && gt) {
          gt.group_name = groupObj.name;
        }
        setGroupTarget(gt);

        const all = await getAllUsers();

        // Identificar el Director Comercial de este grupo
        const activeDcUser = all.find(u => 
          (groupObj && u.id === groupObj.director_commercial_id) || 
          (u.group_id === targetGroupId && u.role === 'director_comercial')
        ) || (currentUser.role === 'director_comercial' ? currentUser : null);

        setDcUser(activeDcUser);

        if (activeDcUser) {
          const dcQ = await getCommercialQuotas(activeDcUser.id, fiscalYear);
          setDcPersonalQuotas(dcQ);
        } else {
          setDcPersonalQuotas({} as any);
        }

        // Filtrar estrictamente solo comerciales asignados al grupo activo
        const commercials = all.filter(u => u.role === 'comercial' && u.group_id === targetGroupId);
        setTeamMembers(commercials);

        const qMap: Record<string, Record<BusinessLineId, number>> = {};
        for (const m of commercials) {
          qMap[m.id] = await getCommercialQuotas(m.id, fiscalYear);
        }
        setTeamQuotas(qMap);

        // Cargar ventas consolidadas de los integrantes del grupo
        const allSales = await getAllSalesForFiscalYear(fiscalYear);
        const allMemberIds = [...commercials.map(u => u.id), ...(activeDcUser ? [activeDcUser.id] : [])];
        const relevantSales = allSales.filter(s => allMemberIds.includes(s.commercial_id || s.user_id || ''));
        setGroupSales(relevantSales);
      }
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
      await saveGroupTarget({
        ...groupTarget,
        group_id: selectedGroupId || groupTarget.group_id,
        dc_user_id: dcUser?.id || currentUser.id,
      });
      setNotification('¡Objetivos consolidados y métricas del Director Comercial guardados con éxito en Supabase!');
      onRefresh();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTarget(false);
    }
  };

  // Abrir editor de cuotas para un comercial específico o para el DC
  const handleOpenEditUser = (user: CommercialUser) => {
    setSelectedUserForEdit(user);
    if (dcUser && user.id === dcUser.id) {
      setEditedUserQuotas({ ...dcPersonalQuotas });
    } else {
      setEditedUserQuotas({ ...(teamQuotas[user.id] || {}) });
    }
  };

  // Guardar cuotas editadas para ese usuario (comercial o DC)
  const handleSaveUserQuotas = async () => {
    if (!selectedUserForEdit) return;
    setSavingCommercial(true);
    try {
      await saveCommercialQuotas(selectedUserForEdit.id, fiscalYear, editedUserQuotas);
      await loadData();
      setSelectedUserForEdit(null);
      setNotification(`Objetivos de ${selectedUserForEdit.full_name || selectedUserForEdit.name} actualizados correctamente en Supabase.`);
      onRefresh();
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCommercial(false);
    }
  };

  // 1. Suma de las cuotas de los comerciales asignados
  const individualSumCurrency = teamMembers.reduce((acc, member) => {
    const uQuotas = teamQuotas[member.id] || {};
    const memberTotal = BUSINESS_LINES
      .filter(b => b.isCurrency)
      .reduce((s, b) => s + (uQuotas[b.id] || 0), 0);
    return acc + memberTotal;
  }, 0);

  // 2. Cuota personal propia del Director Comercial (ventas directas)
  const dcPersonalSum = BUSINESS_LINES
    .filter(b => b.isCurrency)
    .reduce((s, b) => s + (dcPersonalQuotas[b.id] || 0), 0);

  const dcExtra = groupTarget?.dc_extra_quota || 0;

  // 3. Cuota Consolidada Total del Equipo (Comerciales + Cuota Personal DC + Televenta Extra)
  const totalGroupTargetCalculated = individualSumCurrency + dcPersonalSum + dcExtra;

  const activeGroupName = groups.find(g => g.id === selectedGroupId)?.name || groupTarget?.group_name || 'Equipo Comercial';

  // Cálculo del bono del DC (basado en ventas reales si existen, o estimación de referencia)
  const realGroupBilling = groupSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const realNewClients = groupSales.filter(s => s.is_new_client).length;
  const realManagedAmount = groupSales
    .filter(s => s.is_managed_service || s.line_id === 'MI' || s.line_id === 'SW')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const realManagedServicesPct = realGroupBilling > 0 ? (realManagedAmount / realGroupBilling) * 100 : 0;

  const actualOrSimulatedBilling = realGroupBilling > 0 ? realGroupBilling : totalGroupTargetCalculated * 0.96;
  const actualOrSimulatedNewClients = realGroupBilling > 0 ? realNewClients : 19;
  const actualOrSimulatedManaged = realGroupBilling > 0 ? realManagedServicesPct : 26.5;

  const dcBonusPreview = groupTarget ? calculateDCBonus(
    { ...groupTarget, annual_base_bonus: groupTarget.annual_base_bonus || 40000 },
    totalGroupTargetCalculated,
    actualOrSimulatedBilling,
    actualOrSimulatedManaged,
    actualOrSimulatedNewClients,
    9,
    14000
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded uppercase">
              Dirección Comercial
            </span>
            <span className="text-xs text-slate-500 font-medium">Ejercicio {fiscalYear}</span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              {activeGroupName}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Objetivos del Equipo y Configuración del Director
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervisa y edita las cuotas de cada comercial, gestiona tu cuota personal de ventas directas y el consolidado del equipo.
          </p>
        </div>

        {/* Selector de Grupo para Administrador / Director Territorial */}
        {(currentUser.role === 'admin' || currentUser.role === 'director_territorial') && groups.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 shrink-0">Equipo / Zona:</label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                loadData(e.target.value);
              }}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-solitium-500"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resumen Automático del Objetivo Grupal y Desglose Dual */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Cuota Consolidada de Equipo
            </span>
            <span className="text-xs text-slate-400 font-medium">&bull; Objetivo Total Anual</span>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            {totalGroupTargetCalculated.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Base para el cálculo del Bono de Dirección Anual de <strong>{(groupTarget.annual_base_bonus || 40000).toLocaleString('es-ES')} €</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-8 text-xs text-slate-300">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Comerciales Asignados</p>
            <p className="font-black text-white text-base mt-0.5">
              {individualSumCurrency.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-slate-400">{teamMembers.length} comerciales</p>
          </div>

          <div>
            <p className="text-purple-300 text-[10px] uppercase font-bold tracking-wider">Cuota Personal DC (Directa)</p>
            <p className="font-black text-purple-300 text-base mt-0.5">
              {dcPersonalSum.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-purple-400/90 font-mono">
              {dcUser ? (dcUser.seller_code || dcUser.vendor_code || 'Vendedor DC') : 'Sin DC'}
            </p>
          </div>

          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Televenta / Extra Grupo</p>
            <p className="font-black text-white text-base mt-0.5">
              {dcExtra.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-slate-500">Aportación adicional</p>
          </div>
        </div>
      </div>

      {/* BLOQUE DUAL: Tarjeta de Cuota Personal del Director Comercial */}
      {dcUser && (
        <div className="bg-linear-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-purple-800/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-purple-500 text-white font-bold px-2 py-0.5 rounded uppercase">
                Ventas Directas Propias
              </span>
              <span className="text-xs text-purple-200 font-mono font-semibold">
                Cód. Vendedor: {dcUser.seller_code || dcUser.vendor_code || 'DC'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" />
              Cuota Personal Comercial del Director: {dcUser.full_name || dcUser.name}
            </h3>
            <p className="text-xs text-purple-200/80 max-w-2xl">
              Tus ventas directas personales cuentan tanto para tus metas individuales en las 10 líneas de negocio como para el objetivo consolidado de tu equipo.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 p-3.5 rounded-xl backdrop-blur-xs border border-white/10 shrink-0">
            <div>
              <p className="text-[10px] text-purple-200 uppercase font-semibold">Total Cuota Personal (€)</p>
              <p className="text-xl font-black text-white">
                {dcPersonalSum.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </p>
              <p className="text-[10px] text-emerald-300 font-semibold">
                {dcPersonalQuotas['SAGE_CLIENTS'] || 0} Clientes SAGE
              </p>
            </div>
            <button
              onClick={() => handleOpenEditUser(dcUser)}
              className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Edit3 className="w-4 h-4" />
              <span>Configurar Mi Cuota Personal</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Tabla de Comerciales Asignados para ver y editar cuotas individuales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Comerciales Asignados a {activeGroupName} ({teamMembers.length})
            </h3>
            <p className="text-xs text-slate-500">
              Haz clic en "Editar Cuotas" para ajustar los objetivos individuales de cualquier vendedor en Supabase con importes exactos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase">
              <tr>
                <th className="p-3.5">Comercial / Rol</th>
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
              {/* Fila destacada del Director Comercial */}
              {dcUser && (
                <tr className="bg-purple-50/50 hover:bg-purple-50/80 transition-colors border-b-2 border-purple-100">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                        Dir. Comercial
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{dcUser.full_name || dcUser.name}</div>
                        <div className="text-[11px] text-slate-400">{dcUser.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="bg-purple-100 text-purple-800 font-mono font-bold px-2 py-0.5 rounded">
                      {dcUser.seller_code || dcUser.vendor_code || 'DC'}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold">{(dcPersonalQuotas['OFI'] || 0).toLocaleString('es-ES')} €</td>
                  <td className="p-3.5 font-semibold">{(dcPersonalQuotas['SISTEMAS'] || 0).toLocaleString('es-ES')} €</td>
                  <td className="p-3.5 font-semibold">{(dcPersonalQuotas['DW'] || 0).toLocaleString('es-ES')} €</td>
                  <td className="p-3.5 font-black text-purple-900">
                    {dcPersonalSum.toLocaleString('es-ES')} €
                  </td>
                  <td className="p-3.5 text-emerald-700 font-bold">
                    {dcPersonalQuotas['SAGE_CLIENTS'] || 0} clientes
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleOpenEditUser(dcUser)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Mi Cuota</span>
                    </button>
                  </td>
                </tr>
              )}

              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No hay otros comerciales asignados a este equipo en este momento.
                  </td>
                </tr>
              ) : (
                teamMembers.map(member => {
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Formulario de Configuración de Objetivos y Bono Anual del Director Comercial */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Configuración de Métricas Estratégicas y Bono de Dirección (Hasta 40.000 €)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Define el bono base anual y las submétricas clave del plan de compensación directivo de Solitium sin restricciones de múltiplos.
          </p>
        </div>

        <form onSubmit={handleSaveGroupTarget} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bono Anual Base */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Bono Anual de Dirección Base (€)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Importe base directivo sujeto a escala de facturación (hasta 40.000 €)</p>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={groupTarget.annual_base_bonus ?? 40000}
                  onChange={(e) => setGroupTarget({ ...groupTarget, annual_base_bonus: cleanParseNumber(e.target.value) })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
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
                  step="any"
                  min="0"
                  value={groupTarget.managed_services_pct ?? 0}
                  onChange={(e) => setGroupTarget({ ...groupTarget, managed_services_pct: cleanParseNumber(e.target.value) })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
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
                  step="any"
                  min="0"
                  value={groupTarget.new_client_units ?? 0}
                  onChange={(e) => setGroupTarget({ ...groupTarget, new_client_units: Math.round(cleanParseNumber(e.target.value)) })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-14 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
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
                  step="any"
                  min="0"
                  value={groupTarget.turbo_sage_leads ?? 0}
                  onChange={(e) => setGroupTarget({ ...groupTarget, turbo_sage_leads: Math.round(cleanParseNumber(e.target.value)) })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
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
                  step="any"
                  min="0"
                  value={groupTarget.turbo_bol_svm ?? 0}
                  onChange={(e) => setGroupTarget({ ...groupTarget, turbo_bol_svm: cleanParseNumber(e.target.value) })}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-solitium-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>

            {/* Cuota Asignada Extra DC / Televenta */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                Aportación Televenta / Extra Grupo (€)
              </label>
              <p className="text-[11px] text-purple-700 mb-2">Aportación centralizada que se suma al objetivo del grupo</p>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={groupTarget.dc_extra_quota ?? 0}
                  onChange={(e) => setGroupTarget({ ...groupTarget, dc_extra_quota: cleanParseNumber(e.target.value) })}
                  className="w-full text-sm font-bold bg-white border border-purple-300 rounded-lg p-2.5 pr-8 focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
              <span>{savingTarget ? 'Guardando en Supabase...' : 'Guardar Configuración Consolidada DC'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal para editar cuotas individuales (Comercial o Director) */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold">
                    Editar Cuotas: {selectedUserForEdit.full_name || selectedUserForEdit.name}
                  </h4>
                  {selectedUserForEdit.role === 'director_comercial' && (
                    <span className="text-[10px] bg-purple-500 text-white font-bold px-2 py-0.5 rounded">
                      Dir. Comercial
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Código: {selectedUserForEdit.seller_code || selectedUserForEdit.vendor_code} &bull; Ejercicio: {fiscalYear}
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
                <div key={line.id} className="flex items-center justify-between gap-4 p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{line.name} ({line.shortName})</p>
                    <p className="text-[10px] text-slate-400">{line.group}</p>
                  </div>
                  <div className="w-44 relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editedUserQuotas[line.id] ?? 0}
                      onChange={(e) => setEditedUserQuotas({
                        ...editedUserQuotas,
                        [line.id]: cleanParseNumber(e.target.value)
                      })}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2 pr-9 text-right focus:ring-2 focus:ring-solitium-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">
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
                className="flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{savingCommercial ? 'Guardando en Supabase...' : 'Guardar en Supabase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
