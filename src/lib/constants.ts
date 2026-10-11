import { CommercialUser, GroupTarget } from '@/types';

export const CURRENT_FISCAL_YEAR = '2026-2027';

export const AVAILABLE_FISCAL_YEARS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
];

export const DEMO_USERS: CommercialUser[] = [
  {
    id: 'user-admin-01',
    name: 'Administrador General Solitium',
    vendor_code: 'ADMIN01',
    email: 'admin@solitium.es',
    role: 'admin',
    group_id: 'grp-1',
    is_active: true,
  },
  {
    id: 'user-dt-01',
    name: 'Santiago Navarro (Dir. Territorial)',
    vendor_code: 'DT01',
    email: 'santiago.navarro@solitium.es',
    role: 'director_territorial',
    group_id: 'grp-1',
    is_active: true,
  },
  {
    id: 'user-dc-01',
    name: 'Roberto Gómez (Dir. Comercial G1)',
    vendor_code: 'DC01',
    email: 'roberto.gomez@solitium.es',
    role: 'director_comercial',
    group_id: 'grp-1',
    is_active: true,
  },
  {
    id: 'comm-001',
    name: 'Carlos Ruiz García',
    vendor_code: 'V045',
    email: 'carlos.ruiz@solitium.es',
    role: 'comercial',
    group_id: 'grp-1',
    is_active: true,
  },
  {
    id: 'comm-002',
    name: 'Elena Martínez Blanco',
    vendor_code: 'LMARTINEZ',
    email: 'elena.martinez@solitium.es',
    role: 'comercial',
    group_id: 'grp-1',
    is_active: true,
  },
  {
    id: 'comm-003',
    name: 'Javier Villagrasa Sánchez',
    vendor_code: 'JVILLAGRASA',
    email: 'javier.villagrasa@solitium.es',
    role: 'comercial',
    group_id: 'grp-2',
    is_active: true,
  },
  {
    id: 'comm-004',
    name: 'Antonio Lapieza Mur',
    vendor_code: 'ALAPIEZA',
    email: 'antonio.lapieza@solitium.es',
    role: 'comercial',
    group_id: 'grp-3',
    is_active: true,
  },
];

export const INITIAL_GROUP_TARGET: GroupTarget = {
  group_id: 'grp-1',
  fiscal_year: CURRENT_FISCAL_YEAR,
  group_name: 'Grupo 1 - Aragón Norte',
  dc_user_id: 'user-dc-01',
  annual_base_bonus: 7500,
  managed_services_pct: 28,
  new_client_units: 18,
  turbo_sage_leads: 10,
  turbo_bol_svm: 15000,
  dc_extra_quota: 25000,
};
