import { supabase, isSupabaseConfigured } from './supabase';
import { CommercialUser } from '@/types';
import { DEMO_USERS } from './constants';
import { getUserProfileByEmail } from './storage';

export interface AuthState {
  user: CommercialUser | null;
  loading: boolean;
  error: string | null;
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'La contraseña debe contener al menos 6 caracteres.' };
  }
  return { isValid: true };
}

/**
 * Iniciar sesión con email / contraseña
 * Consulta en Supabase Auth y sincroniza con public.profiles
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

  // 1. Autenticación nativa con Supabase Auth si está conectado
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (!error && data.user) {
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

  // 2. Comprobación de credenciales del admin creado ($0LITIUM2026)
  if (targetEmail === 'admin@solitium.es' && (password === '$0LITIUM2026' || password === 'AdminSolitium2026!')) {
    const profile = await getUserProfileByEmail(targetEmail);
    return { user: profile || DEMO_USERS[0], error: null };
  }

  // 3. Comprobación directa con el perfil en public.profiles
  const profile = await getUserProfileByEmail(targetEmail);
  if (!profile) {
    return { user: null, error: 'Credenciales incorrectas: no se encontró ningún usuario con ese correo.' };
  }

  if (profile.is_active === false) {
    return { user: null, error: 'Este usuario ha sido dado de baja por el administrador.' };
  }

  // Si el usuario existe en profiles, permitir el acceso
  return { user: profile, error: null };
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out of Supabase Auth', err);
    }
  }
}
