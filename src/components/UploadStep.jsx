import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadSampleCsv, downloadSampleExcel, parseTakeoffFile } from '@/lib/csv';
import { useTranslation } from '@/context/I18nContext';
import ColumnMappingModal from './ColumnMappingModal';

export default function UploadStep({ onItemsParsed }) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [mappingModalData, setMappingModalData] = useState(null);
  const [currentUploadedFile, setCurrentUploadedFile] = useState(null);
  const [checksumSummary, setChecksumSummary] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file, explicitSheetName = null, explicitTableId = null) => {
      if (!file) return;
      setFileName(file.name);
      setCurrentUploadedFile(file);
      setIsParsing(true);
      setErrors([]);
      setChecksumSummary(null);

      try {
        const result = await parseTakeoffFile(file, explicitSheetName, explicitTableId);

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
        setErrors([t('uploadStep.parseError')]);
      } finally {
        setIsParsing(false);
      }
    },
    [onItemsParsed]
  );

  const handleSheetChange = (sheetName) => {
    if (currentUploadedFile) {
      handleFile(currentUploadedFile, sheetName, null);
    }
  };

  const handleTableChange = (tableId) => {
    if (currentUploadedFile) {
      handleFile(currentUploadedFile, mappingModalData?.activeSheetName || null, tableId);
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
        <h1 className="text-3xl font-bold text-slate-900">{t('uploadStep.title')}</h1>
        <p className="mt-2 text-slate-500">
          {t('uploadStep.subtitle')}
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
            t('uploadStep.parsingMessage')
          ) : (
            <>
              {t('uploadStep.dragDropMessage')} <span className="text-indigo-600 underline">{t('uploadStep.browseLink')}</span>
            </>
          )}
        </p>
        <p className="mt-1 text-sm text-slate-400">{fileName || t('uploadStep.fileTypeHint')}</p>
      </div>

      {checksumSummary && (
        <div className={`mt-6 rounded-xl border p-4 text-xs ${
          checksumSummary.checksumMatches
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            <span>{checksumSummary.checksumMatches ? t('uploadStep.checksumVerified') : t('uploadStep.checksumNote')}</span>
          </div>
          <p>
            {t('uploadStep.checksumPrefix')} <strong>{checksumSummary.detectedSubtotals.toLocaleString()}</strong> |
            {t('uploadStep.checksumParsedPrefix')} <strong>{checksumSummary.parsedSum.toLocaleString()}</strong>
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700 mb-2">
            {t('uploadStep.issuesFound', { count: errors.length, plural: errors.length > 1 ? 's' : '' })}
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-500">
        <span>{t('uploadStep.needStartingPoint')}</span>
        <button
          type="button"
          onClick={() => downloadSampleCsv()}
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          {t('uploadStep.csvTemplate')}
        </button>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          onClick={() => downloadSampleExcel()}
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          {t('uploadStep.excelTemplate')}
        </button>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_edge_cases_takeoff.csv`}
          download="sample_edge_cases_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline font-semibold"
        >
          {t('uploadStep.edgeCasesSample', 'Edge Cases Mega Sample')}
        </a>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_bluebeam_takeoff.csv`}
          download="sample_bluebeam_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          {t('uploadStep.bluebeamSample')}
        </a>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_planswift_takeoff.csv`}
          download="sample_planswift_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          {t('uploadStep.planswiftSample')}
        </a>
        <span className="text-slate-300">|</span>
        <a
          href={`${import.meta.env.BASE_URL}sample_trimble_agtek_takeoff.csv`}
          download="sample_trimble_agtek_takeoff.csv"
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          {t('uploadStep.trimbleSample')}
        </a>
      </div>

      <div className="mt-10 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">{t('uploadStep.ingestionTitle')}</p>
        <p className="text-xs text-slate-500 mb-2">
          {t('uploadStep.ingestionDescription')}
        </p>

        <div className="space-y-3 my-3">
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">
              {t('uploadStep.standardFieldsTitle', 'Standard Fields:')}
            </div>
            <code className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 block overflow-x-auto text-slate-800 font-mono">
              {t('uploadStep.standardFieldsList', 'system, item_description, size_spec, quantity, unit, avg_depth_ft')}
            </code>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">
              {t('uploadStep.optionalFieldsTitle', 'Optional Fields:')}
            </div>
            <code className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 block overflow-x-auto text-slate-800 font-mono">
              {t('uploadStep.optionalFieldsList', 'material_cost_per_unit, labor_hours_per_unit, labor_unit_cost')}
            </code>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              {t('uploadStep.fieldExamplesTitle', 'Supported Column Names & Value Examples:')}
            </div>
            <div className="bg-white border border-slate-200 rounded p-3 space-y-2.5 text-xs">
              <div className="space-y-2">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">system</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleSystemHeaders', 'System, Trade, Phase, Division, Div, Category')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleSystem', 'Plumbing, 02-31-00, Earthwork, Div 22, Site Utilities')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">item_description</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleItemDescriptionHeaders', 'Description, Item Description, Scope, Name, Line Item, Item')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleItemDescription', '4" PVC Sanitary Sewer Pipe, Trench Excavation, Water Main')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">size_spec</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleSizeSpecHeaders', 'Size, Spec, Size/Spec, Pipe Size, Dimension, Material')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleSizeSpec', '4" SCH-40, 6" SDR-35, 1/2" Type L, 8" C900')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">quantity</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleQuantityHeaders', 'Qty, Quantity, Takeoff Qty, Amount, Est Qty, Count')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleQuantity', '150, 2,450.50, 12, 500')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">unit</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleUnitHeaders', 'Unit, UOM, Units, Unit of Measure, Measure')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleUnit', 'LF, FT, EA, CY, SY, SQ FT, TONS, M, LBS')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">avg_depth_ft</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleAvgDepthFtHeaders', 'Depth, Avg Depth, Depth (ft), Average Depth, Trench Depth')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleAvgDepthFt', '4.5, 6.0, 8, 3.5\'')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">material_cost_per_unit</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleMaterialCostHeaders', 'Material $/Unit, Material Unit Cost, Mat Rate, Material Price')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleMaterialCostPerUnit', '$18.50, 42.00, $1,250.00')}
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">labor_hours_per_unit</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleLaborHoursHeaders', 'Labor Hrs/Unit, Labor Hours, Crew Hrs/Unit, Manhours/Unit')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleLaborHoursPerUnit', '0.25, 1.5, 0.08 hrs/unit')}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-indigo-700">labor_unit_cost</span>
                    <span className="text-[11px] text-slate-500 font-medium">({t('uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700">{t('uploadStep.exampleLaborUnitCostHeaders', 'Labor $/Unit, Labor Unit Rate, Labor Rate/Unit, Labor Cost/Unit')}</span>)</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400">{t('uploadStep.valuesLabel', 'Sample values')}:</span> {t('uploadStep.exampleLaborUnitCost', '$15.00/LF, $65.00/EA, 25.00')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3">
          {t('uploadStep.needMoreDetail')}{' '}
          <Link
            to="/guide"
            className="font-medium text-indigo-600 hover:text-indigo-800 underline"
          >
            {t('uploadStep.readFullGuide')}
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
          sampleMatrix={mappingModalData.rawMatrix || mappingModalData.sampleMatrix || []}
          initialHeaderRowIndex={mappingModalData.headerRowIndex ?? 0}
          sheetNames={mappingModalData.sheetNames}
          activeSheetName={mappingModalData.activeSheetName}
          subTables={mappingModalData.subTables || []}
          activeTableId={mappingModalData.activeTableId}
          onSheetChange={handleSheetChange}
          onTableChange={handleTableChange}
          onConfirm={handleMappingConfirm}
          onCancel={() => setMappingModalData(null)}
        />
      )}
    </div>
  );
}
