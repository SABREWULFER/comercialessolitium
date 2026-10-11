import { 
  BusinessLineId, 
  BUSINESS_LINES, 
  QuotaProgress, 
  SalesRecord, 
  AcceleratorTier,
  GroupTarget
} from '@/types';

/**
 * Mapear texto de las columnas de liquidación ('Club 100%', 'Linea Código', etc.) a BusinessLineId
 * Mapea:
 * - 'OFI Oficina' o 'OFI Produccion' -> OFI / PP
 * - 'INF+SW' -> MICRO / SW
 * - 'Sistemas' -> SISTEMAS
 * - 'Docuware' -> DW
 * - 'MI' -> MI
 * - 'Gran Formato' -> GF
 * - '3D' -> 3D
 * - 'Audiovisuales' -> AV
 * - 'SAGE' -> SAGE_CLIENTS
 */
export function mapRawLineToId(rawLine?: string, rawCode?: string): BusinessLineId {
  const c100 = (rawLine || '').toString().toUpperCase().trim();
  const code = (rawCode || '').toString().toUpperCase().trim();
  const combined = `${c100} ${code}`.trim();

  if (!combined) return 'OFI';

  // SAGE
  if (combined.includes('SAGE')) return 'SAGE_CLIENTS';

  // Docuware -> DW
  if (combined.includes('DOCUWARE') || combined.includes('DOCU') || c100 === 'DW' || code === 'DW') {
    return 'DW';
  }

  // OFI Produccion -> PP vs OFI Oficina -> OFI
  if (combined.includes('OFI PRODUCCION') || combined.includes('OFI PRODUCCIÓN') || combined.includes('PRODUCCION') || combined.includes('PRODUCCIÓN') || c100 === 'PP' || code === 'PP') {
    return 'PP';
  }
  if (combined.includes('OFI OFICINA') || combined.includes('OFICINA') || c100 === 'OFI' || code === 'OFI' || combined.includes('IMPRESION')) {
    return 'OFI';
  }

  // INF+SW -> MICRO o SW
  if (combined.includes('INF+SW') || combined.includes('INF + SW') || combined.includes('INFORMATICA') || combined.includes('INFORMÁTICA')) {
    if (combined.includes('SW') || combined.includes('SOFTWARE') || combined.includes('SUSCRIP') || combined.includes('LICENCIA')) {
      return 'SW';
    }
    return 'MICRO';
  }
  if (combined.includes('SUSCRIPCION') || combined.includes('SUSCRIPCIÓN') || c100 === 'SW' || code === 'SW' || combined.includes('SOFTWARE')) {
    return 'SW';
  }
  if (combined.includes('MICRO') || c100 === 'MICRO' || code === 'MICRO') {
    return 'MICRO';
  }

  // Sistemas -> SISTEMAS
  if (combined.includes('SISTEMA') || combined.includes('SISTEMAS') || c100 === 'SISTEMAS' || code === 'SISTEMAS') {
    return 'SISTEMAS';
  }

  // MI -> MI (Mantenimiento Solitium)
  if (combined.includes('MANTENIMIENTO') || c100 === 'MI' || code === 'MI' || combined.includes('MANT.')) {
    return 'MI';
  }

  // Especialidades: Gran Formato (GF), 3D Desktop (3D), Audiovisuales (AV)
  if (combined.includes('GRAN FORMATO') || c100 === 'GF' || code === 'GF' || combined.includes('PLOTTER')) {
    return 'GF';
  }
  if (combined.includes('3D') || c100 === '3D' || code === '3D') {
    return '3D';
  }
  if (combined.includes('AUDIOVISUAL') || combined.includes('AV') || c100 === 'AV' || code === 'AV') {
    return 'AV';
  }

  // Coincidencia directa por id en BusinessLineConfig
  const directMatch = BUSINESS_LINES.find(b => b.id === c100 || b.id === code);
  if (directMatch) return directMatch.id;

  return 'OFI';
}

/**
 * Calcular el progreso dinámico línea a línea comparando Ventas Reales vs Cuotas Guardadas
 */
export function calculateQuotaProgress(
  quotas: Record<BusinessLineId, number>,
  sales: SalesRecord[]
): QuotaProgress[] {
  // Acumular ventas por línea
  const actuals: Record<BusinessLineId, number> = {} as any;
  BUSINESS_LINES.forEach(b => {
    actuals[b.id] = 0;
  });

  sales.forEach(sale => {
    const lineId = sale.line_id;
    if (lineId === 'SAGE_CLIENTS') {
      // Para clientes nuevos SAGE se cuenta la cantidad de clientes
      if (sale.is_new_client) {
        actuals['SAGE_CLIENTS'] = (actuals['SAGE_CLIENTS'] || 0) + 1;
      }
    } else if (actuals[lineId] !== undefined) {
      actuals[lineId] = (actuals[lineId] || 0) + (Number(sale.amount) || 0);
    }
  });

  return BUSINESS_LINES.map(line => {
    const target = quotas[line.id] || 0;
    const actual = actuals[line.id] || 0;
    const remaining = Math.max(0, target - actual);
    const percentage = target > 0 ? (actual / target) * 100 : 0;
    const isCompleted = target > 0 && actual >= target;

    return {
      line,
      target,
      actual,
      remaining,
      percentage,
      isCompleted,
    };
  });
}

/**
 * Calcular Aceleradores Anuales (95%, 100%, 120%)
 */
export function calculateAccelerators(
  progressList: QuotaProgress[]
): {
  totalTargetCurrency: number;
  totalActualCurrency: number;
  overallPercentage: number;
  remainingToGlobal: number;
  tiers: AcceleratorTier[];
} {
  // Excluimos las líneas no monetarias para el cálculo global de facturación
  const currencyLines = progressList.filter(p => p.line.isCurrency);
  const totalTarget = currencyLines.reduce((acc, curr) => acc + curr.target, 0);
  const totalActual = currencyLines.reduce((acc, curr) => acc + curr.actual, 0);
  const overallPercentage = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const remainingToGlobal = Math.max(0, totalTarget - totalActual);

  const tiers: AcceleratorTier[] = [
    {
      threshold: 0.95,
      label: 'Nivel 1 - 95%',
      multiplier: 1.05,
      achieved: overallPercentage >= 95,
      extraRewardDescription: 'Bonus extra de acelerador +5% sobre comisión base',
    },
    {
      threshold: 1.00,
      label: 'Nivel 2 - 100% (Club 100%)',
      multiplier: 1.15,
      achieved: overallPercentage >= 100,
      extraRewardDescription: 'Acceso a Convención Anual + 15% multiplicador anual',
    },
    {
      threshold: 1.20,
      label: 'Nivel 3 - 120% (Turbo Excelencia)',
      multiplier: 1.30,
      achieved: overallPercentage >= 120,
      extraRewardDescription: 'Multiplicador máximo +30% y premio especial Solitium Élite',
    },
  ];

  return {
    totalTargetCurrency: totalTarget,
    totalActualCurrency: totalActual,
    overallPercentage,
    remainingToGlobal,
    tiers,
  };
}

/**
 * Calcular Bono Anual del Director Comercial con escalado y submétricas
 */
export function calculateDCBonus(
  groupTarget: GroupTarget,
  groupTotalTarget: number, // Suma de objetivos del equipo + cuota DC
  groupTotalActual: number, // Ventas reales del equipo
  managedServicesActual: number, // % real o facturación en MI + SW
  newClientsActualCount: number, // Conteo de clientes nuevos del grupo
  turboSageActualCount: number, // Leads SAGE conseguidos
  turboBolSvmActualAmount: number // Ventas BOL/SVM conseguidas (€)
) {
  const baseBonus = groupTarget.annual_base_bonus || 0;
  const billingPct = groupTotalTarget > 0 ? (groupTotalActual / groupTotalTarget) * 100 : 0;

  // Escala de consecución de facturación:
  // < 90% -> 0%
  // 90% a 99.9% -> 70% del bono proporcional
  // 100% a 109.9% -> 100% del bono
  // 110% a 119.9% -> 115% del bono
  // 120% a 129.9% -> 130% del bono
  // >= 130% -> 150% del bono
  let billingBonusMultiplier = 0;
  if (billingPct >= 130) billingBonusMultiplier = 1.50;
  else if (billingPct >= 120) billingBonusMultiplier = 1.30;
  else if (billingPct >= 110) billingBonusMultiplier = 1.15;
  else if (billingPct >= 100) billingBonusMultiplier = 1.00;
  else if (billingPct >= 90) billingBonusMultiplier = 0.70;

  const billingBonusEarned = baseBonus * billingBonusMultiplier;

  // Evaluaciones de los sub-objetivos del DC
  const managedServicesAchieved = managedServicesActual >= groupTarget.managed_services_pct;
  const newClientsAchieved = newClientsActualCount >= groupTarget.new_client_units;
  const turboSageAchieved = turboSageActualCount >= groupTarget.turbo_sage_leads;
  const turboBolAchieved = turboBolSvmActualAmount >= groupTarget.turbo_bol_svm;

  // Bonos adicionales por aceleradores estratégicos
  const extraManagedServicesBonus = managedServicesAchieved ? 1200 : 0;
  const extraNewClientsBonus = newClientsAchieved ? 1000 : 0;
  const extraSageBonus = turboSageAchieved ? 800 : 0;
  const extraBolBonus = turboBolAchieved ? 1500 : 0;

  const totalDCBonusEarned = billingBonusEarned + extraManagedServicesBonus + extraNewClientsBonus + extraSageBonus + extraBolBonus;

  return {
    baseBonus,
    billingPct,
    billingBonusMultiplier,
    billingBonusEarned,
    managedServicesAchieved,
    managedServicesActual,
    extraManagedServicesBonus,
    newClientsAchieved,
    newClientsActualCount,
    extraNewClientsBonus,
    turboSageAchieved,
    turboSageActualCount,
    extraSageBonus,
    turboBolAchieved,
    turboBolSvmActualAmount,
    extraBolBonus,
    totalDCBonusEarned,
  };
}
