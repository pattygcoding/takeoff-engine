import React, { useState } from 'react';
import { useTranslation } from '@/context/I18nContext';

/**
 * ExportFormatsModal
 * Provides an export format & layout picker similar to Microsoft Word template chooser.
 * Layout: 5 items on row 1, 2 items on row 2 (grid-cols-5).
 * First 3 items are standard/free (Standard Print, PDF Document, Word Document .docx).
 * The remaining 4 items are locked Pro/Enterprise templates.
 */
export default function ExportFormatsModal({
  isOpen,
  onClose,
  onSelectFormat,
  isPro,
  onUpgrade,
}) {
  const { t } = useTranslation();
  const [selectedFormatId, setSelectedFormatId] = useState('pdf');

  if (!isOpen) return null;

  const formats = [
    // --- ROW 1 (5 items) ---
    {
      id: 'print',
      title: t('exportFormatsModal.standardPrintTitle'),
      formatType: 'Browser / Printer',
      extension: 'Print',
      tag: 'Standard',
      isLocked: false,
      description: t('exportFormatsModal.standardPrintDesc'),
      previewType: 'print',
      accentColor: 'indigo',
    },
    {
      id: 'pdf',
      title: t('exportFormatsModal.pdfDocTitle'),
      formatType: 'Vector PDF',
      extension: '.pdf',
      tag: 'Standard',
      isLocked: false,
      description: t('exportFormatsModal.pdfDocDesc'),
      previewType: 'pdf',
      accentColor: 'rose',
    },
    {
      id: 'word',
      title: t('exportFormatsModal.wordDocTitle'),
      formatType: 'Editable DOCX',
      extension: '.docx',
      tag: 'Standard',
      isLocked: false,
      description: t('exportFormatsModal.wordDocDesc'),
      previewType: 'word',
      accentColor: 'blue',
    },
    {
      id: 'executive_proposal',
      title: t('exportFormatsModal.executiveProposalTitle'),
      formatType: 'Client Presentation',
      extension: '.pdf',
      tag: 'Pro',
      isLocked: !isPro,
      description: t('exportFormatsModal.executiveProposalDesc'),
      previewType: 'executive',
      accentColor: 'purple',
    },
    {
      id: 'itemized_ledger',
      title: t('exportFormatsModal.costBreakdownLedgerTitle'),
      formatType: 'Audit Report',
      extension: '.pdf / .docx',
      tag: 'Pro',
      isLocked: !isPro,
      description: t('exportFormatsModal.costBreakdownLedgerDesc'),
      previewType: 'ledger',
      accentColor: 'emerald',
    },

    // --- ROW 2 (2 items) ---
    {
      id: 'bid_schedule',
      title: t('exportFormatsModal.aiaBidScheduleTitle'),
      formatType: 'Contractor Submittal',
      extension: '.pdf / .docx',
      tag: 'Pro',
      isLocked: !isPro,
      description: t('exportFormatsModal.aiaBidScheduleDesc'),
      previewType: 'schedule',
      accentColor: 'amber',
    },
    {
      id: 'executive_summary',
      title: t('exportFormatsModal.executiveKpiSummaryTitle'),
      formatType: 'Management Deck',
      extension: '.pdf',
      tag: 'Pro',
      isLocked: !isPro,
      description: t('exportFormatsModal.executiveKpiSummaryDesc'),
      previewType: 'summary',
      accentColor: 'cyan',
    },
  ];

  const handleCardClick = (format) => {
    setSelectedFormatId(format.id);
  };

  const handleConfirm = () => {
    const chosen = formats.find((f) => f.id === selectedFormatId);
    if (!chosen) return;

    if (chosen.isLocked) {
      onUpgrade?.();
      return;
    }

    onSelectFormat(chosen.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t('exportFormatsModal.title')}</h3>
              <p className="text-xs text-slate-500">{t('exportFormatsModal.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Rows of 5 */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Row 1: 5 Formats */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              {t('exportFormatsModal.standardAndExecutive')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {formats.slice(0, 5).map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  isSelected={selectedFormatId === format.id}
                  onClick={() => handleCardClick(format)}
                  onUpgrade={onUpgrade}
                />
              ))}
            </div>
          </div>

          {/* Row 2: 2 Formats */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              {t('exportFormatsModal.advancedContractorSubmittals')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {formats.slice(5).map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  isSelected={selectedFormatId === format.id}
                  onClick={() => handleCardClick(format)}
                  onUpgrade={onUpgrade}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{t('exportFormatsModal.allExportsIncludeNote')}</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              {t('exportFormatsModal.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {t('exportFormatsModal.continueWith', {
                  title: formats.find((f) => f.id === selectedFormatId)?.title || 'Selected',
                })}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Miniature Document Preview mimicking Microsoft Word template selector
 */
function FormatCard({ format, isSelected, onClick, onUpgrade }) {
  const { t } = useTranslation();
  const isLocked = format.isLocked;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition-all duration-200 cursor-pointer select-none bg-white ${
        isSelected
          ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md transform -translate-y-0.5'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Top Tag / Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            format.tag === 'Standard'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs'
          }`}
        >
          {format.tag}
        </span>
        <span className="text-[10px] font-medium text-slate-400">{format.extension}</span>
      </div>

      {/* Word-like Document Miniature Preview */}
      <div className="relative w-full aspect-[4/5] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2 flex flex-col justify-between mb-2.5 shadow-2xs group-hover:bg-slate-50/80 transition">
        <MiniDocumentPreview type={format.previewType} accent={format.accentColor} />

        {/* Locked Overlay if not Pro */}
        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-2 text-center text-white z-10 transition">
            <div className="w-8 h-8 rounded-full bg-amber-500/90 text-white flex items-center justify-center mb-1 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-amber-300">{t('exportFormatsModal.unlockWithPro')}</span>
            <span className="text-[9px] text-slate-200 opacity-90 line-clamp-1 mt-0.5">{t('exportFormatsModal.clickToUpgrade')}</span>
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{format.title}</h4>
          {isSelected && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-tight">{format.description}</p>
      </div>
    </div>
  );
}

/**
 * Miniature CSS representations simulating Word/PDF document sheets
 */
function MiniDocumentPreview({ type, accent = 'indigo' }) {
  if (type === 'print') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-200 p-1.5 flex flex-col gap-1 shadow-2xs">
        <div className="flex justify-between items-center pb-1 border-b border-slate-100">
          <div className="w-8 h-1.5 bg-slate-800 rounded-full"></div>
          <div className="w-4 h-1 bg-slate-300 rounded-full"></div>
        </div>
        <div className="space-y-0.5 my-auto">
          <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-4/5 h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-3/4 h-1 bg-slate-200 rounded-xs"></div>
        </div>
        <div className="grid grid-cols-3 gap-0.5 pt-1 border-t border-slate-100">
          <div className="h-2 bg-slate-100 rounded-xs"></div>
          <div className="h-2 bg-slate-100 rounded-xs"></div>
          <div className="h-2 bg-slate-200 rounded-xs"></div>
        </div>
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-xs bg-rose-500"></div>
          <div className="w-10 h-1.5 bg-slate-700 rounded-full"></div>
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-rose-100 rounded-xs"></div>
          <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-5/6 h-1 bg-slate-200 rounded-xs"></div>
        </div>
        <div className="h-3 bg-rose-50 border border-rose-200 rounded-xs flex items-center justify-end px-1">
          <div className="w-5 h-1 bg-rose-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (type === 'word') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-xs bg-blue-600"></div>
          <div className="w-10 h-1.5 bg-blue-900 rounded-full"></div>
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-3/4 h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-4/5 h-1 bg-slate-200 rounded-xs"></div>
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-slate-100">
          <div className="w-4 h-1 bg-slate-300 rounded-full"></div>
          <div className="w-6 h-1.5 bg-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (type === 'executive') {
    return (
      <div className="w-full h-full bg-white rounded border border-purple-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="w-full h-2.5 bg-purple-600 rounded-xs flex items-center px-1">
          <div className="w-4 h-1 bg-purple-200 rounded-full"></div>
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
          <div className="w-5/6 h-1 bg-slate-200 rounded-xs"></div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="h-3 bg-purple-50 rounded-xs border border-purple-100"></div>
          <div className="h-3 bg-purple-50 rounded-xs border border-purple-100"></div>
        </div>
      </div>
    );
  }

  if (type === 'ledger') {
    return (
      <div className="w-full h-full bg-white rounded border border-emerald-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between items-center">
          <div className="w-8 h-1.5 bg-emerald-700 rounded-full"></div>
          <div className="w-2 h-2 rounded-xs bg-emerald-500"></div>
        </div>
        <div className="space-y-0.5">
          <div className="h-1 bg-emerald-100 rounded-xs"></div>
          <div className="h-1 bg-slate-100 rounded-xs"></div>
          <div className="h-1 bg-emerald-50 rounded-xs"></div>
          <div className="h-1 bg-slate-100 rounded-xs"></div>
        </div>
        <div className="h-2 bg-emerald-600 rounded-xs w-full"></div>
      </div>
    );
  }

  if (type === 'schedule') {
    return (
      <div className="w-full h-full bg-white rounded border border-amber-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="w-10 h-1.5 bg-amber-700 rounded-full"></div>
        <div className="grid grid-cols-4 gap-0.5">
          <div className="h-1.5 bg-amber-100"></div>
          <div className="h-1.5 bg-amber-100"></div>
          <div className="h-1.5 bg-amber-100"></div>
          <div className="h-1.5 bg-amber-200"></div>
          <div className="h-1.5 bg-slate-100"></div>
          <div className="h-1.5 bg-slate-100"></div>
          <div className="h-1.5 bg-slate-100"></div>
          <div className="h-1.5 bg-slate-200"></div>
        </div>
        <div className="w-full h-1.5 bg-amber-500 rounded-xs"></div>
      </div>
    );
  }

  if (type === 'summary') {
    return (
      <div className="w-full h-full bg-white rounded border border-cyan-200 p-1.5 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between">
          <div className="w-6 h-1.5 bg-cyan-700 rounded-full"></div>
          <div className="w-3 h-1 bg-slate-300 rounded-full"></div>
        </div>
        <div className="flex items-end gap-1 h-5 px-1">
          <div className="w-1/3 h-2 bg-cyan-200 rounded-t-xs"></div>
          <div className="w-1/3 h-4 bg-cyan-400 rounded-t-xs"></div>
          <div className="w-1/3 h-5 bg-cyan-600 rounded-t-xs"></div>
        </div>
        <div className="w-full h-1 bg-slate-200 rounded-xs"></div>
      </div>
    );
  }

  return <div className="w-full h-full bg-slate-100 rounded"></div>;
}
