'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Trash2,
  Table
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SalesRecord, CommercialUser } from '@/types';
import { mapRawLineToId } from '@/lib/calculations';
import { saveBatchSales, clearAllSales } from '@/lib/storage';
import { DEMO_USERS } from '@/lib/constants';

interface ImportDataProps {
  fiscalYear: string;
  onImportComplete: () => void;
}

export const ImportData: React.FC<ImportDataProps> = ({
  fiscalYear,
  onImportComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

    try {
      const data = await file.arrayBuffer();
      let workbook: XLSX.WorkBook;

      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        // En caso de que sea un HTML exportado por ERP, sheetjs parsea tablas html
        const textDecoder = new TextDecoder('utf-8');
        const htmlStr = textDecoder.decode(data);
        workbook = XLSX.read(htmlStr, { type: 'string' });
      } else {
        workbook = XLSX.read(data, { type: 'array' });
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        throw new Error('El archivo no contiene filas con datos válidos.');
      }

      // Mapeo automático de columnas de Solitium:
      // 'Pago-a Cód. Vendedor' -> vendor_code
      // 'Club 100%' / 'Linea Código' -> line_id
      // 'Base comisión manual' -> amount
      // 'Cliente / Prospecto' -> is_new_client (Nuevo / Prospecto)
      // 'Nº documento' / 'Nº Factura' -> invoice_number
      // 'Fecha registro' / 'Fecha' -> document_date
      const parsedRecords: SalesRecord[] = [];

      jsonData.forEach((row, index) => {
        // Búsqueda flexible de columnas
        const vendorKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('cód. vendedor') || 
          k.toLowerCase().includes('vendedor') ||
          k.toLowerCase().includes('pago-a')
        );

        const lineKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('club 100%') || 
          k.toLowerCase().includes('linea') ||
          k.toLowerCase().includes('línea') ||
          k.toLowerCase().includes('tipo producto')
        );

        const amountKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('base comisión manual') || 
          k.toLowerCase().includes('base comision') ||
          k.toLowerCase().includes('importe') ||
          k.toLowerCase().includes('base')
        );

        const clientTypeKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('cliente / prospecto') || 
          k.toLowerCase().includes('prospecto') ||
          k.toLowerCase().includes('tipo cliente')
        );

        const invoiceKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('factura') || 
          k.toLowerCase().includes('documento') ||
          k.toLowerCase().includes('albarán')
        );

        const dateKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('fecha')
        );

        const clientNameKey = Object.keys(row).find(k => 
          k.toLowerCase().includes('nombre') || 
          k.toLowerCase().includes('cliente')
        );

        const rawVendor = vendorKey ? String(row[vendorKey]).trim() : 'V045';
        const rawLine = lineKey ? String(row[lineKey]).trim() : 'OFI';
        
        // Manejo de importes con comas europeas
        let rawAmount = amountKey ? row[amountKey] : 0;
        if (typeof rawAmount === 'string') {
          rawAmount = rawAmount.replace(/\./g, '').replace(',', '.');
        }
        const numericAmount = parseFloat(rawAmount) || 0;

        const rawClientType = clientTypeKey ? String(row[clientTypeKey]).toLowerCase() : '';
        const isNew = rawClientType.includes('prospecto') || rawClientType.includes('nuevo');

        // Asociar al usuario de demostración correspondiente por código de vendedor
        const matchedUser = DEMO_USERS.find(u => u.vendor_code.toLowerCase() === rawVendor.toLowerCase());
        const userId = matchedUser ? matchedUser.id : 'comm-001';

        parsedRecords.push({
          user_id: userId,
          vendor_code: rawVendor,
          line_id: mapRawLineToId(rawLine),
          amount: numericAmount,
          is_new_client: isNew,
          document_date: dateKey && row[dateKey] ? String(row[dateKey]) : new Date().toISOString().split('T')[0],
          invoice_number: invoiceKey && row[invoiceKey] ? String(row[invoiceKey]) : `FAC-${index + 1000}`,
          client_name: clientNameKey && row[clientNameKey] ? String(row[clientNameKey]) : 'Cliente Industrial Solitium S.L.',
          fiscal_year: fiscalYear,
          raw_data: row,
        });
      });

      setRecords(parsedRecords);

      // Guardar inmediatamente en la base de datos Supabase / localStorage
      const saved = await saveBatchSales(parsedRecords);
      if (saved) {
        setSuccessMessage(`¡Éxito! Se han importado y consolidado ${parsedRecords.length} registros de venta para el ejercicio ${fiscalYear}.`);
        onImportComplete();
      } else {
        setErrorMessage('Los datos se procesaron pero hubo un error de escritura en la base de datos.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error al procesar el archivo: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cargar datos de prueba de 'SEPTIEMBRE.xlsx'
   */
  const handleLoadSampleSeptiembre = async () => {
    setIsProcessing(true);
    setFileName('SEPTIEMBRE.xlsx (Simulación Oficial Solitium)');
    
    // Generar dataset representativo de SEPTIEMBRE.xlsx
    const sampleSeptiembre: SalesRecord[] = [
      // Carlos Ruiz (V045)
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'OFI', amount: 18500, is_new_client: false, document_date: '2026-09-04', invoice_number: 'FC26-0891', client_name: 'Logística Central Zaragoza S.A.', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'MICRO', amount: 9200, is_new_client: true, document_date: '2026-09-08', invoice_number: 'FC26-0899', client_name: 'Clínica Dental Norte S.L.', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'SISTEMAS', amount: 14500, is_new_client: false, document_date: '2026-09-12', invoice_number: 'FC26-0912', client_name: 'Bodegas Somontano', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'MI', amount: 5600, is_new_client: false, document_date: '2026-09-15', invoice_number: 'FC26-0925', client_name: 'Colegio San Gabriel', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'SW', amount: 4800, is_new_client: true, document_date: '2026-09-18', invoice_number: 'FC26-0940', client_name: 'Asesoría Tributaria Aragonesa', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'DW', amount: 12000, is_new_client: true, document_date: '2026-09-22', invoice_number: 'FC26-0966', client_name: 'Transportes Rápidos Ebro', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'AV', amount: 6500, is_new_client: false, document_date: '2026-09-25', invoice_number: 'FC26-0980', client_name: 'Hotel Rey Alfonso', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'SAGE_CLIENTS', amount: 0, is_new_client: true, document_date: '2026-09-28', invoice_number: 'SAGE-ALTA-1', client_name: 'Mecánicas del Jalón S.L.', fiscal_year: fiscalYear },
      { user_id: 'comm-001', vendor_code: 'V045', line_id: 'SAGE_CLIENTS', amount: 0, is_new_client: true, document_date: '2026-09-29', invoice_number: 'SAGE-ALTA-2', client_name: 'Panificadora Moncayo', fiscal_year: fiscalYear },

      // Elena Martínez (V089)
      { user_id: 'comm-002', vendor_code: 'V089', line_id: 'OFI', amount: 22000, is_new_client: true, document_date: '2026-09-05', invoice_number: 'FC26-0894', client_name: 'Industrias Metálicas del Ebro', fiscal_year: fiscalYear },
      { user_id: 'comm-002', vendor_code: 'V089', line_id: 'PP', amount: 31000, is_new_client: false, document_date: '2026-09-11', invoice_number: 'FC26-0905', client_name: 'Gráficas Aragón Color', fiscal_year: fiscalYear },
      { user_id: 'comm-002', vendor_code: 'V089', line_id: 'GF', amount: 14000, is_new_client: false, document_date: '2026-09-14', invoice_number: 'FC26-0920', client_name: 'Rotulaciones Zaragoza', fiscal_year: fiscalYear },
      { user_id: 'comm-002', vendor_code: 'V089', line_id: '3D', amount: 8500, is_new_client: true, document_date: '2026-09-19', invoice_number: 'FC26-0948', client_name: 'I+D Prototipos Médicos', fiscal_year: fiscalYear },
      { user_id: 'comm-002', vendor_code: 'V089', line_id: 'MI', amount: 7200, is_new_client: false, document_date: '2026-09-24', invoice_number: 'FC26-0975', client_name: 'Grupo Hospitalario Aragón', fiscal_year: fiscalYear },

      // Javier Domínguez (V102)
      { user_id: 'comm-003', vendor_code: 'V102', line_id: 'OFI', amount: 16500, is_new_client: false, document_date: '2026-09-07', invoice_number: 'FC26-0901', client_name: 'Distribuciones Pirineos', fiscal_year: fiscalYear },
      { user_id: 'comm-003', vendor_code: 'V102', line_id: 'MICRO', amount: 11000, is_new_client: true, document_date: '2026-09-16', invoice_number: 'FC26-0933', client_name: 'Consultores TIC Avanzados', fiscal_year: fiscalYear },
      { user_id: 'comm-003', vendor_code: 'V102', line_id: 'SISTEMAS', amount: 19500, is_new_client: true, document_date: '2026-09-21', invoice_number: 'FC26-0955', client_name: 'Centro Comercial Utrillas', fiscal_year: fiscalYear },
    ];

    setRecords(sampleSeptiembre);
    await saveBatchSales(sampleSeptiembre);
    setSuccessMessage(`Se han importado con éxito los registros de ejemplo de SEPTIEMBRE.xlsx (${sampleSeptiembre.length} facturas y liquidaciones).`);
    setIsProcessing(false);
    onImportComplete();
  };

  const handleClear = async () => {
    if (confirm('¿Deseas vaciar todas las ventas cargadas? Los objetivos configurados en commercial_quotas se mantendrán.')) {
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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-solitium-500" />
            Importador de Liquidación y Ventas Solitium
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Procesa archivos <span className="font-semibold text-slate-700">.xlsx (ej. SEPTIEMBRE.xlsx)</span>, volcados <span className="font-semibold text-slate-700">.html</span> o formatos CSV de liquidación.
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
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-solitium-50 text-solitium-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Arrastra aquí tu hoja de cálculo o selecciónala
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Compatible con formato estándar Solitium: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">Pago-a Cód. Vendedor</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">Club 100%</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">Base comisión manual</code>.
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-xs font-semibold">
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
                Registros Procesados ({records.length} líneas)
              </h4>
            </div>
            <span className="text-xs text-slate-500">
              Total Importado: <span className="font-bold text-slate-900">{records.reduce((a, b) => a + b.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                <tr>
                  <th className="p-3">Factura</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Línea Mapeada</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Base Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{r.invoice_number}</td>
                    <td className="p-3 text-slate-500">{r.document_date}</td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">
                        {r.vendor_code}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold">
                        {r.line_id}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{r.client_name || '-'}</td>
                    <td className="p-3">
                      {r.is_new_client ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                          Nuevo / Prospecto
                        </span>
                      ) : (
                        <span className="text-slate-400">Existente</span>
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
        </div>
      )}
    </div>
  );
};
