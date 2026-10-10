-- MIGRACIÓN SUPABASE: GESTIÓN DINÁMICA DE OBJETIVOS Y VENTAS SOLITIUM
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- 1. Tabla de Cuotas Comerciales por Comercial, Año Fiscal y Línea de Negocio
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

-- 2. Tabla de Objetivos y Métricas Grupales para Directores Comerciales (DC)
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

-- 3. Tabla de Ventas Consolidadas (Liquidación / Excel / HTML)
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

-- Índices para consultas de alta velocidad en dashboards y cálculos en tiempo real
CREATE INDEX IF NOT EXISTS idx_commercial_quotas_lookup ON public.commercial_quotas(user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_group_targets_lookup ON public.group_targets(group_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_sales_records_lookup ON public.sales_records(user_id, fiscal_year, line_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_vendor ON public.sales_records(vendor_code, fiscal_year);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.commercial_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo / acceso authenticated y anon
CREATE POLICY "Permitir lectura y escritura en commercial_quotas" ON public.commercial_quotas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en group_targets" ON public.group_targets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir lectura y escritura en sales_records" ON public.sales_records
  FOR ALL USING (true) WITH CHECK (true);
