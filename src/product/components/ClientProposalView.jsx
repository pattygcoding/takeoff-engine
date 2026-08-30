import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { proposalsApi } from '@/lib/product/proposals';
import { formatCurrency, formatNumber, computeEstimate } from '@/lib/product/calculations';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';
import LanguageSelector from '@/core/components/shared/LanguageSelector';
import ClientCounterOfferModal from './ClientCounterOfferModal';
import ScopeSummaryDisplay from './ScopeSummaryDisplay';

export default function ClientProposalView() {
  const { publicToken } = useParams();
  const { showAlert } = useModal();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Signature Form States
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [signError, setSignError] = useState('');

  // Decline Modal States
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  // Counter-Offer / Inclusions Modal States
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [submittingCounter, setSubmittingCounter] = useState(false);

  useEffect(() => {
    if (publicToken) {
      loadProposal();
    }
  }, [publicToken]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await proposalsApi.getPublicProposal(publicToken);
      setData(res);
      if (res.proposal?.client_status === 'accepted') {
        setSignSuccess(true);
      }
    } catch (err) {
      setError(err.message || t('clientProposal.notFoundMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setSignError(t('clientProposal.legalNameRequired'));
      return;
    }
    if (!agreedToTerms) {
      setSignError(t('clientProposal.agreementRequired'));
      return;
    }

    setSubmitting(true);
    setSignError('');

    try {
      await proposalsApi.signPublicProposal(publicToken, {
        signerName,
        signerEmail,
      });
      setSignSuccess(true);
      await loadProposal();
    } catch (err) {
      setSignError(err.message || t('clientProposal.signatureError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    setDeclining(true);
    try {
      await proposalsApi.declinePublicProposal(publicToken, {
        reason: declineReason,
        signerEmail,
        signerName,
      });
      setShowDeclineModal(false);
      await loadProposal();
    } catch (err) {
      await showAlert({
        title: t('clientProposal.declineModalTitle'),
        message: err.message || t('clientProposal.declineError'),
        variant: 'error',
      });
    } finally {
      setDeclining(false);
    }
  };

  const handleCounterOffer = async ({ counterNotes, scopeChanges, clientName: cName, signerEmail: cEmail }) => {
    setSubmittingCounter(true);
    try {
      await proposalsApi.submitPublicCounterOffer(publicToken, {
        counterNotes,
        scopeChanges,
        clientName: cName || signerName,
        signerEmail: cEmail || signerEmail,
      });
      setShowCounterModal(false);
      await showAlert({
        title: t('clientProposal.counterSuccessTitle', 'Counter-Offer Submitted'),
        message: t('clientProposal.counterSuccessMsg', 'Your scope counter-offer has been sent directly to the contractor. They will review your notes and updated inclusions/exclusions.'),
        variant: 'success',
      });
      await loadProposal();
    } catch (err) {
      await showAlert({
        title: t('clientProposal.counterErrorTitle', 'Submission Error'),
        message: err.message || t('clientProposal.counterError', 'Failed to submit counter-offer.'),
        variant: 'error',
      });
    } finally {
      setSubmittingCounter(false);
    }
  };

  const { proposal = {}, contractor = {} } = data || {};
  const snapshot = proposal?.proposal_data_json || {};
  const isAccepted = proposal?.client_status === 'accepted';
  const isDeclined = proposal?.client_status === 'declined';
  const brandColor = contractor?.brand_color || '#0284c7';

  // Compute estimate totals dynamically if snapshot.summary.finalBidAmount is missing or 0
  // (also the only source for scopeAddonsCost, which isn't persisted in the stored summary snapshot)
  const [computedSummary, setComputedSummary] = useState(null);

  useEffect(() => {
    const items = snapshot?.items || [];
    const rates = snapshot?.rates || {};
    if (items.length === 0) {
      setComputedSummary(null);
      return;
    }
    let active = true;
    computeEstimate(items, rates)
      .then((res) => {
        if (active) setComputedSummary(res?.totals || null);
      })
      .catch(() => {
        if (active) setComputedSummary(null);
      });
    return () => {
      active = false;
    };
  }, [snapshot]);

  const finalBidAmount =
    Number(snapshot?.summary?.finalBidAmount) > 0
      ? Number(snapshot.summary.finalBidAmount)
      : computedSummary?.finalBidAmount || 0;

  const scopeAddonsCost = Number(computedSummary?.scopeAddonsCost) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('clientProposal.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('clientProposal.notFoundTitle')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{error || t('clientProposal.notFoundMessage')}</p>
          <a
            href="https://pattygcoding.github.io/takeoff-engine"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
          >
            {t('clientProposal.goToApp')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Utility Bar (Language Selector) */}
        <div className="flex justify-end items-center">
          <LanguageSelector variant="light" />
        </div>

        {/* Status Notification Banner */}
        {isAccepted && (
          <div className="bg-emerald-500 dark:bg-emerald-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-bold text-sm">{t('clientProposal.acceptedBannerTitle')}</p>
                <p className="text-xs text-emerald-100">
                  {t('clientProposal.signedByOn', {
                    name: proposal?.signed_by_name || 'Client',
                    date: proposal?.signed_at ? new Date(proposal.signed_at).toLocaleString() : '',
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-xs font-semibold rounded-lg shadow transition cursor-pointer"
            >
              {t('clientProposal.printSavePdf')}
            </button>
          </div>
        )}

        {isDeclined && (
          <div className="bg-red-500 dark:bg-red-600 text-white p-4 rounded-2xl shadow-md flex items-center gap-3 animate-fade-in">
            <span className="text-2xl">✕</span>
            <div>
              <p className="font-bold text-sm">{t('clientProposal.declinedBannerTitle')}</p>
              <p className="text-xs text-red-100">
                {t('clientProposal.declineReasonPrefix')} {proposal?.decline_reason || t('clientProposal.declinedByClient')}
              </p>
            </div>
          </div>
        )}

        {/* Main Proposal Document */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Top Header & Contractor Brand */}
          <div className="p-6 sm:p-8 border-b-2" style={{ borderColor: brandColor }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {contractor?.company_logo_url ? (
                  <img
                    src={contractor.company_logo_url}
                    alt={contractor.company_name || 'Contractor Logo'}
                    className="h-16 max-w-[180px] object-contain rounded"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(contractor?.company_name?.[0] || contractor?.first_name?.[0] || 'T').toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold tracking-tight" style={{ color: brandColor }}>
                    {contractor?.company_name || `${contractor?.first_name || ''} ${contractor?.last_name || ''}`.trim() || 'General Contractor'}
                  </h1>
                  {contractor?.company_address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{contractor.company_address}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {contractor?.phone_number && <span>📞 {contractor.phone_number}</span>}
                    {contractor?.email && <span>✉️ {contractor.email}</span>}
                    {contractor?.license_number && (
                      <span>
                        {t('clientProposal.license', { license: contractor.license_number }) || `License: #${contractor.license_number}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  {t('clientProposal.projectEstimate')}
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{snapshot?.projectName || t('clientProposal.civilTakeoffProposal')}</p>
                {snapshot?.clientName && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t('clientProposal.preparedFor')} <strong className="text-slate-800 dark:text-slate-200">{snapshot.clientName}</strong></p>
                )}
                {snapshot?.location && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clientProposal.location')} {snapshot.location}</p>
                )}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{t('clientProposal.date')} {proposal?.created_at ? new Date(proposal.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Big Bid Investment Highlight */}
          <div className="bg-slate-50/80 dark:bg-slate-800/50 p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
              {t('clientProposal.totalProposedInvestment')}
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: brandColor }}>
              {formatCurrency(finalBidAmount)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('clientProposal.investmentSubtitle')}
            </p>
            {scopeAddonsCost > 0 && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2">
                {t('resultsStep.scopeAddonsNote', { amount: formatCurrency(scopeAddonsCost) })}
              </p>
            )}
          </div>

          {/* Scope of Work Breakdown */}
          <div className="p-6 sm:p-8 space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
              {t('clientProposal.detailedScopeTitle')}
            </h2>

            {snapshot.items && snapshot.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <th className="py-2 pr-4">{t('clientProposal.itemAndDescription')}</th>
                      <th className="py-2 pr-4">{t('clientProposal.systemDivision')}</th>
                      <th className="py-2 pr-4">{t('clientProposal.sizeSpec')}</th>
                      <th className="py-2 pr-4 text-right">{t('clientProposal.quantity')}</th>
                      <th className="py-2 text-right">{t('clientProposal.unit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {snapshot.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{item.description}</td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            {item.system || t('clientProposal.generalSystem')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 text-xs">{item.sizeSpec || '—'}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatNumber(item.quantity, 0)}
                        </td>
                        <td className="py-2.5 text-right text-slate-500 dark:text-slate-400 text-xs uppercase">{item.unit || 'EA'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">{t('clientProposal.noItemsFound')}</p>
            )}

            {/* Scope Inclusions & Exclusions */}
            <ScopeSummaryDisplay scopeItems={snapshot?.rates?.scopeItems} className="mt-6" />

            {/* Standard Terms / Acceptance Notes */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-300">{t('clientProposal.termsTitle')}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('clientProposal.term1')}</li>
                <li>{t('clientProposal.term2')}</li>
                <li>{t('clientProposal.term3')}</li>
              </ul>
            </div>
          </div>

          {/* E-Signature Section */}
          {!isAccepted && !isDeclined && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 border-t border-slate-200 dark:border-slate-800">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('clientProposal.acceptSignTitle')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('clientProposal.acceptSignSubtitle')}
                  </p>
                </div>

                {signError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl">
                    ✕ {signError}
                  </div>
                )}

                <form onSubmit={handleSign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {t('clientProposal.legalNameLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('clientProposal.legalNamePlaceholder')}
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {t('clientProposal.emailLabel')}
                    </label>
                    <input
                      type="email"
                      placeholder={t('clientProposal.emailPlaceholder')}
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t('clientProposal.agreementCheckbox')}
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between pt-4 gap-3">
                    <button
                      type="button"
                      disabled={!agreedToTerms}
                      onClick={() => setShowDeclineModal(true)}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer"
                    >
                      {t('clientProposal.declineButton')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCounterModal(true)}
                      className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm border border-amber-500 shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⚖️</span>
                      <span>{t('clientProposal.counterOfferBtn', 'Exclusions / Inclusions Counter-Offer')}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !agreedToTerms || !signerName.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer ml-auto"
                    >
                      {submitting ? t('clientProposal.submittingSignature') : t('clientProposal.acceptSignButton')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 pb-8">
          <a href="https://pattygcoding.github.io/takeoff-engine" className="underline hover:text-slate-600 dark:hover:text-slate-300">
            {t('clientProposal.footerTagline')}
          </a>
        </div>
      </div>

      {/* Scope Inclusions / Counter Offer Modal */}
      {showCounterModal && (
        <ClientCounterOfferModal
          currentScope={snapshot?.scopeItems || []}
          clientName={signerName}
          signerEmail={signerEmail}
          submitting={submittingCounter}
          onClose={() => setShowCounterModal(false)}
          onSubmit={handleCounterOffer}
        />
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('clientProposal.declineModalTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('clientProposal.declineModalSubtitle')}
            </p>

            <form onSubmit={handleDecline}>
              <textarea
                rows={3}
                placeholder={t('clientProposal.declineModalPlaceholder')}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {t('clientProposal.declineModalCancel')}
                </button>
                <button
                  type="submit"
                  disabled={declining}
                  className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {declining ? t('clientProposal.submittingDecline') : t('clientProposal.declineModalConfirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
