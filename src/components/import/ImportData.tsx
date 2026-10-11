'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Trash2,
  Table,
  Check,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SalesRecord, CommercialUser } from '@/types';
import { mapRawLineToId } from '@/lib/calculations';
import { saveSalesRecordsDirect, clearAllSales, getAllUsers, RawDBSaleRecord } from '@/lib/storage';

interface ImportDataProps {
  fiscalYear: string;
  onImportComplete: () => void;
}

/**
 * Limpieza y conversión segura de importes monetarios
 */
function cleanParseAmount(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim().replace(/[€$]/g, '').trim();
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parseo de fecha de Excel a formato estándar YYYY-MM-DD
 */
function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

export const ImportData: React.FC<ImportDataProps> = ({
  fiscalYear,
  onImportComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState<RawDBSaleRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  /**
   * Procesar archivo subido (.xlsx, .xls, .csv, .html)
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      // 1. Cargar primero los usuarios de public.profiles (id, seller_code, full_name)
      const profiles = await getAllUsers();
      const sellerCodeMap = new Map<string, CommercialUser>();
      profiles.forEach(p => {
        const code = (p.seller_code || p.vendor_code || '').trim().toUpperCase();
        if (code) {
          sellerCodeMap.set(code, p);
        }
      });

      const data = await file.arrayBuffer();
      let workbook: XLSX.WorkBook;

      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const textDecoder = new TextDecoder('utf-8');
        const htmlStr = textDecoder.decode(data);
        workbook = XLSX.read(htmlStr, { type: 'string' });
      } else {
        workbook = XLSX.read(data, { type: 'array', cellDates: true });
      }

      // Priorizar la hoja 'Lineas Liquidación' o 'Líneas Liquidación' si existe
      const targetSheetName = workbook.SheetNames.find(s => 
        s.toLowerCase().includes('lineas liquidación') || 
        s.toLowerCase().includes('lineas liquidacion') ||
        s.toLowerCase().includes('liquidaci')
      ) || workbook.SheetNames[0];

      const worksheet = workbook.Sheets[targetSheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        throw new Error('La hoja seleccionada no contiene filas con datos válidos.');
      }

      const validSalesRecords: RawDBSaleRecord[] = [];
      let skippedCount = 0;
      const unmappedVendors = new Set<string>();

      jsonData.forEach((row, index) => {
        // Encontrar columna 'Pago-a Cód. Vendedor'
        const vendorKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('pago-a cód. vendedor') || 
                 lk.includes('pago-a cod. vendedor') ||
                 lk.includes('pago-a') ||
                 lk.includes('cód. vendedor') || 
                 lk.includes('cod. vendedor') || 
                 lk.includes('vendedor');
        });

        const rawVendor = vendorKey ? String(row[vendorKey]).trim().toUpperCase() : '';

        // 2. Mapear cada fila por su 'Pago-a Cód. Vendedor'
        const matchedUser = sellerCodeMap.get(rawVendor);

        // 3. Si no existe en profiles, omite la fila o loguea aviso para que no aborte
        if (!matchedUser) {
          skippedCount++;
          if (rawVendor) unmappedVendors.add(rawVendor);
          return;
        }

        // 'Club 100%' / 'Linea Código'
        const lineKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('club 100%') || 
                 lk.includes('linea código') || 
                 lk.includes('linea codigo') || 
                 lk.includes('línea') || 
                 lk.includes('linea') || 
                 lk.includes('tipo producto');
        });
        const rawLine = lineKey ? String(row[lineKey]).trim() : '';
        const mappedLineId = mapRawLineToId(rawLine);

        // 'Base comisión manual'
        const amountKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('base comisión manual') || 
                 lk.includes('base comision manual') || 
                 lk.includes('base comisión') || 
                 lk.includes('base comision') || 
                 lk.includes('importe') || 
                 lk.includes('base');
        });
        const numericAmount = amountKey ? cleanParseAmount(row[amountKey]) : 0;

        // 'Cliente / Prospecto' -> true si es 'Prospecto', false si es 'Cliente'
        const clientTypeKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('cliente / prospecto') || 
                 lk.includes('cliente/prospecto') || 
                 lk.includes('prospecto') || 
                 lk.includes('tipo cliente');
        });
        const rawClientType = clientTypeKey ? String(row[clientTypeKey]).toLowerCase() : '';
        const isNewClient = rawClientType.includes('prospecto') || rawClientType.includes('nuevo');

        // 'Nº operación renting' -> true si tiene datos no vacíos, false si vacío
        const rentingKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('operación renting') || 
                 lk.includes('operacion renting') || 
                 lk.includes('nº operación renting') || 
                 lk.includes('renting');
        });
        const isFinanced = rentingKey ? String(row[rentingKey]).trim().length > 0 : false;

        // 'Nº documento'
        const invoiceKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('nº documento') || 
                 lk.includes('no documento') || 
                 lk.includes('documento') || 
                 lk.includes('factura');
        });
        const invoiceNumber = invoiceKey && row[invoiceKey] ? String(row[invoiceKey]).trim() : `DOC-${index + 1}`;

        // 'Fecha documento'
        const dateKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('fecha documento') || 
                 lk.includes('fecha registro') || 
                 lk.includes('fecha');
        });
        const saleDate = dateKey ? parseExcelDate(row[dateKey]) : new Date().toISOString().split('T')[0];

        // 'is_managed_service' -> true si concepto/categoría es servicio gestionado o conectividad, o si línea es MI/SW
        const conceptKey = Object.keys(row).find(k => {
          const lk = k.toLowerCase();
          return lk.includes('concepto') || 
                 lk.includes('categoría') || 
                 lk.includes('categoria') || 
                 lk.includes('familia') || 
                 lk.includes('descripción') || 
                 lk.includes('descripcion');
        });
        const conceptStr = conceptKey ? String(row[conceptKey]).toLowerCase() : '';
        const isManagedService = conceptStr.includes('servicio gestionado') || 
                                 conceptStr.includes('conectividad') || 
                                 conceptStr.includes('mantenimiento') ||
                                 mappedLineId === 'MI' || 
                                 mappedLineId === 'SW';

        // Columnas exactas de public.sales_records
        validSalesRecords.push({
          commercial_id: matchedUser.id,
          line_id: mappedLineId,
          fiscal_year: fiscalYear || '2026-2027',
          amount: numericAmount,
          discount_rate: 0,
          is_managed_service: isManagedService,
          is_new_client: isNewClient,
          is_financed: isFinanced,
          invoice_number: invoiceNumber,
          sale_date: saleDate,
        });
      });

      if (validSalesRecords.length === 0) {
        throw new Error('No se encontraron filas con códigos de vendedor coincidentes con perfiles registrados.');
      }

      setRecords(validSalesRecords);

      // 4. Inserta en Supabase mediante batches de 50 registros
      const saveResult = await saveSalesRecordsDirect(validSalesRecords);

      if (saveResult.success) {
        // 5. Mensaje de confirmación exacto
        setSuccessMessage(`Procesadas ${validSalesRecords.length} líneas con éxito. Ventas sumadas a cada comercial.`);
        
        if (skippedCount > 0) {
          setWarningMessage(`Aviso: ${skippedCount} filas se omitieron por corresponder a códigos de vendedor no registrados en profiles (${Array.from(unmappedVendors).slice(0, 5).join(', ')}${unmappedVendors.size > 5 ? '...' : ''}).`);
        }

        // 6. Recalcular al instante las cifras acumuladas de cada comercial, del equipo y bonos DC
        onImportComplete();
      } else {
        setErrorMessage(`Error guardando en Supabase: ${saveResult.error || 'Fallo de inserción'}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error al procesar el archivo: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cargar datos oficiales de prueba de 'SEPTIEMBRE.xlsx' mapeando con los usuarios reales de profiles
   */
  const handleLoadSampleSeptiembre = async () => {
    setIsProcessing(true);
    setFileName('SEPTIEMBRE.xlsx (Simulación Oficial Solitium)');
    setSuccessMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      const profiles = await getAllUsers();
      if (profiles.length === 0) {
        throw new Error('No hay perfiles registrados en la base de datos.');
      }

      // Buscar usuarios por código o rol
      const alapieza = profiles.find(p => (p.seller_code || p.vendor_code || '').toUpperCase() === 'ALAPIEZA') || profiles[0];
      const jvillagrasa = profiles.find(p => (p.seller_code || p.vendor_code || '').toUpperCase() === 'JVILLAGRASA') || profiles[1] || profiles[0];
      const lmartinez = profiles.find(p => (p.seller_code || p.vendor_code || '').toUpperCase() === 'LMARTINEZ') || profiles[2] || profiles[0];
      const laloras = profiles.find(p => (p.seller_code || p.vendor_code || '').toUpperCase().includes('LORAS') || p.role === 'director_comercial') || profiles[0];

      const sampleSeptiembre: RawDBSaleRecord[] = [
        // Ventas de ALAPIEZA
        { commercial_id: alapieza.id, line_id: 'OFI', fiscal_year: fiscalYear, amount: 18500, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: true, invoice_number: 'FC26-0891', sale_date: '2026-09-04' },
        { commercial_id: alapieza.id, line_id: 'MICRO', fiscal_year: fiscalYear, amount: 9200, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: false, invoice_number: 'FC26-0899', sale_date: '2026-09-08' },
        { commercial_id: alapieza.id, line_id: 'SISTEMAS', fiscal_year: fiscalYear, amount: 14500, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: true, invoice_number: 'FC26-0912', sale_date: '2026-09-12' },
        { commercial_id: alapieza.id, line_id: 'MI', fiscal_year: fiscalYear, amount: 5600, discount_rate: 0, is_managed_service: true, is_new_client: false, is_financed: false, invoice_number: 'FC26-0925', sale_date: '2026-09-15' },
        { commercial_id: alapieza.id, line_id: 'SW', fiscal_year: fiscalYear, amount: 4800, discount_rate: 0, is_managed_service: true, is_new_client: true, is_financed: false, invoice_number: 'FC26-0940', sale_date: '2026-09-18' },
        { commercial_id: alapieza.id, line_id: 'DW', fiscal_year: fiscalYear, amount: 12000, discount_rate: 0, is_managed_service: true, is_new_client: true, is_financed: false, invoice_number: 'FC26-0966', sale_date: '2026-09-22' },
        { commercial_id: alapieza.id, line_id: 'SAGE_CLIENTS', fiscal_year: fiscalYear, amount: 0, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: false, invoice_number: 'SAGE-01', sale_date: '2026-09-28' },

        // Ventas de JVILLAGRASA
        { commercial_id: jvillagrasa.id, line_id: 'OFI', fiscal_year: fiscalYear, amount: 22000, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: true, invoice_number: 'FC26-0894', sale_date: '2026-09-05' },
        { commercial_id: jvillagrasa.id, line_id: 'PP', fiscal_year: fiscalYear, amount: 31000, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: true, invoice_number: 'FC26-0905', sale_date: '2026-09-11' },
        { commercial_id: jvillagrasa.id, line_id: 'GF', fiscal_year: fiscalYear, amount: 14000, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: true, invoice_number: 'FC26-0920', sale_date: '2026-09-14' },
        { commercial_id: jvillagrasa.id, line_id: '3D', fiscal_year: fiscalYear, amount: 8500, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: false, invoice_number: 'FC26-0948', sale_date: '2026-09-19' },

        // Ventas de LMARTINEZ
        { commercial_id: lmartinez.id, line_id: 'OFI', fiscal_year: fiscalYear, amount: 16500, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: false, invoice_number: 'FC26-0901', sale_date: '2026-09-07' },
        { commercial_id: lmartinez.id, line_id: 'MICRO', fiscal_year: fiscalYear, amount: 11000, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: false, invoice_number: 'FC26-0933', sale_date: '2026-09-16' },
        { commercial_id: lmartinez.id, line_id: 'SISTEMAS', fiscal_year: fiscalYear, amount: 19500, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: true, invoice_number: 'FC26-0955', sale_date: '2026-09-21' },
        { commercial_id: lmartinez.id, line_id: 'SAGE_CLIENTS', fiscal_year: fiscalYear, amount: 0, discount_rate: 0, is_managed_service: false, is_new_client: true, is_financed: false, invoice_number: 'SAGE-02', sale_date: '2026-09-29' },

        // Ventas Directas del Director Comercial (LALORAS)
        { commercial_id: laloras.id, line_id: 'OFI', fiscal_year: fiscalYear, amount: 25000, discount_rate: 0, is_managed_service: false, is_new_client: false, is_financed: true, invoice_number: 'FC26-0970', sale_date: '2026-09-23' },
        { commercial_id: laloras.id, line_id: 'DW', fiscal_year: fiscalYear, amount: 18000, discount_rate: 0, is_managed_service: true, is_new_client: true, is_financed: false, invoice_number: 'FC26-0985', sale_date: '2026-09-26' },
      ];

      setRecords(sampleSeptiembre);
      const res = await saveSalesRecordsDirect(sampleSeptiembre);

      if (res.success) {
        setSuccessMessage(`Procesadas ${sampleSeptiembre.length} líneas con éxito. Ventas sumadas a cada comercial.`);
        onImportComplete();
      } else {
        setErrorMessage(`Error guardando datos de muestra: ${res.error}`);
      }
    } catch (err: any) {
      setErrorMessage(`Error cargando SEPTIEMBRE.xlsx: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    if (confirm('¿Deseas vaciar todas las ventas cargadas? Los objetivos y cuotas configuradas se mantendrán.')) {
      await clearAllSales();
      setRecords([]);
      setSuccessMessage('Ventas eliminadas correctamente.');
      onImportComplete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-solitium-100 text-solitium-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Liquidación Solitium
            </span>
            <span className="text-xs text-slate-400 font-medium">&bull; Ejercicio {fiscalYear}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Upload className="w-5 h-5 text-solitium-500" />
            Importador de Liquidación y Ventas Solitium
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mapeo automático a la tabla <code className="font-mono text-solitium-600 bg-slate-100 px-1 py-0.5 rounded">sales_records</code> por <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">Pago-a Cód. Vendedor</code> e inserción en lotes de 50.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSampleSeptiembre}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            Cargar Demo SEPTIEMBRE.xlsx
          </button>
          
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar Ventas
          </button>
        </div>
      </div>

      {/* Zona de Drop / Input de archivo */}
      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-solitium-500 transition-colors text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-solitium-50 text-solitium-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Arrastra aquí tu archivo Excel ('Lineas Liquidación') o selecciónalo
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Columnas reconocidas: <strong className="text-slate-700">Pago-a Cód. Vendedor</strong>, <strong className="text-slate-700">Club 100% / Linea Código</strong>, <strong className="text-slate-700">Base comisión manual</strong>, <strong className="text-slate-700">Cliente / Prospecto</strong>, <strong className="text-slate-700">Nº operación renting</strong>, <strong className="text-slate-700">Fecha documento</strong>.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-solitium-500 hover:bg-solitium-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all">
            <Upload className="w-4 h-4" />
            <span>Seleccionar Archivo (.xlsx / .html)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.html,.htm"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
          </label>

          {fileName && (
            <p className="text-xs text-slate-600 font-medium pt-2">
              Archivo seleccionado: <span className="font-bold text-solitium-600">{fileName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Mensajes de Estado */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {warningMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Vista previa de datos cargados */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Registros Mapeados a sales_records ({records.length} líneas)
              </h4>
            </div>
            <span className="text-xs text-slate-500">
              Total Facturado: <span className="font-bold text-slate-900">{records.reduce((a, b) => a + b.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-3">Factura (Nº doc)</th>
                  <th className="p-3">Fecha Venta</th>
                  <th className="p-3">ID Comercial (UUID)</th>
                  <th className="p-3">Línea Mapeada</th>
                  <th className="p-3">Nuevo Cliente</th>
                  <th className="p-3">Financiado</th>
                  <th className="p-3 text-right">Base Comisión (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {records.slice(0, 50).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{r.invoice_number}</td>
                    <td className="p-3 text-slate-500">{r.sale_date}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {r.commercial_id ? `${r.commercial_id.slice(0, 8)}...` : '-'}
                    </td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                        {r.line_id}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.is_new_client ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                          Prospecto
                        </span>
                      ) : (
                        <span className="text-slate-400">Cliente</span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.is_financed ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                          Renting
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {r.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length > 50 && (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
              Mostrando las primeras 50 de {records.length} líneas importadas.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
