import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { computeEstimate, formatCurrency, formatNumber } from '../lib/calculations';
import { triggerDownload } from '../lib/csv';
import { authApi } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import UpgradeModal from './UpgradeModal';

/**
 * 17 Distinct Estimating, Engineering & Proposal Layout Formats
 * 
 * --- Standard / Free (3) ---
 * 1. Standard Estimate (Internal Cost & Production Ledger)
 * 2. Client Proposal (Polished Clean Lump Sum / Direct Cost)
 * 3. Executive Proposal (Branded Presentation with Terms)
 * 
 * --- Pro & Enterprise Formats (14 Total: 4 Previous + 10 New) ---
 * 4. Itemized Job-Cost Ledger (Granular Labor, Material & Trench Metrics)
 * 5. AIA Submittal Bid Schedule (Standard Unit Price Contractor Format)
 * 6. Executive KPI Margin Summary (High Level Management Metrics & Risk)
 * 7. Commercial Scope Matrix (System-by-System Spec & Quantity Matrix)
 * 8. Material Procurement Order (Supplier & Vendor Purchase Requisition) [NEW]
 * 9. Production Crew Schedule (Daily Gang Hours & Equipment Utilization) [NEW]
 * 10. Subcontractor Scope Submittal (Dedicated Subcontract Package & T&Cs) [NEW]
 * 11. Trench & Earthwork Engineering Log (Cubic Yards & Excavator Production) [NEW]
 * 12. AIA G702/G703 Application for Payment (Schedule of Values Billing) [NEW]
 * 13. Owner-Contractor Formal Agreement (Standard Construction Contract Form) [NEW]
 * 14. Phase Milestone Schedule (Phased System Draw Breakdown) [NEW]
 * 15. Risk & Contingency Matrix (High-Risk Items & Cost Exposure Analysis) [NEW]
 * 16. Field Daily Superintendent Report (Jobsite Quantity Tracking Sheet) [NEW]
 * 17. Closeout & Warranty Certificate (Project Handover & Completion Sign-Off) [NEW]
 */
export const EXPORT_FORMATS = [
  // --- ROW 1 (5 Formats) ---
  {
    id: 'standard_estimate',
    name: 'Internal Cost Estimate',
    category: 'Detailed Estimating',
    tag: 'Standard',
    isProOnly: false,
    badgeColor: 'bg-slate-100 text-slate-700',
    description: 'Full cost visibility with material, labor rate hours, overhead, contingency, and equipment.',
    previewKind: 'standard',
  },
  {
    id: 'client_proposal',
    name: 'Standard Client Proposal',
    category: 'Client Presentation',
    tag: 'Standard',
    isProOnly: false,
    badgeColor: 'bg-indigo-100 text-indigo-700',
    description: 'Clean proposal hiding internal markups, displaying line descriptions and bid totals.',
    previewKind: 'proposal',
  },
  {
    id: 'executive_presentation',
    name: 'Executive Proposal',
    category: 'High-Value Commercial',
    tag: 'Standard',
    isProOnly: false,
    badgeColor: 'bg-emerald-100 text-emerald-700',
    description: 'Polished client presentation with company header, acceptance blocks, and formal legal notes.',
    previewKind: 'executive',
  },
  {
    id: 'itemized_ledger',
    name: 'Granular Job-Cost Ledger',
    category: 'Field & Audit',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Exposes trench volume, linear footage, equipment rates, and production labor breakdowns.',
    previewKind: 'ledger',
  },
  {
    id: 'aia_bid_schedule',
    name: 'AIA Bid Schedule',
    category: 'Public & Municipal',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Standardized unit price bid schedule matching commercial AIA/DOT submittal standards.',
    previewKind: 'schedule',
  },

  // --- ROW 2 (5 Formats) ---
  {
    id: 'kpi_margin_summary',
    name: 'Executive KPI Summary',
    category: 'Executive & Finance',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Top-level financial overview featuring profit margins, system weight % charts, and cost pools.',
    previewKind: 'kpi',
  },
  {
    id: 'scope_matrix',
    name: 'Commercial Scope Matrix',
    category: 'Subcontractor Scopes',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Compact tabular matrix comparing system specs, take-off units, and inclusions.',
    previewKind: 'matrix',
  },
  {
    id: 'material_procurement',
    name: 'Material Purchase Order',
    category: 'Purchasing & Supply',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Vendor requisition order listing pipe specifications, fitting quantities, and material PO totals.',
    previewKind: 'po',
  },
  {
    id: 'crew_production_schedule',
    name: 'Crew & Equipment Schedule',
    category: 'Field Operations',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Daily gang-hours, excavator machine utilization, and estimated crew days per utility run.',
    previewKind: 'crew',
  },
  {
    id: 'subcontractor_scope',
    name: 'Subcontractor Scope Submittal',
    category: 'Sub Contracts',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Dedicated subcontract package with inclusions, exclusions, site safety rules, and signoff.',
    previewKind: 'subcontractor',
  },

  // --- ROW 3 (5 Formats) ---
  {
    id: 'trench_earthwork_log',
    name: 'Earthwork & Trench Log',
    category: 'Engineering & Excavation',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Calculated trench cubic yards, bedding volume, spoil haul-away, and backfill tonnage.',
    previewKind: 'trench',
  },
  {
    id: 'aia_g702_sov',
    name: 'AIA G702/G703 SOV Billing',
    category: 'Progress Billing',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Schedule of Values (SOV) structure formatted for AIA progressive monthly payment draws.',
    previewKind: 'sov',
  },
  {
    id: 'formal_contract_agreement',
    name: 'Owner-Contractor Agreement',
    category: 'Legal & Contract',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Formal contract agreement with legal indemnification, payment terms, and double notarization lines.',
    previewKind: 'contract',
  },
  {
    id: 'phase_milestone_draw',
    name: 'Phased Milestone Draw',
    category: 'Cash Flow Schedule',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Milestone-based payment schedule tied to utility installation benchmarks and system testing.',
    previewKind: 'milestone',
  },
  {
    id: 'risk_contingency_matrix',
    name: 'Risk & Contingency Matrix',
    category: 'Risk Management',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'System-by-system risk score matrix showing subsurface unknowns and contingency reserves.',
    previewKind: 'risk',
  },

  // --- ROW 4 (2 Formats) ---
  {
    id: 'field_daily_report',
    name: 'Field Superintendent Log',
    category: 'Daily Jobsite QA',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Field inspection sheet to track daily installed linear footage, weather, and inspector initials.',
    previewKind: 'daily',
  },
  {
    id: 'warranty_closeout_cert',
    name: 'Warranty & Closeout Certificate',
    category: 'Project Handover',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Formal 1-year workmanship warranty certificate and project substantial completion document.',
    previewKind: 'warranty',
  },
];

export default function ExportHubPage({ items, rates, currentProject }) {
  const { username, projectId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, refreshProfile } = useAuth();
  const { showAlert } = useModal();

  const [selectedFormatId, setSelectedFormatId] = useState('standard_estimate');
  const [exportingType, setExportingType] = useState(null); // 'pdf' | 'word' | null
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const printAreaRef = useRef(null);

  const isProOrExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['pro', 'enterprise'].includes(user?.subscription_tier));

  const branding = isProOrExempt
    ? {
        companyName: user?.company_name || '',
        companyLogoUrl: user?.company_logo_url || '',
        companyAddress: user?.company_address || '',
        companyPhone: user?.phone_number || '',
        licenseNumber: user?.license_number || '',
        brandColor: user?.brand_color || '#0284c7',
      }
    : null;

  const estimate = useMemo(() => computeEstimate(items, rates), [items, rates]);
  const { totals, bySystem } = estimate;

  const currentFormat = useMemo(
    () => EXPORT_FORMATS.find((f) => f.id === selectedFormatId) || EXPORT_FORMATS[0],
    [selectedFormatId]
  );

  const isCurrentFormatLocked = currentFormat.isProOnly && !isProOrExempt;

  // Metering & export wrapper
  const runExportAction = async (actionFn) => {
    if (isCurrentFormatLocked) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const recordResult = await authApi.recordExport();
      if (recordResult?.trial_uses_remaining !== undefined) {
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, trial_uses_remaining: recordResult.trial_uses_remaining } : prev));
        }
      }
      if (refreshProfile) await refreshProfile();
      await actionFn();
    } catch (err) {
      if (err.code === 'TRIAL_EXHAUSTED' || err.status === 403) {
        setShowUpgradeModal(true);
      } else {
        console.error('[Export Metering Error]', err);
        await actionFn();
      }
    }
  };

  // 1. Browser Print Handler
  const handlePrint = async () => {
    await runExportAction(() => {
      window.print();
    });
  };

  // 2. PDF Generator
  const handleExportPdf = async () => {
    await runExportAction(async () => {
      const node = document.getElementById('export-document-canvas');
      if (!node) return;
      setExportingType('pdf');
      try {
        const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
          import('jspdf'),
          import('html2canvas-pro'),
        ]);
        const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
        pdf.save(`${(currentProject?.name || 'takeoff_estimate').replace(/\s+/g, '_')}_${currentFormat.id}.pdf`);
      } catch (err) {
        console.error('PDF export failed:', err);
        await showAlert({
          title: 'Export Failed',
          message: 'PDF export failed. You can also choose "Print / Save as PDF" from your browser.',
          variant: 'error',
        });
      } finally {
        setExportingType(null);
      }
    });
  };

  // 3. Word DOCX Generator
  const handleExportWord = async () => {
    await runExportAction(async () => {
      setExportingType('word');
      try {
        const isProposalMode = [
          'client_proposal',
          'executive_presentation',
          'kpi_margin_summary',
          'formal_contract_agreement',
          'warranty_closeout_cert',
        ].includes(currentFormat.id);
        const { exportEstimateToWord } = await import('../lib/wordExport');
        await exportEstimateToWord(estimate, isProposalMode, branding || {});
      } catch (err) {
        console.error('Word export failed:', err);
        await showAlert({
          title: 'Export Failed',
          message: 'Word export failed. Please try again.',
          variant: 'error',
        });
      } finally {
        setExportingType(null);
      }
    });
  };

  // Back link target
  const backUrl = projectId
    ? `/${username}/takeoff/${projectId}/results`
    : `/${username}/results`;

  const scrollToPreview = () => {
    const previewEl = document.getElementById('export-preview-section');
    if (previewEl) {
      previewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToFormatSelection = () => {
    const selectorEl = document.getElementById('format-selection-grid');
    if (selectorEl) {
      selectorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Top Breadcrumb & Controls Header (Hidden in Print) */}
      <div className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={backUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition"
            >
              ← Back to Results
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Export &amp; Print Center</span>
                {currentProject?.name && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                    {currentProject.name}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Unified Actions: Print, PDF, Word */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              disabled={exportingType !== null}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingType !== null}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{exportingType === 'pdf' ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={exportingType !== null}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{exportingType === 'word' ? 'Generating Word...' : 'Export Word'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Template Chooser Grid (4 Rows of 5) */}
        <div id="format-selection-grid" className="no-print bg-white rounded-3xl p-5 border border-slate-200 shadow-xs scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Choose Document Format &amp; Layout Template
              </h2>
              <p className="text-xs text-slate-500">
                Select from 17 specialized construction layouts. All formats can be printed, exported as high-res PDF, or generated as editable Word DOCX.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>3 Standard Formats</span>
              <span className="text-slate-300">•</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>14 Pro Formats</span>
            </div>
          </div>

          {/* Row 1 (5 items) */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Row 1 • Standard Estimates &amp; Bid Schedules (5)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(0, 5).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  format={fmt}
                  isSelected={selectedFormatId === fmt.id}
                  isPro={isProOrExempt}
                  onScrollToPreview={scrollToPreview}
                  onClick={() => {
                    if (fmt.isProOnly && !isProOrExempt) {
                      setShowUpgradeModal(true);
                    } else {
                      setSelectedFormatId(fmt.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Row 2 (5 items) */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Row 2 • Procurement, Crews &amp; Subcontracts (5)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(5, 10).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  format={fmt}
                  isSelected={selectedFormatId === fmt.id}
                  isPro={isProOrExempt}
                  onScrollToPreview={scrollToPreview}
                  onClick={() => {
                    if (fmt.isProOnly && !isProOrExempt) {
                      setShowUpgradeModal(true);
                    } else {
                      setSelectedFormatId(fmt.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Row 3 (5 items) */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Row 3 • Earthwork, Billing &amp; Contract Forms (5)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(10, 15).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  format={fmt}
                  isSelected={selectedFormatId === fmt.id}
                  isPro={isProOrExempt}
                  onScrollToPreview={scrollToPreview}
                  onClick={() => {
                    if (fmt.isProOnly && !isProOrExempt) {
                      setShowUpgradeModal(true);
                    } else {
                      setSelectedFormatId(fmt.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Row 4 (2 items) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Row 4 • Jobsite QA &amp; Project Handover (2)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(15).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  format={fmt}
                  isSelected={selectedFormatId === fmt.id}
                  isPro={isProOrExempt}
                  onScrollToPreview={scrollToPreview}
                  onClick={() => {
                    if (fmt.isProOnly && !isProOrExempt) {
                      setShowUpgradeModal(true);
                    } else {
                      setSelectedFormatId(fmt.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Selected Format Banner / Pro Notice */}
        {isCurrentFormatLocked && (
          <div className="no-print rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                🔒
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {currentFormat.name} is a Pro Feature
                </h4>
                <p className="text-xs text-amber-700">
                  Upgrade to Takeoff Engine Pro to unlock this layout format across Print, PDF, and Word exports.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              Upgrade to Unlock
            </button>
          </div>
        )}

        {/* Live Document Canvas Preview Section */}
        <div id="export-preview-section" className="scroll-mt-20 space-y-3">
          {/* Preview Section Header with Title & Back Button */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs text-sm">
                📄
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Document Preview: <span className="text-indigo-600">{currentFormat.name}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Live rendering of the document as it will appear when printed, converted to PDF, or exported to Word.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToFormatSelection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>Back to Document Selection</span>
            </button>
          </div>

          <div className="bg-slate-300/40 p-2 sm:p-6 rounded-3xl border border-slate-200/80 flex justify-center">
            <div
              id="export-document-canvas"
              ref={printAreaRef}
              className="w-full max-w-[850px] bg-white text-slate-800 shadow-xl rounded-2xl border border-slate-200 p-6 sm:p-10 transition print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full"
            >
            {/* 1-7 Previous Formats */}
            {selectedFormatId === 'standard_estimate' && (
              <StandardEstimateDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'client_proposal' && (
              <ClientProposalDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'executive_presentation' && (
              <ExecutiveProposalDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'itemized_ledger' && (
              <ItemizedLedgerDocument estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
            )}
            {selectedFormatId === 'aia_bid_schedule' && (
              <AiaBidScheduleDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'kpi_margin_summary' && (
              <KpiSummaryDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'scope_matrix' && (
              <ScopeMatrixDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}

            {/* 8-17 10 New Pro Formats */}
            {selectedFormatId === 'material_procurement' && (
              <MaterialProcurementDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'crew_production_schedule' && (
              <CrewProductionScheduleDocument estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
            )}
            {selectedFormatId === 'subcontractor_scope' && (
              <SubcontractorScopeDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'trench_earthwork_log' && (
              <TrenchEarthworkLogDocument estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
            )}
            {selectedFormatId === 'aia_g702_sov' && (
              <AiaSovBillingDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'formal_contract_agreement' && (
              <FormalContractAgreementDocument estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
            )}
            {selectedFormatId === 'phase_milestone_draw' && (
              <PhaseMilestoneDrawDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'risk_contingency_matrix' && (
              <RiskContingencyMatrixDocument estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
            )}
            {selectedFormatId === 'field_daily_report' && (
              <FieldDailyReportDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            {selectedFormatId === 'warranty_closeout_cert' && (
              <WarrantyCloseoutCertDocument estimate={estimate} branding={branding} currentProject={currentProject} />
            )}
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

/**
 * Format Card Component with Word-style document thumbnail
 */
function FormatCard({ format, isSelected, isPro, onScrollToPreview, onClick }) {
  const isLocked = format.isProOnly && !isPro;

  const handlePreviewClick = (e) => {
    e.stopPropagation();
    onClick();
    if (onScrollToPreview) {
      setTimeout(() => {
        onScrollToPreview();
      }, 50);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition-all duration-200 cursor-pointer select-none bg-white ${
        isSelected
          ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md transform -translate-y-0.5'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${format.badgeColor}`}>
          {format.tag}
        </span>
        <span className="text-[9px] font-semibold text-slate-400 line-clamp-1">{format.category}</span>
      </div>

      {/* Mini Word-like Document Thumbnail */}
      <div className="relative w-full aspect-[4/5] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2 flex flex-col justify-between mb-2.5 shadow-2xs group-hover:bg-slate-100/70 transition">
        <MiniFormatThumbnail kind={format.previewKind} />

        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-2 text-center text-white z-10 transition">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center mb-1 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-amber-300">Unlock with Pro</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="text-xs font-bold text-slate-900 line-clamp-1 flex-1">{format.name}</h4>
          
          <div className="flex items-center gap-1 shrink-0">
            {isSelected && (
              <button
                type="button"
                onClick={handlePreviewClick}
                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 rounded-md text-[9px] font-extrabold tracking-tight transition cursor-pointer shadow-2xs flex items-center gap-0.5"
                title="Jump down to live document preview"
              >
                <span>SEE PREVIEW</span>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}

            {isSelected && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-tight">{format.description}</p>
      </div>
    </div>
  );
}

/**
 * Thumbnail SVG Visuals
 */
function MiniFormatThumbnail({ kind }) {
  if (kind === 'standard') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between pb-1 border-b border-slate-100">
          <div className="w-6 h-1 bg-slate-800 rounded-full" />
          <div className="w-3 h-1 bg-slate-300 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-slate-200 rounded-xs" />
          <div className="w-4/5 h-1 bg-slate-200 rounded-xs" />
          <div className="w-3/4 h-1 bg-slate-200 rounded-xs" />
        </div>
        <div className="grid grid-cols-3 gap-0.5 pt-1 border-t border-slate-100">
          <div className="h-1.5 bg-slate-100 rounded-xs" />
          <div className="h-1.5 bg-slate-100 rounded-xs" />
          <div className="h-1.5 bg-indigo-500 rounded-xs" />
        </div>
      </div>
    );
  }

  if (kind === 'proposal') {
    return (
      <div className="w-full h-full bg-white rounded border border-indigo-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-indigo-600 rounded-xs" />
          <div className="w-8 h-1 bg-slate-700 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-indigo-50 rounded-xs" />
          <div className="w-5/6 h-1 bg-slate-200 rounded-xs" />
        </div>
        <div className="h-2.5 bg-indigo-600 rounded-xs flex items-center justify-end px-1">
          <div className="w-4 h-0.5 bg-white rounded-full" />
        </div>
      </div>
    );
  }

  if (kind === 'executive') {
    return (
      <div className="w-full h-full bg-white rounded border border-emerald-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-full h-2 bg-emerald-600 rounded-xs" />
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-slate-200 rounded-xs" />
          <div className="w-4/5 h-1 bg-slate-200 rounded-xs" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="h-2 bg-emerald-50 rounded-xs border border-emerald-200" />
          <div className="h-2 bg-emerald-50 rounded-xs border border-emerald-200" />
        </div>
      </div>
    );
  }

  if (kind === 'ledger') {
    return (
      <div className="w-full h-full bg-white rounded border border-amber-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between">
          <div className="w-7 h-1 bg-amber-800 rounded-full" />
          <div className="w-2 h-1 bg-amber-500 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-amber-50 rounded-xs" />
          <div className="w-full h-1 bg-slate-100 rounded-xs" />
          <div className="w-full h-1 bg-amber-50 rounded-xs" />
        </div>
        <div className="w-full h-1.5 bg-amber-600 rounded-xs" />
      </div>
    );
  }

  if (kind === 'schedule') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-300 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-9 h-1 bg-slate-900 rounded-full" />
        <div className="grid grid-cols-3 gap-0.5">
          <div className="h-1 bg-slate-200" />
          <div className="h-1 bg-slate-200" />
          <div className="h-1 bg-slate-200" />
          <div className="h-1 bg-slate-100" />
          <div className="h-1 bg-slate-100" />
          <div className="h-1 bg-slate-100" />
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-xs" />
      </div>
    );
  }

  if (kind === 'kpi') {
    return (
      <div className="w-full h-full bg-white rounded border border-cyan-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-6 h-1 bg-cyan-800 rounded-full" />
        <div className="flex items-end gap-1 h-3.5 px-0.5">
          <div className="w-1/3 h-1.5 bg-cyan-200 rounded-t-xs" />
          <div className="w-1/3 h-2.5 bg-cyan-400 rounded-t-xs" />
          <div className="w-1/3 h-3.5 bg-cyan-600 rounded-t-xs" />
        </div>
        <div className="w-full h-1 bg-slate-200 rounded-xs" />
      </div>
    );
  }

  if (kind === 'matrix') {
    return (
      <div className="w-full h-full bg-white rounded border border-purple-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex gap-1">
          <div className="w-3 h-1 bg-purple-700 rounded-full" />
          <div className="w-3 h-1 bg-purple-400 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="h-3 bg-purple-50 rounded-xs" />
          <div className="h-3 bg-purple-100 rounded-xs" />
        </div>
        <div className="w-full h-1 bg-purple-800 rounded-xs" />
      </div>
    );
  }

  if (kind === 'po') {
    return (
      <div className="w-full h-full bg-white rounded border border-blue-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between items-center pb-0.5 border-b border-blue-100">
          <div className="w-5 h-1 bg-blue-700 rounded-full" />
          <div className="w-2 h-1 bg-blue-300 rounded-full" />
        </div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-blue-50 rounded-xs" />
          <div className="w-4/5 h-1 bg-blue-50 rounded-xs" />
          <div className="w-3/4 h-1 bg-slate-200 rounded-xs" />
        </div>
        <div className="flex justify-between items-center pt-0.5 border-t border-slate-100">
          <div className="w-3 h-0.5 bg-slate-300 rounded-full" />
          <div className="w-4 h-1 bg-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (kind === 'crew') {
    return (
      <div className="w-full h-full bg-white rounded border border-orange-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-7 h-1 bg-orange-700 rounded-full" />
        <div className="grid grid-cols-2 gap-1">
          <div className="h-3 bg-orange-50 rounded-xs border border-orange-100" />
          <div className="h-3 bg-orange-50 rounded-xs border border-orange-100" />
        </div>
        <div className="w-full h-1 bg-orange-600 rounded-xs" />
      </div>
    );
  }

  if (kind === 'subcontractor') {
    return (
      <div className="w-full h-full bg-white rounded border border-teal-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-full h-1.5 bg-teal-700 rounded-xs" />
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-slate-200 rounded-xs" />
          <div className="w-5/6 h-1 bg-teal-50 rounded-xs" />
          <div className="w-4/5 h-1 bg-slate-200 rounded-xs" />
        </div>
        <div className="w-3 h-1 bg-teal-600 rounded-full ml-auto" />
      </div>
    );
  }

  if (kind === 'trench') {
    return (
      <div className="w-full h-full bg-amber-50 rounded border border-amber-300 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-6 h-1 bg-amber-900 rounded-full" />
        <div className="flex items-center justify-center my-auto">
          <div className="w-8 h-3 bg-amber-200 rounded border border-dashed border-amber-400 flex items-center justify-center text-[7px] font-bold text-amber-800">
            CY³
          </div>
        </div>
        <div className="w-full h-1 bg-amber-700 rounded-xs" />
      </div>
    );
  }

  if (kind === 'sov') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-300 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-8 h-1 bg-slate-800 rounded-full" />
        <div className="grid grid-cols-4 gap-0.5">
          <div className="h-1 bg-slate-200" /><div className="h-1 bg-slate-200" /><div className="h-1 bg-slate-200" /><div className="h-1 bg-slate-200" />
          <div className="h-1 bg-slate-100" /><div className="h-1 bg-slate-100" /><div className="h-1 bg-slate-100" /><div className="h-1 bg-slate-100" />
        </div>
        <div className="w-full h-1.5 bg-emerald-700 rounded-xs" />
      </div>
    );
  }

  if (kind === 'contract') {
    return (
      <div className="w-full h-full bg-white rounded border border-slate-400 p-1 flex flex-col justify-between shadow-2xs">
        <div className="text-center font-bold text-[6px] text-slate-800 border-b border-slate-200 pb-0.5">AGREEMENT</div>
        <div className="space-y-0.5">
          <div className="w-full h-0.5 bg-slate-200" />
          <div className="w-full h-0.5 bg-slate-200" />
          <div className="w-3/4 h-0.5 bg-slate-200" />
        </div>
        <div className="flex justify-between pt-0.5 border-t border-slate-200">
          <div className="w-3 h-0.5 bg-slate-400" />
          <div className="w-3 h-0.5 bg-slate-400" />
        </div>
      </div>
    );
  }

  if (kind === 'milestone') {
    return (
      <div className="w-full h-full bg-white rounded border border-violet-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-6 h-1 bg-violet-800 rounded-full" />
        <div className="space-y-1">
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-violet-600" /><div className="w-full h-1 bg-violet-100" /></div>
          <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-violet-400" /><div className="w-full h-1 bg-violet-100" /></div>
        </div>
        <div className="w-full h-1 bg-violet-700 rounded-xs" />
      </div>
    );
  }

  if (kind === 'risk') {
    return (
      <div className="w-full h-full bg-white rounded border border-rose-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="w-6 h-1 bg-rose-800 rounded-full" />
        <div className="grid grid-cols-3 gap-0.5 my-auto">
          <div className="h-2 bg-emerald-100 rounded-xs" />
          <div className="h-2 bg-amber-100 rounded-xs" />
          <div className="h-2 bg-rose-200 rounded-xs" />
        </div>
        <div className="w-full h-1 bg-rose-600 rounded-xs" />
      </div>
    );
  }

  if (kind === 'daily') {
    return (
      <div className="w-full h-full bg-white rounded border border-sky-200 p-1 flex flex-col justify-between shadow-2xs">
        <div className="flex justify-between"><div className="w-4 h-1 bg-sky-800" /><div className="w-2 h-1 bg-sky-300" /></div>
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-sky-50" /><div className="w-full h-1 bg-slate-100" /><div className="w-4/5 h-1 bg-sky-50" />
        </div>
        <div className="w-4 h-1 bg-sky-700 rounded-full ml-auto" />
      </div>
    );
  }

  if (kind === 'warranty') {
    return (
      <div className="w-full h-full bg-amber-50/40 rounded border border-amber-300 p-1 flex flex-col justify-between shadow-2xs">
        <div className="text-center font-bold text-[6px] text-amber-900 border-b border-amber-200 pb-0.5">CERTIFICATE</div>
        <div className="w-4 h-4 rounded-full border border-amber-500 bg-amber-100 mx-auto flex items-center justify-center text-[7px] text-amber-700">★</div>
        <div className="w-full h-1 bg-amber-600 rounded-xs" />
      </div>
    );
  }

  return <div className="w-full h-full bg-slate-100 rounded" />;
}

/* =========================================================================
   17 DETAILED DOCUMENT LAYOUT RENDERERS (For Screen, Print, PDF & Word Sync)
   ========================================================================= */

/** 1. Standard Internal Estimate Layout */
function StandardEstimateDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Internal Cost Estimate" project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Direct</span>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totals.totalDirectCost)}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Labor Hours</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours)} hrs</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Markup &amp; Cont.</span>
          <p className="text-base font-bold text-slate-900">
            {formatCurrency(totals.overheadCost + totals.profitAmount + totals.contingencyCost)}
          </p>
        </div>
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-indigo-500">Total Bid Amount</span>
          <p className="text-base font-bold text-indigo-700">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{sys.system}</h3>
              <span className="text-xs font-bold text-slate-900">{formatCurrency(sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Spec</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right">Material</th>
                  <th className="p-2.5 text-right">Labor Hrs</th>
                  <th className="p-2.5 text-right">Labor $</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.materialCost)}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.laborHours)}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.laborCost)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 2. Client Proposal Layout */
function ClientProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Bid Proposal &amp; Scope of Work" project={currentProject} />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        We are pleased to submit our formal proposal for utility and civil construction scope outlined below. All pricing reflects complete materials, certified labor, equipment installation, site mobilization, and quality testing per project specifications.
      </div>

      <div className="space-y-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">{sys.system} Scope</h3>
              <span className="text-xs font-bold font-mono">{formatCurrency(sys.factoredBid ?? sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Scope Item Description</th>
                  <th className="p-2.5">Size / Material Spec</th>
                  <th className="p-2.5 text-right">Plan Qty</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right">Extended Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.factoredPrice ?? it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <div className="w-full sm:w-80 bg-slate-900 text-white rounded-2xl p-4">
          <div className="flex justify-between text-xs text-slate-300 pb-1.5 border-b border-slate-800">
            <span>Total Base Bid</span>
            <span>{formatCurrency(totals.finalBidAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-2">
            <span>Total Lump Sum</span>
            <span className="text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
          </div>
        </div>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 3. Executive Proposal Layout */
function ExecutiveProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b-4 border-emerald-600 pb-4">
        <DocumentBrandingHeader branding={branding} title="Executive Bid Submittal" project={currentProject} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl md:col-span-2">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">Contractor Scope Guarantee</h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            All work executed under OSHA safety protocols, city standard specifications, and manufacturer guidelines. Bid includes field survey verification, traffic control coordination, and final inspection sign-off.
          </p>
        </div>
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Contract Value</span>
          <span className="text-xl font-bold text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-emerald-800 text-white">
            <tr>
              <th className="p-3">System / Phase</th>
              <th className="p-3">Primary Inclusions</th>
              <th className="p-3 text-right">Items Count</th>
              <th className="p-3 text-right">Lump Sum Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((sys) => (
              <tr key={sys.system} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">{sys.system}</td>
                <td className="p-3 text-slate-600">
                  {sys.items.map((i) => i.description).slice(0, 3).join(', ')}
                  {sys.items.length > 3 ? '...' : ''}
                </td>
                <td className="p-3 text-right font-mono">{sys.items.length}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(sys.factoredBid ?? sys.directCost)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-3 text-right text-slate-700">Total Lump Sum Bid:</td>
              <td className="p-3 text-right text-emerald-700 font-mono text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 4. Itemized Ledger Layout */
function ItemizedLedgerDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Granular Job-Cost Ledger" project={currentProject} />

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Spec</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Mat $</th>
              <th className="p-2 text-right">Hrs</th>
              <th className="p-2 text-right">Labor $</th>
              <th className="p-2 text-right">Equip $</th>
              <th className="p-2 text-right">Total $</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-2 font-sans font-medium text-slate-900">{it.description}</td>
                <td className="p-2 font-sans text-slate-500">{it.sizeSpec}</td>
                <td className="p-2 text-right">{formatNumber(it.quantity, 0)}</td>
                <td className="p-2 font-sans text-slate-500">{it.unit}</td>
                <td className="p-2 text-right">{formatCurrency(it.materialCost)}</td>
                <td className="p-2 text-right">{formatNumber(it.laborHours)}</td>
                <td className="p-2 text-right">{formatCurrency(it.laborCost)}</td>
                <td className="p-2 text-right">{formatCurrency((rates?.excavatorHourlyRate || 0) * (it.laborHours * 0.4))}</td>
                <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Overhead ({rates?.overheadPercent || 10}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.overheadCost)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Profit Margin ({rates?.profitMarginPercent || 15}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.profitAmount)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Contingency ({rates?.contingencyPercent || 5}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.contingencyCost)}</p>
        </div>
        <div>
          <span className="text-indigo-600 font-bold uppercase text-[10px]">Final Bid Amount</span>
          <p className="font-bold text-indigo-700 text-sm">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 5. AIA Bid Schedule Layout */
function AiaBidScheduleDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="AIA Unit Price Bid Schedule" project={currentProject} />

      <div className="border-2 border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white font-mono uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Item #</th>
              <th className="p-2.5">Pay Item &amp; Specification Description</th>
              <th className="p-2.5 text-right">Est. Qty</th>
              <th className="p-2.5">Unit</th>
              <th className="p-2.5 text-right">Unit Price</th>
              <th className="p-2.5 text-right">Total Item Bid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const unitPrice = it.quantity > 0 ? (it.factoredPrice ?? it.directCost) / it.quantity : 0;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-600">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="p-2.5 font-sans font-medium text-slate-900">
                    {it.description} <span className="text-slate-500 font-normal">({it.sizeSpec})</span>
                  </td>
                  <td className="p-2.5 text-right">{formatNumber(it.quantity, 0)}</td>
                  <td className="p-2.5 font-sans text-slate-600">{it.unit}</td>
                  <td className="p-2.5 text-right">{formatCurrency(unitPrice)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.factoredPrice ?? it.directCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
            <tr>
              <td colSpan={5} className="p-3 text-right uppercase tracking-wider font-mono">
                Total Base Contract Bid:
              </td>
              <td className="p-3 text-right font-mono text-sm text-slate-900">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 6. Executive KPI Summary Layout */
function KpiSummaryDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Executive KPI &amp; Margin Summary" project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-indigo-500">Gross Contract</span>
          <p className="text-lg font-bold text-indigo-900">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Net Profit Margin</span>
          <p className="text-lg font-bold text-emerald-800">{formatCurrency(totals.profitAmount)}</p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Labor Hours</span>
          <p className="text-lg font-bold text-slate-800">{formatNumber(totals.totalLaborHours)} hrs</p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-amber-600">Contingency Buffer</span>
          <p className="text-lg font-bold text-amber-800">{formatCurrency(totals.contingencyCost)}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">System Cost Weight Breakdown</h4>
        <div className="space-y-2.5">
          {bySystem.map((sys) => {
            const pct = totals.totalDirectCost > 0 ? (sys.directCost / totals.totalDirectCost) * 100 : 0;
            return (
              <div key={sys.system} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{sys.system}</span>
                  <span className="font-mono text-slate-500">
                    {formatCurrency(sys.directCost)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 7. Commercial Scope Matrix Layout */
function ScopeMatrixDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Commercial Scope &amp; Spec Matrix" project={currentProject} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{sys.system}</h4>
              <span className="text-xs font-bold text-indigo-600 font-mono">{formatCurrency(sys.factoredBid ?? sys.directCost)}</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {sys.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>• {it.description} ({it.sizeSpec})</span>
                  <span className="font-mono text-slate-900">{formatNumber(it.quantity, 0)} {it.unit}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider">Total Combined Matrix Bid</span>
        <span className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/* =========================================================================
   10 NEW PRO FORMAT RENDERERS (8 through 17)
   ========================================================================= */

/** 8. Material Procurement Order Layout */
function MaterialProcurementDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Material Purchase &amp; Supply Order" project={currentProject} />

      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex justify-between items-center">
        <span><strong>Vendor Note:</strong> Please verify spec tolerances and deliver in order of phase sequencing.</span>
        <span className="font-mono font-bold bg-blue-100 px-2 py-0.5 rounded">PO-REQ-{Date.now().toString().slice(-6)}</span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-2.5">Item Description</th>
              <th className="p-2.5">Material Spec</th>
              <th className="p-2.5 text-right">Order Qty</th>
              <th className="p-2.5">Unit</th>
              <th className="p-2.5 text-right">Est. Unit Mat</th>
              <th className="p-2.5 text-right">Total Material</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const unitMat = it.quantity > 0 ? it.materialCost / it.quantity : 0;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-900">{it.description}</td>
                  <td className="p-2.5 font-sans text-slate-500">{it.sizeSpec}</td>
                  <td className="p-2.5 text-right font-bold">{formatNumber(it.quantity, 0)}</td>
                  <td className="p-2.5 font-sans text-slate-600">{it.unit}</td>
                  <td className="p-2.5 text-right">{formatCurrency(unitMat)}</td>
                  <td className="p-2.5 text-right font-bold text-blue-900">{formatCurrency(it.materialCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t border-slate-300 font-bold">
            <tr>
              <td colSpan={5} className="p-2.5 text-right text-slate-700">Total Material Purchase Commitment:</td>
              <td className="p-2.5 text-right font-mono text-blue-800">{formatCurrency(totals.totalMaterialCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 9. Crew & Equipment Utilization Schedule */
function CrewProductionScheduleDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Crew &amp; Equipment Production Schedule" project={currentProject} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-orange-600">Total Field Hours</span>
          <p className="text-base font-bold text-orange-950">{formatNumber(totals.totalLaborHours)} Man-Hours</p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">Est. 4-Man Crew Days</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours / 32, 1)} Days</p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">Heavy Machine Hours</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours * 0.5, 1)} Mach-Hrs</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2.5">Phase / System</th>
              <th className="p-2.5 text-right">Production Hrs</th>
              <th className="p-2.5 text-right">Crew Days (4-Man)</th>
              <th className="p-2.5 text-right">Excavator Util.</th>
              <th className="p-2.5 text-right">Labor Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((sys) => {
              const sysHrs = sys.items.reduce((sum, i) => sum + (i.laborHours || 0), 0);
              const sysLabor = sys.items.reduce((sum, i) => sum + (i.laborCost || 0), 0);
              return (
                <tr key={sys.system} className="hover:bg-slate-50 font-mono">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs)} hrs</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs / 32, 1)} d</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs * 0.4, 1)} hrs</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(sysLabor)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td className="p-2.5 text-slate-700 font-sans">Total Field Labor:</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours)} hrs</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours / 32, 1)} days</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours * 0.4, 1)} hrs</td>
              <td className="p-2.5 text-right font-mono text-orange-800">{formatCurrency(totals.totalLaborCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 10. Subcontractor Scope Submittal */
function SubcontractorScopeDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Subcontractor Scope Package" project={currentProject} />

      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-2">
        <h4 className="font-bold uppercase tracking-wider text-teal-950">Scope Inclusions &amp; Performance Obligations</h4>
        <p className="leading-relaxed">
          Subcontractor shall supply all specified materials, tooling, licensed labor, traffic management, and testing to complete the designated scopes below in strict accordance with project plans and manufacturer warranties.
        </p>
      </div>

      <div className="space-y-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-teal-900 text-white px-3.5 py-2 flex justify-between items-center text-xs">
              <span className="font-bold uppercase">{sys.system} Specification Package</span>
              <span className="font-mono">{sys.items.length} Scope Items</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Scope Description</th>
                  <th className="p-2.5">Spec / ASTM</th>
                  <th className="p-2.5 text-right">Takeoff Qty</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right">Target Subcontract Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 11. Trench & Earthwork Engineering Log */
function TrenchEarthworkLogDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Earthwork &amp; Trench Log" project={currentProject} />

      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Trench Width Assumption</span>
          <p className="font-bold text-slate-900">3.0 LF Standard</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Average Cover Depth</span>
          <p className="font-bold text-slate-900">6.0 LF Invert</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Native Swell Factor</span>
          <p className="font-bold text-slate-900">1.25x Loose</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Trench Safety</span>
          <p className="font-bold text-slate-900">OSHA Type B Box</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-amber-950 text-white">
            <tr>
              <th className="p-2.5">Trench Line</th>
              <th className="p-2.5 text-right">Length (LF)</th>
              <th className="p-2.5 text-right">Trench Vol (CY)</th>
              <th className="p-2.5 text-right">Bedding Stone (TN)</th>
              <th className="p-2.5 text-right">Backfill &amp; Haul</th>
              <th className="p-2.5 text-right">Direct Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const lf = it.unit?.toLowerCase().includes('lf') || it.unit?.toLowerCase().includes('ft') ? it.quantity : it.quantity * 10;
              const cy = (lf * 3.0 * 6.0) / 27;
              const stone = cy * 0.35 * 1.4;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-900">{it.description} ({it.sizeSpec})</td>
                  <td className="p-2.5 text-right">{formatNumber(lf, 0)}</td>
                  <td className="p-2.5 text-right text-amber-900 font-bold">{formatNumber(cy, 1)} CY</td>
                  <td className="p-2.5 text-right">{formatNumber(stone, 1)} TN</td>
                  <td className="p-2.5 text-right">{formatNumber(cy * 0.65, 1)} CY</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 12. AIA G702/G703 SOV Billing */
function AiaSovBillingDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-mono">
      <DocumentBrandingHeader branding={branding} title="AIA G702 / G703 Schedule of Values" project={currentProject} />

      <div className="border-2 border-slate-900 rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white uppercase text-[10px]">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2 font-sans">Description of Work</th>
              <th className="p-2 text-right">Scheduled Value</th>
              <th className="p-2 text-right">Work Done</th>
              <th className="p-2 text-right">Stored Mat</th>
              <th className="p-2 text-right">Total %</th>
              <th className="p-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {bySystem.map((sys, idx) => {
              const sysVal = sys.factoredBid ?? sys.directCost;
              return (
                <tr key={sys.system} className="hover:bg-slate-50">
                  <td className="p-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="p-2 font-sans font-medium text-slate-900">{sys.system} Package</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(sysVal)}</td>
                  <td className="p-2 text-right text-slate-500">$0.00</td>
                  <td className="p-2 text-right text-slate-500">$0.00</td>
                  <td className="p-2 text-right text-slate-500">0.0%</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(sysVal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
            <tr>
              <td colSpan={2} className="p-2.5 font-sans uppercase">Total Scheduled Values:</td>
              <td className="p-2.5 text-right text-indigo-900">{formatCurrency(totals.finalBidAmount)}</td>
              <td className="p-2.5 text-right">$0.00</td>
              <td className="p-2.5 text-right">$0.00</td>
              <td className="p-2.5 text-right">0.0%</td>
              <td className="p-2.5 text-right text-indigo-900">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 13. Owner-Contractor Formal Agreement */
function FormalContractAgreementDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-serif">
      <div className="text-center border-b-2 border-slate-900 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">Construction Services Agreement</h2>
        <p className="text-xs text-slate-600 font-sans mt-1">Contract Document &amp; Formal Terms of Engagement</p>
      </div>

      <div className="space-y-3 text-xs text-slate-800 leading-relaxed font-sans">
        <p>
          This Agreement is entered into on this <strong>{new Date().toLocaleDateString()}</strong> by and between{' '}
          <strong>{branding?.companyName || 'Contractor'}</strong> (&ldquo;Contractor&rdquo;) and{' '}
          <strong>{currentProject?.client_name || 'Client / Owner'}</strong> (&ldquo;Owner&rdquo;) for utility and civil infrastructure services located at{' '}
          <strong>{currentProject?.location || 'Designated Job Site'}</strong>.
        </p>
        <p>
          <strong>1. Total Contract Value:</strong> In consideration for full performance of scopes itemized herein, Owner agrees to pay Contractor the fixed lump sum of{' '}
          <span className="font-bold font-mono text-emerald-800">{formatCurrency(totals.finalBidAmount)}</span>.
        </p>
        <p>
          <strong>2. Scope of Work:</strong> Scope encompasses all labor, equipment, trenching, piping, backfill, and quality control tests for{' '}
          <strong>{bySystem.map((s) => s.system).join(', ')}</strong> per engineering specifications.
        </p>
        <p>
          <strong>3. Payment Schedule:</strong> Progressive monthly billing based on approved Schedule of Values with 10% retainage withheld until final agency signoff.
        </p>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
        <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">Contract Phase Summary</div>
        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((s) => (
              <tr key={s.system}>
                <td className="p-2.5 font-bold text-slate-800">{s.system}</td>
                <td className="p-2.5 text-slate-500">{s.items.length} Work Items</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(s.factoredBid ?? s.directCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={2} className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px]">Total Lump Sum Contract:</td>
              <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 14. Phase Milestone Draw Schedule */
function PhaseMilestoneDrawDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;
  const milestones = [
    { name: 'Mobilization & Material Submittals', pct: 0.15, desc: 'Shop drawings, agency permits & site prep' },
    { name: 'Trench Excavation & Deep Inverts', pct: 0.35, desc: 'Underground utility trenching & pipe install' },
    { name: 'Appurtenance & Structure Tie-Ins', pct: 0.30, desc: 'Manholes, valves, hydrants & backfill compaction' },
    { name: 'Pressure Testing & Final Acceptance', pct: 0.20, desc: 'Hydrostatic tests, mandrel pull & punchlist' },
  ];

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Phase Milestone Draw Schedule" project={currentProject} />

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-violet-900 text-white uppercase text-[10px]">
            <tr>
              <th className="p-3">Draw #</th>
              <th className="p-3">Milestone Deliverable</th>
              <th className="p-3">Verification Criteria</th>
              <th className="p-3 text-right">% Draw</th>
              <th className="p-3 text-right">Payment Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {milestones.map((m, idx) => {
              const amount = totals.finalBidAmount * m.pct;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-violet-700">0{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{m.name}</td>
                  <td className="p-3 text-slate-600">{m.desc}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{(m.pct * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right font-mono font-bold text-violet-900">{formatCurrency(amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-3 text-right text-slate-700">Total Contract Draws:</td>
              <td className="p-3 text-right font-mono">100%</td>
              <td className="p-3 text-right font-mono text-violet-900 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}

/** 15. Risk & Contingency Matrix */
function RiskContingencyMatrixDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Risk &amp; Contingency Matrix" project={currentProject} />

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-rose-950 text-white">
            <tr>
              <th className="p-2.5">System</th>
              <th className="p-2.5">Subsurface Risk Profile</th>
              <th className="p-2.5 text-center">Risk Level</th>
              <th className="p-2.5 text-right">Base Direct</th>
              <th className="p-2.5 text-right">Contingency Buffer ({rates?.contingencyPercent || 5}%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.map((sys, idx) => {
              const cont = sys.directCost * ((rates?.contingencyPercent || 5) / 100);
              const isHigh = idx === 0;
              return (
                <tr key={sys.system} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 font-sans text-slate-600">
                    {isHigh ? 'High utility congestion / unknown crossing' : 'Standard trench / low groundwater probability'}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${isHigh ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isHigh ? 'HIGH' : 'MODERATE'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">{formatCurrency(sys.directCost)}</td>
                  <td className="p-2.5 text-right font-bold text-rose-900">{formatCurrency(cont)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-2.5 font-sans text-slate-700">Total Allocated Risk Reserves:</td>
              <td className="p-2.5 text-right font-mono">{formatCurrency(totals.totalDirectCost)}</td>
              <td className="p-2.5 text-right font-mono text-rose-900">{formatCurrency(totals.contingencyCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 16. Field Superintendent Log */
function FieldDailyReportDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Field Superintendent QA Log" project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50">
        <div><span className="text-slate-400 font-bold">Weather / Temp:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">Superintendent:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">City Inspector:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">Daily Safety Talk:</span><div className="text-emerald-700 font-bold mt-1">✓ Completed</div></div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-sky-900 text-white">
            <tr>
              <th className="p-2">Item Description</th>
              <th className="p-2 text-right">Target Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Installed Today</th>
              <th className="p-2 text-right">Cumulative Qty</th>
              <th className="p-2 text-center">QC Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.flatMap((s) => s.items).map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-2 font-medium text-slate-900">{it.description} ({it.sizeSpec})</td>
                <td className="p-2 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                <td className="p-2 text-slate-500">{it.unit}</td>
                <td className="p-2 text-right border-l border-r border-slate-200 bg-slate-50/50" />
                <td className="p-2 text-right border-r border-slate-200" />
                <td className="p-2 text-center text-slate-300">[ &nbsp; &nbsp; ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}

/** 17. Warranty & Closeout Certificate */
function WarrantyCloseoutCertDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-serif text-center py-4">
      <div className="border-4 border-double border-amber-600 p-8 rounded-3xl bg-amber-50/20 space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
          ★
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-amber-950">
          Certificate of Substantial Completion &amp; Warranty
        </h2>
        <p className="text-xs text-slate-600 font-sans max-w-lg mx-auto leading-relaxed">
          This document certifies that the utility and civil construction work on{' '}
          <strong>{currentProject?.name || 'Utility Project'}</strong> has been inspected, tested, and substantially completed in accordance with contract standards.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs font-sans text-left bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div><span className="text-slate-400 font-bold">Contractor:</span><p className="font-bold text-slate-900">{branding?.companyName || 'Takeoff Contractor'}</p></div>
          <div><span className="text-slate-400 font-bold">Client:</span><p className="font-bold text-slate-900">{currentProject?.client_name || 'Project Owner'}</p></div>
          <div><span className="text-slate-400 font-bold">Warranty Period:</span><p className="font-bold text-emerald-700">1-Year Full Coverage</p></div>
          <div><span className="text-slate-400 font-bold">Certified Value:</span><p className="font-bold font-mono text-slate-900">{formatCurrency(totals.finalBidAmount)}</p></div>
        </div>

        <p className="text-[11px] text-slate-500 font-sans italic max-w-md mx-auto">
          Warranty covers pipe joint integrity, structural backfill compaction, and valve operations against defects in workmanship for 365 calendar days from issuance.
        </p>

        <div className="pt-6 border-t border-amber-300/80 font-sans">
          <DocumentSignOff branding={branding} clientSignBlock />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SHARED DOCUMENT HEADER & SIGN-OFF BLOCKS
   ========================================================================= */

function DocumentBrandingHeader({ branding, title, project }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1">
        {branding?.companyLogoUrl && (
          <img
            src={branding.companyLogoUrl}
            alt={branding.companyName || 'Company Logo'}
            className="h-10 w-auto object-contain mb-1"
          />
        )}
        <h2 className="text-lg font-bold text-slate-900">
          {branding?.companyName || 'Takeoff Engine Estimating'}
        </h2>
        {branding?.companyAddress && <p className="text-xs text-slate-500">{branding.companyAddress}</p>}
        {branding?.companyPhone && <p className="text-xs text-slate-500">Phone: {branding.companyPhone}</p>}
      </div>

      <div className="text-left sm:text-right space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{title}</span>
        <h3 className="text-sm font-bold text-slate-900">{project?.name || 'Utility Takeoff Estimate'}</h3>
        {project?.client_name && <p className="text-xs text-slate-500">Client: {project.client_name}</p>}
        {project?.location && <p className="text-xs text-slate-500">Site: {project.location}</p>}
        <p className="text-[11px] font-mono text-slate-400">Date: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function DocumentSignOff({ branding, clientSignBlock = false }) {
  return (
    <div className="pt-6 border-t border-slate-200 space-y-4">
      {clientSignBlock ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">Submitted By (Contractor):</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>Authorized Signature</span>
              <span>Date</span>
            </div>
          </div>
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">Accepted By (Client):</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>Authorized Signature</span>
              <span>Date</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>Prepared with Takeoff Engine</span>
          <span>Confidential Estimating Data</span>
        </div>
      )}
    </div>
  );
}
