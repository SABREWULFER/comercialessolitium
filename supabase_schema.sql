-- ====================================================================
-- MIGRACIÓN SUPABASE: GESTIÓN DE ZONAS, PERFILES, OBJETIVOS Y VENTAS SOLITIUM
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ====================================================================

-- 1. Tabla de Zonas y Grupos Territoriales
-- Columnas exactas requeridas: id (uuid), name (text), director_commercial_id (uuid), created_at
CREATE TABLE IF NOT EXISTS public.commercial_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  director_commercial_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Perfiles de Usuario
-- Columnas exactas requeridas: id (uuid), full_name (text), email (text), role (text), group_id (uuid), seller_code (text), created_at
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- Coincide con auth.users.id
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'comercial', -- 'comercial', 'director_comercial', 'director_territorial', 'admin'
  group_id UUID REFERENCES public.commercial_groups(id) ON DELETE SET NULL,
  seller_code TEXT NOT NULL DEFAULT '', -- ej: 'ALAPIEZA', 'JVILLAGRASA', 'LMARTINEZ', 'ADMIN01'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Cuotas Comerciales por Comercial, Año Fiscal y Línea de Negocio
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

-- 4. Tabla de Objetivos y Métricas Grupales para Directores Comerciales (DC)
CREATE TABLE IF NOT EXISTS public.group_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  group_name TEXT NOT NULL,
  dc_user_id TEXT NOT NULL,
  annual_base_bonus NUMERIC(12, 2) NOT NULL DEFAULT 6000.00,
  managed_services_pct NUMERIC(5, 2) NOT NULL DEFAULT 25.00,
  new_client_units NUMERIC(6, 0) NOT NULL DEFAULT 15,
  turbo_sage_leads NUMERIC(6, 0) NOT NULL DEFAULT 8,
  turbo_bol_svm NUMERIC(12, 2) NOT NULL DEFAULT 12000.00,
  dc_extra_quota NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_group_year UNIQUE(group_id, fiscal_year)
);

-- 5. Tabla de Ventas Consolidadas (Liquidación / Excel / HTML)
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
CREATE INDEX IF NOT EXISTS idx_commercial_groups_name ON public.commercial_groups(name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_group ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_commercial_quotas_lookup ON public.commercial_quotas(user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_group_targets_lookup ON public.group_targets(group_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_sales_records_lookup ON public.sales_records(user_id, fiscal_year, line_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_vendor ON public.sales_records(vendor_code, fiscal_year);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.commercial_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad permisivas
CREATE POLICY "Permitir lectura y escritura en commercial_groups" ON public.commercial_groups
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en commercial_quotas" ON public.commercial_quotas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en group_targets" ON public.group_targets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en sales_records" ON public.sales_records
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED INICIAL: LOS 4 GRUPOS TERRITORIALES Y EL USUARIO ADMIN
-- ====================================================================

-- Inicializar los 4 grupos por defecto
INSERT INTO public.commercial_groups (id, name, director_commercial_id)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Grupo 1 - Aragón Norte', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Grupo 2 - Aragón Centro & Sur', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Grupo 3 - Levante & Rioja', NULL),
  ('44444444-4444-4444-4444-444444444444', 'Grupo 4 - Cuentas Estratégicas & Corporate', NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- Insertar usuario Admin inicial en profiles
INSERT INTO public.profiles (id, full_name, email, role, group_id, seller_code)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Administrador General Solitium', 'admin@solitium.es', 'admin', '11111111-1111-1111-1111-111111111111', 'ADMIN01')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  group_id = EXCLUDED.group_id,
  seller_code = EXCLUDED.seller_code;

-- Insertar usuario Admin inicial en auth.users
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
      '{"full_name":"Administrador General Solitium","role":"admin"}',
      now(),
      now()
    );
  END IF;
END $$;
