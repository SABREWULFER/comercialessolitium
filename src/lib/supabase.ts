import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-solitium.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock-solitium')
  );
};

export const hasServiceRoleKey = () => {
  return Boolean(supabaseServiceRoleKey && supabaseServiceRoleKey.length > 20);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Cliente con permisos de Administrador para operaciones del servidor en auth.users y profiles.
 */
export const getSupabaseAdmin = () => {
  const secretKey = supabaseServiceRoleKey || supabaseAnonKey;
  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
