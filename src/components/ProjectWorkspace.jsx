import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Stepper from './Stepper';
import EditStep from './EditStep';
import ResultsStep from './ResultsStep';
import ExportHubPage from './ExportHubPage';
import { projectsApi } from '@/lib/projects';

export default function ProjectWorkspace({ step = 2, items, setItems, rates, setRates, currentProject, setCurrentProject }) {
  const { username, projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // When projectId is in the URL, make sure the project and its items are loaded
  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      if (!currentProject || currentProject.id !== projectId) {
        setLoading(true);
        setLoadError(null);
        projectsApi.getById(projectId)
          .then((fullProject) => {
            if (!isMounted) return;
            setCurrentProject(fullProject);
            const est = fullProject.latestEstimate;
            if (est?.items_json && Array.isArray(est.items_json)) {
              setItems(est.items_json);
            } else if (fullProject.items && Array.isArray(fullProject.items)) {
              setItems(fullProject.items);
            }
            if (est?.rates_json && typeof est.rates_json === 'object' && Object.keys(est.rates_json).length > 0) {
              setRates(est.rates_json);
            } else if (fullProject.rates && typeof fullProject.rates === 'object' && Object.keys(fullProject.rates).length > 0) {
              setRates(fullProject.rates);
            }
            // If project is awarded and user navigated directly to step 2 (edit) or step 1, redirect to results (step 3)
            if (fullProject?.status === 'awarded' && step === 2) {
              navigate(`/${username}/takeoff/${projectId}/results`, { replace: true });
            }
          })
          .catch((err) => {
            if (!isMounted) return;
            console.error('Failed to load project by URL ID:', err);
            setLoadError(err.message || 'Failed to load takeoff project.');
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      } else if (currentProject?.status === 'awarded' && step === 2) {
        // If already loaded and user tried navigating to /edit via URL
        navigate(`/${username}/takeoff/${projectId}/results`, { replace: true });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [projectId, step]);

  const isLocked = ['awarded', 'submitted', 'archived'].includes(currentProject?.status);

  const goToStep = (targetStep) => {
    // If project is locked (awarded, submitted, or archived), step 1 (upload) and step 2 (edit) are locked and not navigable
    if (isLocked && (targetStep === 1 || targetStep === 2)) {
      return;
    }

    if (projectId) {
      if (targetStep === 1) navigate(`/${username}/upload`);
      else if (targetStep === 2) navigate(`/${username}/takeoff/${projectId}/edit`);
      else if (targetStep === 3) navigate(`/${username}/takeoff/${projectId}/results`);
      else if (targetStep === 4) navigate(`/${username}/takeoff/${projectId}/export`);
    } else {
      if (targetStep === 1) navigate(`/${username}/upload`);
      else if (targetStep === 2) navigate(`/${username}/edit`);
      else if (targetStep === 3) navigate(`/${username}/results`);
      else if (targetStep === 4) navigate(`/${username}/export`);
    }
  };

  const handleCalculate = () => {
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject.id;
      navigate(`/${username}/takeoff/${activeId}/results`);
    } else {
      navigate(`/${username}/results`);
    }
  };

  const handleBackToEdit = () => {
    if (isLocked) return;
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject.id;
      navigate(`/${username}/takeoff/${activeId}/edit`);
    } else {
      navigate(`/${username}/edit`);
    }
  };

  const handleProjectSaved = (savedProj) => {
    setCurrentProject(savedProj);
    // If a newly created project was saved, update URL to include the new takeoff ID seamlessly
    if (savedProj?.id && (!projectId || projectId !== savedProj.id)) {
      navigate(`/${username}/takeoff/${savedProj.id}/${step === 3 ? 'results' : 'edit'}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Takeoff #{projectId}...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-2xl shadow-sm border border-red-200 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Could Not Load Takeoff</h3>
        <p className="text-sm text-slate-500 mb-5">{loadError}</p>
        <Link
          to={`/${username}`}
          className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
        >
          ← Back to Projects Dashboard
        </Link>
      </div>
    );
  }

  // If new draft takeoff without items and without a projectId, redirect to projects dashboard
  useEffect(() => {
    if (!loading && !projectId && (!items || items.length === 0)) {
      navigate(`/${username}`, { replace: true });
    }
  }, [loading, projectId, items, username, navigate]);

  if (!projectId && (!items || items.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Redirecting to Projects Dashboard...</p>
        </div>
      </div>
    );
  }

  const handleDuplicate = async () => {
    if (!currentProject?.id) return;
    try {
      setLoading(true);
      const cloned = await projectsApi.clone(currentProject.id);
      if (cloned?.id) {
        navigate(`/${username}/takeoff/${cloned.id}/edit`);
      }
    } catch (err) {
      console.error('Failed to duplicate awarded project:', err);
      setLoadError(err.message || 'Failed to duplicate project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-0 flex items-center justify-between">
        <Link
          to={`/${username}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
        >
          ← Back to Projects Dashboard
        </Link>
        {currentProject?.name && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-lg">
              Project: {currentProject.name}
            </span>
            {currentProject?.status === 'awarded' && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>Awarded</span>
              </span>
            )}
            {currentProject?.status === 'submitted' && (
              <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>Submitted</span>
              </span>
            )}
            {currentProject?.status === 'archived' && (
              <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>Archived</span>
              </span>
            )}
            {projectId && (
              <span className="text-[11px] font-mono font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                ID: {projectId.slice(0, 8)}
              </span>
            )}
          </div>
        )}
      </div>

      <Stepper step={step} onStepClick={goToStep} isAwarded={isLocked} />

      {step === 2 && (
        <EditStep
          items={items}
          onItemsChange={setItems}
          rates={rates}
          onRatesChange={setRates}
          onCalculate={handleCalculate}
          readOnly={isLocked}
          projectStatus={currentProject?.status}
          onDuplicate={isLocked ? handleDuplicate : undefined}
        />
      )}

      {step === 3 && (
        <ResultsStep
          items={items}
          rates={rates}
          currentProject={currentProject}
          onProjectSaved={handleProjectSaved}
          onBack={handleBackToEdit}
          readOnly={isLocked}
          projectStatus={currentProject?.status}
          onDuplicate={isLocked ? handleDuplicate : undefined}
        />
      )}

      {step === 4 && (
        <ExportHubPage
          items={items}
          rates={rates}
          currentProject={currentProject}
        />
      )}
    </>
  );
}
