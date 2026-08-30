import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { authApi } from '@/core/lib/auth/auth';
import { billingApi } from '@/core/lib/billing/billing';
import { openPaddleCheckout } from '@/core/lib/billing/paddle';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';
import {
  STARTER_MONTHLY_PRICE,
  PRO_MONTHLY_PRICE,
  ENTERPRISE_MONTHLY_PRICE,
  STARTER_YEARLY_PRICE,
  PRO_YEARLY_PRICE,
  ENTERPRISE_YEARLY_PRICE,
  EXTRA_SEAT_MONTHLY_PRICE,
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

export default function LoginPage({ initialView = 'login' }) {
  const { login, register, refreshProfile, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'forgot' | 'plan-select'

  // Update view if prop changes
  React.useEffect(() => {
    // Only update view if not in active plan-select onboarding step
    if (view !== 'plan-select') {
      setView(initialView);
    }
  }, [initialView]);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const [registeredUser, setRegisteredUser] = useState(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setError('');
    setMessage('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setRegisterPassword('');
    setShowRegisterPassword(false);
  };

  const switchView = (newView) => {
    resetForm();
    setView(newView);
    if (newView === 'login') navigate('/login');
    else if (newView === 'register') navigate('/register');
    else if (newView === 'forgot') navigate('/forgot-password');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ usernameOrEmail: loginIdentifier, password: loginPassword });
    } catch (err) {
      setError(err.message || t('core.loginPage.errLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      setError(t('core.loginPage.errValidEmail'));
      return;
    }

    if (registerPassword.length < 6) {
      setError(t('core.loginPage.errPasswordMin'));
      return;
    }

    setLoading(true);
    try {
      await register({
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        email: registerEmail,
        phoneNumber: registerPhone,
      });

      // Route immediately to the dedicated /onboarding screen
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message || t('core.loginPage.errRegisterFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFreePlan = () => {
    const targetUsername = registeredUser?.username || user?.username || registerUsername;
    navigate(`/${targetUsername}`);
  };

  const handleSelectPaidPlan = async (planKey) => {
    setError('');
    setCheckoutLoadingPlan(planKey);

    const currentUser = registeredUser || user || {
      username: registerUsername,
      email: registerEmail,
    };
    const targetUsername = currentUser.username || registerUsername;

    try {
      const checkoutParams = await billingApi.createCheckout(planKey, 'monthly', 0);

      const launched = await openPaddleCheckout({
        priceId: checkoutParams.priceId,
        items: checkoutParams.items,
        customerEmail: currentUser.email,
        customData: checkoutParams.customData,
        onSuccess: async () => {
          try {
            const syncRes = await billingApi.mockActivate(planKey, 'monthly', 0);
            if (syncRes.user) {
              localStorage.setItem('takeoff_user', JSON.stringify(syncRes.user));
            }
          } catch (syncErr) {
            console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
          }
          if (refreshProfile) await refreshProfile();
          navigate(`/${targetUsername}`);
        },
      });

      // Sandbox mock fallback if Paddle checkout is not configured
      if (!launched) {
        const mockRes = await billingApi.mockActivate(planKey, 'monthly', 0);
        if (mockRes.user) {
          localStorage.setItem('takeoff_user', JSON.stringify(mockRes.user));
        }
        if (refreshProfile) await refreshProfile();
        navigate(`/${targetUsername}`);
      }
    } catch (err) {
      setError(err.message || t('core.upgradeModal.checkoutErrorMessage', 'Failed to launch checkout'));
    } finally {
      setCheckoutLoadingPlan('');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setMessage(res.message || t('core.loginPage.resetLinkSent'));
    } catch (err) {
      setError(err.message || t('core.loginPage.errResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getSeoData = () => {
    switch (view) {
      case 'register':
        return {
          title: t('core.seo.register.title', 'Sign Up — Takeoff Engine Civil & Construction Estimator'),
          description: t('core.seo.register.description', 'Create your free Takeoff Engine account. Get 5 free takeoff exports with automatic column mapping, trench cubic yard calculators, and proposal generation.'),
          canonicalUrl: 'https://takeoffengine.com/register',
        };
      case 'forgot':
        return {
          title: t('core.seo.forgot.title', 'Reset Password — Takeoff Engine'),
          description: t('core.seo.forgot.description', 'Reset your Takeoff Engine account password securely.'),
          canonicalUrl: 'https://takeoffengine.com/forgot-password',
        };
      default:
        return {
          title: t('core.seo.login.title', 'Sign In — Takeoff Engine Estimating Platform'),
          description: t('core.seo.login.description', 'Log in to your Takeoff Engine estimating workspace, projects, client proposals, and rate libraries.'),
          canonicalUrl: 'https://takeoffengine.com/login',
        };
    }
  };

  const seoData = getSeoData();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <SeoHead
        title={seoData.title}
        description={seoData.description}
        canonicalUrl={seoData.canonicalUrl}
      />
      {/* Back to Home / Public site navigation banner */}
      <div className={`w-full mb-4 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 ${view === 'plan-select' ? 'max-w-5xl' : 'max-w-md'}`}>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        >
          <span>←</span>
          <span>{t('core.loginPage.backToHome')}</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              navigate('/home');
              setTimeout(() => {
                const el = document.getElementById('calculator');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            {t('core.loginPage.freeCalculator')}
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={() => {
              navigate('/home');
              setTimeout(() => {
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            {t('core.loginPage.pricing')}
          </button>
        </div>
      </div>

      <div className={`rounded-3xl shadow-2xl w-full transition-all duration-300 ${
        view === 'plan-select'
          ? 'max-w-6xl p-6 sm:p-10 bg-slate-950 border border-slate-800 text-white'
          : 'max-w-md p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-slate-900 dark:text-slate-100'
      }`}>
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <p className="flex-1 font-medium">{error}</p>
            </div>
            {error.toLowerCase().includes('locked') && (
              <div className="pt-2 border-t border-red-200 dark:border-red-900/60 flex items-center justify-between">
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{t('core.loginPage.forgotPasswordPrompt')}</span>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline cursor-pointer"
                >
                  {t('core.loginPage.resetPasswordNow')}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        {/* POST-REGISTRATION PLAN SELECTION VIEW */}
        {view === 'plan-select' && (
          <div>
            <div className="text-center mb-8 max-w-2xl mx-auto">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
                Account Created Successfully 🎉
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
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.freeTrial.f1')}</strong></li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.freeTrial.f2')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.freeTrial.f3')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.freeTrial.f4')}</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleSelectFreePlan}
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
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.starter.f1', { seats: STARTER_PLAN_SEATS })}</strong></li>
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.starter.f2')}</strong></li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.starter.f3')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.starter.f4')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.starter.f5')}</li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'starter'}
                  onClick={() => handleSelectPaidPlan('starter')}
                  className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {checkoutLoadingPlan === 'starter' ? t('core.loginPage.launchingCheckout') : t('core.landing.pricing.starter.cta', 'Choose Starter')}
                </button>
              </div>

              {/* 3. Pro Tier (Most Popular) */}
              <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl relative flex flex-col justify-between">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                  {t('core.landing.pricing.pro.mostPopular', 'Most Popular')}
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {t('core.landing.pricing.pro.tier', 'Pro Tier')}
                  </span>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{t('core.landing.pricing.pro.price', { price: PRO_MONTHLY_PRICE })}</span>
                    <span className="text-xs text-slate-400">{t('core.landing.pricing.pro.cadence', '/ mo')}</span>
                  </div>
                  <div className="text-[10px] text-indigo-300/80 font-medium mt-0.5">
                    {t('core.landing.pricing.pro.yearly', { yearly: PRO_YEARLY_PRICE })}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed min-h-[34px]">
                    {t('core.landing.pricing.pro.description', 'Unlimited power & full PDF report layouts.')}
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.pro.f1', { seats: PRO_PLAN_SEATS })}</strong></li>
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.pro.f2')}</strong></li>
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.pro.f3')}</strong></li>
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.pro.f4')}</strong></li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.pro.f5')}</li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'pro'}
                  onClick={() => handleSelectPaidPlan('pro')}
                  className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
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
                    {t('core.landing.pricing.enterprise.description', 'Multi-seat collaboration for growing teams.')}
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.enterprise.f1', { seats: ENTERPRISE_PLAN_SEATS })}</strong></li>
                    <li className="flex items-center gap-2">✓ <strong>{t('core.landing.pricing.enterprise.f2', { price: EXTRA_SEAT_MONTHLY_PRICE })}</strong></li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.enterprise.f3')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.enterprise.f4')}</li>
                    <li className="flex items-center gap-2">✓ {t('core.landing.pricing.enterprise.f5')}</li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'enterprise'}
                  onClick={() => handleSelectPaidPlan('enterprise')}
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
                onClick={handleSelectFreePlan}
                className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition cursor-pointer"
              >
                {t('core.loginPage.skipForNow', 'Or continue to dashboard with Free Trial →')}
              </button>
            </div>
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.welcomeBack')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('core.loginPage.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.usernameOrEmail')}
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={t('core.loginPage.usernameOrEmailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('core.loginPage.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t('core.loginPage.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t('core.loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 text-sm focus:outline-none"
                    aria-label={showLoginPassword ? t('core.loginPage.hidePassword') : t('core.loginPage.showPassword')}
                  >
                    {showLoginPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.loggingIn') : t('core.loginPage.logIn')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('core.loginPage.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                {t('core.loginPage.createAccount')}
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.createAccount')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('core.loginPage.getStartedSubtitle')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t('core.loginPage.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    placeholder={t('core.loginPage.firstNamePlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t('core.loginPage.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    placeholder={t('core.loginPage.lastNamePlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.username')}
                </label>
                <input
                  type="text"
                  required
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder={t('core.loginPage.usernamePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.email')}
                </label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder={t('core.loginPage.emailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.phoneOptional')}
                </label>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder={t('core.loginPage.phonePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.passwordMinChars')}
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder={t('core.loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 text-sm focus:outline-none"
                    aria-label={showRegisterPassword ? t('core.loginPage.hidePassword') : t('core.loginPage.showPassword')}
                  >
                    {showRegisterPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.creatingAccount') : t('core.loginPage.createAccount')}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('core.loginPage.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                {t('core.loginPage.logIn')}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.forgotPasswordTitle')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('core.loginPage.forgotPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.emailAddress')}
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('core.loginPage.yourEmailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.submitting') : t('core.loginPage.sendResetInstructions')}
              </button>

              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('core.loginPage.backToLogIn')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
