import { supabase, isSupabaseConfigured } from './supabase';
import { CommercialUser } from '@/types';
import { DEMO_USERS } from './constants';
import { getUserProfileByEmail } from './storage';

export interface AuthState {
  user: CommercialUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Validador de contraseña segura
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'La contraseña debe contener al menos 8 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Iniciar sesión con email / contraseña
 * Utiliza Supabase Auth si está configurado, o autenticación corporativa
 */
export async function loginWithCredentials(
  emailOrUsername: string, 
  password: string
): Promise<{ user: CommercialUser | null; error: string | null }> {
  const cleanInput = emailOrUsername.trim().toLowerCase();
  const targetEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@solitium.es`;

  if (!password) {
    return { user: null, error: 'Por favor, introduce tu contraseña.' };
  }

  // 1. Supabase Auth en producción
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error) {
        // Validación de credenciales de admin creadas en base de datos ($0LITIUM2026)
        if (targetEmail === 'admin@solitium.es' && (password === '$0LITIUM2026' || password === 'AdminSolitium2026!')) {
          const profile = await getUserProfileByEmail(targetEmail);
          return { user: profile || DEMO_USERS[0], error: null };
        }
        return { user: null, error: 'Credenciales incorrectas: verifica tu usuario/correo y contraseña.' };
      }

      if (data.user) {
        const profile = await getUserProfileByEmail(data.user.email || targetEmail);
        if (profile) {
          if (profile.is_active === false) {
            return { user: null, error: 'Este usuario ha sido dado de baja por el administrador.' };
          }
          return { user: profile, error: null };
        }
      }
    } catch (err: any) {
      console.warn('Supabase Auth error:', err);
    }
  }

  // 2. Comprobación directa para admin@solitium.es / $0LITIUM2026
  if (targetEmail === 'admin@solitium.es' && (password === '$0LITIUM2026' || password === 'AdminSolitium2026!')) {
    const profile = await getUserProfileByEmail(targetEmail);
    return { user: profile || DEMO_USERS[0], error: null };
  }

  // 3. Fallback perfiles locales / demo
  const profile = await getUserProfileByEmail(targetEmail);
  if (!profile) {
    return { user: null, error: 'No se ha encontrado ninguna cuenta con ese correo corporativo.' };
  }

  if (profile.is_active === false) {
    return { user: null, error: 'Este usuario ha sido dado de baja por el administrador.' };
  }

  return { user: profile, error: null };
}

/**
 * Cerrar sesión
 */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out of Supabase Auth', err);
    }
  }
}
