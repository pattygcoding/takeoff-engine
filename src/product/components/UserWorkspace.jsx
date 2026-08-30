import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams, Link } from 'react-router-dom';
import Stepper from '@/product/components/Stepper';
import UploadStep from '@/product/components/UploadStep';
import ProjectDashboard from '@/product/components/ProjectDashboard';
import ProjectWorkspace from '@/product/components/ProjectWorkspace';
import AccountSettings from '@/core/components/auth/AccountSettings';
import { useAuth } from '@/core/components/context/AuthContext';
import { DEFAULT_RATES } from '@/product/lib/calculations';
import { useLocalStorageState } from '@/core/lib/shared/useLocalStorageState';
import { projectsApi } from '@/product/lib/projects';

export default function UserWorkspace() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useLocalStorageState('takeoff-engine.items', []);
  const [currentProject, setCurrentProject] = useLocalStorageState('takeoff-engine.currentProject', null);
  const [rates, setRates] = useLocalStorageState('takeoff-engine.rates', DEFAULT_RATES);
  const [importContext, setImportContext] = useState({ file: null, mappingData: null });

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
    setImportContext({ file: null, mappingData: null });
    navigate(`/${username}/upload`);
  };

  const handleItemsParsed = (parsedItems, options = {}) => {
    setItems(parsedItems);
    setImportContext({
      file: options?.file || null,
      mappingData: options?.mappingData || null,
    });
    if (options?.detectedLaborMode) {
      setRates((prevRates) => ({
        ...prevRates,
        laborMode: options.detectedLaborMode,
      }));
    }
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
            <div className="max-w-6xl mx-auto px-4 pt-5 pb-3 flex items-center justify-between">
              <Link
                to={`/${username}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
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
            importContext={importContext}
            setImportContext={setImportContext}
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
            importContext={importContext}
            setImportContext={setImportContext}
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
            importContext={importContext}
            setImportContext={setImportContext}
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
            importContext={importContext}
            setImportContext={setImportContext}
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
            importContext={importContext}
            setImportContext={setImportContext}
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
            importContext={importContext}
            setImportContext={setImportContext}
          />
        }
      />
      <Route path="*" element={<Navigate to={`/${username}`} replace />} />
    </Routes>
  );
}
