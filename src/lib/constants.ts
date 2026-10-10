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
    id: 'comm-001',
    name: 'Carlos Ruiz García',
    vendor_code: 'V045',
    email: 'carlos.ruiz@solitium.es',
    role: 'commercial',
    group_id: 'grp-norte',
  },
  {
    id: 'comm-002',
    name: 'Elena Martínez Blanco',
    vendor_code: 'V089',
    email: 'elena.martinez@solitium.es',
    role: 'commercial',
    group_id: 'grp-norte',
  },
  {
    id: 'comm-003',
    name: 'Javier Domínguez Silva',
    vendor_code: 'V102',
    email: 'javier.dominguez@solitium.es',
    role: 'commercial',
    group_id: 'grp-norte',
  },
  {
    id: 'dc-001',
    name: 'Roberto Gómez (Dir. Comercial)',
    vendor_code: 'DC01',
    email: 'roberto.gomez@solitium.es',
    role: 'director',
    group_id: 'grp-norte',
  },
];

export const INITIAL_GROUP_TARGET: GroupTarget = {
  group_id: 'grp-norte',
  fiscal_year: CURRENT_FISCAL_YEAR,
  group_name: 'Equipo Comercial Norte - Solitium',
  dc_user_id: 'dc-001',
  annual_base_bonus: 7500,
  managed_services_pct: 28,
  new_client_units: 18,
  turbo_sage_leads: 10,
  turbo_bol_svm: 15000,
  dc_extra_quota: 25000,
};
