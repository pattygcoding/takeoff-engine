import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { authApi } from '@/core/lib/auth/auth';
import { billingApi } from '@/core/lib/billing/billing';
import { openPaddleCheckout } from '@/core/lib/billing/paddle';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
import {
  AccountCreationDisabledNotice,
  PricingStatus,
  useAccountCreationDisabled,
  usePricing,
  usePricingDisplay,
} from '@/core/components/context/PricingContext';
import SeoHead from '@/core/components/shared/SeoHead';
import PlanSelectionView from '@/core/components/billing/PlanSelectionView';
import { ArrowLeft, AlertTriangle, PartyPopper, Check, ArrowRight } from 'lucide-react';
import { isValidPassword, isValidPhoneNumber, PASSWORD_MIN_LENGTH } from '@/core/lib/shared/validators';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
  CURRENT_TERMS_VERSION,
} from '@/core/constants';
import type { TranslateFunction } from '@/core/components/context/I18nContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** The i18n key of the first invalid registration field, or null when the form is complete. */
function registrationError(values: {
  email: string;
  password: string;
  phone: string;
  acceptedTerms: boolean;
  confirmedAge: boolean;
}): string | null {
  if (!EMAIL_PATTERN.test(values.email.trim())) return 'core.loginPage.errValidEmail';
  if (!isValidPassword(values.password)) return 'core.loginPage.errPasswordRequirements';
  if (!isValidPhoneNumber(values.phone)) return 'core.loginPage.errValidPhone';
  if (!values.acceptedTerms) return 'core.loginPage.errMustAcceptTerms';
  if (!values.confirmedAge) return 'core.loginPage.errMustConfirmAge';
  return null;
}

/** Sandbox/instant activation used when Paddle checkout is unavailable. */
async function activateMockSubscription(planKey: string): Promise<void> {
  const res = await billingApi.mockActivate(planKey, 'monthly', 0);
  if (res.user) localStorage.setItem('takeoff_user', JSON.stringify(res.user));
}

/** Mirrors a completed Paddle checkout into our own subscription state, without failing the flow. */
async function syncCheckoutSubscription(planKey: string): Promise<void> {
  try {
    await activateMockSubscription(planKey);
  } catch (syncErr) {
    console.warn('[Paddle Post-Checkout Sync Warning]', syncErr);
  }
}

/** The SEO head for the auth views; `plan-select` (onboarding) shares the login copy. */
function loginSeoData(view: string, t: TranslateFunction) {
  if (view === 'register') {
    return {
      title: t('core.seo.register.title', 'Sign Up — Takeoff Engine Civil & Construction Estimator'),
      description: t('core.seo.register.description', 'Create your free Takeoff Engine account. Get 5 free takeoff exports with automatic column mapping, trench cubic yard calculators, and proposal generation.'),
      canonicalUrl: 'https://takeoffengine.com/register',
    };
  }
  if (view === 'forgot') {
    return {
      title: t('core.seo.forgot.title', 'Reset Password — Takeoff Engine'),
      description: t('core.seo.forgot.description', 'Reset your Takeoff Engine account password securely.'),
      canonicalUrl: 'https://takeoffengine.com/forgot-password',
    };
  }
  return {
    title: t('core.seo.login.title', 'Sign In — Takeoff Engine Estimating Platform'),
    description: t('core.seo.login.description', 'Log in to your Takeoff Engine estimating workspace, projects, client proposals, and rate libraries.'),
    canonicalUrl: 'https://takeoffengine.com/login',
  };
}

export default function LoginPage({ initialView = 'login' }) {
  const { login, register, refreshProfile, user } = useAuth();
  const { t } = usePricingDisplay();
  const { retry: retryPricing } = usePricing();
  const accountCreationDisabled = useAccountCreationDisabled();
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
  const [registerAcceptedTerms, setRegisterAcceptedTerms] = useState(false);
  const [registerConfirmedAge, setRegisterConfirmedAge] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');

  const [registeredUser] = useState<{
    username?: string;
    email?: string;
    [key: string]: unknown;
  } | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const guard = useSingleFlight();
  const resetForm = () => {
    setError('');
    setMessage('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setRegisterPassword('');
    setShowRegisterPassword(false);
  };

  const switchView = (newView: string) => {
    resetForm();
    setView(newView);
    if (newView === 'login') navigate('/login');
    else if (newView === 'register') navigate('/register');
    else if (newView === 'forgot') navigate('/forgot-password');
  };

  const handleLogin = guard('login', async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await login({ usernameOrEmail: loginIdentifier, password: loginPassword });
    } catch (err) {
      setError((err as Error).message || t('core.loginPage.errLoginFailed'));
    } finally {
      setLoading(false);
    }
  });

  const handleRegister = guard('register', async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || accountCreationDisabled) return;
    setError('');

    const invalidField = registrationError({
      email: registerEmail,
      password: registerPassword,
      phone: registerPhone,
      acceptedTerms: registerAcceptedTerms,
      confirmedAge: registerConfirmedAge,
    });
    if (invalidField) {
      setError(t(invalidField));
      return;
    }

    setLoading(true);
    try {
      const registration = await register({
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        email: registerEmail,
        phoneNumber: registerPhone,
        acceptedTerms: registerAcceptedTerms,
        confirmedAge: registerConfirmedAge,
        termsVersion: CURRENT_TERMS_VERSION,
      });

      // switchView resets the form (including messages), so the confirmation is set afterwards.
      switchView('login');
      setMessage(registration.message || t('core.loginPage.emailVerificationSent'));
    } catch (err) {
      // The server closed sign-up because pricing went down; resync so the form disables itself.
      if ((err as { code?: string }).code === 'PRICING_UNAVAILABLE') retryPricing();
      setError((err as Error).message || t('core.loginPage.errRegisterFailed'));
    } finally {
      setLoading(false);
    }
  });

  const handleSelectFreePlan = () => {
    const targetUsername = registeredUser?.username || user?.username || registerUsername;
    navigate(`/${targetUsername}`);
  };

  const handleSelectPaidPlan = guard('checkout', async (planKey: string) => {
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
          await syncCheckoutSubscription(planKey);
          if (refreshProfile) await refreshProfile();
          navigate(`/${targetUsername}`);
        },
      });

      // Sandbox mock fallback if Paddle checkout is not configured
      if (!launched) {
        await activateMockSubscription(planKey);
        if (refreshProfile) await refreshProfile();
        navigate(`/${targetUsername}`);
      }
    } catch (err) {
      setError((err as Error).message || t('core.upgradeModal.checkoutErrorMessage', 'Failed to launch checkout'));
    } finally {
      setCheckoutLoadingPlan('');
    }
  });

  const handleForgotPassword = guard('forgot-password', async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setMessage(res.message || t('core.loginPage.resetLinkSent'));
    } catch (err) {
      setError((err as Error).message || t('core.loginPage.errResetFailed'));
    } finally {
      setLoading(false);
    }
  });

  const seoData = loginSeoData(view, t);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <SeoHead
        title={seoData.title}
        description={seoData.description}
        canonicalUrl={seoData.canonicalUrl}
      />
      {/* Back to Home / Public site navigation banner */}
      <div className={`w-full mb-4 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 ${view === 'plan-select' ? 'max-w-5xl' : 'max-w-md'}`}>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
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
            className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
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
            className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
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
          <div id="auth-error" role="alert" className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <p className="flex-1 font-medium">{error}</p>
            </div>
            {error.toLowerCase().includes('locked') && (
              <div className="pt-2 border-t border-red-200 dark:border-red-900/60 flex items-center justify-between">
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">{t('core.loginPage.forgotPasswordPrompt')}</span>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                >
                  {t('core.loginPage.resetPasswordNow')}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div role="status" className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        {/* POST-REGISTRATION PLAN SELECTION VIEW */}
        {view === 'plan-select' && (
          <PlanSelectionView
            checkoutLoadingPlan={checkoutLoadingPlan}
            onSelectPlan={handleSelectPaidPlan}
            onSkip={handleSelectFreePlan}
          />
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.welcomeBack')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('core.loginPage.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleLogin} aria-describedby={error ? 'auth-error' : undefined} aria-busy={loading} className="space-y-4">
              <div>
                <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.usernameOrEmail')}
                </label>
                <input
                  id="login-identifier"
                  autoComplete="username"
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={t('core.loginPage.usernameOrEmailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('core.loginPage.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('core.loginPage.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t('core.loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                aria-disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 aria-disabled:cursor-wait text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.loggingIn') : t('core.loginPage.logIn')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('core.loginPage.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                disabled={accountCreationDisabled}
                title={accountCreationDisabled ? t('core.catalogPricing.accountCreationDisabled') : undefined}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.createAccount')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('core.loginPage.getStartedSubtitle')}</p>
            </div>

            <AccountCreationDisabledNotice className="mb-4 text-red-700 dark:text-red-300" />
            <form onSubmit={handleRegister} aria-describedby={error ? 'auth-error' : undefined} aria-busy={loading} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="register-first-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t('core.loginPage.firstName')}
                  </label>
                  <input
                    id="register-first-name"
                    autoComplete="given-name"
                    type="text"
                    required
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    placeholder={t('core.loginPage.firstNamePlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="register-last-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {t('core.loginPage.lastName')}
                  </label>
                  <input
                    id="register-last-name"
                    autoComplete="family-name"
                    type="text"
                    required
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    placeholder={t('core.loginPage.lastNamePlaceholder')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="register-username" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.username')}
                </label>
                <input
                  id="register-username"
                  autoComplete="username"
                  type="text"
                  required
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder={t('core.loginPage.usernamePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.email')}
                </label>
                <input
                  id="register-email"
                  autoComplete="email"
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder={t('core.loginPage.emailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="register-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.phoneOptional')}
                </label>
                <input
                  id="register-phone"
                  autoComplete="tel"
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder={t('core.loginPage.phonePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.passwordMinChars')}
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    autoComplete="new-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder={t('core.loginPage.passwordPlaceholder')}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
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

              <label htmlFor="register-age-confirmation" className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  id="register-age-confirmation"
                  type="checkbox"
                  required
                  checked={registerConfirmedAge}
                  onChange={(e) => setRegisterConfirmedAge(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('core.loginPage.ageConfirmation')}
                </span>
              </label>

              <label htmlFor="register-accept-terms" className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  id="register-accept-terms"
                  type="checkbox"
                  required
                  checked={registerAcceptedTerms}
                  onChange={(e) => setRegisterAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('core.loginPage.agreeToTermsPrefix')}{' '}
                  <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    {t('core.loginPage.termsOfServiceLink')}
                  </Link>{' '}
                  {t('core.loginPage.agreeToTermsAnd')}{' '}
                  <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    {t('core.loginPage.privacyPolicyLink')}
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                aria-disabled={loading}
                disabled={accountCreationDisabled}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 aria-disabled:cursor-wait disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.creatingAccount') : t('core.loginPage.createAccount')}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('core.loginPage.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('core.loginPage.forgotPasswordTitle')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('core.loginPage.forgotPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} aria-describedby={error ? 'auth-error' : undefined} aria-busy={loading} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  {t('core.loginPage.emailAddress')}
                </label>
                <input
                  id="forgot-email"
                  autoComplete="email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('core.loginPage.yourEmailPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                aria-disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 aria-disabled:cursor-wait text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('core.loginPage.submitting') : t('core.loginPage.sendResetInstructions')}
              </button>

              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
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
