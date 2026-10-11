import { supabase, isSupabaseConfigured } from './supabase';
import { CommercialUser } from '@/types';
import { DEMO_USERS } from './constants';
import { getUserProfileByEmail, saveUser } from './storage';

export interface AuthState {
  user: CommercialUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Validador de contraseña segura:
 * - Mínimo 8 caracteres
 * - Alfanumérica
 * - Al menos una mayúscula, una minúscula y un número
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'La contraseña debe contener un mínimo de 8 caracteres.' };
  }
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return { 
      isValid: false, 
      message: 'La contraseña debe ser alfanumérica y contener al menos una mayúscula, una minúscula y un número (ej. Solitium2026!).' 
    };
  }

  return { isValid: true };
}

/**
 * Iniciar sesión con email / contraseña
 * Utiliza Supabase Auth si está configurado, o autenticación simulada corporativa
 */
export async function loginWithCredentials(
  emailOrUsername: string, 
  password: string
): Promise<{ user: CommercialUser | null; error: string | null }> {
  const cleanInput = emailOrUsername.trim().toLowerCase();
  const targetEmail = cleanInput.includes('@') ? cleanInput : `${cleanInput}@solitium.es`;

  // 1. Validar requisitos de contraseña mínima
  const passValidation = validatePassword(password);
  if (!passValidation.isValid) {
    return { user: null, error: passValidation.message || 'Contraseña inválida' };
  }

  // 2. Si Supabase Auth está configurado en producción
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error) {
        // En caso de que no exista aún en Supabase Auth pero sea el admin semilla
        if (targetEmail === 'admin@solitium.es' && password === 'AdminSolitium2026!') {
          const profile = await getUserProfileByEmail(targetEmail);
          return { user: profile || DEMO_USERS[0], error: null };
        }
        return { user: null, error: 'Credenciales incorrectas: verifica tu usuario/email y contraseña.' };
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
      console.warn('Fallo Supabase Auth, procediendo con verificación de perfil:', err);
    }
  }

  // 3. Fallback corporativo / desarrollo local
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
