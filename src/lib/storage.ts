import { supabase, isSupabaseConfigured } from './supabase';
import { 
  CommercialQuota, 
  GroupTarget, 
  SalesRecord, 
  BusinessLineId, 
  BUSINESS_LINES,
  CommercialUser,
  COMMERCIAL_GROUPS
} from '@/types';
import { INITIAL_GROUP_TARGET, DEMO_USERS } from './constants';

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

/**
 * ==========================================
 * GESTIÓN DE PERFILES Y USUARIOS (ADMIN)
 * ==========================================
 */

/**
 * Obtener todos los usuarios / perfiles del sistema
 */
export async function getAllUsers(): Promise<CommercialUser[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (!error && data && data.length > 0) {
        return data as CommercialUser[];
      }
    } catch (err) {
      console.warn('Error al consultar perfiles en Supabase, usando caché local', err);
    }
  }

  // Fallback local con inicialización desde DEMO_USERS
  let localUsers = getLocalData<CommercialUser[]>(LOCAL_STORAGE_USERS_KEY, []);
  if (localUsers.length === 0) {
    localUsers = [...DEMO_USERS];
    setLocalData(LOCAL_STORAGE_USERS_KEY, localUsers);
  }
  return localUsers;
}

/**
 * Crear o actualizar usuario / perfil
 */
export async function saveUser(user: CommercialUser): Promise<boolean> {
  const users = await getAllUsers();
  const existingIdx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push(user);
  }
  setLocalData(LOCAL_STORAGE_USERS_KEY, users);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          vendor_code: user.vendor_code,
          role: user.role,
          group_id: user.group_id,
          is_active: user.is_active ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error al guardar perfil en Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Excepción guardando perfil en Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Dar de baja o eliminar un usuario
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const users = await getAllUsers();
  const filtered = users.filter(u => u.id !== userId);
  setLocalData(LOCAL_STORAGE_USERS_KEY, filtered);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      return !error;
    } catch (err) {
      console.error('Error al eliminar usuario en Supabase:', err);
      return false;
    }
  }

  return true;
}

/**
 * Buscar perfil por email
 */
export async function getUserProfileByEmail(email: string): Promise<CommercialUser | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (!error && data) {
        return data as CommercialUser;
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
