-- ====================================================================
-- MIGRACIÓN SUPABASE: PERFILES, AUTENTICACIÓN, OBJETIVOS Y VENTAS SOLITIUM
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ====================================================================

-- 1. Tabla de Perfiles de Usuario (Vinculada a auth.users o ID único corporativo)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- UID del usuario o id corporativo
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  vendor_code TEXT NOT NULL, -- ej: 'ALAPIEZA', 'JVILLAGRASA', 'LMARTINEZ', 'ADMIN01'
  role TEXT NOT NULL DEFAULT 'comercial', -- 'comercial', 'director_comercial', 'director_territorial', 'admin'
  group_id TEXT NOT NULL DEFAULT 'grp-1', -- 'grp-1', 'grp-2', 'grp-3', 'grp-4'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Cuotas Comerciales por Comercial, Año Fiscal y Línea de Negocio
CREATE TABLE IF NOT EXISTS public.commercial_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  fiscal_year TEXT NOT NULL, -- Ej: '2026-2027'
  line_id TEXT NOT NULL,     -- 'OFI', 'MICRO', 'SISTEMAS', 'MI', 'SW', 'PP', 'GF', '3D', 'DW', 'AV', 'SAGE_CLIENTS'
  target_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_year_line UNIQUE(user_id, fiscal_year, line_id)
);

-- 3. Tabla de Objetivos y Métricas Grupales para Directores Comerciales (DC)
CREATE TABLE IF NOT EXISTS public.group_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  group_name TEXT NOT NULL,
  dc_user_id TEXT NOT NULL,
  annual_base_bonus NUMERIC(12, 2) NOT NULL DEFAULT 6000.00, -- Bono Base (€)
  managed_services_pct NUMERIC(5, 2) NOT NULL DEFAULT 25.00,  -- Target Servicios Gestionados (%)
  new_client_units NUMERIC(6, 0) NOT NULL DEFAULT 15,         -- Target Unidades Cliente Nuevo
  turbo_sage_leads NUMERIC(6, 0) NOT NULL DEFAULT 8,          -- Target Turbo Boost SAGE Leads
  turbo_bol_svm NUMERIC(12, 2) NOT NULL DEFAULT 12000.00,     -- Target Turbo Boost BOL/SVM (€)
  dc_extra_quota NUMERIC(12, 2) NOT NULL DEFAULT 0.00,        -- Cuota asignada al DC / Televenta (€)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_group_year UNIQUE(group_id, fiscal_year)
);

-- 4. Tabla de Ventas Consolidadas (Liquidación / Excel / HTML)
CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  vendor_code TEXT NOT NULL,
  line_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_new_client BOOLEAN DEFAULT FALSE,
  document_date DATE,
  invoice_number TEXT,
  client_name TEXT,
  fiscal_year TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_commercial_quotas_lookup ON public.commercial_quotas(user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_group_targets_lookup ON public.group_targets(group_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_sales_records_lookup ON public.sales_records(user_id, fiscal_year, line_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_vendor ON public.sales_records(vendor_code, fiscal_year);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad permisivas
CREATE POLICY "Permitir lectura y escritura en profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en commercial_quotas" ON public.commercial_quotas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en group_targets" ON public.group_targets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en sales_records" ON public.sales_records
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 4. SEED INICIAL: USUARIO ADMINISTRADOR Y EQUIPO CORPORATIVO SOLITIUM
-- ====================================================================

-- 4.1 Insertar usuario Admin inicial en la tabla profiles
INSERT INTO public.profiles (id, name, email, vendor_code, role, group_id, is_active)
VALUES 
  ('user-admin-01', 'Administrador General Solitium', 'admin@solitium.es', 'ADMIN01', 'admin', 'grp-1', true),
  ('user-dt-01', 'Santiago Navarro (Dir. Territorial)', 'santiago.navarro@solitium.es', 'DT01', 'director_territorial', 'grp-1', true),
  ('user-dc-01', 'Roberto Gómez (Dir. Comercial G1)', 'roberto.gomez@solitium.es', 'DC01', 'director_comercial', 'grp-1', true),
  ('comm-001', 'Carlos Ruiz García', 'carlos.ruiz@solitium.es', 'V045', 'comercial', 'grp-1', true),
  ('comm-002', 'Elena Martínez Blanco', 'elena.martinez@solitium.es', 'LMARTINEZ', 'comercial', 'grp-1', true),
  ('comm-003', 'Javier Villagrasa Sánchez', 'javier.villagrasa@solitium.es', 'JVILLAGRASA', 'comercial', 'grp-2', true),
  ('comm-004', 'Antonio Lapieza Mur', 'antonio.lapieza@solitium.es', 'ALAPIEZA', 'comercial', 'grp-3', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  group_id = EXCLUDED.group_id,
  vendor_code = EXCLUDED.vendor_code;

-- 4.2 Seed en auth.users de Supabase para login nativo (admin@solitium.es / AdminSolitium2026!)
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@solitium.es') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@solitium.es',
      crypt('AdminSolitium2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Administrador General Solitium","role":"admin"}',
      now(),
      now()
    );
  END IF;
END $$;
