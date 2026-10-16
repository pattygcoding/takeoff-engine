import { lazy, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Navigate, Route, Routes, useNavigate, useParams, Link } from 'react-router-dom';
import Stepper from '@/product/components/Stepper';
import NotFoundPage from '@/core/components/shared/NotFoundPage';
import UploadStep from '@/product/components/UploadStep';
import ProjectDashboard from '@/product/components/ProjectDashboard';
import { useAuth } from '@/core/components/context/AuthContext';
import { DEFAULT_RATES } from '@/product/lib/calculations';
import { useLocalStorageState } from '@/core/lib/shared/useLocalStorageState';
import { projectsApi } from '@/product/lib/projects';
import type { ImportContext, Project, Rates, TakeoffItem } from '@/types/models';

const ProjectWorkspace = lazy(() => import('@/product/components/ProjectWorkspace'));
const AccountSettings = lazy(() => import('@/core/components/auth/AccountSettings'));

/** The first candidate that is a non-empty array, or `[]`. */
function firstNonEmptyArray<T>(...candidates: unknown[]): T[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate as T[];
  }
  return [];
}

/** The first candidate that is a non-empty object, or `null`. */
function firstNonEmptyObject<T>(...candidates: unknown[]): T | null {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0) return candidate as T;
  }
  return null;
}

export default function UserWorkspace() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useLocalStorageState<TakeoffItem[]>('takeoff-engine.items', []);
  const [currentProject, setCurrentProject] = useLocalStorageState<Project | null>(
    'takeoff-engine.currentProject',
    null,
  );
  const [rates, setRates] = useLocalStorageState<Rates>('takeoff-engine.rates', DEFAULT_RATES);
  const [importContext, setImportContext] = useState<ImportContext>({ file: null, mappingData: null });

  // Redirect if URL username doesn't match authenticated username
  if (user && username !== user.username) {
    return <Navigate to={`/${user.username}`} replace />;
  }

  const userStepPaths: Record<number, string> = {
    1: `/${username}/upload`,
    2: currentProject?.id ? `/${username}/takeoff/${currentProject.id}/edit` : `/${username}/edit`,
    3: currentProject?.id ? `/${username}/takeoff/${currentProject.id}/results` : `/${username}/results`,
  };

  const goToStep = (step: number) => navigate(userStepPaths[step]);

  const handleOpenProject = async (project: Project, targetStep: string = 'edit') => {
    let activeProject = project;
    try {
      // Fetch full project data with items_json and rates_json
      activeProject = (await projectsApi.getById(String(project.id))) || project;
    } catch (err) {
      console.error('Failed to load project details:', err);
      // Fall back to the project object the caller already had.
    }
    setCurrentProject(activeProject);

    // Prefer the estimate payload, falling back to the project columns when it is empty.
    const est = activeProject.latestEstimate;
    const projectItems = firstNonEmptyArray<TakeoffItem>(est?.items_json, activeProject.items);
    if (projectItems.length > 0) setItems(projectItems);

    const projectRates = firstNonEmptyObject<Rates>(est?.rates_json, activeProject.rates);
    if (projectRates) setRates(projectRates);

    navigate(`/${username}/takeoff/${project.id}/${targetStep === 'results' ? 'results' : 'edit'}`);
  };

  const handleNewTakeoff = () => {
    setCurrentProject(null);
    setItems([]);
    setImportContext({ file: null, mappingData: null });
    navigate(`/${username}/upload`);
  };

  const handleItemsParsed = (parsedItems: TakeoffItem[], options: ImportContext = {}) => {
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects Dashboard
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
