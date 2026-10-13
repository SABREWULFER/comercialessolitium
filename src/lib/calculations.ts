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
export function mapRawLineToId(rawConcept?: string, rawLine?: string, rawCode?: string): BusinessLineId {
  const conc = (rawConcept || '').toString().toUpperCase().trim();
  const c100 = (rawLine || '').toString().toUpperCase().trim();
  const code = (rawCode || '').toString().toUpperCase().trim();
  const combined = `${conc} ${c100} ${code}`.trim();

  if (!combined) return 'OFI';

  // 1. OFIMATICA-Cliente y OFIMATICA-Prospecto -> 'OFI'
  if (conc.includes('OFIMATICA-CLIENTE') || conc.includes('OFIMATICA-PROSPECTO') || conc.includes('OFIMATICA') || combined.includes('OFIMATICA')) {
    return 'OFI';
  }

  // 2. PRODUCCION -> 'PP'
  if (conc.includes('PRODUCCION') || conc.includes('PRODUCCIÓN') || combined.includes('PRODUCCION') || combined.includes('PRODUCCIÓN')) {
    return 'PP';
  }

  // 3. LATEX y DESINGJET (o DJET) -> 'GF' (Gran Formato)
  if (conc.includes('LATEX') || conc.includes('DESINGJET') || conc.includes('DESIGNJET') || conc.includes('DJET') || 
      combined.includes('LATEX') || combined.includes('DESINGJET') || combined.includes('DESIGNJET') || combined.includes('DJET')) {
    return 'GF';
  }

  // 4. Micro + SW Resto -> 'MICRO'
  if (conc.includes('MICRO + SW RESTO') || conc.includes('MICRO+SW RESTO') || conc.includes('MICRO + SW') || conc.includes('MICRO') || 
      combined.includes('MICRO + SW RESTO') || combined.includes('MICRO+SW RESTO')) {
    return 'MICRO';
  }

  // 5. Sistemas+SW TS -> 'SISTEMAS'
  if (conc.includes('SISTEMAS+SW TS') || conc.includes('SISTEMAS + SW TS') || conc.includes('SISTEMAS+SW') || conc.includes('SISTEMAS') || 
      combined.includes('SISTEMAS+SW TS')) {
    return 'SISTEMAS';
  }

  // 6. SW-SUSCRIP -> 'SW'
  if (conc.includes('SW-SUSCRIP') || conc.includes('SW - SUSCRIP') || conc.includes('SUSCRIP') || conc.includes('SOFTWARE') || 
      combined.includes('SW-SUSCRIP')) {
    return 'SW';
  }

  // 7. DOCUWARE -> 'DW'
  if (conc.includes('DOCUWARE') || conc.includes('DOCU') || combined.includes('DOCUWARE')) {
    return 'DW';
  }

  // 8. MO-IN y BOL -> 'MI' (Mantenimiento Solitium)
  if (conc === 'MO-IN' || conc.startsWith('MO-IN') || conc.includes('MO-IN') || 
      conc === 'BOL' || conc.startsWith('BOL') || conc.includes('BOL') || 
      combined.includes('MO-IN') || combined.includes('BOL')) {
    return 'MI';
  }

  // 9. F-SERVICIOS -> 'F-SERVICIOS' (Fuera de Servicios)
  if (conc.includes('F-SERVICIOS') || conc.includes('F_SERVICIOS') || conc.includes('FUERA DE SERVICIOS') || combined.includes('F-SERVICIOS')) {
    return 'F-SERVICIOS';
  }

  // 10. VARIOS -> 'VARIOS'
  if (conc.includes('VARIOS') || combined.includes('VARIOS')) {
    return 'VARIOS';
  }

  // Fallbacks de compatibilidad
  if (combined.includes('SAGE')) return 'SAGE_CLIENTS';
  if (combined.includes('3D')) return '3D';
  if (combined.includes('AV') || combined.includes('AUDIOVISUAL')) return 'AV';
  if (combined.includes('GRAN FORMATO') || combined.includes('PLOTTER')) return 'GF';
  if (combined.includes('MANTENIMIENTO') || c100 === 'MI' || code === 'MI') return 'MI';

  const directMatch = BUSINESS_LINES.find(b => b.id === c100 || b.id === code || b.id === conc);
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
  let moInActual = 0;
  let bolActual = 0;

  BUSINESS_LINES.forEach(b => {
    actuals[b.id] = 0;
  });

  sales.forEach(sale => {
    const lineId = sale.line_id;
    if (lineId === 'SAGE_CLIENTS') {
      if (sale.is_new_client) {
        actuals['SAGE_CLIENTS'] = (actuals['SAGE_CLIENTS'] || 0) + 1;
      }
    } else if (actuals[lineId] !== undefined) {
      actuals[lineId] = (actuals[lineId] || 0) + (Number(sale.amount) || 0);
    }

    // Subdivisión de Mantenimiento Solitium (MI) entre MO-IN (core) y BOL
    if (lineId === 'MI') {
      const sub = (sale.subline || '').toUpperCase();
      const conc = (sale.raw_data?.concept || '').toString().toUpperCase();
      if (sub === 'MO-IN' || conc.includes('MO-IN')) {
        moInActual += Number(sale.amount) || 0;
      } else if (sub === 'BOL' || conc.includes('BOL')) {
        bolActual += Number(sale.amount) || 0;
      } else {
        moInActual += Number(sale.amount) || 0;
      }
    }
  });

  return BUSINESS_LINES.map(line => {
    const isInformative = line.hasTarget === false;
    const target = isInformative ? 0 : (quotas[line.id] || 0);
    const actual = actuals[line.id] || 0;
    const remaining = isInformative ? 0 : Math.max(0, target - actual);
    const percentage = target > 0 ? (actual / target) * 100 : (isInformative && actual > 0 ? 100 : 0);
    const isCompleted = isInformative ? true : (target > 0 && actual >= target);

    let miExtras: Partial<QuotaProgress> = {};
    if (line.id === 'MI') {
      const moInTarget80 = target * 0.8;
      const moInShareOfActual = actual > 0 ? (moInActual / actual) * 100 : 0;
      const moInTargetAchievement = moInTarget80 > 0 ? (moInActual / moInTarget80) * 100 : (moInActual > 0 ? 100 : 0);
      miExtras = {
        moInActual,
        bolActual,
        moInShareOfActual,
        moInTarget80,
        moInTargetAchievement,
      };
    }

    return {
      line,
      target,
      actual,
      remaining,
      percentage,
      isCompleted,
      ...miExtras,
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
  // Excluimos las líneas no monetarias y las informativas sin cuota
  const currencyLines = progressList.filter(p => p.line.isCurrency && p.line.hasTarget !== false);
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
