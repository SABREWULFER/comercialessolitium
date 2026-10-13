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
  ShieldAlert,
  AlertTriangle,
  Activity,
  TrendingDown
} from 'lucide-react';
import { GroupTarget, CommercialUser, BusinessLineId, BUSINESS_LINES, CommercialGroup, SalesRecord } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
  const [selectedDiagnosticCommercialId, setSelectedDiagnosticCommercialId] = useState<string>('');

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

        // Filtrar comerciales asignados al grupo activo
        const commercials = all.filter(u => u.role === 'comercial' && u.group_id === targetGroupId);

        // Incluir a Televenta como comercial multi-equipo para ambos equipos
        const televentaUser = all.find(u => 
          (u.seller_code || u.vendor_code || '').trim().toUpperCase() === 'TELEVENTA' ||
          (u.email || '').toLowerCase().includes('televenta')
        );
        if (televentaUser && !commercials.some(c => c.id === televentaUser.id)) {
          commercials.push(televentaUser);
        }

        setTeamMembers(commercials);

        // 3. CARGA DIRECTA DE CUOTAS AL MONTAR LA PÁGINA DESDE SUPABASE
        let quotasData: any[] = [];
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('commercial_quotas')
              .select('*')
              .eq('fiscal_year', fiscalYear);

            if (error) {
              console.error('Error consultando commercial_quotas desde Supabase:', error);
            } else if (data) {
              quotasData = data;
            }
          } catch (err) {
            console.error('Excepción al cargar commercial_quotas:', err);
          }
        }

        const matchRowToUser = (row: any, user: CommercialUser) => {
          const rowCommId = (row.commercial_id || row.user_id || '').toString().trim().toUpperCase();
          const userId = (user.id || '').toString().trim().toUpperCase();
          const userSellerCode = (user.seller_code || user.vendor_code || '').toString().trim().toUpperCase();
          return Boolean(
            (rowCommId && rowCommId === userId) ||
            (userSellerCode && rowCommId === userSellerCode)
          );
        };

        // Rellenar cuota personal del Director Comercial
        if (activeDcUser) {
          const dcQ: Record<BusinessLineId, number> = {} as any;
          BUSINESS_LINES.forEach(b => { dcQ[b.id] = 0; });

          const dcRows = quotasData.filter(r => matchRowToUser(r, activeDcUser));
          if (dcRows.length > 0) {
            dcRows.forEach(r => {
              if (r.line_id && dcQ.hasOwnProperty(r.line_id)) {
                const amt = r.quota_amount !== undefined ? Number(r.quota_amount) : Number(r.target_value);
                dcQ[r.line_id as BusinessLineId] = isNaN(amt) ? 0 : amt;
              }
            });
          } else {
            const fallback = await getCommercialQuotas(activeDcUser.id, fiscalYear, activeDcUser.seller_code || activeDcUser.vendor_code);
            Object.assign(dcQ, fallback);
          }
          setDcPersonalQuotas(dcQ);
        } else {
          setDcPersonalQuotas({} as any);
        }

        // Rellenar cuotas para cada comercial asignado al equipo
        const qMap: Record<string, Record<BusinessLineId, number>> = {};
        for (const m of commercials) {
          const mQ: Record<BusinessLineId, number> = {} as any;
          BUSINESS_LINES.forEach(b => { mQ[b.id] = 0; });

          const mRows = quotasData.filter(r => matchRowToUser(r, m));
          if (mRows.length > 0) {
            mRows.forEach(r => {
              if (r.line_id && mQ.hasOwnProperty(r.line_id)) {
                const amt = r.quota_amount !== undefined ? Number(r.quota_amount) : Number(r.target_value);
                mQ[r.line_id as BusinessLineId] = isNaN(amt) ? 0 : amt;
              }
            });
          } else {
            const fallback = await getCommercialQuotas(m.id, fiscalYear, m.seller_code || m.vendor_code);
            Object.assign(mQ, fallback);
          }
          qMap[m.id] = mQ;
        }
        setTeamQuotas(qMap);

        // Cargar ventas consolidadas de los integrantes del grupo con filtrado por EQUIPO COMERCIAL
        const allSales = await getAllSalesForFiscalYear(fiscalYear);
        const allMemberIds = [...commercials.map(u => u.id), ...(activeDcUser ? [activeDcUser.id] : [])];

        const dcSellerCode = (activeDcUser?.seller_code || activeDcUser?.vendor_code || currentUser.seller_code || '').trim().toUpperCase();
        const activeGroupObj = allGroups.find(g => g.id === targetGroupId);
        const groupName = (activeGroupObj?.name || '').trim().toUpperCase();
        const dcFullName = (activeDcUser?.full_name || activeDcUser?.name || currentUser.name || '').trim().toUpperCase();

        const isSaleMatchingThisTeam = (sale: SalesRecord) => {
          const isMember = allMemberIds.includes(sale.commercial_id || sale.user_id || '');
          if (!isMember) return false;

          const isTeleventaSale = televentaUser && (sale.commercial_id === televentaUser.id || sale.user_id === televentaUser.id);

          // Si la venta tiene team_code, debe pertenecer al equipo de este Director Comercial
          if (sale.team_code) {
            const saleTeam = sale.team_code.trim().toUpperCase();
            const isCodeMatch = dcSellerCode && (saleTeam === dcSellerCode || saleTeam.includes(dcSellerCode) || dcSellerCode.includes(saleTeam));
            const isNameMatch = groupName && (saleTeam === groupName || saleTeam.includes(groupName) || groupName.includes(saleTeam));
            const isDcNameMatch = dcFullName && (saleTeam.includes(dcFullName) || dcFullName.includes(saleTeam));
            const isGroupIdMatch = sale.team_code === targetGroupId;
            return Boolean(isCodeMatch || isNameMatch || isDcNameMatch || isGroupIdMatch);
          }

          // Si es venta de Televenta pero NO trae team_code, no se consolida automáticamente para evitar solapamientos
          if (isTeleventaSale) {
            return false;
          }

          // Si la venta no trae team_code (por compatibilidad previa), se consolida por comercial asignado
          return true;
        };

        const relevantSales = allSales.filter(isSaleMatchingThisTeam);
        setGroupSales(relevantSales);

        // Inicializar o ajustar comercial seleccionado para diagnóstico
        setSelectedDiagnosticCommercialId(prev => {
          if (commercials.some(m => m.id === prev)) return prev;
          if (activeDcUser && prev === activeDcUser.id) return prev;
          return commercials[0]?.id || activeDcUser?.id || '';
        });
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
      const currentCommercialId = selectedUserForEdit.id;
      const quotasToUpsert = Object.entries(editedUserQuotas).map(([lineId, amount]) => ({
        commercial_id: currentCommercialId,
        line_id: lineId,
        fiscal_year: fiscalYear || '2026-2027',
        quota_amount: Number(amount) || 0,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('commercial_quotas')
        .upsert(quotasToUpsert, { onConflict: 'commercial_id,line_id,fiscal_year' });

      if (error) {
        console.error('Error al guardar en commercial_quotas:', error);
        setNotification(`Error técnico al guardar en Supabase: ${error.message}${error.details ? ` (${error.details})` : ''}`);
        return;
      }

      await saveCommercialQuotas(selectedUserForEdit.id, fiscalYear, editedUserQuotas);
      await loadData();
      setSelectedUserForEdit(null);
      setNotification(`Cuotas guardadas correctamente en Supabase para ${selectedUserForEdit.full_name || selectedUserForEdit.name}`);
      onRefresh();
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      console.error(err);
      setNotification(`Error inesperado: ${err.message}`);
    } finally {
      setSavingCommercial(false);
    }
  };

  // 1. Suma de las cuotas de los comerciales asignados
  const individualSumCurrency = teamMembers.reduce((acc, member) => {
    const uQuotas = teamQuotas[member.id] || {};
    const memberTotal = BUSINESS_LINES
      .filter(b => b.isCurrency && b.hasTarget !== false)
      .reduce((s, b) => s + (uQuotas[b.id] || 0), 0);
    return acc + memberTotal;
  }, 0);

  // 2. Cuota personal propia del Director Comercial (ventas directas)
  const dcPersonalSum = BUSINESS_LINES
    .filter(b => b.isCurrency && b.hasTarget !== false)
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

  // Comercial seleccionado para diagnóstico ("¿En qué pata falla?")
  const diagnosticTargetUser = teamMembers.find(m => m.id === selectedDiagnosticCommercialId) || 
    (dcUser?.id === selectedDiagnosticCommercialId ? dcUser : teamMembers[0]) || 
    dcUser;

  const diagnosticQuotas = diagnosticTargetUser ? (
    diagnosticTargetUser.id === dcUser?.id ? dcPersonalQuotas : (teamQuotas[diagnosticTargetUser.id] || ({} as any))
  ) : ({} as any);

  const diagnosticSales = diagnosticTargetUser ? groupSales.filter(s => (s.commercial_id || s.user_id) === diagnosticTargetUser.id) : [];

  const lineDiagnostics = BUSINESS_LINES.map(line => {
    const isInformative = line.hasTarget === false;
    const target = diagnosticQuotas[line.id] || 0;
    const actual = line.isCurrency
      ? diagnosticSales.filter(s => s.line_id === line.id).reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      : diagnosticSales.filter(s => s.line_id === line.id && s.is_new_client).length;
    
    let moInActual = 0;
    let bolActual = 0;
    let moInShareOfActual = 0;
    let moInTarget80 = 0;
    let moInThresholdMet = false;

    if (line.id === 'MI') {
      const miSales = diagnosticSales.filter(s => s.line_id === 'MI');
      moInActual = miSales
        .filter(s => s.subline === 'MO-IN' || (!s.subline && s.subline !== 'BOL'))
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      bolActual = miSales
        .filter(s => s.subline === 'BOL' || s.raw_data?.['Concepto Presupuesto']?.includes('BOL'))
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      moInShareOfActual = actual > 0 ? (moInActual / actual) * 100 : 0;
      moInTarget80 = target * 0.8;
      moInThresholdMet = target > 0 ? moInActual >= moInTarget80 : true;
    }

    const remaining = isInformative ? 0 : Math.max(0, target - actual);
    const percentage = isInformative ? 100 : (target > 0 ? (actual / target) * 100 : (actual > 0 ? 100 : 0));

    let status: 'critical' | 'progress' | 'achieved' | 'informative' = 'critical';
    if (isInformative) {
      status = 'informative';
    } else if (percentage >= 100) {
      status = 'achieved';
    } else if (percentage >= 70) {
      status = 'progress';
    }

    return {
      line,
      isInformative,
      target,
      actual,
      remaining,
      percentage,
      status,
      moInActual,
      bolActual,
      moInShareOfActual,
      moInTarget80,
      moInThresholdMet,
    };
  });

  const linesUnder50 = lineDiagnostics.filter(l => !l.isInformative && l.target > 0 && l.percentage < 50);
  const criticalCount = lineDiagnostics.filter(l => l.status === 'critical').length;
  const progressCount = lineDiagnostics.filter(l => l.status === 'progress').length;
  const achievedCount = lineDiagnostics.filter(l => l.status === 'achieved').length;

  const totalDiagnosticTarget = BUSINESS_LINES.filter(b => b.isCurrency && b.hasTarget !== false).reduce((sum, b) => sum + (diagnosticQuotas[b.id] || 0), 0);
  const totalDiagnosticActual = diagnosticSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalDiagnosticRemaining = Math.max(0, totalDiagnosticTarget - totalDiagnosticActual);
  const totalDiagnosticPct = totalDiagnosticTarget > 0 ? (totalDiagnosticActual / totalDiagnosticTarget) * 100 : 0;

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
                    .filter(b => b.isCurrency && b.hasTarget !== false)
                    .reduce((sum, b) => sum + (q[b.id] || 0), 0);
                  const isTeleventa = (member.seller_code || member.vendor_code || '').trim().toUpperCase() === 'TELEVENTA';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {isTeleventa && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 font-black px-1.5 py-0.5 rounded uppercase">
                              Multi-Equipo
                            </span>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{member.name || member.full_name}</div>
                            <div className="text-[11px] text-slate-400">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded">
                          {member.seller_code || member.vendor_code}
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

      {/* 4. Vista de Análisis de Rendimiento por Comercial ("En qué pata falla" con semáforo) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Diagnóstico de Rendimiento
              </span>
              <span className="text-xs text-slate-400 font-medium">&bull; Análisis Semafórico 10 Líneas</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-solitium-500" />
              ¿En Qué Pata Falla Cada Comercial?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de consecución real vs cuota línea a línea para preparar las reuniones de seguimiento y desbloquear desviaciones.
            </p>
          </div>

          {/* Selector de comercial para diagnóstico */}
          <div className="flex flex-wrap items-center gap-2">
            {teamMembers.map(member => {
              const isSelected = member.id === diagnosticTargetUser?.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedDiagnosticCommercialId(member.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-solitium-500 text-white border-solitium-600 shadow-md scale-[1.02]'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-solitium-500'}`}></span>
                  <span>{member.full_name || member.name}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {member.seller_code || member.vendor_code}
                  </span>
                </button>
              );
            })}

            {dcUser && (
              <button
                onClick={() => setSelectedDiagnosticCommercialId(dcUser.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  dcUser.id === diagnosticTargetUser?.id
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.02]'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dcUser.id === diagnosticTargetUser?.id ? 'bg-white' : 'bg-purple-500'}`}></span>
                <span>{dcUser.full_name || dcUser.name} (DC)</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  dcUser.id === diagnosticTargetUser?.id ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  {dcUser.seller_code || dcUser.vendor_code || 'DC'}
                </span>
              </button>
            )}
          </div>
        </div>

        {diagnosticTargetUser ? (
          <div className="p-6 space-y-6">
            {/* Alerta / Resumen de diagnóstico rápido: Líneas por debajo del 50% */}
            {linesUnder50.length > 0 ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Resumen de Diagnóstico Rápido: {linesUnder50.length} Línea(s) por debajo del 50%
                    </h4>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Empujar en Seguimiento Semanal
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-1">
                    Para <strong className="font-extrabold">{diagnosticTargetUser.full_name || diagnosticTargetUser.name}</strong>, estas líneas requieren foco comercial inmediato para evitar desvíos en el cierre anual:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {linesUnder50.map(item => (
                      <div 
                        key={item.line.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-rose-900 border border-rose-300 rounded-lg text-xs font-bold shadow-2xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>{item.line.name}</span>
                        <span className="font-mono text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded">
                          {item.percentage.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (Faltan {item.remaining.toLocaleString('es-ES', { minimumFractionDigits: item.line.isCurrency ? 2 : 0 })} {item.line.unit})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Rendimiento Equilibrado
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    <strong className="font-bold">{diagnosticTargetUser.full_name || diagnosticTargetUser.name}</strong> no presenta ninguna línea asignada por debajo del 50% de cuota. Todas las líneas evolucionan a buen ritmo.
                  </p>
                </div>
              </div>
            )}

            {/* Tarjetas KPI de este comercial */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cuota Asignada (€)</p>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {totalDiagnosticTarget.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Líneas monetarias
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Facturado Real (€)</p>
                <p className="text-lg font-black text-solitium-600 mt-1">
                  {totalDiagnosticActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ventas sumadas a este equipo
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Restante para Objetivo (€)</p>
                <p className="text-lg font-black text-slate-800 mt-1">
                  {totalDiagnosticRemaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pendiente de cubrir
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resumen Semáforo (Líneas)</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    🔴 {criticalCount}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    🟡 {progressCount}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    🟢 {achievedCount}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div 
                    className={`h-1.5 rounded-full ${
                      totalDiagnosticPct >= 100 ? 'bg-emerald-500' : totalDiagnosticPct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, totalDiagnosticPct))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Tabla Detallada de las 10 Líneas de Negocio con Semáforo */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-3.5">Línea de Negocio</th>
                    <th className="p-3.5 text-right">Cuota Asignada</th>
                    <th className="p-3.5 text-right">Facturado Real</th>
                    <th className="p-3.5 text-right">Restante para Objetivo</th>
                    <th className="p-3.5 text-center">% Consecución</th>
                    <th className="p-3.5 text-center">Estado Semáforo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {lineDiagnostics.map(item => {
                    const isCurrency = item.line.isCurrency;
                    const isInformative = item.isInformative;

                    return (
                      <tr 
                        key={item.line.id} 
                        className={`transition-colors ${
                          isInformative ? 'hover:bg-blue-50/20 bg-white' :
                          item.status === 'critical' ? 'hover:bg-rose-50/40 bg-white' : 
                          item.status === 'progress' ? 'hover:bg-amber-50/40 bg-white' : 
                          'hover:bg-emerald-50/40 bg-emerald-50/10'
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isInformative ? 'bg-blue-400' : 'bg-solitium-500'}`}></span>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{item.line.name}</span>
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                  {item.line.shortName}
                                </span>
                                {isInformative && (
                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                                    Informativa
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">{item.line.group}</div>
                              {/* Desglose para Mantenimiento MI */}
                              {item.line.id === 'MI' && (
                                <div className="mt-1 text-[10px] font-medium text-slate-600 flex items-center gap-2 flex-wrap">
                                  <span className="text-purple-700 font-semibold">
                                    Core MO-IN: {(item.moInActual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  </span>
                                  <span>&bull;</span>
                                  <span className="text-slate-500">
                                    BOL: {(item.bolActual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  </span>
                                  <span>&bull;</span>
                                  <span className={(item.moInActual || 0) >= (item.moInTarget80 || 0) ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                    {(item.moInActual || 0) >= (item.moInTarget80 || 0) ? '✅ Umbral 80% Core OK' : `⚠️ Falta 80% core (${(item.moInTarget80 || 0).toLocaleString('es-ES')} €)`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-semibold text-slate-700">
                          {isInformative ? (
                            <span className="text-slate-400 text-[11px] italic">Sin cuota</span>
                          ) : isCurrency
                            ? `${item.target.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                            : `${item.target} Clientes`}
                        </td>

                        <td className="p-3.5 text-right font-bold text-slate-900">
                          {isCurrency
                            ? `${item.actual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                            : `${item.actual} Clientes`}
                        </td>

                        <td className="p-3.5 text-right font-medium">
                          {isInformative ? (
                            <span className="text-slate-400 text-[11px]">—</span>
                          ) : item.remaining > 0 ? (
                            <span className="text-slate-600">
                              {isCurrency
                                ? `${item.remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                : `${item.remaining} Clientes`}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">¡Objetivo Cubierto!</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {isInformative ? (
                            <div className="text-center text-[11px] font-bold text-blue-600">
                              Real Informativo
                            </div>
                          ) : (
                            <div className="w-28 mx-auto space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className={
                                  item.status === 'critical' ? 'text-rose-600' :
                                  item.status === 'progress' ? 'text-amber-600' :
                                  'text-emerald-600'
                                }>
                                  {item.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    item.status === 'critical' ? 'bg-rose-500' :
                                    item.status === 'progress' ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {isInformative && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                              <span>ℹ️</span>
                              <span>Informativa</span>
                            </span>
                          )}
                          {item.status === 'critical' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                              <span>🔴</span>
                              <span>Crítico (&lt; 70%)</span>
                            </span>
                          )}
                          {item.status === 'progress' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                              <span>🟡</span>
                              <span>En progreso (70-99%)</span>
                            </span>
                          )}
                          {item.status === 'achieved' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span>🟢</span>
                              <span>Superado (≥ 100%)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            Selecciona un comercial de la lista superior para diagnosticar su rendimiento.
          </div>
        )}
      </div>

      {/* 5. Formulario de Configuración de Objetivos y Bono Anual del Director Comercial */}
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
              {BUSINESS_LINES.filter(b => b.hasTarget !== false).map(line => (
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
