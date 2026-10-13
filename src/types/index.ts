export type UserRole = 'comercial' | 'director_comercial' | 'director_territorial' | 'admin';

export interface CommercialGroup {
  id: string; // uuid
  name: string; // text
  director_commercial_id?: string | null; // uuid
  created_at?: string;
}

export const DEFAULT_COMMERCIAL_GROUPS: CommercialGroup[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Grupo 1 - Aragón Norte', director_commercial_id: null },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Grupo 2 - Aragón Centro & Sur', director_commercial_id: null },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Grupo 3 - Levante & Rioja', director_commercial_id: null },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Grupo 4 - Cuentas Estratégicas & Corporate', director_commercial_id: null },
];

export interface CommercialUser {
  id: string; // uuid
  full_name: string; // text
  name: string; // compatibilidad
  email: string; // text
  role: UserRole; // text
  group_id: string | null; // uuid
  seller_code: string; // text
  vendor_code: string; // compatibilidad
  created_at?: string;
  is_active?: boolean;
}

export type BusinessLineId = 
  | 'OFI'
  | 'MICRO'
  | 'SISTEMAS'
  | 'MI'
  | 'SW'
  | 'PP'
  | 'GF'
  | '3D'
  | 'DW'
  | 'AV'
  | 'SAGE_CLIENTS'
  | 'F-SERVICIOS'
  | 'VARIOS';

export interface BusinessLineConfig {
  id: BusinessLineId;
  name: string;
  shortName: string;
  isCurrency: boolean;
  unit: string;
  description: string;
  group: 'Ofimática y TI' | 'Especialidades' | 'Servicios & Software' | 'Objetivos Estratégicos' | 'Facturación Adicional / Sin Cuota';
  hasTarget?: boolean; // false para patas informativas que no exigen cuota
}

export const BUSINESS_LINES: BusinessLineConfig[] = [
  { id: 'OFI', name: 'Impresión Oficina', shortName: 'OFI', isCurrency: true, unit: '€', description: 'Impresión y multifuncionales de oficina', group: 'Ofimática y TI', hasTarget: true },
  { id: 'MICRO', name: 'Microinformática', shortName: 'MICRO', isCurrency: true, unit: '€', description: 'Puestos de trabajo, portátiles y periféricos', group: 'Ofimática y TI', hasTarget: true },
  { id: 'SISTEMAS', name: 'Sistemas & Servidores', shortName: 'SISTEMAS', isCurrency: true, unit: '€', description: 'Infraestructura, servidores y networking', group: 'Ofimática y TI', hasTarget: true },
  { id: 'MI', name: 'Mantenimiento Solitium', shortName: 'MI', isCurrency: true, unit: '€', description: 'Mantenimientos preventivos/correctivos (MO-IN + BOL)', group: 'Servicios & Software', hasTarget: true },
  { id: 'SW', name: 'Suscripción & Software', shortName: 'SW', isCurrency: true, unit: '€', description: 'Licenciamiento recurrente y software', group: 'Servicios & Software', hasTarget: true },
  { id: 'PP', name: 'Producción', shortName: 'PP', isCurrency: true, unit: '€', description: 'Sistemas de artes gráficas y producción', group: 'Especialidades', hasTarget: true },
  { id: 'GF', name: 'Gran Formato', shortName: 'GF', isCurrency: true, unit: '€', description: 'Plotters, látex y cartelería gran formato', group: 'Especialidades', hasTarget: true },
  { id: '3D', name: '3D Desktop', shortName: '3D', isCurrency: true, unit: '€', description: 'Impresión y escaneado 3D profesional', group: 'Especialidades', hasTarget: true },
  { id: 'DW', name: 'DocuWare (Gestión Documental)', shortName: 'DW', isCurrency: true, unit: '€', description: 'Soluciones ECM / Gestión documental', group: 'Servicios & Software', hasTarget: true },
  { id: 'AV', name: 'Audiovisuales', shortName: 'AV', isCurrency: true, unit: '€', description: 'Pantallas interactivas y salas de reunión', group: 'Especialidades', hasTarget: true },
  { id: 'SAGE_CLIENTS', name: 'Clientes Nuevos SAGE', shortName: 'SAGE (Clientes)', isCurrency: false, unit: 'Clientes', description: 'Captación de nuevas altas de clientes en SAGE', group: 'Objetivos Estratégicos', hasTarget: true },
  { id: 'F-SERVICIOS', name: 'Fuera de Servicios', shortName: 'F-SERVICIOS', isCurrency: true, unit: '€', description: 'Facturación real fuera de servicios (sin objetivo asignable)', group: 'Facturación Adicional / Sin Cuota', hasTarget: false },
  { id: 'VARIOS', name: 'Varios', shortName: 'VARIOS', isCurrency: true, unit: '€', description: 'Facturación informativa adicional (sin objetivo asignable)', group: 'Facturación Adicional / Sin Cuota', hasTarget: false },
];

export interface CommercialQuota {
  id?: string;
  user_id: string;
  fiscal_year: string;
  line_id: BusinessLineId;
  target_value: number;
  created_at?: string;
  updated_at?: string;
}

export interface GroupTarget {
  id?: string;
  group_id: string;
  fiscal_year: string;
  group_name: string;
  dc_user_id: string;
  annual_base_bonus: number; // €
  managed_services_pct: number; // %
  new_client_units: number; // unidades
  turbo_sage_leads: number; // leads
  turbo_bol_svm: number; // € o unidades
  dc_extra_quota: number; // cuota propia DC / Televenta €
  created_at?: string;
  updated_at?: string;
}

export interface SalesRecord {
  id?: string;
  commercial_id: string | null; // uuid de public.profiles o null
  user_id?: string; // compatibilidad
  vendor_code?: string; // compatibilidad
  team_code?: string | null; // Columna 'EQUIPO COMERCIAL' (código/nombre del equipo)
  subline?: string | null; // 'MO-IN' (core mantenimiento) | 'BOL' u otros
  line_id: BusinessLineId;
  fiscal_year: string;
  amount: number;
  discount_rate?: number;
  is_managed_service?: boolean;
  is_new_client: boolean;
  is_financed?: boolean;
  invoice_number: string;
  sale_date?: string;
  document_date?: string; // compatibilidad
  client_name?: string;
  raw_data?: Record<string, any>;
  created_at?: string;
}

export interface QuotaProgress {
  line: BusinessLineConfig;
  target: number;
  actual: number;
  remaining: number;
  percentage: number;
  isCompleted: boolean;
  moInActual?: number;
  bolActual?: number;
  moInShareOfActual?: number;
  moInTarget80?: number;
  moInTargetAchievement?: number;
}

export interface AcceleratorTier {
  threshold: number; // ej: 0.95 (95%), 1.0 (100%), 1.2 (120%)
  label: string;
  multiplier: number;
  achieved: boolean;
  extraRewardDescription: string;
}
