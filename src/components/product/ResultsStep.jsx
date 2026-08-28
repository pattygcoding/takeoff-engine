import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { computeEstimate, formatCurrency, formatNumber } from '@/lib/product/calculations';
import { triggerDownload } from '@/lib/product/csv';
import { projectsApi } from '@/lib/product/projects';
import { proposalsApi } from '@/lib/product/proposals';
import { authApi } from '@/lib/auth/auth';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';
import UpgradeModal from '@/components/billing/UpgradeModal';
import Papa from 'papaparse';

export default function ResultsStep({ items, rates, currentProject, onProjectSaved, onBack, readOnly = false, projectStatus = 'awarded', onDuplicate }) {
  const { username, projectId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, refreshProfile } = useAuth();
  const { showAlert } = useModal();
  const { t } = useTranslation();
  const [proposalMode, setProposalMode] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(currentProject?.name || '');
  const [clientNameInput, setClientNameInput] = useState(currentProject?.client_name || '');
  const [locationInput, setLocationInput] = useState(currentProject?.location || '');

  // Proposal Portal Sharing States
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [shareProposalModalOpen, setShareProposalModalOpen] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [shareProposalData, setShareProposalData] = useState(null);
  const [clientRecipientEmail, setClientRecipientEmail] = useState('');
  const [clientRecipientName, setClientRecipientName] = useState(currentProject?.client_name || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState('');

  const isExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier));

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

  const handleSaveToCloud = async (e) => {
    if (e) e.preventDefault();
    if (!projectNameInput.trim()) {
      setShowSaveModal(true);
      return;
    }

    try {
      setIsSavingProject(true);
      setSaveSuccessMsg('');

      const summaryPayload = {
        totalMaterialCost: totals.materialCost,
        totalLaborCost: totals.laborCost,
        totalDirectCost: totals.directCost,
        overheadCost: totals.overheadCost,
        contingencyCost: totals.contingencyCost,
        profitAmount: totals.profitAmount,
        equipmentCost: totals.equipmentCost,
        finalBidAmount: totals.finalBidAmount,
        totalItemsCount: items.length,
      };

      let savedProject = null;

      if (currentProject?.id) {
        // Update existing project
        savedProject = await projectsApi.update(currentProject.id, {
          name: projectNameInput.trim(),
          clientName: clientNameInput.trim(),
          location: locationInput.trim(),
          items,
          rates,
          summary: summaryPayload,
        });
        if (onProjectSaved) onProjectSaved(savedProject);
      } else {
        // Create new cloud project
        savedProject = await projectsApi.create({
          name: projectNameInput.trim(),
          clientName: clientNameInput.trim(),
          location: locationInput.trim(),
          status: 'draft',
          items,
          rates,
          summary: summaryPayload,
        });
        if (onProjectSaved) onProjectSaved(savedProject);
        if (refreshProfile) refreshProfile();
      }

      setShowSaveModal(false);
      setSaveSuccessMsg(t('resultsStep.estimateSavedSuccess'));
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      return savedProject;
    } catch (err) {
      if (err.code === 'TRIAL_EXHAUSTED') {
        setShowSaveModal(false);
        if (refreshProfile) refreshProfile();
        setShowUpgradeModal(true);
        return null;
      }
      await showAlert({
        title: t('resultsStep.saveFailed'),
        message: err.message || t('resultsStep.savingProject'),
        variant: 'error',
      });
      return null;
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleGenerateShareableProposal = async () => {
    if (!user) {
      await showAlert({
        title: t('resultsStep.authRequired'),
        message: t('resultsStep.authRequiredMessage'),
        variant: 'warning',
      });
      return;
    }

    try {
      setIsGeneratingShareLink(true);

      const summaryPayload = {
        totalMaterialCost: totals.materialCost,
        totalLaborCost: totals.laborCost,
        totalDirectCost: totals.directCost,
        overheadCost: totals.overheadCost,
        contingencyCost: totals.contingencyCost,
        profitAmount: totals.profitAmount,
        equipmentCost: totals.equipmentCost,
        finalBidAmount: totals.finalBidAmount,
        totalItemsCount: items.length,
      };

      const res = await proposalsApi.generateProposal({
        projectId: currentProject?.id || null,
        projectName: currentProject?.name || projectNameInput.trim() || 'Utility Takeoff Proposal',
        clientName: currentProject?.client_name || clientNameInput.trim() || '',
        location: currentProject?.location || locationInput.trim() || '',
        items,
        rates,
        summary: summaryPayload,
      });

      const url = `${window.location.origin}/p/${res.proposal.public_token}`;
      setPublicShareUrl(url);
      setShareProposalData(res.proposal);
      setClientRecipientName(currentProject?.client_name || clientNameInput || '');
      setEmailSentSuccess('');
      setShareProposalModalOpen(true);
    } catch (err) {
      await showAlert({
        title: t('resultsStep.proposalLinkError'),
        message: err.message || t('resultsStep.proposalLinkErrorMessage'),
        variant: 'error',
      });
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  const handleSendProposalEmail = async (e) => {
    e.preventDefault();
    if (!clientRecipientEmail || !clientRecipientEmail.trim()) {
      await showAlert({
        title: t('resultsStep.missingRecipientEmail'),
        message: t('resultsStep.missingRecipientEmailMessage'),
        variant: 'warning',
      });
      return;
    }

    try {
      setIsSendingEmail(true);
      setEmailSentSuccess('');
      const res = await proposalsApi.sendProposalEmail({
        projectId: currentProject?.id || shareProposalData?.project_id,
        recipientEmail: clientRecipientEmail.trim(),
        recipientName: clientRecipientName.trim(),
      });

      setEmailSentSuccess(t('resultsStep.proposalSentSuccess', { email: clientRecipientEmail.trim() }));
      if (res.trial_uses_remaining !== undefined) {
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, trial_uses_remaining: res.trial_uses_remaining } : prev));
        }
      }
      if (refreshProfile) await refreshProfile();
      if (res.project && onProjectSaved) {
        onProjectSaved(res.project);
      }
    } catch (err) {
      await showAlert({
        title: t('resultsStep.emailDeliveryError'),
        message: err.message || t('resultsStep.emailDeliveryErrorMessage'),
        variant: 'error',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * Records export and decrements credit count before completing file download
   */
  const processExportWithCreditCheck = async (exportFn) => {
    try {
      const recordResult = await authApi.recordExport();
      if (recordResult?.trial_uses_remaining !== undefined) {
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, trial_uses_remaining: recordResult.trial_uses_remaining } : prev));
        }
      }
      if (refreshProfile) await refreshProfile();
      await exportFn();
    } catch (err) {
      if (err.code === 'TRIAL_EXHAUSTED' || err.status === 403) {
        setShowUpgradeModal(true);
      } else {
        console.error('[Export Metering Error]', err);
        await exportFn();
      }
    }
  };

  const exportCsv = () => {
    processExportWithCreditCheck(async () => {
      const rows = bySystem.flatMap((sys) =>
        sys.items.map((item) => ({
          System: item.system,
          Description: item.description,
          'Size/Spec': item.sizeSpec,
          Quantity: item.quantity,
          Unit: item.unit,
          ...(proposalMode
            ? { 'Line Total': item.directCost.toFixed(2) }
            : {
                'Material Cost': item.materialCost.toFixed(2),
                'Labor Hours': item.laborHours.toFixed(2),
                'Labor Cost': item.laborCost.toFixed(2),
                'Direct Cost': item.directCost.toFixed(2),
              }),
        }))
      );
      const csv = Papa.unparse(rows);
      triggerDownload(csv, proposalMode ? 'proposal_summary.csv' : 'internal_cost_breakdown.csv', 'text/csv');
    });
  };

  const navigateToExportHub = () => {
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject.id;
      navigate(`/${username}/takeoff/${activeId}/export`);
    } else {
      navigate(`/${username}/export`);
    }
  };

  const activeStatus = currentProject?.status || projectStatus;
  const statusLabel =
    activeStatus === 'submitted'
      ? t('resultsStep.statusSubmitted')
      : activeStatus === 'archived'
      ? t('resultsStep.statusArchived')
      : activeStatus === 'declined'
      ? t('resultsStep.statusDeclined')
      : t('resultsStep.statusAwarded');

  const statusDescription =
    activeStatus === 'submitted'
      ? t('resultsStep.statusDescSubmitted')
      : activeStatus === 'archived'
      ? t('resultsStep.statusDescArchived')
      : activeStatus === 'declined'
      ? t('resultsStep.statusDescDeclined')
      : t('resultsStep.statusDescAwarded');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-900 dark:text-slate-100">
      {readOnly && (
        <div className="no-print mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">{statusLabel} Project ({t('resultsStep.lockedReadOnly')})</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {statusDescription}
              </p>
            </div>
          </div>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('resultsStep.duplicateAsNewRevision')}
            </button>
          )}
        </div>
      )}

      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {proposalMode ? t('resultsStep.clientProposalTitle') : t('resultsStep.internalCostBreakdownTitle')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {proposalMode
              ? t('resultsStep.clientProposalSubtitle')
              : t('resultsStep.internalCostBreakdownSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            {t('resultsStep.backToEdit')}
          </button>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 select-none cursor-pointer">
            <span>{t('resultsStep.clientFacingProposalMode')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={proposalMode}
              onClick={() => setProposalMode((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                proposalMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  proposalMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setProjectNameInput(currentProject?.name || '');
                setClientNameInput(currentProject?.client_name || '');
                setLocationInput(currentProject?.location || '');
                setShowSaveModal(true);
              }}
              disabled={isSavingProject}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSavingProject ? t('resultsStep.saving') : currentProject?.id ? t('resultsStep.updateCloudEstimate') : t('resultsStep.saveToProjects')}
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateShareableProposal}
            disabled={isGeneratingShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {isGeneratingShareLink ? t('resultsStep.generatingLink') : t('resultsStep.shareClientLink')}
          </button>

          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
              ✓ {saveSuccessMsg}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={navigateToExportHub}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{t('resultsStep.printExportFormats')}</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl border border-emerald-600 dark:border-emerald-500 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {t('resultsStep.exportCsvExcel')}
          </button>
        </div>
      </div>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {currentProject?.id ? t('resultsStep.updateProjectDetails') : t('resultsStep.saveProjectToCloud')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('resultsStep.modalSaveDescription')}
            </p>
            <form onSubmit={handleSaveToCloud}>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('resultsStep.projectNameLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder={t('resultsStep.projectNamePlaceholder')}
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('resultsStep.clientNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder={t('resultsStep.clientNamePlaceholder')}
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('resultsStep.locationLabel')}
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder={t('resultsStep.locationPlaceholder')}
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {t('resultsStep.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProject ? t('resultsStep.saving') : t('resultsStep.saveEstimate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Proposal & E-Sign Modal */}
      {shareProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  🔗
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('resultsStep.portalLinkModalTitle')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('resultsStep.portalLinkModalSubtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareProposalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6">
              {/* Direct Email Submission Section */}
              <form onSubmit={handleSendProposalEmail} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">✉️ {t('resultsStep.emailDirectlyToClient')}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t('resultsStep.emailDirectlyDescription')}
                </p>

                {emailSentSuccess && (
                  <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    ✓ {emailSentSuccess}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">{t('resultsStep.clientAttentionLabel')}</label>
                      <input
                        type="text"
                        value={clientRecipientName}
                        onChange={(e) => setClientRecipientName(e.target.value)}
                        placeholder={t('resultsStep.clientAttentionPlaceholder')}
                        className="w-full bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">{t('resultsStep.clientEmailLabel')}</label>
                      <input
                        type="email"
                        required
                        value={clientRecipientEmail}
                        onChange={(e) => setClientRecipientEmail(e.target.value)}
                        placeholder={t('resultsStep.clientEmailPlaceholder')}
                        className="w-full bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('resultsStep.sendingEmail')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>{t('resultsStep.sendProposalAndLock')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t('resultsStep.orCopyPublicLink')}</span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                    {t('resultsStep.statusTag', { status: shareProposalData?.client_status || 'sent' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicShareUrl}
                    className="w-full bg-white dark:bg-slate-800 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicShareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 3000);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs transition cursor-pointer"
                  >
                    {shareCopied ? t('resultsStep.copied') : t('resultsStep.copyLink')}
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-4 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5 border border-indigo-100 dark:border-indigo-900">
                <p className="font-bold flex items-center gap-1.5">
                  <span>✨</span> {t('resultsStep.whatClientSees')}
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>{t('resultsStep.benefitBranding')}</li>
                  <li>{t('resultsStep.benefitScope')}</li>
                  <li>{t('resultsStep.benefitSignature')}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={publicShareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline"
              >
                {t('resultsStep.previewClientPortal')}
              </a>

              <button
                type="button"
                onClick={() => setShareProposalModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                {t('resultsStep.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="print-area" className="print-area bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden shadow-sm transition-colors text-slate-900 dark:text-slate-100">
        {/* Custom Company Header for Pro / Paid Users */}
        {branding && (branding.companyName || branding.companyLogoUrl) ? (
          <div className="flex flex-wrap items-center justify-between border-b-2 pb-4 mb-6" style={{ borderColor: branding.brandColor || '#0284c7' }}>
            <div className="flex items-center gap-4">
              {branding.companyLogoUrl && (
                <img
                  src={branding.companyLogoUrl}
                  alt={branding.companyName || 'Company Logo'}
                  className="h-16 max-w-[180px] object-contain rounded"
                  crossOrigin="anonymous"
                />
              )}
              <div>
                {branding.companyName && (
                  <h2 className="text-xl font-bold tracking-tight" style={{ color: branding.brandColor || '#0284c7' }}>
                    {branding.companyName}
                  </h2>
                )}
                {branding.companyAddress && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{branding.companyAddress}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {branding.companyPhone && <span>{t('resultsStep.phoneLabel', { phone: branding.companyPhone })}</span>}
                  {branding.licenseNumber && <span>{t('resultsStep.licLabel', { license: branding.licenseNumber })}</span>}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {currentProject?.name || t('resultsStep.defaultProposalTitle')}
              </p>
              {currentProject?.client_name && (
                <p>{t('resultsStep.preparedFor', { client: currentProject.client_name })}</p>
              )}
              <p>{t('resultsStep.dateLabel', { date: new Date().toLocaleDateString() })}</p>
            </div>
          </div>
        ) : (
          /* Default Watermark/Header for Free Users */
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                T
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('resultsStep.appWatermark')}</span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">{t('resultsStep.appWatermarkGenerated')}</span>
          </div>
        )}

        {!proposalMode && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label={t('resultsStep.totalMaterialCost')} value={formatCurrency(totals.totalMaterialCost)} />
            <SummaryCard
              label={t('resultsStep.totalLabor')}
              value={formatCurrency(totals.totalLaborCost)}
              sub={t('resultsStep.laborHrs', { count: formatNumber(totals.totalLaborHours) })}
            />
            <SummaryCard label={t('resultsStep.equipmentMobilization')} value={formatCurrency(totals.equipmentLumpSum)} />
            {totals.miscCost > 0 && (
              <SummaryCard label={t('resultsStep.miscellaneousCosts')} value={formatCurrency(totals.miscCost)} />
            )}
            <SummaryCard label={t('resultsStep.totalDirectCost')} value={formatCurrency(totals.totalDirectCost)} />
            <SummaryCard
              label={t('resultsStep.overhead', { pct: totals.overheadPct })}
              value={formatCurrency(totals.overheadAmount)}
            />
            <SummaryCard
              label={t('resultsStep.contingency', { pct: totals.contingencyPct })}
              value={formatCurrency(totals.contingencyAmount)}
            />
            <SummaryCard label={t('resultsStep.profit', { pct: totals.profitPct })} value={formatCurrency(totals.profitAmount)} />
            <SummaryCard label={t('resultsStep.finalBidAmount')} value={formatCurrency(totals.finalBidAmount)} highlight />
          </div>
        )}

        {proposalMode && (
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium">{t('resultsStep.totalProjectInvestment')}</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totals.finalBidAmount)}</p>
          </div>
        )}

        <div className="space-y-8">
          {bySystem.map((sys) => (
            <div key={sys.system}>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                {sys.system}
              </h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <th className="py-1 pr-3">{t('resultsStep.colDescription')}</th>
                    <th className="py-1 pr-3">{t('resultsStep.colSizeSpec')}</th>
                    <th className="py-1 pr-3 text-right">{t('resultsStep.colQty')}</th>
                    <th className="py-1 pr-3">{t('resultsStep.colUnit')}</th>
                    {!proposalMode && <th className="py-1 pr-3 text-right">{t('resultsStep.colMaterial')}</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">{t('resultsStep.colLaborHrs')}</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">{t('resultsStep.colLaborCost')}</th>}
                    <th className="py-1 pr-3 text-right">{proposalMode ? t('resultsStep.colLineTotal') : t('resultsStep.colDirectCost')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sys.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-1.5 pr-3 text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{item.sizeSpec}</td>
                      <td className="py-1.5 pr-3 text-right text-slate-800 dark:text-slate-200 font-mono">{formatNumber(item.quantity, 0)}</td>
                      <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">{item.unit}</td>
                      {!proposalMode && <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(item.materialCost)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300 font-mono">{formatNumber(item.laborHours)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(item.laborCost)}</td>}
                      <td className="py-1.5 pr-3 text-right font-medium text-slate-900 dark:text-slate-100 font-mono">{formatCurrency(item.directCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <td className="py-2 pr-3" colSpan={proposalMode ? 4 : 7}>
                      {t('resultsStep.subtotal')}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{formatCurrency(sys.directCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        {proposalMode && (
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <div className="w-full sm:w-64 text-right">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm py-1">
                <span>{t('resultsStep.subtotal')}</span>
                <span className="font-mono">{formatCurrency(totals.totalDirectCost)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                <span>{t('resultsStep.totalBid')}</span>
                <span className="font-mono">{formatCurrency(totals.finalBidAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        highlight
          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-xs'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold font-mono tracking-tight ${highlight ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
