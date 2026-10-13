import { supabase, isSupabaseConfigured } from './supabase';
import { 
  CommercialQuota, 
  GroupTarget, 
  SalesRecord, 
  BusinessLineId, 
  BUSINESS_LINES,
  CommercialUser,
  CommercialGroup,
  DEFAULT_COMMERCIAL_GROUPS
} from '@/types';
import { INITIAL_GROUP_TARGET, DEMO_USERS } from './constants';

const LOCAL_STORAGE_GROUPS_KEY = 'solitium_commercial_groups_cache';
const LOCAL_STORAGE_USERS_KEY = 'solitium_profiles_users_cache';
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

// Generador de UUID v4 seguro
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * ==========================================
 * GESTIÓN DE ZONAS Y GRUPOS TERRITORIALES
 * Tabla: public.commercial_groups (id, name, director_commercial_id, created_at)
 * ==========================================
 */

export async function getCommercialGroups(): Promise<CommercialGroup[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('commercial_groups')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        // Ignorar grupos huérfanos obsoletos de prueba sin agentes asignados
        const cleaned = data.filter(g => g.id !== '11111111-1111-1111-1111-111111111111' || g.name !== 'Grupo 1 - Aragón y Madrid');
        setLocalData(LOCAL_STORAGE_GROUPS_KEY, cleaned.length > 0 ? cleaned : data);
        return (cleaned.length > 0 ? cleaned : data) as CommercialGroup[];
      }
    } catch (err) {
      console.warn('Error al consultar commercial_groups en Supabase, usando fallback', err);
    }
  }

  let local = getLocalData<CommercialGroup[]>(LOCAL_STORAGE_GROUPS_KEY, []);
  if (local.length === 0) {
    local = [...DEFAULT_COMMERCIAL_GROUPS];
    setLocalData(LOCAL_STORAGE_GROUPS_KEY, local);
  }
  return local;
}

export async function deleteCommercialGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const currentGroups = await getCommercialGroups();
  const filtered = currentGroups.filter(g => g.id !== groupId);
  setLocalData(LOCAL_STORAGE_GROUPS_KEY, filtered);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('commercial_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

export async function saveCommercialGroup(group: Partial<CommercialGroup> & { name: string }): Promise<{ success: boolean; group?: CommercialGroup; error?: string }> {
  const currentGroups = await getCommercialGroups();
  const validId = (group.id && group.id.includes('-') && group.id.length >= 32) ? group.id : generateUUID();

  const groupPayload: CommercialGroup = {
    id: validId,
    name: group.name.trim(),
    director_commercial_id: group.director_commercial_id || null,
    created_at: group.created_at || new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('commercial_groups')
        .upsert({
          id: groupPayload.id,
          name: groupPayload.name,
          director_commercial_id: groupPayload.director_commercial_id,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error al guardar en commercial_groups:', error);
        return { success: false, error: error.message };
      }

      if (data) {
        groupPayload.id = data.id;
      }
    } catch (err: any) {
      console.error('Excepción guardando grupo en Supabase:', err);
      return { success: false, error: err.message || 'Error de conexión con Supabase' };
    }
  }

  const existingIndex = currentGroups.findIndex(g => g.id === groupPayload.id);
  if (existingIndex >= 0) {
    currentGroups[existingIndex] = groupPayload;
  } else {
    currentGroups.push(groupPayload);
  }
  setLocalData(LOCAL_STORAGE_GROUPS_KEY, currentGroups);

  return { success: true, group: groupPayload };
}

export async function initializeDefaultGroups(): Promise<{ success: boolean; groups: CommercialGroup[]; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('commercial_groups')
        .upsert(
          DEFAULT_COMMERCIAL_GROUPS.map(g => ({
            id: g.id,
            name: g.name,
            director_commercial_id: g.director_commercial_id,
          })), 
          { onConflict: 'id' }
        )
        .select();

      if (error) {
        return { success: false, groups: [], error: error.message };
      }

      if (data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_GROUPS_KEY, data);
        return { success: true, groups: data as CommercialGroup[] };
      }
    } catch (err: any) {
      return { success: false, groups: [], error: err.message };
    }
  }

  setLocalData(LOCAL_STORAGE_GROUPS_KEY, DEFAULT_COMMERCIAL_GROUPS);
  return { success: true, groups: DEFAULT_COMMERCIAL_GROUPS };
}

/**
 * ==========================================
 * GESTIÓN DIRECTA DE PERFILES Y USUARIOS (PROFILES)
 * Tabla: public.profiles (id, full_name, email, role, group_id, seller_code, created_at)
 * ==========================================
 */

function normalizeProfile(p: any): CommercialUser {
  const fullName = p.full_name || p.name || 'Sin Nombre';
  const sellerCode = p.seller_code || p.vendor_code || '';
  return {
    id: p.id,
    full_name: fullName,
    name: fullName,
    email: p.email,
    role: p.role,
    group_id: p.group_id,
    seller_code: sellerCode,
    vendor_code: sellerCode,
    created_at: p.created_at,
    is_active: p.is_active ?? true,
  };
}

export async function getAllUsers(): Promise<CommercialUser[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (!error && data && data.length > 0) {
        const normalized = data.map(normalizeProfile);
        if (!normalized.some(u => (u.seller_code || u.vendor_code || '').toUpperCase().includes('TELEVENTA'))) {
          const televentaProfile = DEMO_USERS.find(u => (u.seller_code || '').toUpperCase().includes('TELEVENTA'));
          if (televentaProfile) normalized.push(normalizeProfile(televentaProfile));
        }
        setLocalData(LOCAL_STORAGE_USERS_KEY, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Error al consultar profiles en Supabase, usando caché local', err);
    }
  }

  let localUsers = getLocalData<CommercialUser[]>(LOCAL_STORAGE_USERS_KEY, []);
  if (localUsers.length === 0) {
    localUsers = DEMO_USERS.map(normalizeProfile);
    setLocalData(LOCAL_STORAGE_USERS_KEY, localUsers);
  } else if (!localUsers.some(u => (u.seller_code || u.vendor_code || '').toUpperCase().includes('TELEVENTA'))) {
    const televentaProfile = DEMO_USERS.find(u => (u.seller_code || '').toUpperCase().includes('TELEVENTA'));
    if (televentaProfile) {
      localUsers.push(normalizeProfile(televentaProfile));
      setLocalData(LOCAL_STORAGE_USERS_KEY, localUsers);
    }
  }
  return localUsers.map(normalizeProfile);
}

/**
 * Guardar o actualizar directamente en public.profiles
 */
export async function saveUser(user: Partial<CommercialUser> & { full_name: string; email: string; role: any; seller_code: string }): Promise<{ success: boolean; user?: CommercialUser; error?: string }> {
  const users = await getAllUsers();

  const validUserId = (user.id && user.id.includes('-') && user.id.length >= 32) 
    ? user.id 
    : generateUUID();
  
  let validGroupId: string | null = user.group_id || null;
  if (validGroupId && (!validGroupId.includes('-') || validGroupId.length < 32)) {
    validGroupId = null;
  }

  const profilePayload = {
    id: validUserId,
    full_name: (user.full_name || user.name || '').trim(),
    email: user.email.trim().toLowerCase(),
    role: user.role,
    group_id: validGroupId,
    seller_code: (user.seller_code || user.vendor_code || '').trim().toUpperCase(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error guardando en profiles:', error);
        return { success: false, error: `${error.message} (${error.details || error.hint || error.code})` };
      }

      if (data) {
        profilePayload.id = data.id;
      }
    } catch (err: any) {
      console.error('Excepción guardando perfil en Supabase:', err);
      return { success: false, error: err.message || 'Excepción no controlada al conectar con Supabase' };
    }
  }

  const normalizedSaved = normalizeProfile(profilePayload);
  const existingIdx = users.findIndex(u => u.id === profilePayload.id || u.email.toLowerCase() === profilePayload.email.toLowerCase());

  if (existingIdx >= 0) {
    users[existingIdx] = normalizedSaved;
  } else {
    users.push(normalizedSaved);
  }
  setLocalData(LOCAL_STORAGE_USERS_KEY, users);

  return { success: true, user: normalizedSaved };
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const users = await getAllUsers();
  const filtered = users.filter(u => u.id !== userId);
  setLocalData(LOCAL_STORAGE_USERS_KEY, filtered);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}

export async function getUserProfileByEmail(email: string): Promise<CommercialUser | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (!error && data) {
        return normalizeProfile(data);
      }
    } catch (err) {
      console.warn('Error buscando usuario por email en Supabase:', err);
    }
  }

  const users = await getAllUsers();
  return users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase()) || null;
}

/**
 * ==========================================
 * GESTIÓN DE CUOTAS Y OBJETIVOS DINÁMICOS
 * ==========================================
 */

export async function getCommercialQuotas(
  commercialId: string, 
  fiscalYear: string,
  userSellerCode?: string
): Promise<Record<BusinessLineId, number>> {
  const result: Record<BusinessLineId, number> = {} as any;
  BUSINESS_LINES.forEach(line => {
    result[line.id] = 0;
  });

  const targetId = (commercialId || '').toString().trim().toUpperCase();
  const targetCode = (userSellerCode || '').toString().trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      // Consultar commercial_quotas para este ejercicio fiscal
      const { data, error } = await supabase
        .from('commercial_quotas')
        .select('*')
        .eq('fiscal_year', fiscalYear);

      if (!error && data && data.length > 0) {
        // Encontrar filas correspondientes a este comercial por commercial_id, seller_code o user_id
        const userRows = data.filter((row: any) => {
          const rowCommId = (row.commercial_id || row.user_id || '').toString().trim().toUpperCase();
          return Boolean(
            (rowCommId && rowCommId === targetId) ||
            (targetCode && rowCommId === targetCode)
          );
        });

        if (userRows.length > 0) {
          userRows.forEach((row: any) => {
            if (row.line_id && result.hasOwnProperty(row.line_id)) {
              const amt = row.quota_amount !== undefined ? Number(row.quota_amount) : Number(row.target_value);
              result[row.line_id as BusinessLineId] = isNaN(amt) ? 0 : amt;
            }
          });

          // Actualizar caché local
          const localList = getLocalData<any[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
          const filtered = localList.filter(q => !( (q.commercial_id === commercialId || q.user_id === commercialId) && q.fiscal_year === fiscalYear));
          const syncLocal = userRows.map(r => ({
            commercial_id: commercialId,
            user_id: commercialId,
            fiscal_year: fiscalYear,
            line_id: r.line_id,
            quota_amount: r.quota_amount !== undefined ? Number(r.quota_amount) : Number(r.target_value),
            target_value: r.quota_amount !== undefined ? Number(r.quota_amount) : Number(r.target_value),
          }));
          setLocalData(LOCAL_STORAGE_QUOTAS_KEY, [...filtered, ...syncLocal]);

          return result;
        }
      }
    } catch (err) {
      console.warn('Fallo consultando commercial_quotas en Supabase, usando fallback local', err);
    }
  }

  // Fallback a localStorage
  const localList = getLocalData<any[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
  const userQuotas = localList.filter(q => 
    (q.commercial_id === commercialId || q.user_id === commercialId || (targetCode && (q.commercial_id === targetCode || q.user_id === targetCode))) && 
    q.fiscal_year === fiscalYear
  );
  userQuotas.forEach(q => {
    if (q.line_id && result.hasOwnProperty(q.line_id)) {
      const amt = q.quota_amount !== undefined ? Number(q.quota_amount) : Number(q.target_value);
      result[q.line_id as BusinessLineId] = isNaN(amt) ? 0 : amt;
    }
  });

  return result;
}

export async function saveCommercialQuotas(
  commercialId: string, 
  fiscalYear: string, 
  quotas: Record<BusinessLineId, number>
): Promise<{ success: boolean; error?: string }> {
  const quotasToUpsert = Object.entries(quotas).map(([lineId, amount]) => ({
    commercial_id: commercialId,
    line_id: lineId,
    fiscal_year: fiscalYear,
    quota_amount: Number(amount) || 0,
    updated_at: new Date().toISOString(),
  }));

  // Guardar siempre en local storage para que el valor persista en el navegador
  const localList = getLocalData<any[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
  const filtered = localList.filter(q => !( (q.commercial_id === commercialId || q.user_id === commercialId) && q.fiscal_year === fiscalYear));
  const syncLocal = quotasToUpsert.map(q => ({
    commercial_id: commercialId,
    user_id: commercialId,
    fiscal_year: fiscalYear,
    line_id: q.line_id,
    quota_amount: q.quota_amount,
    target_value: q.quota_amount,
  }));
  setLocalData(LOCAL_STORAGE_QUOTAS_KEY, [...filtered, ...syncLocal]);

  if (isSupabaseConfigured()) {
    try {
      // 1. Intento principal con el esquema oficial: commercial_id, line_id, fiscal_year, quota_amount
      const { error } = await supabase
        .from('commercial_quotas')
        .upsert(quotasToUpsert, { onConflict: 'commercial_id,line_id,fiscal_year' });

      if (error) {
        console.warn('Upsert en commercial_quotas falló, probando con user_id/target_value:', error.message);
        
        // Fallback defensivo si la tabla tuviera columnas legacy user_id y target_value
        const legacyUpsert = quotasToUpsert.map(q => ({
          user_id: commercialId,
          line_id: q.line_id,
          fiscal_year: fiscalYear,
          target_value: q.quota_amount,
          updated_at: q.updated_at,
        }));

        const { error: legacyError } = await supabase
          .from('commercial_quotas')
          .upsert(legacyUpsert, { onConflict: 'user_id,line_id,fiscal_year' });

        if (legacyError) {
          // Intentar delete + insert directo
          const { error: delError } = await supabase
            .from('commercial_quotas')
            .delete()
            .eq('commercial_id', commercialId)
            .eq('fiscal_year', fiscalYear);

          if (!delError) {
            const { error: insError } = await supabase
              .from('commercial_quotas')
              .insert(quotasToUpsert);
            if (!insError) return { success: true };
          }

          console.error('Error persistiendo commercial_quotas en Supabase:', error);
          return { success: false, error: `${error.message}${error.details ? ` (${error.details})` : ''}` };
        }
      }
      return { success: true };
    } catch (err: any) {
      console.error('Excepción al conectar con Supabase:', err);
      return { success: false, error: err.message || 'Error de red o conexión al guardar en Supabase' };
    }
  }

  return { success: true };
}

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

function normalizeSaleRecord(s: any): SalesRecord {
  const commId = s.commercial_id || s.user_id || '';
  const dateVal = s.sale_date || s.document_date || '';
  const rawConcept = (s.raw_data?.concept || s.concept || '').toString().toUpperCase();
  const sublineVal = s.subline || (rawConcept.includes('MO-IN') ? 'MO-IN' : rawConcept.includes('BOL') ? 'BOL' : null);

  return {
    id: s.id,
    commercial_id: commId,
    user_id: commId,
    vendor_code: s.vendor_code || '',
    team_code: s.team_code || null,
    subline: sublineVal,
    line_id: s.line_id,
    amount: Number(s.amount) || 0,
    discount_rate: Number(s.discount_rate) || 0,
    is_managed_service: Boolean(s.is_managed_service),
    is_new_client: Boolean(s.is_new_client),
    is_financed: Boolean(s.is_financed),
    invoice_number: s.invoice_number || '',
    sale_date: dateVal,
    document_date: dateVal,
    client_name: s.client_name,
    fiscal_year: s.fiscal_year,
    raw_data: s.raw_data,
    created_at: s.created_at,
  };
}

export interface RawDBSaleRecord {
  commercial_id: string | null; // uuid de public.profiles o null si no existe vendedor registrado
  team_code?: string | null; // Columna 'EQUIPO COMERCIAL' de la liquidación
  subline?: string | null; // 'MO-IN' (core mantenimiento) | 'BOL' u otros
  line_id: string;
  fiscal_year: string;
  amount: number;
  discount_rate: number;
  is_managed_service: boolean;
  is_new_client: boolean;
  is_financed: boolean;
  invoice_number: string;
  sale_date: string; // YYYY-MM-DD
}

export async function getUserSales(userId: string, vendorCode: string, fiscalYear: string): Promise<SalesRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('fiscal_year', fiscalYear)
        .eq('commercial_id', userId);

      if (!error && data) {
        return data.map(normalizeSaleRecord);
      }
    } catch (err) {
      console.warn('Error fetching sales from Supabase', err);
    }
  }

  const allSales = getLocalData<any[]>(LOCAL_STORAGE_SALES_KEY, []);
  return allSales
    .filter(s => 
      s.fiscal_year === fiscalYear && 
      (s.commercial_id === userId || s.user_id === userId || (s.vendor_code && s.vendor_code.toLowerCase() === vendorCode.toLowerCase()))
    )
    .map(normalizeSaleRecord);
}

export async function getAllSalesForFiscalYear(fiscalYear: string): Promise<SalesRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('fiscal_year', fiscalYear);

      if (!error && data) {
        return data.map(normalizeSaleRecord);
      }
    } catch (err) {
      console.warn('Error fetching all sales from Supabase', err);
    }
  }

  const allSales = getLocalData<any[]>(LOCAL_STORAGE_SALES_KEY, []);
  return allSales
    .filter(s => s.fiscal_year === fiscalYear)
    .map(normalizeSaleRecord);
}

export async function saveSalesRecordsDirect(
  records: RawDBSaleRecord[]
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  // Sincronizar también con la caché local
  const localList = getLocalData<any[]>(LOCAL_STORAGE_SALES_KEY, []);
  const normalized = records.map(normalizeSaleRecord);
  setLocalData(LOCAL_STORAGE_SALES_KEY, [...localList, ...normalized]);

  if (isSupabaseConfigured()) {
    try {
      const BATCH_SIZE = 50;
      let totalInserted = 0;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE).map(r => ({
          commercial_id: r.commercial_id,
          team_code: r.team_code || null,
          subline: r.subline || null,
          line_id: r.line_id,
          fiscal_year: r.fiscal_year,
          amount: Number(r.amount) || 0,
          discount_rate: Number(r.discount_rate) || 0,
          is_managed_service: Boolean(r.is_managed_service),
          is_new_client: Boolean(r.is_new_client),
          is_financed: Boolean(r.is_financed),
          invoice_number: String(r.invoice_number || ''),
          sale_date: r.sale_date,
        }));

        let { error } = await supabase
          .from('sales_records')
          .insert(batch);

        // Fallback defensivo si las columnas team_code o subline todavía no se han agregado en Supabase
        if (error && (error.message.includes('team_code') || error.message.includes('subline') || error.code === '42703')) {
          console.warn('Columnas extendidas (team_code/subline) no encontradas en Supabase, reintentando inserción con campos base...');
          const fallbackBatch = batch.map(({ team_code, subline, ...rest }: any) => rest);
          const fallbackRes = await supabase.from('sales_records').insert(fallbackBatch);
          error = fallbackRes.error;
        }

        if (error) {
          console.error('Error insertando lote de 50 en sales_records:', error);
          return { success: false, insertedCount: totalInserted, error: error.message };
        }
        totalInserted += batch.length;
      }

      return { success: true, insertedCount: totalInserted };
    } catch (err: any) {
      console.error('Excepción guardando ventas en Supabase:', err);
      return { success: false, insertedCount: 0, error: err.message || 'Error de conexión' };
    }
  }

  return { success: true, insertedCount: records.length };
}

export async function saveBatchSales(sales: SalesRecord[]): Promise<boolean> {
  const dbRecords: RawDBSaleRecord[] = sales.map(s => ({
    commercial_id: s.commercial_id || s.user_id || '',
    line_id: s.line_id,
    fiscal_year: s.fiscal_year,
    amount: Number(s.amount) || 0,
    discount_rate: Number(s.discount_rate) || 0,
    is_managed_service: Boolean(s.is_managed_service),
    is_new_client: Boolean(s.is_new_client),
    is_financed: Boolean(s.is_financed),
    invoice_number: s.invoice_number || '',
    sale_date: s.sale_date || s.document_date || new Date().toISOString().split('T')[0],
  }));

  const res = await saveSalesRecordsDirect(dbRecords);
  return res.success;
}

export async function clearAllSales(): Promise<void> {
  setLocalData(LOCAL_STORAGE_SALES_KEY, []);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('sales_records').delete().neq('fiscal_year', 'non-existent-year');
    } catch (err) {
      console.error('Error vaciando ventas en Supabase', err);
    }
  }
}
