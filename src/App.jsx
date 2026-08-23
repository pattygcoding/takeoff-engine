import { useState, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import Stepper from '@/components/Stepper';
import UploadStep from '@/components/UploadStep';
import ProjectDashboard from '@/components/ProjectDashboard';
import ProjectWorkspace from '@/components/ProjectWorkspace';
import AccountSettings from '@/components/AccountSettings';
import UserMenu from '@/components/UserMenu';
import LoginPage from '@/components/LoginPage';
import PlanOnboardingPage from '@/components/PlanOnboardingPage';
import LandingPage from '@/components/LandingPage';
import ClientProposalView from '@/components/ClientProposalView';
import AdminPortal from '@/components/AdminPortal';
import ClientGuidePage from '@/components/ClientGuidePage';
import UsagePolicyPage from '@/components/UsagePolicyPage';
import AcceptInvitePage from '@/components/AcceptInvitePage';
import UpgradeModal from '@/components/UpgradeModal';
import AppFooter from '@/components/AppFooter';
import LanguageSelector from '@/components/LanguageSelector';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ModalProvider } from '@/context/ModalContext';
import { I18nProvider } from '@/context/I18nContext';
import { DEFAULT_RATES } from '@/lib/calculations';
import { useLocalStorageState } from '@/lib/useLocalStorageState';
import { projectsApi } from '@/lib/projects';

function UserWorkspace({ items, setItems, rates, setRates, currentProject, setCurrentProject }) {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if URL username doesn't match authenticated username
  if (user && username !== user.username) {
    return <Navigate to={`/${user.username}`} replace />;
  }

  const userStepPaths = {
    1: `/${username}/upload`,
    2: currentProject?.id ? `/${username}/takeoff/${currentProject.id}/edit` : `/${username}/edit`,
    3: currentProject?.id ? `/${username}/takeoff/${currentProject.id}/results` : `/${username}/results`,
  };

  const goToStep = (step) => navigate(userStepPaths[step]);

  const handleOpenProject = async (project, targetStep = 'edit') => {
    try {
      // Fetch full project data with items_json and rates_json
      const fullProject = await projectsApi.getById(project.id);
      const activeProject = fullProject || project;
      setCurrentProject(activeProject);

      const est = activeProject.latestEstimate;
      if (est?.items_json && Array.isArray(est.items_json) && est.items_json.length > 0) {
        setItems(est.items_json);
      } else if (activeProject.items && Array.isArray(activeProject.items) && activeProject.items.length > 0) {
        setItems(activeProject.items);
      }

      if (est?.rates_json && typeof est.rates_json === 'object' && Object.keys(est.rates_json).length > 0) {
        setRates(est.rates_json);
      } else if (activeProject.rates && typeof activeProject.rates === 'object' && Object.keys(activeProject.rates).length > 0) {
        setRates(activeProject.rates);
      }

      if (targetStep === 'results') {
        navigate(`/${username}/takeoff/${project.id}/results`);
      } else {
        navigate(`/${username}/takeoff/${project.id}/edit`);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      // Fallback with provided project object
      setCurrentProject(project);
      const est = project.latestEstimate;
      if (est?.items_json && Array.isArray(est.items_json) && est.items_json.length > 0) {
        setItems(est.items_json);
      }
      if (est?.rates_json && typeof est.rates_json === 'object' && Object.keys(est.rates_json).length > 0) {
        setRates(est.rates_json);
      }
      if (targetStep === 'results') {
        navigate(`/${username}/takeoff/${project.id}/results`);
      } else {
        navigate(`/${username}/takeoff/${project.id}/edit`);
      }
    }
  };

  const handleNewTakeoff = () => {
    setCurrentProject(null);
    setItems([]);
    navigate(`/${username}/upload`);
  };

  const handleItemsParsed = (parsedItems) => {
    setItems(parsedItems);
    navigate(`/${username}/edit`);
  };

  return (
    <Routes>
      {/* Default User Route: Projects Dashboard */}
      <Route
        path="/"
        element={
          <ProjectDashboard
            onOpenProject={handleOpenProject}
            onNewTakeoff={handleNewTakeoff}
          />
        }
      />
      <Route
        path="/projects"
        element={
          <ProjectDashboard
            onOpenProject={handleOpenProject}
            onNewTakeoff={handleNewTakeoff}
          />
        }
      />

      {/* Account Settings */}
      <Route
        path="/settings"
        element={<AccountSettings />}
      />

      {/* Step 1: Upload */}
      <Route
        path="/upload"
        element={
          <>
            <div className="max-w-6xl mx-auto px-4 pt-4 pb-0 flex items-center justify-between">
              <Link
                to={`/${username}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
              >
                ← Back to Projects Dashboard
              </Link>
            </div>
            <Stepper step={1} onStepClick={goToStep} />
            <UploadStep onItemsParsed={handleItemsParsed} />
          </>
        }
      />

      {/* Existing Saved Takeoff Routes with Direct Project ID */}
      <Route
        path="/takeoff/:projectId/edit"
        element={
          <ProjectWorkspace
            step={2}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />
      <Route
        path="/takeoff/:projectId/results"
        element={
          <ProjectWorkspace
            step={3}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />
      <Route
        path="/takeoff/:projectId/export"
        element={
          <ProjectWorkspace
            step={4}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />

      {/* Draft / Unsaved Takeoff Routes */}
      <Route
        path="/edit"
        element={
          <ProjectWorkspace
            step={2}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />

      <Route
        path="/results"
        element={
          <ProjectWorkspace
            step={3}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />

      <Route
        path="/export"
        element={
          <ProjectWorkspace
            step={4}
            items={items}
            setItems={setItems}
            rates={rates}
            setRates={setRates}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
          />
        }
      />
      <Route path="*" element={<Navigate to={`/${username}`} replace />} />
    </Routes>
  );
}

function AppContent() {
  const [items, setItems] = useLocalStorageState('takeoff-engine.items', []);
  const [currentProject, setCurrentProject] = useLocalStorageState('takeoff-engine.currentProject', null);
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);
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
    <div className="min-h-screen bg-slate-100">
      {!isPublicLandingOrProposal && (
        <header className="no-print bg-white border-b border-slate-200 py-3 sm:py-4">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                if (isAuthenticated && user?.username) {
                  navigate(`/${user.username}`);
                } else {
                  navigate('/login');
                }
              }}
              title={isAuthenticated ? 'Go to Projects Dashboard' : 'Go to Login'}
            >
              <span className="text-xl font-bold text-indigo-600">Takeoff Engine</span>
              <span className="hidden sm:inline text-sm text-slate-400">Construction Estimating</span>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSelector variant="light" />

              <button
                type="button"
                onClick={() => navigate('/home')}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                title="View public marketing site & free trench calculator"
              >
                <span>🌐</span>
                <span>Public Site &amp; Tools</span>
              </button>

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
        {/* Auth Routes */}
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
          element={
            <LoginPage initialView="register" />
          }
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

        {/* Public Landing Page & Calculators */}
        <Route
          path="/home"
          element={<LandingPage />}
        />

        {/* Super-Admin Portal (US-014) */}
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

        {/* Documentation / Client Guide Page */}
        <Route
          path="/guide"
          element={<ClientGuidePage />}
        />

        {/* Acceptable Use & Account Suspension Policy (US-033) */}
        <Route
          path="/terms"
          element={<UsagePolicyPage />}
        />
        <Route
          path="/policy"
          element={<UsagePolicyPage />}
        />
        <Route
          path="/acceptable-use"
          element={<UsagePolicyPage />}
        />

        {/* Public Client Proposal & E-Signature View */}
        <Route
          path="/p/:publicToken"
          element={<ClientProposalView />}
        />

        {/* Team Workspace Invitation Acceptance (US-036) */}
        <Route
          path="/accept-invite"
          element={<AcceptInvitePage />}
        />

        {/* User-Scoped Workspace Routes */}
        <Route
          path="/:username/guide"
          element={<ClientGuidePage />}
        />
        <Route
          path="/:username/terms"
          element={<UsagePolicyPage />}
        />
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
        <Route
          path="/:username/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : (
              <UserWorkspace
                items={items}
                setItems={setItems}
                rates={rates}
                setRates={setRates}
                currentProject={currentProject}
                setCurrentProject={setCurrentProject}
              />
            )
          }
        />

        {/* Root Route: Public Landing Page or redirect to logged-in user dashboard */}
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

        {/* Fallback */}
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

      {/* Persistent Global Application Footer with Terms & Usage Policy Link */}
      <AppFooter />

      {/* Global Out of Credits Upgrade Modal Prompt on Login */}
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
      <I18nProvider>
        <AuthProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
