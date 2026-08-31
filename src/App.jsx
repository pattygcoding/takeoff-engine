import { useState, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';

// Core Auth & User Components
import AccountSettings from '@/core/components/auth/AccountSettings';
import UserMenu from '@/core/components/auth/UserMenu';
import LoginPage from '@/core/components/auth/LoginPage';
import PlanOnboardingPage from '@/core/components/billing/PlanOnboardingPage';
import AcceptInvitePage from '@/core/components/auth/AcceptInvitePage';

// Core Pages & Portals
import LandingPage from '@/core/components/landing/LandingPage';
import AdminPortal from '@/core/components/admin/AdminPortal';
import UsagePolicyPage from '@/core/components/legal/UsagePolicyPage';
import LegalDisclaimerPage from '@/core/components/legal/LegalDisclaimerPage';
import PrivacyPolicyPage from '@/core/components/legal/PrivacyPolicyPage';
import RefundPolicyPage from '@/core/components/legal/RefundPolicyPage';
import TermsOfServicePage from '@/core/components/legal/TermsOfServicePage';

// Core Billing & Shared Components
import UpgradeModal from '@/core/components/billing/UpgradeModal';
import AppFooter from '@/core/components/shared/AppFooter';
import LanguageSelector from '@/core/components/shared/LanguageSelector';
import ThemeToggle from '@/core/components/shared/ThemeToggle';
import ErrorBoundary from '@/core/components/shared/ErrorBoundary';

// Core Context & Providers
import { AuthProvider, useAuth } from '@/core/components/context/AuthContext';
import { ModalProvider } from '@/core/components/context/ModalContext';
import { I18nProvider } from '@/core/components/context/I18nContext';
import { ThemeProvider } from '@/core/components/context/ThemeContext';

// Product Routes (Decoupled Domain Layer)
import { renderProductRoutes } from '@/product/routes/ProductRoutes';

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showAutoUpgradeModal, setShowAutoUpgradeModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier));

  // Automatically prompt free users with 0 credits to upgrade when they log in / view the app
  useEffect(() => {
    if (!loading && isAuthenticated && user && !isExempt) {
      const remainingCredits = typeof user.trial_uses_remaining === 'number' ? user.trial_uses_remaining : 5;
      if (remainingCredits <= 0) {
        setShowAutoUpgradeModal(true);
      }
    }
  }, [loading, isAuthenticated, user?.id, user?.trial_uses_remaining, isExempt]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Loading Takeoff Engine...</div>
      </div>
    );
  }

  const isPublicLandingOrProposal =
    location.pathname === '/home' ||
    (!isAuthenticated && (location.pathname === '/' || location.pathname === '')) ||
    location.pathname.startsWith('/p/');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {!isPublicLandingOrProposal && (
        <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 sm:py-4 transition-colors duration-200">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  if (isAuthenticated && user?.username) {
                    navigate(`/${user.username}`);
                  } else {
                    navigate('/home');
                  }
                }}
                title={isAuthenticated ? 'Go to Projects Dashboard' : 'Go to Home'}
              >
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Takeoff Engine</span>
                <span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500">Construction Estimating</span>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate('/home');
                }}
                aria-label="View public marketing site & free trench calculator"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="View public marketing site & free trench calculator"
              >
                <span aria-hidden="true">🌐</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSelector variant="light" />

              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-3.5 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <Routes>
        {/* Core Auth & Onboarding Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <LoginPage initialView="login" />
            )
          }
        />
        <Route
          path="/register"
          element={<LoginPage initialView="register" />}
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              <PlanOnboardingPage />
            ) : (
              <Navigate to="/register" replace />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <LoginPage initialView="forgot" />
            )
          }
        />
        <Route
          path="/accept-invite"
          element={<AcceptInvitePage />}
        />

        {/* Core Landing Page */}
        <Route
          path="/home"
          element={<LandingPage />}
        />

        {/* Core Super-Admin Portal */}
        <Route
          path="/admin"
          element={
            isAuthenticated && user?.role === 'admin' ? (
              <AdminPortal />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Core Terms, Privacy, Refund, Legal & Policy Pages */}
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/refund" element={<RefundPolicyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/policy" element={<UsagePolicyPage />} />
        <Route path="/acceptable-use" element={<UsagePolicyPage />} />
        <Route path="/disclaimer" element={<LegalDisclaimerPage />} />
        <Route path="/legal-disclaimer" element={<LegalDisclaimerPage />} />

        {/* User Scoped Core Settings & Legal Wrappers */}
        <Route path="/:username/terms" element={<TermsOfServicePage />} />
        <Route path="/:username/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/:username/refund" element={<RefundPolicyPage />} />
        <Route path="/:username/acceptable-use" element={<UsagePolicyPage />} />
        <Route path="/:username/disclaimer" element={<LegalDisclaimerPage />} />
        <Route
          path="/:username/settings"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <AccountSettings />
            )
          }
        />

        {/* Product-Specific Routes (Decoupled Domain Layer) */}
        {renderProductRoutes(isAuthenticated)}

        {/* Core Root Route & Fallback */}
        <Route
          path="/"
          element={
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="*"
          element={
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <LandingPage />
            )
          }
        />
      </Routes>

      {/* Persistent Global Application Footer */}
      <AppFooter />

      {/* Global Out of Credits Upgrade Modal Prompt */}
      <UpgradeModal
        isOpen={showAutoUpgradeModal}
        onClose={() => setShowAutoUpgradeModal(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
