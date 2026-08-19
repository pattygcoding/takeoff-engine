import React, { useState } from 'react';
import { billingApi } from '../lib/billing';
import { openPaddleCheckout } from '../lib/paddle';
import { useAuth } from '../context/AuthContext';

export default function UpgradeModal({ isOpen, onClose }) {
  const { user, refreshProfile } = useAuth();
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoErr, setPromoErr] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activePlan, setActivePlan] = useState('pro'); // 'starter' or 'pro'

  if (!isOpen) return null;

  const handleLaunchCheckout = async (selectedPlan) => {
    setCheckoutLoading(true);
    try {
      const checkoutParams = await billingApi.createCheckout(selectedPlan);

      // Attempt real Paddle.js overlay
      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        customerEmail: user?.email,
        customData: checkoutParams.customData,
        onSuccess: async () => {
          if (refreshProfile) await refreshProfile();
          onClose();
        },
      });

      // If Paddle keys aren't configured yet in .env, perform instant sandbox mock activation
      if (!launched) {
        const mockRes = await billingApi.mockActivate(selectedPlan);
        if (mockRes.user) {
          localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
        }
        if (refreshProfile) await refreshProfile();
        alert(mockRes.message || 'Upgraded successfully via Sandbox Mock Mode!');
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Failed to initialize checkout.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 sm:p-8 relative my-8">
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

        {/* Plan Switcher */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setActivePlan('starter')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              activePlan === 'starter'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Starter</span>
              <span className="text-base font-extrabold text-slate-900">$19.99<span className="text-xs font-normal text-slate-500">/mo</span></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Essential takeoff calculations & proposals.</p>
          </button>

          <button
            type="button"
            onClick={() => setActivePlan('pro')}
            className={`p-3.5 rounded-xl border text-left relative transition-all ${
              activePlan === 'pro'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            <span className="absolute -top-2.5 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Popular
            </span>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Pro</span>
              <span className="text-base font-extrabold text-slate-900">$49.99<span className="text-xs font-normal text-slate-500">/mo</span></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Unlimited proposals, branding & versioning.</p>
          </button>
        </div>

        {/* Plan Feature Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 mb-5 border border-indigo-800/40 shadow-lg">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                {activePlan === 'starter' ? 'Starter Contractor' : 'Pro Contractor Plan'}
              </span>
              <h3 className="text-xl font-bold text-white">
                {activePlan === 'starter' ? '$19.99 / month' : '$49.99 / month'}
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
            {activePlan === 'pro' && (
              <li className="flex items-center gap-2 font-medium text-emerald-300">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Custom Brand Letterhead & Tax/Markup Presets</span>
              </li>
            )}
          </ul>

          <button
            onClick={() => handleLaunchCheckout(activePlan)}
            disabled={checkoutLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-sm text-white shadow-md hover:shadow-indigo-500/25 transition-all text-center"
          >
            {checkoutLoading ? 'Opening Checkout...' : `Upgrade to ${activePlan === 'starter' ? 'Starter ($19.99/mo)' : 'Pro ($49.99/mo)'}`}
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
