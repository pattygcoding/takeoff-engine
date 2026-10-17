import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { billingApi } from '@/core/lib/billing/billing';
import { openPaddleCheckout } from '@/core/lib/billing/paddle';
import { PricingStatus, usePricingDisplay } from '@/core/components/context/PricingContext';
import { Check, ArrowRight } from 'lucide-react';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';
import type { UserProfile } from '@/types/models';

/** Whether the account already holds plan entitlements (so the chooser can show its current tier). */
function hasPlanEntitlements(user: UserProfile | null): boolean {
  return Boolean(user?.subscription_status === 'active' || user?.has_unlimited_bypass || user?.role === 'payment_exempt');
}

/** The tier the plan chooser treats as current. */
function currentTierOf(user: UserProfile | null): string {
  return hasPlanEntitlements(user) ? user?.subscription_tier || 'free' : 'free';
}

/** Where the chooser continues to: the user's workspace, or sign-in when we don't know the name. */
function workspaceTarget(username: string): string {
  return username ? `/${username}` : '/login';
}

/** Sandbox/instant activation used when Paddle checkout is unavailable. */
async function activateMockSubscription(planKey: string, interval: string): Promise<void> {
  const res = await billingApi.mockActivate(planKey, interval, 0);
  if (res.user) localStorage.setItem('takeoff_user', JSON.stringify(res.user));
}

/** Mirrors a completed Paddle checkout into our own subscription state, without failing the flow. */
async function syncCheckoutSubscription(planKey: string, interval: string): Promise<void> {
  try {
    await activateMockSubscription(planKey, interval);
  } catch (syncErr) {
    console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
  }
}

interface PlanCardFeature {
  text: string;
  bold?: boolean;
}

interface PlanCardProps {
  cardClassName: string;
  tierLabelClassName: string;
  checkClassName: string;
  noteClassName: string;
  descriptionClassName: string;
  featuresClassName: string;
  ctaClassName: string;
  currentCtaClassName: string;
  cornerBadge?: string;
  headerBadge?: string;
  tierLabel: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isAnnual: boolean;
  yearlyNote: string;
  description: string;
  features: PlanCardFeature[];
  isCurrent: boolean;
  isCheckoutLoading: boolean;
  ready: boolean;
  ctaText: string;
  currentPlanText: string;
  loadingText: string;
  onSelect: () => void;
  formatPrice: (amount?: number) => string;
}

/** One pricing tier card on the plan chooser. */
function PlanCard({
  cardClassName,
  tierLabelClassName,
  checkClassName,
  noteClassName,
  descriptionClassName,
  featuresClassName,
  ctaClassName,
  currentCtaClassName,
  cornerBadge,
  headerBadge,
  tierLabel,
  monthlyPrice,
  yearlyPrice,
  isAnnual,
  yearlyNote,
  description,
  features,
  isCurrent,
  isCheckoutLoading,
  ready,
  ctaText,
  currentPlanText,
  loadingText,
  onSelect,
  formatPrice,
}: Readonly<PlanCardProps>) {
  return (
    <div className={cardClassName}>
      {cornerBadge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
          {cornerBadge}
        </div>
      )}

      <div>
        {headerBadge ? (
          <div className="flex justify-between items-center mb-1">
            <span className={tierLabelClassName}>{tierLabel}</span>
            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              {headerBadge}
            </span>
          </div>
        ) : (
          <span className={tierLabelClassName}>{tierLabel}</span>
        )}
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-black text-white">
            {formatPrice(isAnnual ? yearlyPrice : monthlyPrice)}
          </span>
          <span className="text-xs text-slate-400">
            {isAnnual ? '/ yr' : '/ mo'}
          </span>
        </div>
        <div className={noteClassName}>
          {isAnnual ? 'billed annually • plus tax' : yearlyNote}
        </div>
        <p className={descriptionClassName}>
          {description}
        </p>

        <ul className={featuresClassName}>
          {features.map((feature) => (
            <li key={feature.text} className="flex items-center gap-2">
              <Check className={`w-3.5 h-3.5 ${checkClassName} shrink-0`} />
              {feature.bold ? <strong>{feature.text}</strong> : feature.text}
            </li>
          ))}
        </ul>
      </div>

      {isCurrent ? (
        <button
          type="button"
          disabled
          className={currentCtaClassName}
        >
          {currentPlanText}
        </button>
      ) : (
        <button
          type="button"
          disabled={!ready || isCheckoutLoading}
          onClick={onSelect}
          className={ctaClassName}
        >
          {isCheckoutLoading ? loadingText : ctaText}
        </button>
      )}
    </div>
  );
}

export default function PlanOnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { t, prices, ready, formatPrice } = usePricingDisplay();
  const {
    STARTER_MONTHLY_PRICE, PRO_MONTHLY_PRICE, ENTERPRISE_MONTHLY_PRICE,
    STARTER_YEARLY_PRICE, PRO_YEARLY_PRICE, ENTERPRISE_YEARLY_PRICE,
    EXTRA_SEAT_MONTHLY_PRICE, EXTRA_SEAT_YEARLY_PRICE,
  } = prices;
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'annually'
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');
  const [error, setError] = useState('');

  const guard = useSingleFlight();
  const isAnnual = billingInterval === 'annually';
  const targetUsername = user?.username || '';
  const currentTier = currentTierOf(user);

  const handleSelectFree = () => {
    navigate(workspaceTarget(targetUsername), { replace: true });
  };

  const handleSelectPaidPlan = guard('checkout', async (planKey: string) => {
    setError('');
    setCheckoutLoadingPlan(planKey);

    try {
      const checkoutParams = await billingApi.createCheckout(planKey, billingInterval, 0);

      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        items: checkoutParams.items,
        customerEmail: user?.email,
        pwCustomerId: user?.paddle_customer_id,
        customData: checkoutParams.customData,
        onSuccess: async () => {
          await syncCheckoutSubscription(planKey, billingInterval);
          if (refreshProfile) await refreshProfile();
          navigate(workspaceTarget(targetUsername), { replace: true });
        },
      });

      // Sandbox mock fallback if Paddle checkout overlay is disabled or mock mode
      if (!launched) {
        await activateMockSubscription(planKey, billingInterval);
        if (refreshProfile) await refreshProfile();
        navigate(workspaceTarget(targetUsername), { replace: true });
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize plan checkout');
    } finally {
      setCheckoutLoadingPlan('');
    }
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        <PricingStatus />
        {error && (
          <div className="mb-6 max-w-md mx-auto p-3.5 rounded-xl bg-red-900/40 border border-red-500/50 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('core.loginPage.selectPlanTitle', 'Choose Your Plan to Get Started')}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2">
            {t('core.loginPage.selectPlanSubtitle', 'Select the plan that best fits your workflow. You can change or cancel your subscription at any time.')}
          </p>

          {/* Monthly vs Annual Toggle */}
          <div className="mt-6 inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isAnnual
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('core.upgradeModal.monthlyBilling', 'Monthly Billing')}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('annually')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                isAnnual
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('core.upgradeModal.annualBilling', 'Annual Billing')}</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isAnnual ? 'bg-blue-900 text-amber-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {t('core.upgradeModal.twoMonthsFree', '2 Months Free')}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Paid Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-5xl mx-auto">
          {/* 1. Starter Tier */}
          <PlanCard
            cardClassName="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition shadow-xl"
            tierLabelClassName="text-xs font-bold uppercase tracking-wider text-slate-400"
            checkClassName="text-emerald-500"
            noteClassName="text-[10px] text-slate-400 font-medium mt-0.5"
            descriptionClassName="text-xs text-slate-400 mt-2 leading-relaxed min-h-[34px]"
            featuresClassName="mt-6 space-y-2.5 text-xs text-slate-300"
            ctaClassName="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            currentCtaClassName="mt-6 w-full py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl border border-slate-700 cursor-not-allowed opacity-75"
            tierLabel={t('core.landing.pricing.starter.tier', 'STARTER TIER')}
            monthlyPrice={STARTER_MONTHLY_PRICE}
            yearlyPrice={STARTER_YEARLY_PRICE}
            isAnnual={isAnnual}
            yearlyNote={t('core.landing.pricing.starter.yearly', { yearly: STARTER_YEARLY_PRICE })}
            description={t('core.landing.pricing.starter.description', 'Great for solo estimators bidding jobs weekly.')}
            features={[
              { text: t('core.landing.pricing.starter.f1', { seats: STARTER_PLAN_SEATS }), bold: true },
              { text: t('core.landing.pricing.starter.f2', 'Unlimited Calculations'), bold: true },
              { text: t('core.landing.pricing.starter.f3', 'Standard Word & PDF Export') },
              { text: t('core.landing.pricing.starter.f4', '2 Custom Rate Libraries') },
              { text: t('core.landing.pricing.starter.f5', 'Cloud Save & Project Dashboard') },
            ]}
            isCurrent={currentTier === 'starter'}
            isCheckoutLoading={checkoutLoadingPlan === 'starter'}
            ready={ready}
            ctaText={t('core.landing.pricing.starter.cta', 'Choose Starter')}
            currentPlanText={t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
            loadingText={t('core.loginPage.launchingCheckout', 'Launching Checkout...')}
            onSelect={() => handleSelectPaidPlan('starter')}
            formatPrice={formatPrice}
          />

          {/* 2. Pro Tier (Most Popular) */}
          <PlanCard
            cardClassName="bg-gradient-to-b from-blue-950/90 to-slate-900 p-6 rounded-3xl border-2 border-blue-500 shadow-2xl relative flex flex-col justify-between"
            tierLabelClassName="text-xs font-bold uppercase tracking-wider text-blue-400"
            checkClassName="text-blue-400"
            noteClassName="text-[10px] text-blue-300/80 font-medium mt-0.5"
            descriptionClassName="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]"
            featuresClassName="mt-6 space-y-2.5 text-xs text-slate-200"
            ctaClassName="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            currentCtaClassName="mt-6 w-full py-2.5 bg-blue-900/60 text-blue-300 text-xs font-bold rounded-xl border border-blue-700/60 cursor-not-allowed opacity-75"
            cornerBadge={currentTier === 'pro' ? t('core.upgradeModal.currentPlanBadge', 'Current Plan') : t('core.landing.pricing.pro.mostPopular', 'MOST POPULAR')}
            tierLabel={t('core.landing.pricing.pro.tier', 'PRO TIER')}
            monthlyPrice={PRO_MONTHLY_PRICE}
            yearlyPrice={PRO_YEARLY_PRICE}
            isAnnual={isAnnual}
            yearlyNote={t('core.landing.pricing.pro.yearly', { yearly: PRO_YEARLY_PRICE })}
            description={t('core.landing.pricing.pro.description', 'Unlimited power & full PDF report layouts.')}
            features={[
              { text: t('core.landing.pricing.pro.f1', { seats: PRO_PLAN_SEATS }), bold: true },
              { text: t('core.landing.pricing.pro.f2', 'All 17+ Advanced PDF Formats'), bold: true },
              { text: t('core.landing.pricing.pro.f3', 'Custom Branding & Logos'), bold: true },
              { text: t('core.landing.pricing.pro.f4', 'Client Portal & E-Signatures'), bold: true },
              { text: t('core.landing.pricing.pro.f5', 'Unlimited Custom Rate Libraries') },
            ]}
            isCurrent={currentTier === 'pro'}
            isCheckoutLoading={checkoutLoadingPlan === 'pro'}
            ready={ready}
            ctaText={t('core.landing.pricing.pro.cta', 'Upgrade to Pro')}
            currentPlanText={t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
            loadingText={t('core.loginPage.launchingCheckout', 'Launching Checkout...')}
            onSelect={() => handleSelectPaidPlan('pro')}
            formatPrice={formatPrice}
          />

          {/* 3. Enterprise Tier */}
          <PlanCard
            cardClassName="bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between"
            tierLabelClassName="text-xs font-bold uppercase tracking-wider text-amber-400"
            checkClassName="text-amber-400"
            noteClassName="text-[10px] text-amber-300/80 font-medium mt-0.5"
            descriptionClassName="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]"
            featuresClassName="mt-6 space-y-2.5 text-xs text-slate-300"
            ctaClassName="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            currentCtaClassName="mt-6 w-full py-2.5 bg-amber-950/60 text-amber-300 text-xs font-bold rounded-xl border border-amber-700/60 cursor-not-allowed opacity-75"
            headerBadge={currentTier === 'enterprise' ? t('core.upgradeModal.currentPlanBadge', 'Current Plan') : undefined}
            tierLabel={t('core.landing.pricing.enterprise.tier', 'ENTERPRISE')}
            monthlyPrice={ENTERPRISE_MONTHLY_PRICE}
            yearlyPrice={ENTERPRISE_YEARLY_PRICE}
            isAnnual={isAnnual}
            yearlyNote={t('core.landing.pricing.enterprise.yearly', { yearly: ENTERPRISE_YEARLY_PRICE })}
            description={t('core.landing.pricing.enterprise.description', 'Extra seats and team member management for growing companies.')}
            features={[
              { text: t('core.landing.pricing.enterprise.f1', { seats: ENTERPRISE_PLAN_SEATS }), bold: true },
              { text: t('core.landing.pricing.enterprise.f2', { price: isAnnual ? EXTRA_SEAT_YEARLY_PRICE : EXTRA_SEAT_MONTHLY_PRICE }), bold: true },
              { text: t('core.landing.pricing.enterprise.f3', 'All 17+ Advanced PDF Formats') },
              { text: t('core.landing.pricing.enterprise.f4', 'Team Workspaces & Member Roles') },
              { text: t('core.landing.pricing.enterprise.f5', 'All Pro features + priority support') },
            ]}
            isCurrent={currentTier === 'enterprise'}
            isCheckoutLoading={checkoutLoadingPlan === 'enterprise'}
            ready={ready}
            ctaText={t('core.landing.pricing.enterprise.cta', 'Choose Enterprise')}
            currentPlanText={t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
            loadingText={t('core.loginPage.launchingCheckout', 'Launching Checkout...')}
            onSelect={() => handleSelectPaidPlan('enterprise')}
            formatPrice={formatPrice}
          />
        </div>

        {/* Bottom Skip to Dashboard Link */}
        <div className="text-center pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSelectFree}
            className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition cursor-pointer inline-flex items-center gap-1"
          >
            {t('core.loginPage.skipForNow', 'Or continue to dashboard with Free Trial')} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
