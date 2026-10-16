import { ArrowRight, Check, PartyPopper } from 'lucide-react';
import { PricingStatus, usePricingDisplay } from '@/core/components/context/PricingContext';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

/**
 * Post-registration plan chooser.
 *
 * Split out of `LoginPage` (which had grown past 800 lines) so the catalog prices, the four plan
 * cards, and their checkout buttons live in one focused component.
 */
export default function PlanSelectionView({
  checkoutLoadingPlan,
  onSelectPlan,
  onSkip,
}: Readonly<{
  checkoutLoadingPlan: string;
  onSelectPlan: (planKey: string) => void;
  onSkip: () => void;
}>) {
  const { t, prices, ready } = usePricingDisplay();
  const {
    STARTER_MONTHLY_PRICE, PRO_MONTHLY_PRICE, ENTERPRISE_MONTHLY_PRICE,
    STARTER_YEARLY_PRICE, PRO_YEARLY_PRICE, ENTERPRISE_YEARLY_PRICE, EXTRA_SEAT_MONTHLY_PRICE,
  } = prices;

  return (
    <div>
      <PricingStatus />
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-3 inline-flex items-center gap-1.5">
          Account Created Successfully <PartyPopper className="w-3.5 h-3.5" />
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {t('core.loginPage.selectPlanTitle')}
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          {t('core.loginPage.selectPlanSubtitle')}
        </p>
      </div>

      {/* 4 Plan Cards Grid styled after Dark Theme Pricing UI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* 1. Free Trial */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('core.landing.pricing.freeTrial.tier', 'Free Trial')}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{t('core.landing.pricing.freeTrial.price', '$0')}</span>
              <span className="text-xs text-slate-400">{t('core.landing.pricing.freeTrial.cadence', '/ forever')}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {t('core.landing.pricing.freeTrial.noCard', 'no credit card required')}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[34px]">
              {t('core.landing.pricing.freeTrial.description', 'Perfect for evaluating your first job bids.')}
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.freeTrial.f1')}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f2')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f3')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f4')}</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            {t('core.landing.pricing.freeTrial.cta', 'Get Started Free')}
          </button>
        </div>
        {/* 2. Starter Tier */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('core.landing.pricing.starter.tier', 'Starter Tier')}
            </span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{t('core.landing.pricing.starter.price', { price: STARTER_MONTHLY_PRICE })}</span>
              <span className="text-xs text-slate-400">{t('core.landing.pricing.starter.cadence', '/ mo')}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {t('core.landing.pricing.starter.yearly', { yearly: STARTER_YEARLY_PRICE })}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[34px]">
              {t('core.landing.pricing.starter.description', 'Great for solo estimators bidding jobs weekly.')}
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.starter.f1', { seats: STARTER_PLAN_SEATS })}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.starter.f2')}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f3')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f4')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f5')}</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!ready || checkoutLoadingPlan === 'starter'}
            onClick={() => onSelectPlan('starter')}
            className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {checkoutLoadingPlan === 'starter' ? t('core.loginPage.launchingCheckout') : t('core.landing.pricing.starter.cta', 'Choose Starter')}
          </button>
        </div>

        {/* 3. Pro Tier (Most Popular) */}
        <div className="bg-gradient-to-b from-blue-950/80 to-slate-900 p-6 rounded-3xl border-2 border-blue-500 shadow-2xl relative flex flex-col justify-between">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
            {t('core.landing.pricing.pro.mostPopular', 'Most Popular')}
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              {t('core.landing.pricing.pro.tier', 'Pro Tier')}
            </span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{t('core.landing.pricing.pro.price', { price: PRO_MONTHLY_PRICE })}</span>
              <span className="text-xs text-slate-400">{t('core.landing.pricing.pro.cadence', '/ mo')}</span>
            </div>
            <div className="text-[10px] text-blue-300/80 font-medium mt-0.5">
              {t('core.landing.pricing.pro.yearly', { yearly: PRO_YEARLY_PRICE })}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]">
              {t('core.landing.pricing.pro.description', 'Unlimited power & full PDF report layouts.')}
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f1', { seats: PRO_PLAN_SEATS })}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f2')}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f3')}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f4')}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {t('core.landing.pricing.pro.f5')}</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!ready || checkoutLoadingPlan === 'pro'}
            onClick={() => onSelectPlan('pro')}
            className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {checkoutLoadingPlan === 'pro' ? t('core.loginPage.launchingCheckout') : t('core.landing.pricing.pro.cta', 'Upgrade to Pro')}
          </button>
        </div>
        {/* 4. Enterprise Tier */}
        <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {t('core.landing.pricing.enterprise.tier', 'Enterprise')}
            </span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{t('core.landing.pricing.enterprise.price', { price: ENTERPRISE_MONTHLY_PRICE })}</span>
              <span className="text-xs text-slate-400">{t('core.landing.pricing.enterprise.cadence', '/ mo')}</span>
            </div>
            <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">
              {t('core.landing.pricing.enterprise.yearly', { yearly: ENTERPRISE_YEARLY_PRICE })}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]">
              {t('core.landing.pricing.enterprise.description', 'Extra seats and team member management for growing companies.')}
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>{t('core.landing.pricing.enterprise.f1', { seats: ENTERPRISE_PLAN_SEATS })}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>{t('core.landing.pricing.enterprise.f2', { price: EXTRA_SEAT_MONTHLY_PRICE })}</strong></li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('core.landing.pricing.enterprise.f3')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('core.landing.pricing.enterprise.f4')}</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('core.landing.pricing.enterprise.f5')}</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={!ready || checkoutLoadingPlan === 'enterprise'}
            onClick={() => onSelectPlan('enterprise')}
            className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {checkoutLoadingPlan === 'enterprise' ? t('core.loginPage.launchingCheckout') : t('core.landing.pricing.enterprise.cta', 'Choose Enterprise')}
          </button>
        </div>
      </div>

      {/* Bottom Skip to Dashboard Link */}
      <div className="text-center pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition cursor-pointer inline-flex items-center gap-1"
        >
          {t('core.loginPage.skipForNow', 'Or continue to dashboard with Free Trial')} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
