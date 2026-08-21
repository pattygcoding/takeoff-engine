import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { computeEstimate, formatCurrency, formatNumber } from '../lib/calculations';
import { triggerDownload } from '../lib/csv';
import { projectsApi } from '../lib/projects';
import { proposalsApi } from '../lib/proposals';
import { authApi } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import UpgradeModal from './UpgradeModal';
import Papa from 'papaparse';

export default function ResultsStep({ items, rates, currentProject, onProjectSaved, onBack, readOnly = false, projectStatus = 'awarded', onDuplicate }) {
  const { username, projectId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, refreshProfile } = useAuth();
  const { showAlert } = useModal();
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
      setSaveSuccessMsg('Estimate successfully saved to cloud!');
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
        title: 'Save Failed',
        message: err.message || 'Failed to save project to cloud.',
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
        title: 'Authentication Required',
        message: 'Please sign in to generate a shareable client proposal link.',
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
        title: 'Proposal Link Error',
        message: err.message || 'Failed to generate proposal link.',
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
        title: 'Missing Recipient Email',
        message: 'Please provide a valid client email address.',
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

      setEmailSentSuccess(`Proposal invitation successfully sent to ${clientRecipientEmail.trim()}! Project has been moved to Submitted status.`);
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
        title: 'Email Delivery Error',
        message: err.message || 'Failed to send proposal email.',
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
      ? 'Submitted'
      : activeStatus === 'archived'
      ? 'Archived'
      : 'Awarded';

  const statusDescription =
    activeStatus === 'submitted'
      ? 'This project has been submitted to the client. Figures are locked to maintain proposal integrity. You can export or print anytime.'
      : activeStatus === 'archived'
      ? 'This project has been archived. Figures are locked in read-only mode. You can export or print anytime.'
      : 'This project has been awarded. Figures are locked to maintain historical and contract integrity. You can export or print anytime.';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {readOnly && (
        <div className="no-print mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">{statusLabel} Project (Locked - Read Only)</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {statusDescription}
              </p>
            </div>
          </div>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate as New Revision
            </button>
          )}
        </div>
      )}

      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {proposalMode ? 'Client Proposal' : 'Internal Cost Breakdown'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {proposalMode
              ? 'Clean, client-facing summary ready to share or export.'
              : 'Full internal cost detail including markups and labor hours.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to Edit
          </button>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 select-none cursor-pointer">
            <span>Client-Facing Proposal Mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={proposalMode}
              onClick={() => setProposalMode((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                proposalMode ? 'bg-indigo-600' : 'bg-slate-300'
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

      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-xs transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSavingProject ? 'Saving...' : currentProject?.id ? 'Update Cloud Estimate' : 'Save to Projects'}
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateShareableProposal}
            disabled={isGeneratingShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {isGeneratingShareLink ? 'Generating Link...' : 'Share Client Link & E-Sign'}
          </button>

          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
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
            <span>Print &amp; Export Formats</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
          >
            Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {currentProject?.id ? 'Update Project Details' : 'Save Project to Cloud'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter details for this takeoff estimate to easily access and manage it from your Dashboard.
            </p>
            <form onSubmit={handleSaveToCloud}>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder="e.g. West Main St Sewer Replacement"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client / General Contractor Name
                  </label>
                  <input
                    type="text"
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="e.g. Apex Construction LLC"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / Job Site
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="e.g. Greenville, SC"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSavingProject ? 'Saving...' : 'Save Estimate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Proposal & E-Sign Modal */}
      {shareProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                  🔗
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Client Proposal Portal Link</h3>
                  <p className="text-xs text-slate-500">Live online bid with electronic signature capture</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareProposalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-6">
              {/* Direct Email Submission Section */}
              <form onSubmit={handleSendProposalEmail} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-800">✉️ Email Directly to Client</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Delivers a direct branded proposal review &amp; e-signature invitation to your client. Automatically locks project into <strong>Submitted</strong> status.
                </p>

                {emailSentSuccess && (
                  <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
                    ✓ {emailSentSuccess}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Client Name / Attention</label>
                      <input
                        type="text"
                        value={clientRecipientName}
                        onChange={(e) => setClientRecipientName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Client Email Address *</label>
                      <input
                        type="email"
                        required
                        value={clientRecipientEmail}
                        onChange={(e) => setClientRecipientEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="w-full bg-white px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Invitation Email...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send Proposal &amp; Lock Project</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-700">Or Copy Public Link</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    Status: {shareProposalData?.client_status || 'sent'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicShareUrl}
                    className="w-full bg-white px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicShareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 3000);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs transition"
                  >
                    {shareCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="bg-indigo-50/60 p-4 rounded-2xl text-xs text-indigo-900 space-y-1.5 border border-indigo-100">
                <p className="font-bold flex items-center gap-1.5">
                  <span>✨</span> What your client sees:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Your custom company branding, logo, and contact info</li>
                  <li>Clean scope breakdown without internal cost markups or labor hours</li>
                  <li>One-click digital signature acceptance with legal timestamp</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={publicShareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Preview Client Portal ↗
              </a>

              <button
                type="button"
                onClick={() => setShareProposalModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="print-area" className="print-area bg-white rounded-lg border border-slate-200 p-6 relative overflow-hidden">
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
                  <p className="text-xs text-slate-500 mt-0.5">{branding.companyAddress}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  {branding.companyPhone && <span>Phone: {branding.companyPhone}</span>}
                  {branding.licenseNumber && <span>Lic #: {branding.licenseNumber}</span>}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 mt-2 sm:mt-0">
              <p className="font-semibold text-slate-800 text-sm">
                {currentProject?.name || 'Takeoff Proposal'}
              </p>
              {currentProject?.client_name && (
                <p>Prepared for: <span className="font-medium text-slate-700">{currentProject.client_name}</span></p>
              )}
              <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          /* Default Watermark/Header for Free Users */
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                T
              </div>
              <span className="text-sm font-semibold text-slate-700">Takeoff Engine</span>
            </div>
            <span className="text-xs text-slate-400">Generated with Takeoff Engine</span>
          </div>
        )}

        {!proposalMode && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Total Material Cost" value={formatCurrency(totals.totalMaterialCost)} />
            <SummaryCard
              label="Total Labor"
              value={formatCurrency(totals.totalLaborCost)}
              sub={`${formatNumber(totals.totalLaborHours)} hrs`}
            />
            <SummaryCard label="Equipment / Mobilization" value={formatCurrency(totals.equipmentLumpSum)} />
            <SummaryCard label="Total Direct Cost" value={formatCurrency(totals.totalDirectCost)} />
            <SummaryCard
              label={`Overhead (${totals.overheadPct}%)`}
              value={formatCurrency(totals.overheadAmount)}
            />
            <SummaryCard
              label={`Contingency (${totals.contingencyPct}%)`}
              value={formatCurrency(totals.contingencyAmount)}
            />
            <SummaryCard label={`Profit (${totals.profitPct}%)`} value={formatCurrency(totals.profitAmount)} />
            <SummaryCard label="Final Bid Amount" value={formatCurrency(totals.finalBidAmount)} highlight />
          </div>
        )}

        {proposalMode && (
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-wide text-slate-400 font-medium">Total Project Investment</p>
            <p className="text-4xl font-bold text-slate-900 mt-1">{formatCurrency(totals.finalBidAmount)}</p>
          </div>
        )}

        <div className="space-y-8">
          {bySystem.map((sys) => (
            <div key={sys.system}>
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">
                {sys.system}
              </h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-3">Description</th>
                    <th className="py-1 pr-3">Size / Spec</th>
                    <th className="py-1 pr-3 text-right">Qty</th>
                    <th className="py-1 pr-3">Unit</th>
                    {!proposalMode && <th className="py-1 pr-3 text-right">Material</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">Labor Hrs</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">Labor $</th>}
                    <th className="py-1 pr-3 text-right">{proposalMode ? 'Line Total' : 'Direct Cost'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sys.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-3">{item.description}</td>
                      <td className="py-1.5 pr-3 text-slate-500">{item.sizeSpec}</td>
                      <td className="py-1.5 pr-3 text-right">{formatNumber(item.quantity, 0)}</td>
                      <td className="py-1.5 pr-3">{item.unit}</td>
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatCurrency(item.materialCost)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatNumber(item.laborHours)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatCurrency(item.laborCost)}</td>}
                      <td className="py-1.5 pr-3 text-right font-medium">{formatCurrency(item.directCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-slate-200">
                    <td className="py-2 pr-3" colSpan={proposalMode ? 4 : 7}>
                      Subtotal
                    </td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(sys.directCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        {proposalMode && (
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
            <div className="w-full sm:w-64 text-right">
              <div className="flex justify-between text-slate-600 text-sm py-1">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.totalDirectCost)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>Total Bid</span>
                <span>{formatCurrency(totals.finalBidAmount)}</span>
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
      className={`rounded-lg border p-4 ${
        highlight ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
