import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/auth';
import { billingApi } from '@/lib/billing';
import { openPaddleCheckout } from '@/lib/paddle';
import { useTranslation } from '@/context/I18nContext';

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
      setError(err.message || t('loginPage.errLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      setError(t('loginPage.errValidEmail'));
      return;
    }

    if (registerPassword.length < 6) {
      setError(t('loginPage.errPasswordMin'));
      return;
    }

    setLoading(true);
    try {
      const regData = await register({
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        email: registerEmail,
        phoneNumber: registerPhone,
      });

      const userObj = regData?.user || {
        username: registerUsername,
        email: registerEmail,
      };
      setRegisteredUser(userObj);
      setView('plan-select');
    } catch (err) {
      setError(err.message || t('loginPage.errRegisterFailed'));
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
      setError(err.message || t('upgradeModal.checkoutErrorMessage', 'Failed to launch checkout'));
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
      setMessage(res.message || t('loginPage.resetLinkSent'));
    } catch (err) {
      setError(err.message || t('loginPage.errResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      {/* Back to Home / Public site navigation banner */}
      <div className={`w-full mb-4 flex items-center justify-between text-xs font-medium text-slate-500 ${view === 'plan-select' ? 'max-w-5xl' : 'max-w-md'}`}>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 hover:text-indigo-600 transition cursor-pointer"
        >
          <span>←</span>
          <span>{t('loginPage.backToHome')}</span>
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
            className="hover:text-indigo-600 transition cursor-pointer"
          >
            {t('loginPage.freeCalculator')}
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => {
              navigate('/home');
              setTimeout(() => {
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="hover:text-indigo-600 transition cursor-pointer"
          >
            {t('loginPage.pricing')}
          </button>
        </div>
      </div>

      <div className={`bg-white rounded-2xl shadow-xl w-full border border-slate-200 transition-all duration-300 ${view === 'plan-select' ? 'max-w-5xl p-6 sm:p-10' : 'max-w-md p-6 sm:p-8'}`}>
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <p className="flex-1 font-medium">{error}</p>
            </div>
            {error.toLowerCase().includes('locked') && (
              <div className="pt-2 border-t border-red-200 flex items-center justify-between">
                <span className="text-xs text-red-600 font-semibold">{t('loginPage.forgotPasswordPrompt')}</span>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  {t('loginPage.resetPasswordNow')}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* POST-REGISTRATION PLAN SELECTION VIEW */}
        {view === 'plan-select' && (
          <div>
            <div className="text-center mb-8 max-w-2xl mx-auto">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3">
                Account Created Successfully 🎉
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('loginPage.selectPlanTitle')}
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                {t('loginPage.selectPlanSubtitle')}
              </p>
            </div>

            {/* 4 Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
              {/* 1. Free Trial */}
              <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-all hover:shadow-md">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t('loginPage.freeTierTitle')}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full uppercase">
                      {t('loginPage.freeTierBadge')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-extrabold text-slate-900">{t('loginPage.freeTierPrice')}</span>
                    <span className="text-xs text-slate-500 font-medium">{t('loginPage.freeTierCadence')}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 min-h-[32px] leading-snug">
                    {t('loginPage.freeTierDesc')}
                  </p>
                  <ul className="space-y-2 mb-6 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.freeTierFeature1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.freeTierFeature2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.freeTierFeature3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.freeTierFeature4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.freeTierFeature5')}</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFreePlan}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-xs text-slate-800 shadow-sm transition"
                >
                  {t('loginPage.freeTierCta')}
                </button>
              </div>

              {/* 2. Starter Tier */}
              <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 transition-all hover:shadow-md">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t('loginPage.starterTierTitle')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {t('loginPage.monthlyBilled')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-extrabold text-slate-900">{t('loginPage.starterTierPrice')}</span>
                    <span className="text-xs text-slate-500 font-medium">{t('loginPage.starterTierCadence')}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 min-h-[32px] leading-snug">
                    {t('loginPage.starterTierDesc')}
                  </p>
                  <ul className="space-y-2 mb-6 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span className="font-semibold">{t('loginPage.starterTierFeature1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.starterTierFeature2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.starterTierFeature3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.starterTierFeature4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{t('loginPage.starterTierFeature5')}</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'starter'}
                  onClick={() => handleSelectPaidPlan('starter')}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {checkoutLoadingPlan === 'starter' ? t('loginPage.launchingCheckout') : t('loginPage.starterTierCta')}
                </button>
              </div>

              {/* 3. Pro Tier (Highlighted / Most Popular) */}
              <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/30 relative shadow-lg ring-2 ring-indigo-500/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                  {t('loginPage.proTierPopular')}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2 mt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      {t('loginPage.proTierTitle')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {t('loginPage.monthlyBilled')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-extrabold text-slate-900">{t('loginPage.proTierPrice')}</span>
                    <span className="text-xs text-slate-500 font-medium">{t('loginPage.proTierCadence')}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 min-h-[32px] leading-snug">
                    {t('loginPage.proTierDesc')}
                  </p>
                  <ul className="space-y-2 mb-6 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">✓</span>
                      <span className="font-semibold text-indigo-900">{t('loginPage.proTierFeature1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">✓</span>
                      <span>{t('loginPage.proTierFeature2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">✓</span>
                      <span>{t('loginPage.proTierFeature3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">✓</span>
                      <span>{t('loginPage.proTierFeature4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">✓</span>
                      <span>{t('loginPage.proTierFeature5')}</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'pro'}
                  onClick={() => handleSelectPaidPlan('pro')}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {checkoutLoadingPlan === 'pro' ? t('loginPage.launchingCheckout') : t('loginPage.proTierCta')}
                </button>
              </div>

              {/* 4. Enterprise Tier */}
              <div className="flex flex-col justify-between p-5 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white hover:shadow-xl transition-all">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {t('loginPage.enterpriseTierTitle')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {t('loginPage.monthlyBilled')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-extrabold text-white">{t('loginPage.enterpriseTierPrice')}</span>
                    <span className="text-xs text-slate-300 font-medium">{t('loginPage.enterpriseTierCadence')}</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4 min-h-[32px] leading-snug">
                    {t('loginPage.enterpriseTierDesc')}
                  </p>
                  <ul className="space-y-2 mb-6 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span className="font-semibold text-amber-300">{t('loginPage.enterpriseTierFeature1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span>{t('loginPage.enterpriseTierFeature2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span>{t('loginPage.enterpriseTierFeature3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span>{t('loginPage.enterpriseTierFeature4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">✓</span>
                      <span>{t('loginPage.enterpriseTierFeature5')}</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled={checkoutLoadingPlan === 'enterprise'}
                  onClick={() => handleSelectPaidPlan('enterprise')}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {checkoutLoadingPlan === 'enterprise' ? t('loginPage.launchingCheckout') : t('loginPage.enterpriseTierCta')}
                </button>
              </div>
            </div>

            {/* Bottom Skip to Dashboard Link */}
            <div className="text-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSelectFreePlan}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
              >
                {t('loginPage.skipForNow')}
              </button>
            </div>
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('loginPage.welcomeBack')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('loginPage.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.usernameOrEmail')}
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={t('loginPage.usernameOrEmailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t('loginPage.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {t('loginPage.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t('loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm focus:outline-none"
                    aria-label={showLoginPassword ? t('loginPage.hidePassword') : t('loginPage.showPassword')}
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
                {loading ? t('loginPage.loggingIn') : t('loginPage.logIn')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {t('loginPage.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                {t('loginPage.createAccount')}
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('loginPage.createAccount')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('loginPage.getStartedSubtitle')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t('loginPage.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    placeholder={t('loginPage.firstNamePlaceholder')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t('loginPage.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    placeholder={t('loginPage.lastNamePlaceholder')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.username')}
                </label>
                <input
                  type="text"
                  required
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder={t('loginPage.usernamePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.email')}
                </label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder={t('loginPage.emailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.phoneOptional')}
                </label>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder={t('loginPage.phonePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.passwordMinChars')}
                </label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder={t('loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm focus:outline-none"
                    aria-label={showRegisterPassword ? t('loginPage.hidePassword') : t('loginPage.showPassword')}
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
                {loading ? t('loginPage.creatingAccount') : t('loginPage.createAccount')}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500">
              {t('loginPage.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                {t('loginPage.logIn')}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('loginPage.forgotPasswordTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('loginPage.forgotPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('loginPage.emailAddress')}
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('loginPage.yourEmailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('loginPage.submitting') : t('loginPage.sendResetInstructions')}
              </button>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-indigo-600 hover:underline"
                >
                  {t('loginPage.backToLogIn')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
