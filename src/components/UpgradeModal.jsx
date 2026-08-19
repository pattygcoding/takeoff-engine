import React, { useState } from 'react';
import { billingApi } from '../lib/billing';
import { openPaddleCheckout } from '../lib/paddle';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

export default function UpgradeModal({ isOpen, onClose }) {
  const { user, refreshProfile } = useAuth();
  const { showAlert } = useModal();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('pro'); // 'starter', 'pro', or 'enterprise'
  const [additionalSeats, setAdditionalSeats] = useState(0);

  if (!isOpen) return null;

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
          <h3 className="text-xl font-bold text-slate-900 mb-2">Account Already Unlocked</h3>
          <p className="text-sm text-slate-600 mb-6">
            Your account has complimentary permanent VIP access with all Pro features unlocked. You do not need to upgrade or enter payment details.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition"
          >
            Got it, Return to App
          </button>
        </div>
      </div>
    );
  }

  const handleLaunchCheckout = async (selectedPlan) => {
    setCheckoutLoading(true);
    try {
      const seatsToAdd = selectedPlan === 'enterprise' ? additionalSeats : 0;
      const checkoutParams = await billingApi.createCheckout(selectedPlan, seatsToAdd);

      // Attempt real Paddle.js overlay
      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        items: checkoutParams.items,
        customerEmail: user?.email,
        customData: checkoutParams.customData,
        onSuccess: async () => {
          if (refreshProfile) await refreshProfile();
          onClose();
        },
      });

      // If Paddle keys aren't configured yet in .env, perform instant sandbox mock activation
      if (!launched) {
        const mockRes = await billingApi.mockActivate(selectedPlan, seatsToAdd);
        if (mockRes.user) {
          localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
        }
        if (refreshProfile) await refreshProfile();
        await showAlert({
          title: 'Upgrade Successful',
          message: mockRes.message || 'Upgraded successfully via Sandbox Mock Mode!',
          variant: 'success',
        });
        onClose();
      }
    } catch (err) {
      await showAlert({
        title: 'Checkout Error',
        message: err.message || 'Failed to initialize checkout.',
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

  const enterpriseTotalPrice = 149.99 + additionalSeats * 29.99;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden p-6 sm:p-8 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mb-3 border border-amber-200 shadow-inner">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Upgrade Your Plan</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Choose a plan to get unlimited PDF proposals, Excel takeoff sheets, and cloud project versioning.
          </p>
        </div>

        {/* Plan Switcher - 3 Tiers */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => setActivePlan('starter')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePlan === 'starter'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-0.5">Starter</div>
            <div className="text-sm font-extrabold text-slate-900">$19.99<span className="text-[10px] font-normal text-slate-500">/mo</span></div>
            <div className="text-[9px] text-slate-400 font-medium">plus tax</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">Single user, essential takeoff exports.</p>
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
            <span className="absolute -top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
              Popular
            </span>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-0.5">Pro</div>
            <div className="text-sm font-extrabold text-slate-900">$49.99<span className="text-[10px] font-normal text-slate-500">/mo</span></div>
            <div className="text-[9px] text-slate-400 font-medium">plus tax</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">Branding, rate libraries & e-signatures.</p>
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
            <span className="absolute -top-2 right-2 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
              Multi-Seat
            </span>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-0.5">Enterprise</div>
            <div className="text-sm font-extrabold text-slate-900">$149.99<span className="text-[10px] font-normal text-slate-500">/mo</span></div>
            <div className="text-[9px] text-slate-400 font-medium">plus tax</div>
            <p className="text-[10px] text-slate-500 leading-snug mt-1">3 seats included + $29.99/add'l seat.</p>
          </button>
        </div>

        {/* Enterprise Seat Selector */}
        {activePlan === 'enterprise' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-amber-950">Enterprise Team Size:</span>
              <span className="font-extrabold text-amber-900 text-sm">
                {3 + additionalSeats} seats total ({3} base + {additionalSeats} extra)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 text-[11px]">Additional Seats ($29.99/mo each + tax):</span>
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
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 mb-5 border border-indigo-800/40 shadow-lg">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                {activePlan === 'starter' && 'Starter Contractor'}
                {activePlan === 'pro' && 'Pro Contractor Plan'}
                {activePlan === 'enterprise' && `Enterprise Team Plan (${3 + additionalSeats} Seats)`}
              </span>
              <h3 className="text-xl font-bold text-white flex items-baseline gap-1.5">
                {activePlan === 'starter' && '$19.99 / month'}
                {activePlan === 'pro' && '$49.99 / month'}
                {activePlan === 'enterprise' && `$${enterpriseTotalPrice.toFixed(2)} / month`}
                <span className="text-[11px] font-normal text-slate-400">(plus applicable tax)</span>
              </h3>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              Paddle MoR Protected
            </span>
          </div>

          <ul className="space-y-2 text-xs text-indigo-100 mb-4">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Unlimited Client Proposals (PDF, Word DOCX)</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Unlimited Excel / CSV Takeoff Data Exports</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Unlimited Cloud Project & Estimate Versioning</span>
            </li>
            {(activePlan === 'pro' || activePlan === 'enterprise') && (
              <li className="flex items-center gap-2 font-medium text-emerald-300">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Custom Brand Letterhead, Rate Libraries & E-Signatures</span>
              </li>
            )}
            {activePlan === 'enterprise' && (
              <li className="flex items-center gap-2 font-medium text-amber-300">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Multi-User Organization Collaboration & Team Workspaces</span>
              </li>
            )}
          </ul>

          <button
            onClick={() => handleLaunchCheckout(activePlan)}
            disabled={checkoutLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-sm text-white shadow-md hover:shadow-indigo-500/25 transition-all text-center"
          >
            {checkoutLoading ? 'Opening Checkout...' : `Upgrade to ${activePlan === 'starter' ? 'Starter ($19.99/mo)' : activePlan === 'pro' ? 'Pro ($49.99/mo)' : `Enterprise ($${enterpriseTotalPrice.toFixed(2)}/mo)`} + tax`}
          </button>
        </div>

        {/* Promo Code Redemption Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Have a VIP Pass or Promo Code?
          </label>
          <form onSubmit={handleRedeemCode} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. VIPBETA2026"
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs uppercase font-mono tracking-wider bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={promoLoading || !promoCodeInput.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
            >
              {promoLoading ? 'Applying...' : 'Apply Code'}
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
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Continue in preview mode (view-only)
          </button>
        </div>
      </div>
    </div>
  );
}
