import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import Stepper from './components/Stepper';
import UploadStep from './components/UploadStep';
import EditStep from './components/EditStep';
import ResultsStep from './components/ResultsStep';
import ProjectDashboard from './components/ProjectDashboard';
import AccountSettings from './components/AccountSettings';
import UserMenu from './components/UserMenu';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import ClientProposalView from './components/ClientProposalView';
import AdminPortal from './components/AdminPortal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';
import { DEFAULT_RATES } from './lib/calculations';
import { useLocalStorageState } from './lib/useLocalStorageState';

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
    2: `/${username}/edit`,
    3: `/${username}/results`,
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
        navigate(`/${username}/results`);
      } else {
        navigate(`/${username}/edit`);
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
        navigate(`/${username}/results`);
      } else {
        navigate(`/${username}/edit`);
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

      {/* Step 2: Edit */}
      <Route
        path="/edit"
        element={
          items.length === 0 ? (
            <Navigate to={`/${username}`} replace />
          ) : (
            <>
              <div className="max-w-6xl mx-auto px-4 pt-4 pb-0 flex items-center justify-between">
                <Link
                  to={`/${username}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
                >
                  ← Back to Projects Dashboard
                </Link>
                {currentProject?.name && (
                  <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-lg">
                    Project: {currentProject.name}
                  </span>
                )}
              </div>
              <Stepper step={2} onStepClick={goToStep} />
              <EditStep
                items={items}
                onItemsChange={setItems}
                rates={rates}
                onRatesChange={setRates}
                onCalculate={() => navigate(`/${username}/results`)}
              />
            </>
          )
        }
      />

      {/* Step 3: Results */}
      <Route
        path="/results"
        element={
          items.length === 0 ? (
            <Navigate to={`/${username}`} replace />
          ) : (
            <>
              <div className="max-w-6xl mx-auto px-4 pt-4 pb-0 flex items-center justify-between">
                <Link
                  to={`/${username}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
                >
                  ← Back to Projects Dashboard
                </Link>
                {currentProject?.name && (
                  <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-lg">
                    Project: {currentProject.name}
                  </span>
                )}
              </div>
              <Stepper step={3} onStepClick={goToStep} />
              <ResultsStep
                items={items}
                rates={rates}
                currentProject={currentProject}
                onProjectSaved={(savedProj) => setCurrentProject(savedProj)}
                onBack={() => navigate(`/${username}/edit`)}
              />
            </>
          )
        }
      />
      <Route path="*" element={<Navigate to={`/${username}`} replace />} />
    </Routes>
  );
}

function AppContent() {
  const [items, setItems] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
                  <div className="relative group">
                    <button
                      disabled
                      className="px-3.5 py-1.5 text-sm font-medium bg-slate-200 text-slate-400 rounded-lg cursor-not-allowed transition"
                      title="Registration is disabled while in beta for testing only"
                    >
                      Sign Up
                    </button>
                    <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 p-2 bg-slate-800 text-white text-[11px] rounded shadow-lg z-50 text-center leading-tight">
                      Registration is disabled while in beta for testing only.
                    </div>
                  </div>
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
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <LoginPage initialView="register" />
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

        {/* Public Client Proposal & E-Signature View */}
        <Route
          path="/p/:publicToken"
          element={<ClientProposalView />}
        />

        {/* User-Scoped Workspace Routes */}
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
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;
