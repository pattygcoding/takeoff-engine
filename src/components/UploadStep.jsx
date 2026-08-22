import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadSampleCsv, downloadSampleExcel, parseTakeoffFile } from '@/lib/csv';
import ColumnMappingModal from './ColumnMappingModal';

export default function UploadStep({ onItemsParsed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [mappingModalData, setMappingModalData] = useState(null);
  const [currentUploadedFile, setCurrentUploadedFile] = useState(null);
  const [checksumSummary, setChecksumSummary] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file, explicitSheetName = null) => {
      if (!file) return;
      setFileName(file.name);
      setCurrentUploadedFile(file);
      setIsParsing(true);
      setErrors([]);
      setChecksumSummary(null);

      try {
        const result = await parseTakeoffFile(file, explicitSheetName);

        if (result.requiresMappingModal) {
          setMappingModalData(result);
          return;
        }

        const { items, errors: parseErrors, checksum } = result;
        setErrors(parseErrors || []);
        if (checksum?.hasSubtotals) {
          setChecksumSummary(checksum);
        }

        if (items && items.length > 0) {
          onItemsParsed(items);
        }
      } catch (err) {
        console.error('Failed to parse takeoff file:', err);
        setErrors([`Could not read this file. Make sure it's a valid CSV or Excel (.xlsx) file.`]);
      } finally {
        setIsParsing(false);
      }
    },
    [onItemsParsed]
  );

  const handleSheetChange = (sheetName) => {
    if (currentUploadedFile) {
      handleFile(currentUploadedFile, sheetName);
    }
  };

  const handleMappingConfirm = ({ items, errors: mappingErrors, checksum }) => {
    setMappingModalData(null);
    setErrors(mappingErrors || []);
    if (checksum?.hasSubtotals) {
      setChecksumSummary(checksum);
    }
    if (items && items.length > 0) {
      onItemsParsed(items);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Import Your Takeoff</h1>
        <p className="mt-2 text-slate-500">
          Upload a CSV or Excel export of your construction takeoff to begin building a pricing estimate.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,.xlsx,.xls,.xlsm,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        <p className="mt-4 font-medium text-slate-700">
          {isParsing ? (
            'Parsing spreadsheet and sniffing headers…'
          ) : (
            <>
              Drag &amp; drop your CSV or Excel file here, or <span className="text-indigo-600 underline">browse</span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-slate-400">{fileName || 'Accepts .csv, .xlsx, .xls, and .xlsm files'}</p>
      </div>

      {checksumSummary && (
        <div className={`mt-6 rounded-xl border p-4 text-xs ${
          checksumSummary.checksumMatches
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            <span>{checksumSummary.checksumMatches ? '✓ Subtotal Checksum Verified' : '⚠️ Subtotal Checksum Note'}</span>
          </div>
          <p>
            Detected Spreadsheet Subtotal: <strong>{checksumSummary.detectedSubtotals.toLocaleString()}</strong> |
            Parsed Items Total: <strong>{checksumSummary.parsedSum.toLocaleString()}</strong>
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700 mb-2">
            {errors.length} issue{errors.length > 1 ? 's' : ''} found in your file:
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-500">
        <span>Need a starting point?</span>
        <button
          type="button"
          onClick={() => downloadSampleCsv()}
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          CSV Template
        </button>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          onClick={() => downloadSampleExcel()}
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          Excel Template (.xlsx)
        </button>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_bluebeam_takeoff.csv`}
          download="sample_bluebeam_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          Bluebeam Sample
        </a>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_planswift_takeoff.csv`}
          download="sample_planswift_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          PlanSwift Sample
        </a>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_trimble_agtek_takeoff.csv`}
          download="sample_trimble_agtek_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          Trimble / Agtek Sample
        </a>
      </div>

      <div className="mt-10 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Mega-Resilient Takeoff Engine Ingestion:</p>
        <p className="text-xs text-slate-500 mb-2">
          Drop complex takeoff spreadsheets directly without manual cleanup. Our engine features automatic 2D header boundary sniffing, merged cell forward-filling, subtotal row exclusion, composite size deconstruction, trade unit normalization, and vendor mapping presets.
        </p>
        <code className="text-xs bg-white border border-slate-200 rounded px-2 py-1 block overflow-x-auto">
          Standard Fields: system, item_description, size_spec, quantity, unit, avg_depth_ft
        </code>
        <p className="mt-3">
          Need more detail on what's allowed?{' '}
          <Link
            to="/guide"
            className="font-medium text-indigo-600 hover:text-indigo-800 underline"
          >
            Read the full client guide
          </Link>
          .
        </p>
      </div>

      {/* Interactive Column Mapping Modal */}
      {mappingModalData && (
        <ColumnMappingModal
          headers={mappingModalData.headers}
          rawRows={mappingModalData.rawRows}
          initialMapping={mappingModalData.currentMapping}
          matchConfidences={mappingModalData.matchConfidences}
          overallConfidence={mappingModalData.overallConfidence}
          sheetNames={mappingModalData.sheetNames}
          activeSheetName={mappingModalData.activeSheetName}
          onSheetChange={handleSheetChange}
          onConfirm={handleMappingConfirm}
          onCancel={() => setMappingModalData(null)}
        />
      )}
    </div>
  );
}
