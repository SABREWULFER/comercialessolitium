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

  const localList = getLocalData<CommercialQuota[]>(LOCAL_STORAGE_QUOTAS_KEY, []);
  const userQuotas = localList.filter(q => q.user_id === userId && q.fiscal_year === fiscalYear);
  userQuotas.forEach(q => {
    result[q.line_id] = Number(q.target_value) || 0;
  });

  return result;
}

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

export async function getAllSalesForFiscalYear(fiscalYear: string): Promise<SalesRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('fiscal_year', fiscalYear);

      if (!error && data) {
        return data as SalesRecord[];
      }
    } catch (err) {
      console.warn('Error fetching all sales from Supabase', err);
    }
  }

  const allSales = getLocalData<SalesRecord[]>(LOCAL_STORAGE_SALES_KEY, []);
  return allSales.filter(s => s.fiscal_year === fiscalYear);
}

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
