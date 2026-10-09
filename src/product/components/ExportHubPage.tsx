import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, FileText } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { computeEstimate, formatCurrency, formatNumber } from '@/product/lib/calculations';
import { triggerDownload } from '@/product/lib/csv';
import { exportNodeToPdf } from '@/product/lib/pdfExport';
import { authApi } from '@/core/lib/auth/auth';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import UpgradeModal from '@/core/components/billing/UpgradeModal';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
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
} from '@/product/templates';

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
  },
  {
    id: 'client_proposal',
    name: 'Standard Client Proposal',
    category: 'Client Presentation',
    tag: 'Standard',
    isProOnly: false,
    badgeColor: 'bg-blue-100 text-blue-700',
    description: 'Clean proposal hiding internal markups, displaying line descriptions and bid totals.',
  },
  {
    id: 'executive_presentation',
    name: 'Executive Proposal',
    category: 'High-Value Commercial',
    tag: 'Standard',
    isProOnly: false,
    badgeColor: 'bg-emerald-100 text-emerald-700',
    description: 'Polished client presentation with company header, acceptance blocks, and formal legal notes.',
  },
  {
    id: 'itemized_ledger',
    name: 'Granular Job-Cost Ledger',
    category: 'Field & Audit',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Exposes trench volume, linear footage, equipment rates, and production labor breakdowns.',
  },
  {
    id: 'aia_bid_schedule',
    name: 'AIA Bid Schedule',
    category: 'Public & Municipal',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Standardized unit price bid schedule matching commercial AIA/DOT submittal standards.',
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
  },
  {
    id: 'scope_matrix',
    name: 'Commercial Scope Matrix',
    category: 'Subcontractor Scopes',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Compact tabular matrix comparing system specs, take-off units, and inclusions.',
  },
  {
    id: 'material_procurement',
    name: 'Material Purchase Order',
    category: 'Purchasing & Supply',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Vendor requisition order listing pipe specifications, fitting quantities, and material PO totals.',
  },
  {
    id: 'crew_production_schedule',
    name: 'Crew & Equipment Schedule',
    category: 'Field Operations',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Daily gang-hours, excavator machine utilization, and estimated crew days per utility run.',
  },
  {
    id: 'subcontractor_scope',
    name: 'Subcontractor Scope Submittal',
    category: 'Sub Contracts',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Dedicated subcontract package with inclusions, exclusions, site safety rules, and signoff.',
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
  },
  {
    id: 'aia_g702_sov',
    name: 'AIA G702/G703 SOV Billing',
    category: 'Progress Billing',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Schedule of Values (SOV) structure formatted for AIA progressive monthly payment draws.',
  },
  {
    id: 'formal_contract_agreement',
    name: 'Owner-Contractor Agreement',
    category: 'Legal & Contract',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Formal contract agreement with legal indemnification, payment terms, and double notarization lines.',
  },
  {
    id: 'phase_milestone_draw',
    name: 'Phased Milestone Draw',
    category: 'Cash Flow Schedule',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Milestone-based payment schedule tied to utility installation benchmarks and system testing.',
  },
  {
    id: 'risk_contingency_matrix',
    name: 'Risk & Contingency Matrix',
    category: 'Risk Management',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'System-by-system risk score matrix showing subsurface unknowns and contingency reserves.',
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
  },
  {
    id: 'warranty_closeout_cert',
    name: 'Warranty & Closeout Certificate',
    category: 'Project Handover',
    tag: 'Pro',
    isProOnly: true,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs',
    description: 'Formal 1-year workmanship warranty certificate and project substantial completion document.',
  },
];

const DOCUMENT_COMPONENTS = {
  standard_estimate: StandardEstimateDocument,
  client_proposal: ClientProposalDocument,
  executive_presentation: ExecutiveProposalDocument,
  itemized_ledger: ItemizedLedgerDocument,
  aia_bid_schedule: AiaBidScheduleDocument,
  kpi_margin_summary: KpiSummaryDocument,
  scope_matrix: ScopeMatrixDocument,
  material_procurement: MaterialProcurementDocument,
  crew_production_schedule: CrewProductionScheduleDocument,
  subcontractor_scope: SubcontractorScopeDocument,
  trench_earthwork_log: TrenchEarthworkLogDocument,
  aia_g702_sov: AiaSovBillingDocument,
  formal_contract_agreement: FormalContractAgreementDocument,
  phase_milestone_draw: PhaseMilestoneDrawDocument,
  risk_contingency_matrix: RiskContingencyMatrixDocument,
  field_daily_report: FieldDailyReportDocument,
  warranty_closeout_cert: WarrantyCloseoutCertDocument,
};

export default function ExportHubPage({ items, rates, currentProject }) {
  const { t } = useTranslation();
  const { username, projectId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, refreshProfile } = useAuth();
  const { showAlert } = useModal();

  const [selectedFormatId, setSelectedFormatId] = useState('standard_estimate');
  const [exportingType, setExportingType] = useState(null); // 'pdf' | 'word' | null
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const printAreaRef = useRef(null);

  const guard = useSingleFlight();
  const isProOrExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['pro', 'enterprise'].includes(user?.subscription_tier));

  // '#0284c7' is the DB column default, so treat it as "no brand color chosen" and let each format use its own accent.
  const chosenBrandColor = user?.brand_color && user.brand_color.toLowerCase() !== '#0284c7' ? user.brand_color : '';

  const branding = useMemo(
    () =>
      isProOrExempt
        ? {
            companyName: user?.company_name || '',
            companyLogoUrl: user?.company_logo_url || '',
            companyAddress: user?.company_address || '',
            companyPhone: user?.phone_number || '',
            licenseNumber: user?.license_number || '',
            brandColor: chosenBrandColor,
          }
        : null,
    [isProOrExempt, user, chosenBrandColor]
  );

  const [estimate, setEstimate] = useState({ totals: {}, bySystem: [], items: [], rates });

  // Thumbnails only show the top of page 1, so trim line items to keep 17 live renders cheap.
  const thumbnailEstimate = useMemo(
    () => ({
      ...estimate,
      bySystem: (estimate.bySystem || []).slice(0, 3).map((sys) => ({ ...sys, items: sys.items.slice(0, 4) })),
    }),
    [estimate]
  );
  const thumbnailProps = { estimate: thumbnailEstimate, branding, currentProject, rates };

  useEffect(() => {
    let active = true;
    computeEstimate(items, rates)
      .then((res) => {
        if (active && res) setEstimate({ ...res, rates });
      })
      .catch((err) => console.error('Failed to compute estimate for export preview:', err));
    return () => {
      active = false;
    };
  }, [items, rates]);

  const { totals, bySystem } = estimate;

  // Lets print CSS hide the app shell and print only the portal-rendered document.
  useEffect(() => {
    document.body.classList.add('export-print-mode');
    return () => document.body.classList.remove('export-print-mode');
  }, []);

  const currentFormat = useMemo(
    () => EXPORT_FORMATS.find((f) => f.id === selectedFormatId) || EXPORT_FORMATS[0],
    [selectedFormatId]
  );

  const isCurrentFormatLocked = currentFormat.isProOnly && !isProOrExempt;

  const DocumentComponent = DOCUMENT_COMPONENTS[currentFormat.id];
  const documentContent = (
    <DocumentComponent estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
  );

  // Metering & export wrapper
  const runExportAction = async (actionFn) => {
    if (isCurrentFormatLocked) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const recordResult = await authApi.recordExport(currentFormat.id);
      if (recordResult?.trial_uses_remaining !== undefined) {
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, trial_uses_remaining: recordResult.trial_uses_remaining } : prev));
        }
      }
      if (refreshProfile) await refreshProfile();
      await actionFn();
    } catch (err) {
      if (err.code === 'TRIAL_EXHAUSTED' || err.code === 'FORBIDDEN_TIER_FEATURE' || err.status === 403) {
        setShowUpgradeModal(true);
      } else {
        console.error('[Export Metering Error]', err);
        await actionFn();
      }
    }
  };

  // 1. Browser Print Handler
  const handlePrint = guard('record-export', async () => {
    await runExportAction(() => {
      window.print();
    });
  });

  // 2. PDF Generator (Generates standard Letter 8.5" x 11" with 1:1 Print Preview fidelity & multi-page support)
  const handleExportPdf = guard('record-export', async () => {
    await runExportAction(async () => {
      const node = document.getElementById('export-document-canvas');
      if (!node) return;
      setExportingType('pdf');
      try {
        await exportNodeToPdf(node, `${(currentProject?.name || 'takeoff_estimate').replace(/\s+/g, '_')}_${currentFormat.id}.pdf`);
      } catch (err) {
        console.error('PDF export failed:', err);
        await showAlert({
          title: t('product.exportHub.exportFailedTitle'),
          message: t('product.exportHub.pdfExportFailedMsg'),
          variant: 'error',
        });
      } finally {
        setExportingType(null);
      }
    });
  });

  // 3. Word DOCX Generator
  const handleExportWord = guard('record-export', async () => {
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
        const { exportEstimateToWord } = await import('@/product/lib/wordExport');
        await exportEstimateToWord(estimate, isProposalMode, branding || {}, null, currentFormat.id, currentProject, rates);
      } catch (err) {
        console.error('Word export failed:', err);
        await showAlert({
          title: t('product.exportHub.exportFailedTitle'),
          message: t('product.exportHub.wordExportFailedMsg'),
          variant: 'error',
        });
      } finally {
        setExportingType(null);
      }
    });
  });

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-16 text-slate-900 dark:text-slate-100">
      {/* Top Breadcrumb & Controls Header (Hidden in Print) */}
      <div className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={backUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl transition"
            >
              {t('product.exportHub.backToResults')}
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('product.exportHub.exportPrintCenter')}</span>
                {currentProject?.name && (
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-md">
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
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{t('product.exportHub.printBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingType !== null}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{exportingType === 'pdf' ? t('product.exportHub.generatingPdf') : t('product.exportHub.exportPdfBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Template Chooser Grid (4 Rows of 5) */}
        <div id="format-selection-grid" className="no-print bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {t('product.exportHub.chooseDocFormatTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('product.exportHub.chooseDocFormatDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t('product.exportHub.standardFormatsBadge')}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{t('product.exportHub.proFormatsBadge')}</span>
            </div>
          </div>

          {/* Row 1 (5 items) */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {t('product.exportHub.row1Title')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(0, 5).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  thumbnailProps={thumbnailProps}
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {t('product.exportHub.row2Title')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(5, 10).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  thumbnailProps={thumbnailProps}
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {t('product.exportHub.row3Title')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(10, 15).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  thumbnailProps={thumbnailProps}
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {t('product.exportHub.row4Title')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {EXPORT_FORMATS.slice(15).map((fmt) => (
                <FormatCard
                  key={fmt.id}
                  thumbnailProps={thumbnailProps}
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
          <div className="no-print rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {t('product.exportHub.isAProFeature', { name: currentFormat.name })}
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('product.exportHub.isAProFeatureDesc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              {t('product.exportHub.upgradeToUnlockBtn')}
            </button>
          </div>
        )}

        {/* Live Document Canvas Preview Section */}
        <div id="export-preview-section" className="scroll-mt-20 space-y-3">
          {/* Preview Section Header with Title & Back Button */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {t('product.exportHub.documentPreview')}: <span className="text-blue-600 dark:text-blue-400">{currentFormat.name}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('product.exportHub.previewDesc')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToFormatSelection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{t('product.exportHub.backToDocSelection')}</span>
            </button>
          </div>

          <div className="bg-slate-300/40 dark:bg-slate-900/60 p-2 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex justify-center">
            <div
              id="export-document-canvas"
              ref={printAreaRef}
              className="w-full max-w-[816px] bg-white text-slate-800 shadow-xl rounded-sm border border-slate-200 p-5 sm:p-12 transition"
            >
              {documentContent}
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {createPortal(<div id="export-print-root">{documentContent}</div>, document.body)}
    </div>
  );
}

/**
 * Format Card Component with Word-style document thumbnail
 */
function FormatCard({ format, isSelected, isPro, onScrollToPreview, onClick, thumbnailProps }) {
  const { t } = useTranslation();
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
      className={`group relative flex flex-col justify-between rounded-2xl border-2 p-3 text-left transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-800 ${
        isSelected
          ? 'border-blue-600 ring-4 ring-blue-50 dark:ring-blue-950 shadow-md transform -translate-y-0.5'
          : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${format.badgeColor}`}>
          {format.tag}
        </span>
        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 line-clamp-1">{format.category}</span>
      </div>

      {/* Live miniature of the actual document, like a Word template gallery */}
      <div className="relative w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-2.5 mb-2.5 transition group-hover:bg-slate-200/70 dark:group-hover:bg-slate-900/80">
        <DocumentThumbnail formatId={format.id} {...thumbnailProps} />

        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-2 text-center text-white z-10 transition">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center mb-1 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-amber-300">{t('product.exportHub.unlockWithPro')}</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 flex-1">{format.name}</h4>
          
          <div className="flex items-center gap-1 shrink-0">
            {isSelected && (
              <button
                type="button"
                onClick={handlePreviewClick}
                className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 hover:text-blue-900 border border-blue-200 dark:border-blue-800 rounded-md text-[9px] font-extrabold tracking-tight transition cursor-pointer shadow-2xs flex items-center gap-0.5"
                title={t('product.exportHub.jumpToPreviewTitle')}
              >
                <span>{t('product.exportHub.seePreviewBtn')}</span>
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}

            {isSelected && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-tight">{format.description}</p>
      </div>
    </div>
  );
}

const PAGE_WIDTH_PX = 816; // 8.5in Letter at 96 DPI

/**
 * Renders the real document template on a Letter-sized sheet, scaled to fit the card.
 */
const DocumentThumbnail = memo(function DocumentThumbnail({ formatId, estimate, branding, currentProject, rates }) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(0);
  const DocumentComponent = DOCUMENT_COMPONENTS[formatId];

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const update = () => setScale(el.clientWidth / PAGE_WIDTH_PX);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      inert
      className="relative w-full aspect-[8.5/11] bg-white overflow-hidden rounded-sm shadow-md ring-1 ring-slate-900/5 pointer-events-none select-none"
    >
      {scale > 0 && DocumentComponent && (
        <div
          className="absolute top-0 left-0 bg-white text-slate-800 p-12"
          style={{ width: PAGE_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <DocumentComponent estimate={estimate} branding={branding} currentProject={currentProject} rates={rates} />
        </div>
      )}
    </div>
  );
});
