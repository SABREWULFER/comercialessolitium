export type UserRole = 'comercial' | 'director_comercial' | 'director_territorial' | 'admin';

export interface CommercialGroup {
  id: string;
  name: string;
  code: string;
  description: string;
}

export const COMMERCIAL_GROUPS: CommercialGroup[] = [
  { id: 'grp-1', name: 'Grupo 1 - Aragón Norte', code: 'G1-NORTE', description: 'Zaragoza Norte, Huesca y Jacetania' },
  { id: 'grp-2', name: 'Grupo 2 - Aragón Centro & Sur', code: 'G2-SUR', description: 'Zaragoza Centro, Ebro Sur y Teruel' },
  { id: 'grp-3', name: 'Grupo 3 - Levante & Rioja', code: 'G3-RIOJA', description: 'La Rioja, Navarra y Ribera de Levante' },
  { id: 'grp-4', name: 'Grupo 4 - Cuentas Estratégicas & Corporate', code: 'G4-CORP', description: 'Grandes cuentas industriales e instituciones' },
];

export interface CommercialUser {
  id: string;
  name: string;
  vendor_code: string;
  email: string;
  role: UserRole;
  group_id: string;
  is_active?: boolean;
  created_at?: string;
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
  | 'SAGE_CLIENTS';

export interface BusinessLineConfig {
  id: BusinessLineId;
  name: string;
  shortName: string;
  isCurrency: boolean;
  unit: string;
  description: string;
  group: 'Ofimática y TI' | 'Especialidades' | 'Servicios & Software' | 'Objetivos Estratégicos';
}

export const BUSINESS_LINES: BusinessLineConfig[] = [
  { id: 'OFI', name: 'Impresión Oficina', shortName: 'OFI', isCurrency: true, unit: '€', description: 'Impresión y multifuncionales de oficina', group: 'Ofimática y TI' },
  { id: 'MICRO', name: 'Microinformática', shortName: 'MICRO', isCurrency: true, unit: '€', description: 'Puestos de trabajo, portátiles y periféricos', group: 'Ofimática y TI' },
  { id: 'SISTEMAS', name: 'Sistemas & Servidores', shortName: 'SISTEMAS', isCurrency: true, unit: '€', description: 'Infraestructura, servidores y networking', group: 'Ofimática y TI' },
  { id: 'MI', name: 'Mantenimiento Solitium', shortName: 'MI', isCurrency: true, unit: '€', description: 'Mantenimientos preventivos/correctivos', group: 'Servicios & Software' },
  { id: 'SW', name: 'Suscripción & Software', shortName: 'SW', isCurrency: true, unit: '€', description: 'Licenciamiento recurrente y software', group: 'Servicios & Software' },
  { id: 'PP', name: 'Producción', shortName: 'PP', isCurrency: true, unit: '€', description: 'Sistemas de artes gráficas y producción', group: 'Especialidades' },
  { id: 'GF', name: 'Gran Formato', shortName: 'GF', isCurrency: true, unit: '€', description: 'Plotters y cartelería gran formato', group: 'Especialidades' },
  { id: '3D', name: '3D Desktop', shortName: '3D', isCurrency: true, unit: '€', description: 'Impresión y escaneado 3D profesional', group: 'Especialidades' },
  { id: 'DW', name: 'DocuWare (Gestión Documental)', shortName: 'DW', isCurrency: true, unit: '€', description: 'Soluciones ECM / Gestión documental', group: 'Servicios & Software' },
  { id: 'AV', name: 'Audiovisuales', shortName: 'AV', isCurrency: true, unit: '€', description: 'Pantallas interactivas y salas de reunión', group: 'Especialidades' },
  { id: 'SAGE_CLIENTS', name: 'Clientes Nuevos SAGE', shortName: 'SAGE (Clientes)', isCurrency: false, unit: 'Clientes', description: 'Captación de nuevas altas de clientes en SAGE', group: 'Objetivos Estratégicos' },
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
  user_id: string;
  vendor_code: string;
  line_id: BusinessLineId;
  amount: number;
  is_new_client: boolean;
  document_date: string;
  invoice_number: string;
  client_name?: string;
  fiscal_year: string;
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
}

export interface AcceleratorTier {
  threshold: number; // ej: 0.95 (95%), 1.0 (100%), 1.2 (120%)
  label: string;
  multiplier: number;
  achieved: boolean;
  extraRewardDescription: string;
}
