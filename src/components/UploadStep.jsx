import { useCallback, useRef, useState } from 'react';
import { downloadSampleCsv, parseTakeoffCsv } from '../lib/csv';

export default function UploadStep({ onItemsParsed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setFileName(file.name);
      const { items, errors: parseErrors } = await parseTakeoffCsv(file);
      setErrors(parseErrors);
      if (items.length > 0) {
        onItemsParsed(items);
      }
    },
    [onItemsParsed]
  );

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
          Upload a CSV export of your construction takeoff to begin building a pricing estimate.
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
          accept=".csv,text/csv"
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
          Drag &amp; drop your CSV file here, or <span className="text-indigo-600 underline">browse</span>
        </p>
        <p className="mt-1 text-sm text-slate-400">{fileName || 'Accepts .csv files only'}</p>
      </div>

      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-700 mb-2">
            {errors.length} issue{errors.length > 1 ? 's' : ''} found in your CSV:
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
        <span>Need a starting point?</span>
        <button
          type="button"
          onClick={() => downloadSampleCsv()}
          className="font-medium text-indigo-600 hover:text-indigo-800 underline"
        >
          Download Sample CSV Template
        </button>
      </div>

      <div className="mt-10 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Expected columns:</p>
        <code className="text-xs bg-white border border-slate-200 rounded px-2 py-1 block overflow-x-auto">
          system, item_description, size_spec, quantity, unit, avg_depth_ft
        </code>
      </div>
    </div>
  );
}
