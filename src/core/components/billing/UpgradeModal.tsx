import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '@/core/lib/billing/billing';
import { openPaddleCheckout } from '@/core/lib/billing/paddle';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { PricingStatus, usePricingDisplay } from '@/core/components/context/PricingContext';
import { X, Check, FileText, Info } from 'lucide-react';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

const TIER_HIERARCHY: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };

type AuthUser = ReturnType<typeof useAuth>['user'];

/** The tier the modal treats as the account's current one. */
function currentTierOf(user: AuthUser): string {
  if (user?.subscription_status !== 'active') return 'free';
  return user?.subscription_tier || 'free';
}

/** Whether the selected plan is already the account's plan. */
function isPlanCurrent(user: AuthUser, activePlan: string): boolean {
  return user?.subscription_status === 'active' && currentTierOf(user) === activePlan;
}

/** Whether picking the selected plan would downgrade the account. */
function isPlanDowngrade(user: AuthUser, activePlan: string): boolean {
  const currentRank = TIER_HIERARCHY[currentTierOf(user)] || 0;
  const activeRank = TIER_HIERARCHY[activePlan] || 0;
  return user?.subscription_status === 'active' && activeRank < currentRank;
}

/** Whether the account already holds a live Paddle subscription. */
function hasLiveSubscription(user: AuthUser): boolean {
  return Boolean(user?.paddle_subscription_id) && user?.subscription_status === 'active';
}

/** Whether the account bypasses billing entirely (admin / VIP / paid tier). */
function isExemptUser(user: AuthUser): boolean {
  if (user?.role === 'admin') return true;
  if (user?.role === 'payment_exempt') return true;
  if (user?.has_unlimited_bypass === true) return true;
  return user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier ?? '');
}

/** Trial takeoffs left, defaulting to five. */
function remainingCreditsOf(user: AuthUser): number {
  if (typeof user?.trial_uses_remaining !== 'number') return 5;
  return user.trial_uses_remaining;
}

/** Whether the account is out of free trial takeoffs. */
function isOutOfCreditsFor(user: AuthUser): boolean {
  return !isExemptUser(user) && remainingCreditsOf(user) <= 0;
}

/** Base seats bundled with a plan. */
function baseSeatsFor(plan: string): number {
  if (plan === 'enterprise') return ENTERPRISE_PLAN_SEATS;
  if (plan === 'pro') return PRO_PLAN_SEATS;
  return STARTER_PLAN_SEATS;
}

/** Whether the plan supports extra seats. */
function planSupportsExtraSeats(plan: string): boolean {
  return plan === 'pro' || plan === 'enterprise';
}

/** Extra seats applied at checkout (Pro/Enterprise only). */
function extraSeatsFor(plan: string, additionalSeats: number): number {
  if (!planSupportsExtraSeats(plan)) return 0;
  return additionalSeats;
}

/** Total seats for the plan, including any extras. */
function totalSeatsFor(plan: string, additionalSeats: number): number {
  return baseSeatsFor(plan) + extraSeatsFor(plan, additionalSeats);
}

/** Welcome price for the active plan (base fee plus any extra seats). */
function activeTotalPriceFor(plan: string, isAnnual: boolean, additionalSeats: number, prices: Record<string, number>): number {
  const extraSeatPrice = isAnnual ? prices.EXTRA_SEAT_YEARLY_PRICE : prices.EXTRA_SEAT_MONTHLY_PRICE;
  if (plan === 'starter') return isAnnual ? prices.STARTER_YEARLY_PRICE : prices.STARTER_MONTHLY_PRICE;
  if (plan === 'pro') return (isAnnual ? prices.PRO_YEARLY_PRICE : prices.PRO_MONTHLY_PRICE) + additionalSeats * extraSeatPrice;
  return (isAnnual ? prices.ENTERPRISE_YEARLY_PRICE : prices.ENTERPRISE_MONTHLY_PRICE) + additionalSeats * extraSeatPrice;
}

/** Interval suffix used in compact price labels. */
function intervalSuffix(isAnnual: boolean, short = true): string {
  if (!short) return isAnnual ? '/ year' : '/ month';
  return isAnnual ? '/yr' : '/mo';
}

/** Class for the billing interval toggle buttons. */
function intervalButtonClass(selected: boolean, selectedClass: string, extraClass = ''): string {
  const tone = selected ? selectedClass : 'text-slate-600 hover:text-slate-900';
  return `px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${extraClass}${tone}`;
}

/** Class for the annual-billing "two months free" pill. */
function annualBadgeClass(isAnnual: boolean): string {
  if (isAnnual) return 'bg-blue-800 text-amber-300';
  return 'bg-emerald-100 text-emerald-800';
}

/** Class for one plan tier card. */
function planCardClass(activePlan: string, plan: string): string {
  const selected = 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20';
  const idle = 'border-slate-200 bg-slate-50 hover:bg-slate-100/70';
  return `p-3 rounded-xl border text-left relative transition-all ${activePlan === plan ? selected : idle}`;
}

/** The checkout CTA class for the selected plan state. */
function checkoutButtonClass(isCurrent: boolean, isDowngrade: boolean): string {
  if (isCurrent) return 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600';
  if (isDowngrade) return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25';
  return 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25';
}

/** Display name for a plan tier. */
function planTierName(plan: string): string {
  if (plan === 'starter') return 'starterTier';
  if (plan === 'pro') return 'proTier';
  return 'enterpriseTier';
}

type PricingTranslate = (key: string, params?: string | Record<string, string | number | undefined>) => string;
type ShowAlert = ReturnType<typeof useModal>['showAlert'];
type ShowConfirm = ReturnType<typeof useModal>['showConfirm'];

/** Shown to admins / VIP accounts that never need to check out. */
function ExemptNotice({ t, onClose }: Readonly<{ t: PricingTranslate; onClose: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{t('core.upgradeModal.alreadyUnlockedTitle')}</h3>
        <p className="text-sm text-slate-600 mb-6">
          {t('core.upgradeModal.alreadyUnlockedMessage')}
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition"
        >
          {t('core.upgradeModal.gotItButton')}
        </button>
      </div>
    </div>
  );
}

/** Monthly / annual billing switch. */
function BillingIntervalToggle({ isAnnual, onChange, t }: Readonly<{ isAnnual: boolean; onChange: (interval: string) => void; t: PricingTranslate }>) {
  return (
    <div className="mt-4 inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={intervalButtonClass(!isAnnual, 'bg-white text-slate-900 shadow-sm')}
      >
        {t('core.upgradeModal.monthlyBilling')}
      </button>
      <button
        type="button"
        onClick={() => onChange('annually')}
        className={intervalButtonClass(isAnnual, 'bg-blue-600 text-white shadow-sm', 'flex items-center gap-1.5 ')}
      >
        <span>{t('core.upgradeModal.annualBilling')}</span>
        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${annualBadgeClass(isAnnual)}`}>
          {t('core.upgradeModal.twoMonthsFree')}
        </span>
      </button>
    </div>
  );
}

interface TierButtonProps {
  activePlan: string;
  currentTier: string;
  isAnnual: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  seats: number;
  formatPrice: (amount?: number) => string;
  onSelect: () => void;
  t: PricingTranslate;
}

/** The Starter plan card in the modal's tier selector. */
function StarterTierButton({ activePlan, currentTier, isAnnual, monthlyPrice, yearlyPrice, seats, formatPrice, onSelect, t }: Readonly<TierButtonProps>) {
  return (
    <button
      type="button"
      aria-pressed={activePlan === 'starter'}
      onClick={onSelect}
      className={planCardClass(activePlan, 'starter')}
    >
      {currentTier === 'starter' && (
        <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          {t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
        </span>
      )}
      <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-0.5">{t('core.upgradeModal.starterTier')}</div>
      <div className="text-sm font-extrabold text-slate-900">
        {formatPrice(isAnnual ? yearlyPrice : monthlyPrice)}
        <span className="text-[10px] font-normal text-slate-500">{intervalSuffix(isAnnual)}</span>
      </div>
      <div className="text-[9px] text-slate-400 font-medium">{t('core.upgradeModal.starterTaxAndSeats', { seats })}</div>
      <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('core.upgradeModal.starterDescription')}</p>
    </button>
  );
}

/** The Pro plan card in the modal's tier selector. */
function ProTierButton({ activePlan, currentTier, isAnnual, monthlyPrice, yearlyPrice, seats, formatPrice, onSelect, t }: Readonly<TierButtonProps>) {
  return (
    <button
      type="button"
      aria-pressed={activePlan === 'pro'}
      onClick={onSelect}
      className={planCardClass(activePlan, 'pro')}
    >
      {currentTier === 'pro' ? (
        <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          {t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
        </span>
      ) : (
        <span className="absolute -top-2 right-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
          {t('core.upgradeModal.popularBadge')}
        </span>
      )}
      <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-0.5">{t('core.upgradeModal.proTier')}</div>
      <div className="text-sm font-extrabold text-slate-900">
        {formatPrice(isAnnual ? yearlyPrice : monthlyPrice)}
        <span className="text-[10px] font-normal text-slate-500">{intervalSuffix(isAnnual)}</span>
      </div>
      <div className="text-[9px] text-blue-600 font-bold">{t('core.upgradeModal.proTaxAndSeats', { seats })}</div>
      <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('core.upgradeModal.proDescription')}</p>
    </button>
  );
}

/** The Enterprise plan card in the modal's tier selector. */
function EnterpriseTierButton({ activePlan, currentTier, isAnnual, monthlyPrice, yearlyPrice, seats, formatPrice, onSelect, t }: Readonly<TierButtonProps>) {
  return (
    <button
      type="button"
      aria-pressed={activePlan === 'enterprise'}
      onClick={onSelect}
      className={planCardClass(activePlan, 'enterprise')}
    >
      {currentTier === 'enterprise' ? (
        <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          {t('core.upgradeModal.currentPlanBadge', 'Current Plan')}
        </span>
      ) : (
        <span className="absolute -top-2 right-2 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
          {t('core.upgradeModal.multiSeatBadge')}
        </span>
      )}
      <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-0.5">{t('core.upgradeModal.enterpriseTier')}</div>
      <div className="text-sm font-extrabold text-slate-900">
        {formatPrice(isAnnual ? yearlyPrice : monthlyPrice)}
        <span className="text-[10px] font-normal text-slate-500">{intervalSuffix(isAnnual)}</span>
      </div>
      <div className="text-[9px] text-amber-700 font-bold">{t('core.upgradeModal.enterpriseTaxAndSeats', { seats })}</div>
      <p className="text-[10px] text-slate-500 leading-snug mt-1">{t('core.upgradeModal.enterpriseDescription')}</p>
    </button>
  );
}

/** Live preview of the plan label shown above the price. */
function planLabel(t: PricingTranslate, plan: string, totalSeats: number): string {
  if (plan === 'starter') return t('core.upgradeModal.starterPlanLabel');
  if (plan === 'pro') return t('core.upgradeModal.proPlanLabel', { seats: totalSeats });
  return t('core.upgradeModal.enterprisePlanLabel', { seats: totalSeats });
}

/** Label for the modal's checkout button. */
function checkoutLabel(
  t: PricingTranslate,
  state: { loading: boolean; isCurrent: boolean; isDowngrade: boolean; plan: string; price: number; ready: boolean; isAnnual: boolean },
): string {
  if (state.loading) return t('core.upgradeModal.openingCheckout');
  if (state.isCurrent) return t('core.upgradeModal.currentPlanButton', 'Current Active Plan');
  const params = {
    plan: t(`core.upgradeModal.${planTierName(state.plan)}`),
    price: state.ready ? state.price.toFixed(2) : undefined,
    interval: intervalSuffix(state.isAnnual),
  };
  if (state.isDowngrade) return t('core.upgradeModal.downgradeButton', params);
  return t('core.upgradeModal.upgradeButton', params);
}

/** Extra-seat stepper shown for the Pro and Enterprise plans. */
function ExtraSeatsPanel({
  additionalSeats,
  totalSeats,
  baseSeats,
  isAnnual,
  extraSeatMonthly,
  extraSeatYearly,
  onChangeAdditionalSeats,
  t,
}: Readonly<{
  additionalSeats: number;
  totalSeats: number;
  baseSeats: number;
  isAnnual: boolean;
  extraSeatMonthly: number;
  extraSeatYearly: number;
  onChangeAdditionalSeats: (next: number) => void;
  t: PricingTranslate;
}>) {
  const seatPrice = isAnnual ? `${extraSeatYearly}/yr` : `${extraSeatMonthly}/mo`;
  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 mb-4 text-xs">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-bold text-amber-950">{t('core.upgradeModal.teamSeatsLabel')}:</span>
        <span className="font-extrabold text-amber-900 text-xs">
          {totalSeats} {t('core.upgradeModal.seatsTotal')} ({baseSeats} {t('core.upgradeModal.base')} + {additionalSeats} {t('core.upgradeModal.extra')})
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-600 text-[11px]">
          {t('core.upgradeModal.addExtraSeats', { price: seatPrice })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeAdditionalSeats(Math.max(0, additionalSeats - 1))}
            disabled={additionalSeats <= 0}
            className="w-6 h-6 rounded bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 disabled:opacity-40"
          >
            -
          </button>
          <span className="font-mono font-bold text-sm w-5 text-center">{additionalSeats}</span>
          <button
            type="button"
            onClick={() => onChangeAdditionalSeats(additionalSeats + 1)}
            className="w-6 h-6 rounded bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tick glyph used in the plan benefit list. */
function CheckBullet({ toneClassName = 'text-emerald-400' }: Readonly<{ toneClassName?: string }>) {
  return (
    <svg aria-hidden="true" className={`w-4 h-4 ${toneClassName} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

/** Selected-plan summary card with benefits and the checkout CTA. */
function PlanFeatureCard({
  activePlan,
  currentTier,
  isAnnual,
  totalSeats,
  activeTotalPrice,
  ready,
  checkoutLoading,
  isCurrentPlanSelected,
  isDowngradeSelected,
  formatPrice,
  onCheckout,
  t,
}: Readonly<{
  activePlan: string;
  currentTier: string;
  isAnnual: boolean;
  totalSeats: number;
  activeTotalPrice: number;
  ready: boolean;
  checkoutLoading: boolean;
  isCurrentPlanSelected: boolean;
  isDowngradeSelected: boolean;
  formatPrice: (amount?: number) => string;
  onCheckout: () => void;
  t: PricingTranslate;
}>) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 mb-4 border border-blue-800/40 shadow-lg">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {planLabel(t, activePlan, totalSeats)}
          </span>
          <h3 className="text-xl font-bold text-white flex items-baseline gap-1.5">
            {formatPrice(activeTotalPrice)} {intervalSuffix(isAnnual, false)}
            <span className="text-[11px] font-normal text-slate-400">({t('core.upgradeModal.plusTax')})</span>
          </h3>
        </div>
        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
          {t('core.upgradeModal.paddleMoRProtected')}
        </span>
      </div>

      {planSupportsExtraSeats(activePlan) && (
        <div className="bg-blue-900/60 border border-blue-400/40 rounded-lg p-2.5 mb-3 text-[11px] text-blue-100 flex items-start gap-2">
          <span className="text-base"><FileText className="w-4 h-4" /></span>
          <div>
            <strong className="text-amber-300">{t('core.upgradeModal.advancedPDFLabel')}:</strong> {t('core.upgradeModal.advancedPDFDescription')}
          </div>
        </div>
      )}

      <ul className="space-y-1.5 text-xs text-blue-100 mb-4">
        <li className="flex items-center gap-2">
          <CheckBullet />
          <span>{t('core.upgradeModal.unlimitedExports')}</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckBullet />
          <span>
            {activePlan === 'starter'
              ? t('core.upgradeModal.starterPDFFormats')
              : t('core.upgradeModal.advancedPDFFormats')}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <CheckBullet />
          <span>{t('core.upgradeModal.cloudPersistence')}</span>
        </li>
        {planSupportsExtraSeats(activePlan) && (
          <li className="flex items-center gap-2 font-medium text-emerald-300">
            <CheckBullet />
            <span>{t('core.upgradeModal.customLetterheads')}</span>
          </li>
        )}
        {activePlan === 'enterprise' && (
          <li className="flex items-center gap-2 font-medium text-amber-300">
            <CheckBullet toneClassName="text-amber-400" />
            <span>{t('core.upgradeModal.teamWorkspaces')}</span>
          </li>
        )}
      </ul>

      {isDowngradeSelected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 text-[11px] text-amber-200 flex items-start gap-2">
          <span className="text-base"><Info className="w-4 h-4" /></span>
          <div>
            <strong className="text-amber-300">Downgrade Note:</strong> {t('core.upgradeModal.downgradeNotice', {
              plan: activePlan.toUpperCase(),
              currentPlan: currentTier.toUpperCase(),
            })}
          </div>
        </div>
      )}

      <button
        onClick={onCheckout}
        disabled={!ready || checkoutLoading || isCurrentPlanSelected}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm shadow-md transition-all text-center ${checkoutButtonClass(isCurrentPlanSelected, isDowngradeSelected)}`}
      >
        {checkoutLabel(t, {
          loading: checkoutLoading,
          isCurrent: isCurrentPlanSelected,
          isDowngrade: isDowngradeSelected,
          plan: activePlan,
          price: activeTotalPrice,
          ready,
          isAnnual,
        })}
      </button>
    </div>
  );
}

/** Promo-code redemption form inside the modal. */
function PromoCodeForm({
  promoCodeInput,
  promoLoading,
  promoMsg,
  promoErr,
  onCodeChange,
  onSubmit,
  t,
}: Readonly<{
  promoCodeInput: string;
  promoLoading: boolean;
  promoMsg: string;
  promoErr: string;
  onCodeChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  t: PricingTranslate;
}>) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        {t('core.upgradeModal.promoCodeLabel')}
      </label>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={t('core.upgradeModal.promoCodePlaceholder')}
          value={promoCodeInput}
          onChange={(e) => onCodeChange(e.target.value)}
          className="flex-1 px-3 py-2 text-xs uppercase font-mono tracking-wider bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={promoLoading || !promoCodeInput.trim()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
        >
          {promoLoading ? t('core.upgradeModal.applyingCode') : t('core.upgradeModal.applyCodeButton')}
        </button>
      </form>

      {promoErr && (
        <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1"><X className="w-3.5 h-3.5 shrink-0" /> {promoErr}</p>
      )}
      {promoMsg && (
        <p className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5 shrink-0" /> {promoMsg}</p>
      )}
    </div>
  );
}

/** Footer actions below the modal body. */
function CreditsFooter({ isOutOfCredits, onClose, onReturnToLogin, t }: Readonly<{ isOutOfCredits: boolean; onClose: () => void; onReturnToLogin: () => void; t: PricingTranslate }>) {
  return (
    <div className="flex justify-center">
      {isOutOfCredits ? (
        <button
          onClick={onReturnToLogin}
          className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition-colors flex items-center gap-1.5"
        >
          <span>{t('core.upgradeModal.returnToLoginButton')}</span>
        </button>
      ) : (
        <button
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
        >
          {t('core.upgradeModal.continuePreviewMode')}
        </button>
      )}
    </div>
  );
}

/** Shared context threaded through the checkout helpers. */
interface CheckoutContext {
  user: AuthUser;
  billingInterval: string;
  isDowngrading: boolean;
  showAlert: ShowAlert;
  refreshProfile?: () => Promise<unknown>;
  onClose: () => void;
  t: PricingTranslate;
}

/** Applies an immediate plan change for accounts that already hold a subscription. */
async function changeExistingPlan(selectedPlan: string, ctx: CheckoutContext): Promise<void> {
  const res = await billingApi.changePlan(selectedPlan);
  if (res.user) localStorage.setItem('takeoff_user', JSON.stringify(res.user));
  if (ctx.refreshProfile) await ctx.refreshProfile();
  await ctx.showAlert({
    title: res.changeType === 'upgrade'
      ? ctx.t('core.upgradeModal.successTitle', 'Upgrade Successful')
      : ctx.t('core.upgradeModal.downgradeScheduledTitle', 'Downgrade Scheduled'),
    message: res.message,
    variant: res.changeType === 'upgrade' ? 'success' : 'info',
  });
  ctx.onClose();
}

/** Sends the account through Paddle checkout, falling back to sandbox activation. */
async function launchNewCheckout(selectedPlan: string, seatsToAdd: number, ctx: CheckoutContext): Promise<void> {
  const checkoutParams = await billingApi.createCheckout(selectedPlan, ctx.billingInterval, seatsToAdd);

  const launched = await openPaddleCheckout({
    priceId: checkoutParams.priceId,
    items: checkoutParams.items,
    customerEmail: ctx.user?.email,
    customData: checkoutParams.customData,
    onSuccess: async () => {
      try {
        const syncRes = await billingApi.mockActivate(selectedPlan, ctx.billingInterval, seatsToAdd);
        if (syncRes.user) localStorage.setItem('takeoff_user', JSON.stringify(syncRes.user));
      } catch (syncErr) {
        console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
      }
      if (ctx.refreshProfile) await ctx.refreshProfile();
      await ctx.showAlert({
        title: ctx.isDowngrading ? ctx.t('core.upgradeModal.downgradeScheduledTitle', 'Downgrade Scheduled') : ctx.t('core.upgradeModal.successTitle', 'Upgrade Successful'),
        message: ctx.isDowngrading
          ? `Your downgrade to ${selectedPlan.toUpperCase()} has been scheduled for your next billing cycle.`
          : `Congratulations! Your account has been upgraded to the ${selectedPlan.toUpperCase()} plan.`,
        variant: ctx.isDowngrading ? 'info' : 'success',
      });
      ctx.onClose();
    },
  });

  if (launched) return;

  const mockRes = await billingApi.mockActivate(selectedPlan, ctx.billingInterval, seatsToAdd);
  if (mockRes.user) localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
  if (ctx.refreshProfile) await ctx.refreshProfile();
  await ctx.showAlert({
    title: ctx.isDowngrading ? 'Downgrade Scheduled' : 'Upgrade Successful',
    message: mockRes.message || (ctx.isDowngrading ? 'Downgrade scheduled for next cycle.' : 'Upgraded successfully via Sandbox Mock Mode!'),
    variant: ctx.isDowngrading ? 'info' : 'success',
  });
  ctx.onClose();
}

/** Validates and runs the checkout / plan-change flow for the selected plan. */
async function runCheckoutFlow(input: {
  selectedPlan: string;
  ready: boolean;
  user: AuthUser;
  additionalSeats: number;
  billingInterval: string;
  showAlert: ShowAlert;
  showConfirm: ShowConfirm;
  refreshProfile?: () => Promise<unknown>;
  onClose: () => void;
  setCheckoutLoading: (loading: boolean) => void;
  t: PricingTranslate;
}): Promise<void> {
  const { selectedPlan, ready, user, additionalSeats, showAlert, showConfirm, t } = input;

  if (!ready) {
    await showAlert({
      title: t('core.upgradeModal.checkoutErrorTitle'),
      message: t('core.catalogPricing.unavailable'),
      variant: 'error',
    });
    return;
  }
  if (isPlanCurrent(user, selectedPlan)) return;

  const isDowngrading = isPlanDowngrade(user, selectedPlan);
  if (isDowngrading) {
    const confirmed = await showConfirm({
      title: t('core.upgradeModal.confirmDowngradeTitle', 'Confirm Plan Downgrade'),
      message: t('core.upgradeModal.confirmDowngradePrompt', {
        plan: selectedPlan.toUpperCase(),
        currentPlan: currentTierOf(user).toUpperCase(),
      }),
      confirmText: t('core.upgradeModal.confirmDowngradeBtn', 'Proceed with Downgrade'),
      cancelText: t('core.upgradeModal.cancelDowngradeBtn', 'Keep Current Plan'),
    });
    if (!confirmed) return;
  }

  const ctx: CheckoutContext = {
    user,
    billingInterval: input.billingInterval,
    isDowngrading,
    showAlert,
    refreshProfile: input.refreshProfile,
    onClose: input.onClose,
    t,
  };

  input.setCheckoutLoading(true);
  try {
    if (hasLiveSubscription(user)) {
      await changeExistingPlan(selectedPlan, ctx);
      return;
    }
    await launchNewCheckout(selectedPlan, extraSeatsFor(selectedPlan, additionalSeats), ctx);
  } catch (err) {
    await showAlert({
      title: t('core.upgradeModal.checkoutErrorTitle'),
      message: (err as Error).message || t('core.upgradeModal.checkoutErrorMessage'),
      variant: 'error',
    });
  } finally {
    input.setCheckoutLoading(false);
  }
}

export default function UpgradeModal({ isOpen, onClose }: Readonly<{ isOpen: boolean; onClose: () => void }>) {
  const { user, logout, refreshProfile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t, prices, ready, formatPrice } = usePricingDisplay();
  const {
    STARTER_MONTHLY_PRICE, PRO_MONTHLY_PRICE, ENTERPRISE_MONTHLY_PRICE,
    STARTER_YEARLY_PRICE, PRO_YEARLY_PRICE, ENTERPRISE_YEARLY_PRICE,
    EXTRA_SEAT_MONTHLY_PRICE, EXTRA_SEAT_YEARLY_PRICE,
  } = prices;
  const navigate = useNavigate();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('pro'); // 'starter', 'pro', or 'enterprise'
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'annually'
  const [additionalSeats, setAdditionalSeats] = useState(0);

  const guard = useSingleFlight();
  if (!isOpen) return null;

  const currentTier = currentTierOf(user);
  const isCurrentPlanSelected = isPlanCurrent(user, activePlan);
  const isDowngradeSelected = isPlanDowngrade(user, activePlan);

  if (user?.role === 'payment_exempt' || user?.has_unlimited_bypass) {
    return <ExemptNotice t={t} onClose={onClose} />;
  }

  const handleLaunchCheckout = guard('checkout', (selectedPlan: string) =>
    runCheckoutFlow({
      selectedPlan,
      ready,
      user,
      additionalSeats,
      billingInterval,
      showAlert,
      showConfirm,
      refreshProfile,
      onClose,
      setCheckoutLoading,
      t,
    }),
  );

  const handleRedeemCode = guard('redeem-code', async (e: React.FormEvent) => {
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
      setPromoErr((err as Error).message || 'Failed to redeem promo code');
    } finally {
      setPromoLoading(false);
    }
  });

  const isAnnual = billingInterval === 'annually';

  // Base and display pricing
  const baseSeatsForPlan = baseSeatsFor(activePlan);
  const totalSeats = totalSeatsFor(activePlan, additionalSeats);
  const activeTotalPrice = activeTotalPriceFor(activePlan, isAnnual, additionalSeats, prices);
  const isOutOfCredits = isOutOfCreditsFor(user);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in flex min-h-full items-center justify-center">
      <div role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title" className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 relative my-auto">
        {!isOutOfCredits && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            aria-label="Close"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 border border-amber-200 shadow-inner">
            <svg aria-hidden="true" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 id="upgrade-modal-title" className="text-2xl font-bold text-slate-900 tracking-tight">{t('core.upgradeModal.title')}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {t('core.upgradeModal.subtitle')}
          </p>

          {/* Monthly vs Annual Toggle */}
          <BillingIntervalToggle isAnnual={isAnnual} onChange={setBillingInterval} t={t} />
        </div>

        {/* Plan Switcher - 3 Tiers */}
        <PricingStatus />
        <div role="group" aria-label={t('core.upgradeModal.planOptionsLabel')} className="grid grid-cols-3 gap-2.5 mb-4">
          <StarterTierButton
            activePlan={activePlan}
            currentTier={currentTier}
            isAnnual={isAnnual}
            monthlyPrice={STARTER_MONTHLY_PRICE}
            yearlyPrice={STARTER_YEARLY_PRICE}
            seats={STARTER_PLAN_SEATS}
            formatPrice={formatPrice}
            onSelect={() => {
              setActivePlan('starter');
              setAdditionalSeats(0);
            }}
            t={t}
          />

          <ProTierButton
            activePlan={activePlan}
            currentTier={currentTier}
            isAnnual={isAnnual}
            monthlyPrice={PRO_MONTHLY_PRICE}
            yearlyPrice={PRO_YEARLY_PRICE}
            seats={PRO_PLAN_SEATS}
            formatPrice={formatPrice}
            onSelect={() => setActivePlan('pro')}
            t={t}
          />

          <EnterpriseTierButton
            activePlan={activePlan}
            currentTier={currentTier}
            isAnnual={isAnnual}
            monthlyPrice={ENTERPRISE_MONTHLY_PRICE}
            yearlyPrice={ENTERPRISE_YEARLY_PRICE}
            seats={ENTERPRISE_PLAN_SEATS}
            formatPrice={formatPrice}
            onSelect={() => setActivePlan('enterprise')}
            t={t}
          />
        </div>

        {/* Additional Seat Selector for Pro & Enterprise */}
        {planSupportsExtraSeats(activePlan) && (
          <ExtraSeatsPanel
            additionalSeats={additionalSeats}
            totalSeats={totalSeats}
            baseSeats={baseSeatsForPlan}
            isAnnual={isAnnual}
            extraSeatMonthly={EXTRA_SEAT_MONTHLY_PRICE}
            extraSeatYearly={EXTRA_SEAT_YEARLY_PRICE}
            onChangeAdditionalSeats={setAdditionalSeats}
            t={t}
          />
        )}

        {/* Plan Feature Card */}
        <PlanFeatureCard
          activePlan={activePlan}
          currentTier={currentTier}
          isAnnual={isAnnual}
          totalSeats={totalSeats}
          activeTotalPrice={activeTotalPrice}
          ready={ready}
          checkoutLoading={checkoutLoading}
          isCurrentPlanSelected={isCurrentPlanSelected}
          isDowngradeSelected={isDowngradeSelected}
          formatPrice={formatPrice}
          onCheckout={() => handleLaunchCheckout(activePlan)}
          t={t}
        />




        {/* Promo Code Redemption Section */}
        <PromoCodeForm
          promoCodeInput={promoCodeInput}
          promoLoading={promoLoading}
          promoMsg={promoMsg}
          promoErr={promoErr}
          onCodeChange={setPromoCodeInput}
          onSubmit={handleRedeemCode}
          t={t}
        />

        <CreditsFooter
          isOutOfCredits={isOutOfCredits}
          onClose={onClose}
          onReturnToLogin={async () => {
            if (logout) await logout();
            onClose();
            navigate('/login');
          }}
          t={t}
        />
      </div>
    </div>
  );
}
