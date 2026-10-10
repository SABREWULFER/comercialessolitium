# Portal de Gestión Comercial & Objetivos Dinámicos - Grupo Solitium

Aplicación desarrollada en **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** y conectada con **Supabase** para el cálculo 100% dinámico de incentivos, cuotas por línea de negocio, aceleradores anuales y bonos de dirección comercial.

---

## 🚀 Principios de Arquitectura y Requisitos Clave
1. **Zero Hardcoded Quotas**: Ningún objetivo de venta está fijado en el código fuente. Todas las cuotas residen en la base de datos Supabase (`commercial_quotas` y `group_targets`) y se pueden editar en cualquier momento.
2. **Logotipo Corporativo de Solitium**: Integrado en la cabecera superior del Sidebar y Navbar, así como en la pantalla de bienvenida / login (`/logo-solitium.png`).
3. **Cálculos en Tiempo Real**: Consecución %, importe restante para alcanzar cuota, Aceleradores Anuales (95%, 100%, 120%) y Bono Anual del Director Comercial calculados dinámicamente comparando ventas consolidadas contra cuotas guardadas.
4. **Importador Universal**: Capaz de procesar hojas `.xlsx` (formato oficial `SEPTIEMBRE.xlsx`), así como volcados `.html` o `.csv`, mapeando automáticamente vendedores, líneas de negocio y tipo de cliente (prospecto/nuevo).

---

## 📦 Despliegue en Supabase

Ejecuta el script incluido en [`supabase_schema.sql`](file:///Users/luis/Library/CloudStorage/OneDrive-Personal/cosas%20mias/DOCUMENTACION/luis/NEGOCIO%20PARALELO/LOCALPASS/antigravity/SOLITIUM/supabase_schema.sql) dentro del SQL Editor de Supabase:

- **`commercial_quotas`**: Cuotas por `user_id`, `fiscal_year` y `line_id` (`OFI`, `MICRO`, `SISTEMAS`, `MI`, `SW`, `PP`, `GF`, `3D`, `DW`, `AV`, `SAGE_CLIENTS`).
- **`group_targets`**: Objetivos del Director Comercial (Bono Anual Base, Servicios Gestionados %, Unidades Nuevos Clientes, Turbo Boost SAGE Leads, Turbo Boost BOL/SVM y Cuota Asignada al DC).
- **`sales_records`**: Liquidaciones y ventas consolidadas.

### Variables de Entorno (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```
*(Si no se configuran, la aplicación opera de forma transparente en modo local reactivo con caché persistente).*

---

## 🛠️ Comandos de Desarrollo y Compilación

```bash
# Servidor local de desarrollo
npm run dev

# Compilación de producción (Vercel)
npm run build
```
