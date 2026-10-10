import { supabase, isSupabaseConfigured } from './supabase';
import { CommercialQuota, GroupTarget, SalesRecord, BusinessLineId, BUSINESS_LINES } from '@/types';
import { INITIAL_GROUP_TARGET } from './constants';

const LOCAL_STORAGE_QUOTAS_KEY = 'solitium_commercial_quotas_cache';
const LOCAL_STORAGE_GROUP_TARGETS_KEY = 'solitium_group_targets_cache';
const LOCAL_STORAGE_SALES_KEY = 'solitium_sales_records_cache';

// Helper para localStorage
const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setLocalData = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving to localStorage', err);
  }
};

/**
 * Obtener las cuotas de un comercial para un año fiscal específico
 */
export async function getCommercialQuotas(userId: string, fiscalYear: string): Promise<Record<BusinessLineId, number>> {
  const result: Record<BusinessLineId, number> = {} as any;
  BUSINESS_LINES.forEach(line => {
    result[line.id] = 0;
  });

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('commercial_quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('fiscal_year', fiscalYear);

      if (!error && data && data.length > 0) {
        data.forEach((row: CommercialQuota) => {
          result[row.line_id] = Number(row.target_value) || 0;
        });
        return result;
      }
    } catch (err) {
      console.warn('Fallo consultando Supabase, usando fallback local', err);
    }
  }

  // Fallback Local Storage
  const localList = getLocalData<CommercialQuota[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
  const userQuotas = localList.filter(q => q.user_id === userId && q.fiscal_year === fiscalYear);
  userQuotas.forEach(q => {
    result[q.line_id] = Number(q.target_value) || 0;
  });

  return result;
}

/**
 * Guardar o actualizar cuotas de un comercial
 */
export async function saveCommercialQuotas(
  userId: string, 
  fiscalYear: string, 
  quotas: Record<BusinessLineId, number>
): Promise<boolean> {
  const recordsToUpsert: CommercialQuota[] = Object.entries(quotas).map(([line_id, target_value]) => ({
    user_id: userId,
    fiscal_year: fiscalYear,
    line_id: line_id as BusinessLineId,
    target_value: Number(target_value) || 0,
    updated_at: new Date().toISOString(),
  }));

  // Siempre actualizamos localmente para persistencia garantizada
  const localList = getLocalData<CommercialQuota[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
  const filtered = localList.filter(q => !(q.user_id === userId && q.fiscal_year === fiscalYear));
  setLocalData(LOCAL_STORAGE_QUOTAS_KEY, [...filtered, ...recordsToUpsert]);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('commercial_quotas')
        .upsert(recordsToUpsert, { onConflict: 'user_id,fiscal_year,line_id' });

      if (error) {
        console.error('Error al guardar en Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Excepción al conectar con Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Obtener todas las cuotas de un conjunto de usuarios (ej. el grupo comercial)
 */
export async function getGroupUsersQuotas(
  userIds: string[], 
  fiscalYear: string
): Promise<Record<string, Record<BusinessLineId, number>>> {
  const result: Record<string, Record<BusinessLineId, number>> = {};
  for (const uid of userIds) {
    result[uid] = await getCommercialQuotas(uid, fiscalYear);
  }
  return result;
}

/**
 * Obtener la configuración de objetivos del grupo (Director Comercial)
 */
export async function getGroupTarget(groupId: string, fiscalYear: string): Promise<GroupTarget> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('group_targets')
        .select('*')
        .eq('group_id', groupId)
        .eq('fiscal_year', fiscalYear)
        .single();

      if (!error && data) {
        return data as GroupTarget;
      }
    } catch (err) {
      console.warn('Fallo consultando group_targets en Supabase, usando local', err);
    }
  }

  const localList = getLocalData<GroupTarget[]>(LOCAL_STORAGE_GROUP_TARGETS_KEY, [INITIAL_GROUP_TARGET]);
  const found = localList.find(t => t.group_id === groupId && t.fiscal_year === fiscalYear);
  return found || { ...INITIAL_GROUP_TARGET, group_id: groupId, fiscal_year: fiscalYear };
}

/**
 * Guardar la configuración de objetivos del grupo
 */
export async function saveGroupTarget(target: GroupTarget): Promise<boolean> {
  const localList = getLocalData<GroupTarget[]>(LOCAL_STORAGE_GROUP_TARGETS_KEY, [INITIAL_GROUP_TARGET]);
  const index = localList.findIndex(t => t.group_id === target.group_id && t.fiscal_year === target.fiscal_year);
  if (index >= 0) {
    localList[index] = target;
  } else {
    localList.push(target);
  }
  setLocalData(LOCAL_STORAGE_GROUP_TARGETS_KEY, localList);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('group_targets')
        .upsert(target, { onConflict: 'group_id,fiscal_year' });
      return !error;
    } catch (err) {
      console.error('Error guardando group_target en Supabase', err);
      return false;
    }
  }
  return true;
}

/**
 * Obtener ventas registradas para un usuario y año fiscal
 */
export async function getUserSales(userId: string, vendorCode: string, fiscalYear: string): Promise<SalesRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .or(`user_id.eq.${userId},vendor_code.eq.${vendorCode}`);

      if (!error && data) {
        return data as SalesRecord[];
      }
    } catch (err) {
      console.warn('Error fetching sales from Supabase', err);
    }
  }

  const allSales = getLocalData<SalesRecord[]>(LOCAL_STORAGE_SALES_KEY, []);
  return allSales.filter(s => 
    s.fiscal_year === fiscalYear && 
    (s.user_id === userId || s.vendor_code.toLowerCase() === vendorCode.toLowerCase())
  );
}

/**
 * Guardar lote de ventas importadas
 */
export async function saveBatchSales(sales: SalesRecord[]): Promise<boolean> {
  const localList = getLocalData<SalesRecord[]>(LOCAL_STORAGE_SALES_KEY, []);
  setLocalData(LOCAL_STORAGE_SALES_KEY, [...localList, ...sales]);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('sales_records')
        .insert(sales);
      return !error;
    } catch (err) {
      console.error('Error guardando ventas en Supabase', err);
      return false;
    }
  }
  return true;
}

/**
 * Limpiar ventas registradas para reiniciar o reimportar
 */
export async function clearAllSales(): Promise<void> {
  setLocalData(LOCAL_STORAGE_SALES_KEY, []);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('sales_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.error('Error vaciando ventas en Supabase', err);
    }
  }
}
