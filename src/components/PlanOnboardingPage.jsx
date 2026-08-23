import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { billingApi } from '@/lib/billing';
import { openPaddleCheckout } from '@/lib/paddle';
import { useTranslation } from '@/context/I18nContext';

export default function PlanOnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'annually'
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');
  const [error, setError] = useState('');

  const isAnnual = billingInterval === 'annually';
  const targetUsername = user?.username || '';

  const handleSelectFree = () => {
    if (targetUsername) {
      navigate(`/${targetUsername}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleSelectPaidPlan = async (planKey) => {
    setError('');
    setCheckoutLoadingPlan(planKey);

    try {
      const checkoutParams = await billingApi.createCheckout(planKey, billingInterval, 0);

      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        items: checkoutParams.items,
        customerEmail: user?.email,
        customData: checkoutParams.customData,
        onSuccess: async () => {
          try {
            const syncRes = await billingApi.mockActivate(planKey, billingInterval, 0);
            if (syncRes.user) {
              localStorage.setItem('takeoff_user', JSON.stringify(syncRes.user));
            }
          } catch (syncErr) {
            console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
          }
          if (refreshProfile) await refreshProfile();
          if (targetUsername) {
            navigate(`/${targetUsername}`, { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        },
      });

      // Sandbox mock fallback if Paddle checkout overlay is disabled or mock mode
      if (!launched) {
        const mockRes = await billingApi.mockActivate(planKey, billingInterval, 0);
        if (mockRes.user) {
          localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
        }
        if (refreshProfile) await refreshProfile();
        if (targetUsername) {
          navigate(`/${targetUsername}`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize plan checkout');
    } finally {
      setCheckoutLoadingPlan('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        {error && (
          <div className="mb-6 max-w-md mx-auto p-3.5 rounded-xl bg-red-900/40 border border-red-500/50 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('loginPage.selectPlanTitle', 'Choose Your Plan to Get Started')}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2">
            {t('loginPage.selectPlanSubtitle', 'Select the plan that best fits your workflow. You can change or cancel your subscription at any time.')}
          </p>

          {/* Monthly vs Annual Toggle */}
          <div className="mt-6 inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isAnnual
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('upgradeModal.monthlyBilling', 'Monthly Billing')}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annually')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                isAnnual
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('upgradeModal.annualBilling', 'Annual Billing')}</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isAnnual ? 'bg-indigo-900 text-amber-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {t('upgradeModal.twoMonthsFree', '2 Months Free')}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Paid Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-5xl mx-auto">
          {/* 1. Starter Tier */}
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition shadow-xl">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('landing.pricing.starter.tier', 'STARTER TIER')}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  ${isAnnual ? '299.99' : '29.99'}
                </span>
                <span className="text-xs text-slate-400">
                  {isAnnual ? '/ yr' : '/ mo'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isAnnual ? 'billed annually • plus tax' : t('landing.pricing.starter.yearly', 'or $299.99/yr • plus tax')}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[34px]">
                {t('landing.pricing.starter.description', 'Great for solo estimators bidding jobs weekly.')}
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.starter.f1', 'Single Estimator Seat')}</strong></li>
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.starter.f2', 'Unlimited Calculations')}</strong></li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f3', 'Standard Word & PDF Export')}</li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f4', '2 Custom Rate Libraries')}</li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f5', 'Cloud Save & Project Dashboard')}</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={checkoutLoadingPlan === 'starter'}
              onClick={() => handleSelectPaidPlan('starter')}
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {checkoutLoadingPlan === 'starter' ? t('loginPage.launchingCheckout', 'Launching Checkout...') : t('landing.pricing.starter.cta', 'Choose Starter')}
            </button>
          </div>

          {/* 2. Pro Tier (Most Popular) */}
          <div className="bg-gradient-to-b from-indigo-950/90 to-slate-900 p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl relative flex flex-col justify-between">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
              {t('landing.pricing.pro.mostPopular', 'MOST POPULAR')}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                {t('landing.pricing.pro.tier', 'PRO TIER')}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  ${isAnnual ? '799.99' : '79.99'}
                </span>
                <span className="text-xs text-slate-400">
                  {isAnnual ? '/ yr' : '/ mo'}
                </span>
              </div>
              <div className="text-[10px] text-indigo-300/80 font-medium mt-0.5">
                {isAnnual ? 'billed annually • plus tax' : t('landing.pricing.pro.yearly', 'or $799.99/yr • plus tax')}
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]">
                {t('landing.pricing.pro.description', 'Unlimited power & full PDF report layouts.')}
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f1', '3 Team Seats Included')}</strong></li>
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f2', 'All 17+ Advanced PDF Formats')}</strong></li>
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f3', 'Custom Branding & Logos')}</strong></li>
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f4', 'Client Portal & E-Signatures')}</strong></li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.pro.f5', 'Unlimited Custom Rate Libraries')}</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={checkoutLoadingPlan === 'pro'}
              onClick={() => handleSelectPaidPlan('pro')}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {checkoutLoadingPlan === 'pro' ? t('loginPage.launchingCheckout', 'Launching Checkout...') : t('landing.pricing.pro.cta', 'Upgrade to Pro')}
            </button>
          </div>

          {/* 3. Enterprise Tier */}
          <div className="bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {t('landing.pricing.enterprise.tier', 'ENTERPRISE')}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  ${isAnnual ? '1999.99' : '199.99'}
                </span>
                <span className="text-xs text-slate-400">
                  {isAnnual ? '/ yr' : '/ mo'}
                </span>
              </div>
              <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">
                {isAnnual ? 'billed annually • plus tax' : t('landing.pricing.enterprise.yearly', 'or $1999.99/yr • plus tax')}
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]">
                {t('landing.pricing.enterprise.description', 'Multi-seat collaboration for growing teams.')}
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.enterprise.f1', '8 Base Team Seats Included')}</strong></li>
                <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.enterprise.f2', isAnnual ? '+$299.99/yr per extra seat (+ tax)' : '+$29.99/mo per extra seat (+ tax)')}</strong></li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.enterprise.f3', 'All 17+ Advanced PDF Formats')}</li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.enterprise.f4', 'Team Workspaces & Shared Libraries')}</li>
                <li className="flex items-center gap-2">✓ {t('landing.pricing.enterprise.f5', 'All Pro features + priority support')}</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={checkoutLoadingPlan === 'enterprise'}
              onClick={() => handleSelectPaidPlan('enterprise')}
              className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {checkoutLoadingPlan === 'enterprise' ? t('loginPage.launchingCheckout', 'Launching Checkout...') : t('landing.pricing.enterprise.cta', 'Choose Enterprise')}
            </button>
          </div>
        </div>

        {/* Bottom Skip to Dashboard Link */}
        <div className="text-center pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSelectFree}
            className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition cursor-pointer"
          >
            {t('loginPage.skipForNow', 'Or continue to dashboard with Free Trial →')}
          </button>
        </div>
      </div>
    </div>
  );
}
