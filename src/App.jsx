import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Stepper from './components/Stepper';
import UploadStep from './components/UploadStep';
import EditStep from './components/EditStep';
import ResultsStep from './components/ResultsStep';
import UserMenu from './components/UserMenu';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DEFAULT_RATES } from './lib/calculations';
import { useLocalStorageState } from './lib/useLocalStorageState';

function UserWorkspace({ items, setItems, rates, setRates }) {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if URL username doesn't match authenticated username
  if (user && username !== user.username) {
    return <Navigate to={`/${user.username}`} replace />;
  }

  const userStepPaths = {
    1: `/${username}`,
    2: `/${username}/edit`,
    3: `/${username}/results`,
  };

  const goToStep = (step) => navigate(userStepPaths[step]);

  const handleItemsParsed = (parsedItems) => {
    setItems(parsedItems);
    navigate(`/${username}/edit`);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Stepper step={1} onStepClick={goToStep} />
            <UploadStep onItemsParsed={handleItemsParsed} />
          </>
        }
      />
      <Route
        path="/edit"
        element={
          items.length === 0 ? (
            <Navigate to={`/${username}`} replace />
          ) : (
            <>
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
      <Route
        path="/results"
        element={
          items.length === 0 ? (
            <Navigate to={`/${username}`} replace />
          ) : (
            <>
              <Stepper step={3} onStepClick={goToStep} />
              <ResultsStep
                items={items}
                rates={rates}
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
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Loading Takeoff Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
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
          >
            <span className="text-xl font-bold text-indigo-600">Takeoff Engine</span>
            <span className="hidden sm:inline text-sm text-slate-400">Construction Estimating</span>
          </div>

          <div className="flex items-center gap-3">
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
              />
            )
          }
        />

        {/* Root Route: Redirect to user workspace or login */}
        <Route
          path="/"
          element={
            isAuthenticated && user?.username ? (
              <Navigate to={`/${user.username}`} replace />
            ) : (
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
      <AppContent />
    </AuthProvider>
  );
}

export default App;
