'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Award, 
  ArrowRight, 
  Target, 
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';
import { CommercialUser, GroupTarget, CommercialGroup } from '@/types';
import { getAllUsers, getGroupTarget, getAllSalesForFiscalYear, getCommercialGroups } from '@/lib/storage';

interface TerritorialViewProps {
  fiscalYear: string;
  onSelectGroup?: (groupId: string) => void;
}

export const TerritorialView: React.FC<TerritorialViewProps> = ({
  fiscalYear,
  onSelectGroup,
}) => {
  const [groups, setGroups] = useState<CommercialGroup[]>([]);
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerritorialData();
  }, [fiscalYear]);

  const loadTerritorialData = async () => {
    setLoading(true);
    try {
      const [g, u, s] = await Promise.all([
        getCommercialGroups(),
        getAllUsers(),
        getAllSalesForFiscalYear(fiscalYear),
      ]);
      setGroups(g);
      setUsers(u);
      setSales(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas dinámicas de los grupos existentes en la base de datos
  const groupStats = groups.map(group => {
    const groupUsers = users.filter(u => u.group_id === group.id && u.role === 'comercial');
    const groupUserIds = groupUsers.map(u => u.id);
    const groupVendorCodes = groupUsers.map(u => (u.seller_code || u.vendor_code || '').toLowerCase());

    const groupSales = sales.filter(s => 
      groupUserIds.includes(s.user_id) || groupVendorCodes.includes(s.vendor_code?.toLowerCase())
    );

    const totalFacturacion = groupSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalNewClients = groupSales.filter(s => s.is_new_client).length;

    // Director comercial del grupo
    const dcUser = users.find(u => u.id === group.director_commercial_id || (u.group_id === group.id && u.role === 'director_comercial'));

    return {
      group,
      commercialCount: groupUsers.length,
      dcName: dcUser ? (dcUser.full_name || dcUser.name) : 'Por Asignar',
      totalFacturacion,
      totalNewClients,
      estimacionTarget: 250000,
      cumplimiento: (totalFacturacion / 250000) * 100,
    };
  });

  const totalTerritorialSales = groupStats.reduce((acc, g) => acc + g.totalFacturacion, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Dirección Territorial
            </span>
            <span className="text-xs text-slate-400 font-medium">&bull; Ejercicio {fiscalYear}</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Consolidado de Zonas Territoriales ({groups.length} Grupos)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión integral de rendimiento, ventas e incentivos por zona comercial en Solitium.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-5">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Facturación Territorial</p>
            <p className="text-xl font-black text-emerald-400">
              {totalTerritorialSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          <div className="border-l border-slate-700 pl-4 text-xs text-slate-300">
            <p>Grupos Activos: <span className="font-bold text-white">{groups.length}</span></p>
            <p>Comerciales: <span className="font-bold text-white">{users.filter(u => u.role === 'comercial').length}</span></p>
          </div>
        </div>
      </div>

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {groupStats.map(({ group, commercialCount, dcName, totalFacturacion, totalNewClients, cumplimiento }) => (
          <div 
            key={group.id}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md font-mono">
                    ID: {group.id.slice(0, 8)}...
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {group.name}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-600">
                    {cumplimiento.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="my-4 p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Director Comercial:</span>
                  <span className="font-bold text-slate-800">{dcName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Comerciales asignados:</span>
                  <span className="font-semibold text-slate-700">{commercialCount} agentes</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Ventas Consolidadas:</span>
                  <span className="font-black text-slate-900">
                    {totalFacturacion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nuevos Clientes Captados:</span>
                  <span className="font-bold text-emerald-700">{totalNewClients} clientes</span>
                </div>
              </div>
            </div>

            {/* Barra de progreso de cumplimiento */}
            <div className="space-y-1.5 pt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, cumplimiento)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
