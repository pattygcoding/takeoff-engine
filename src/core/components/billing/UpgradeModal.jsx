import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '@/core/lib/billing/billing';
import { openPaddleCheckout } from '@/core/lib/billing/paddle';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function UpgradeModal({ isOpen, onClose }) {
  const { user, logout, refreshProfile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('pro'); // 'starter', 'pro', or 'enterprise'
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'annually'
  const [additionalSeats, setAdditionalSeats] = useState(0);

  if (!isOpen) return null;

  const currentTier = user?.subscription_status === 'active' ? (user?.subscription_tier || 'free') : 'free';
  const tierHierarchy = { free: 0, starter: 1, pro: 2, enterprise: 3 };
  const currentTierRank = tierHierarchy[currentTier] || 0;
  const activeTierRank = tierHierarchy[activePlan] || 0;
  const isCurrentPlanSelected = user?.subscription_status === 'active' && currentTier === activePlan;
  const isDowngradeSelected = user?.subscription_status === 'active' && activeTierRank < currentTierRank;

  if (user?.role === 'payment_exempt' || user?.has_unlimited_bypass) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ✓
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('upgradeModal.alreadyUnlockedTitle')}</h3>
          <p className="text-sm text-slate-600 mb-6">
            {t('upgradeModal.alreadyUnlockedMessage')}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition"
          >
            {t('upgradeModal.gotItButton')}
          </button>
        </div>
      </div>
    );
  }

  const handleLaunchCheckout = async (selectedPlan) => {
    if (selectedPlan === currentTier && user?.subscription_status === 'active') {
      return;
    }

    const isDowngrading = user?.subscription_status === 'active' && (tierHierarchy[selectedPlan] || 0) < (tierHierarchy[currentTier] || 0);

    if (isDowngrading) {
      const confirmed = await showConfirm({
        title: t('upgradeModal.confirmDowngradeTitle', 'Confirm Plan Downgrade'),
        message: t('upgradeModal.confirmDowngradePrompt', {
          plan: selectedPlan.toUpperCase(),
          currentPlan: currentTier.toUpperCase(),
        }),
        confirmText: t('upgradeModal.confirmDowngradeBtn', 'Proceed with Downgrade'),
        cancelText: t('upgradeModal.cancelDowngradeBtn', 'Keep Current Plan'),
      });
      if (!confirmed) return;
    }

    setCheckoutLoading(true);
    try {
      const seatsToAdd = (selectedPlan === 'enterprise' || selectedPlan === 'pro') ? additionalSeats : 0;
      const checkoutParams = await billingApi.createCheckout(selectedPlan, billingInterval, seatsToAdd);

      // Attempt real Paddle.js overlay
      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        items: checkoutParams.items,
        customerEmail: user?.email,
        customData: checkoutParams.customData,
        onSuccess: async (data) => {
          try {
            // Instantly sync & activate the subscription in backend DB upon checkout completion
            const syncRes = await billingApi.mockActivate(selectedPlan, billingInterval, seatsToAdd);
            if (syncRes.user) {
              localStorage.setItem('takeoff_user', JSON.stringify(syncRes.user));
            }
          } catch (syncErr) {
            console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
          }
          if (refreshProfile) await refreshProfile();
          await showAlert({
            title: isDowngrading ? t('upgradeModal.downgradeScheduledTitle', 'Downgrade Scheduled') : t('upgradeModal.successTitle', 'Upgrade Successful'),
            message: isDowngrading
              ? `Your downgrade to ${selectedPlan.toUpperCase()} has been scheduled for your next billing cycle.`
              : `Congratulations! Your account has been upgraded to the ${selectedPlan.toUpperCase()} plan.`,
            variant: isDowngrading ? 'info' : 'success',
          });
          onClose();
        },
      });

      // If Paddle keys aren't configured yet in .env, perform instant sandbox mock activation
      if (!launched) {
        const mockRes = await billingApi.mockActivate(selectedPlan, billingInterval, seatsToAdd);
        if (mockRes.user) {
          localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
        }
        if (refreshProfile) await refreshProfile();
        await showAlert({
          title: isDowngrading ? 'Downgrade Scheduled' : 'Upgrade Successful',
          message: mockRes.message || (isDowngrading ? 'Downgrade scheduled for next cycle.' : 'Upgraded successfully via Sandbox Mock Mode!'),
          variant: isDowngrading ? 'info' : 'success',
        });
        onClose();
      }
    } catch (err) {
      await showAlert({
        title: t('upgradeModal.checkoutErrorTitle'),
        message: err.message || t('upgradeModal.checkoutErrorMessage'),
        variant: 'error',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRedeemCode = async (e) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    setPromoLoading(true);
    setPromoErr('');
    setPromoMsg('');

    try {
      const res = await billingApi.redeemPromoCode(promoCodeInput.trim());
      setPromoMsg(res.message);
      setPromoCodeInput('');
      if (refreshProfile) await refreshProfile();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setPromoErr(err.message || 'Failed to redeem promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const isAnnual = billingInterval === 'annually';

  // Base and display pricing
  const starterPrice = isAnnual ? 299.99 : 29.99;
  const proPrice = isAnnual ? 799.99 : 79.99;
  const enterpriseBasePrice = isAnnual ? 1999.99 : 199.99;
  const extraSeatPrice = isAnnual ? 299.99 : 29.99;

  const baseSeatsForPlan = activePlan === 'enterprise' ? 8 : (activePlan === 'pro' ? 3 : 1);
  const totalSeats = baseSeatsForPlan + (activePlan === 'enterprise' || activePlan === 'pro' ? additionalSeats : 0);

  const activeTotalPrice =
    activePlan === 'starter'
      ? starterPrice
      : activePlan === 'pro'
      ? proPrice + additionalSeats * extraSeatPrice
      : enterpriseBasePrice + additionalSeats * extraSeatPrice;

  const isExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier));

  const remainingCredits = typeof user?.trial_uses_remaining === 'number' ? user.trial_uses_remaining : 5;
  const isOutOfCredits = !isExempt && remainingCredits <= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in flex min-h-full items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 relative my-auto">
        {!isOutOfCredits && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 border border-amber-200 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('upgradeModal.title')}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {t('upgradeModal.subtitle')}
          </p>

          {/* Monthly vs Annual Toggle */}
          <div className="mt-4 inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('upgradeModal.monthlyBilling')}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annually')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                billingInterval === 'annually'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{t('upgradeModal.annualBilling')}</span>
              <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                billingInterval === 'annually' ? 'bg-indigo-800 text-amber-300' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {t('upgradeModal.twoMonthsFree')}
              </span>
            </button>
          </div>
        </div>

        {/* Plan Switcher - 3 Tiers */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            type="button"
            onClick={() => {
              setActivePlan('starter');
              setAdditionalSeats(0);
            }}
            className={`p-3 rounded-xl border text-left relative transition-all ${
              activePlan === 'starter'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            {currentTier === 'starter' && (
              <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {t('upgradeModal.currentPlanBadge', 'Current Plan')}
              </span>
            )}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-0.5">{t('upgradeModal.starterTier')}</div>
            <div className="text-sm font-extrabold text-slate-900">
              ${isAnnual ? '299.99' : '29.99'}
              <span className="text-[10px] font-normal text-slate-500">{isAnnual ? '/yr' : '/mo'}</span>
            </div>
            <div className="text-[9px] text-slate-400 font-medium">{t('upgradeModal.starterTaxAndSeats')}</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('upgradeModal.starterDescription')}</p>
          </button>

          <button
            type="button"
            onClick={() => setActivePlan('pro')}
            className={`p-3 rounded-xl border text-left relative transition-all ${
              activePlan === 'pro'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            {currentTier === 'pro' ? (
              <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {t('upgradeModal.currentPlanBadge', 'Current Plan')}
              </span>
            ) : (
              <span className="absolute -top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                {t('upgradeModal.popularBadge')}
              </span>
            )}
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-0.5">{t('upgradeModal.proTier')}</div>
            <div className="text-sm font-extrabold text-slate-900">
              ${isAnnual ? '799.99' : '79.99'}
              <span className="text-[10px] font-normal text-slate-500">{isAnnual ? '/yr' : '/mo'}</span>
            </div>
            <div className="text-[9px] text-indigo-600 font-bold">{t('upgradeModal.proTaxAndSeats')}</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('upgradeModal.proDescription')}</p>
          </button>

          <button
            type="button"
            onClick={() => setActivePlan('enterprise')}
            className={`p-3 rounded-xl border text-left relative transition-all ${
              activePlan === 'enterprise'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            {currentTier === 'enterprise' ? (
              <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                {t('upgradeModal.currentPlanBadge', 'Current Plan')}
              </span>
            ) : (
              <span className="absolute -top-2 right-2 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                {t('upgradeModal.multiSeatBadge')}
              </span>
            )}
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-0.5">{t('upgradeModal.enterpriseTier')}</div>
            <div className="text-sm font-extrabold text-slate-900">
              ${isAnnual ? '1999.99' : '199.99'}
              <span className="text-[10px] font-normal text-slate-500">{isAnnual ? '/yr' : '/mo'}</span>
            </div>
            <div className="text-[9px] text-amber-700 font-bold">{t('upgradeModal.enterpriseTaxAndSeats')}</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('upgradeModal.enterpriseDescription')}</p>
          </button>
        </div>

        {/* Additional Seat Selector for Pro & Enterprise */}
        {(activePlan === 'enterprise' || activePlan === 'pro') && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-4 text-xs">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-amber-950">{t('upgradeModal.teamSeatsLabel')}:</span>
              <span className="font-extrabold text-amber-900 text-xs">
                {totalSeats} {t('upgradeModal.seatsTotal')} ({baseSeatsForPlan} {t('upgradeModal.base')} + {additionalSeats} {t('upgradeModal.extra')})
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 text-[11px]">
                {t('upgradeModal.addExtraSeats', { price: isAnnual ? '299.99/yr' : '29.99/mo' })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdditionalSeats(Math.max(0, additionalSeats - 1))}
                  disabled={additionalSeats <= 0}
                  className="w-6 h-6 rounded bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm w-5 text-center">{additionalSeats}</span>
                <button
                  type="button"
                  onClick={() => setAdditionalSeats(additionalSeats + 1)}
                  className="w-6 h-6 rounded bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plan Feature Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 mb-4 border border-indigo-800/40 shadow-lg">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                {activePlan === 'starter' && t('upgradeModal.starterPlanLabel')}
                {activePlan === 'pro' && t('upgradeModal.proPlanLabel', { seats: totalSeats })}
                {activePlan === 'enterprise' && t('upgradeModal.enterprisePlanLabel', { seats: totalSeats })}
              </span>
              <h3 className="text-xl font-bold text-white flex items-baseline gap-1.5">
                ${activeTotalPrice.toFixed(2)} {isAnnual ? '/ year' : '/ month'}
                <span className="text-[11px] font-normal text-slate-400">({t('upgradeModal.plusTax')})</span>
              </h3>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              {t('upgradeModal.paddleMoRProtected')}
            </span>
          </div>

          {/* PDF Benefit Banner for Pro & Enterprise */}
          {(activePlan === 'pro' || activePlan === 'enterprise') && (
            <div className="bg-indigo-900/60 border border-indigo-400/40 rounded-lg p-2.5 mb-3 text-[11px] text-indigo-100 flex items-start gap-2">
              <span className="text-base">📄</span>
              <div>
                <strong className="text-amber-300">{t('upgradeModal.advancedPDFLabel')}:</strong> {t('upgradeModal.advancedPDFDescription')}
              </div>
            </div>
          )}

          <ul className="space-y-1.5 text-xs text-indigo-100 mb-4">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('upgradeModal.unlimitedExports')}</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>
                {activePlan === 'starter'
                  ? t('upgradeModal.starterPDFFormats')
                  : t('upgradeModal.advancedPDFFormats')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('upgradeModal.cloudPersistence')}</span>
            </li>
            {(activePlan === 'pro' || activePlan === 'enterprise') && (
              <li className="flex items-center gap-2 font-medium text-emerald-300">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{t('upgradeModal.customLetterheads')}</span>
              </li>
            )}
            {activePlan === 'enterprise' && (
              <li className="flex items-center gap-2 font-medium text-amber-300">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{t('upgradeModal.teamWorkspaces')}</span>
              </li>
            )}
          </ul>

          {/* Downgrade Explanatory Notice */}
          {isDowngradeSelected && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 text-[11px] text-amber-200 flex items-start gap-2">
              <span className="text-base">ℹ️</span>
              <div>
                <strong className="text-amber-300">Downgrade Note:</strong> {t('upgradeModal.downgradeNotice', {
                  plan: activePlan.toUpperCase(),
                  currentPlan: currentTier.toUpperCase(),
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => handleLaunchCheckout(activePlan)}
            disabled={checkoutLoading || isCurrentPlanSelected}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm shadow-md transition-all text-center ${
              isCurrentPlanSelected
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                : isDowngradeSelected
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
            }`}
          >
            {checkoutLoading
              ? t('upgradeModal.openingCheckout')
              : isCurrentPlanSelected
              ? t('upgradeModal.currentPlanButton', 'Current Active Plan')
              : isDowngradeSelected
              ? t('upgradeModal.downgradeButton', {
                  plan: activePlan === 'starter' ? t('upgradeModal.starterTier') : activePlan === 'pro' ? t('upgradeModal.proTier') : t('upgradeModal.enterpriseTier'),
                  price: activeTotalPrice.toFixed(2),
                  interval: isAnnual ? '/yr' : '/mo',
                })
              : t('upgradeModal.upgradeButton', { 
                  plan: activePlan === 'starter' ? t('upgradeModal.starterTier') : activePlan === 'pro' ? t('upgradeModal.proTier') : t('upgradeModal.enterpriseTier'),
                  price: activeTotalPrice.toFixed(2),
                  interval: isAnnual ? '/yr' : '/mo',
                })}
          </button>
        </div>

        {/* Promo Code Redemption Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {t('upgradeModal.promoCodeLabel')}
          </label>
          <form onSubmit={handleRedeemCode} className="flex gap-2">
            <input
              type="text"
              placeholder={t('upgradeModal.promoCodePlaceholder')}
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs uppercase font-mono tracking-wider bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={promoLoading || !promoCodeInput.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
            >
              {promoLoading ? t('upgradeModal.applyingCode') : t('upgradeModal.applyCodeButton')}
            </button>
          </form>

          {promoErr && (
            <p className="text-xs text-red-600 font-medium mt-2">✕ {promoErr}</p>
          )}
          {promoMsg && (
            <p className="text-xs text-emerald-700 font-medium mt-2">✓ {promoMsg}</p>
          )}
        </div>

        <div className="flex justify-center">
          {isOutOfCredits ? (
            <button
              onClick={async () => {
                if (logout) await logout();
                onClose();
                navigate('/login');
              }}
              className="text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>{t('upgradeModal.returnToLoginButton')}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              {t('upgradeModal.continuePreviewMode')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
