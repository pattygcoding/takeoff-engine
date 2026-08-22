import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { computeEstimate, formatCurrency, formatNumber } from '@/lib/calculations';
import { triggerDownload } from '@/lib/csv';
import { authApi } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import UpgradeModal from './UpgradeModal';
import {
  StandardEstimateDocument,
  ClientProposalDocument,
  ExecutiveProposalDocument,
  ItemizedLedgerDocument,
  AiaBidScheduleDocument,
  KpiSummaryDocument,
  ScopeMatrixDocument,
  MaterialProcurementDocument,
  CrewProductionScheduleDocument,
  SubcontractorScopeDocument,
  TrenchEarthworkLogDocument,
  AiaSovBillingDocument,
  FormalContractAgreementDocument,
  PhaseMilestoneDrawDocument,
  RiskContingencyMatrixDocument,
  FieldDailyReportDocument,
  WarrantyCloseoutCertDocument,
} from '../templates';

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
        const { exportEstimateToWord } = await import('@/lib/wordExport');
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
