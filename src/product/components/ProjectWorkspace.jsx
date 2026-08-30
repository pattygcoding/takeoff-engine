import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Stepper from './Stepper';
import EditStep from './EditStep';
import ResultsStep from './ResultsStep';
import ExportHubPage from './ExportHubPage';
import { projectsApi } from '@/product/lib/projects';
import { useTranslation } from '@/context/I18nContext';

export default function ProjectWorkspace({
  step = 2,
  items,
  setItems,
  rates,
  setRates,
  currentProject,
  setCurrentProject,
  importContext = { file: null, mappingData: null },
  setImportContext,
}) {
  const { username, projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // When projectId is in the URL, only fetch if current project is not loaded or does not match
  useEffect(() => {
    let isMounted = true;
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
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
          // If project is locked (awarded, declined, submitted, archived) and user navigated directly to step 2 (edit) or step 1, redirect to results (step 3)
          if (['awarded', 'declined', 'submitted', 'archived'].includes(fullProject?.status) && step === 2) {
            navigate(`/${username}/takeoff/${projectId}/results`, { replace: true });
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Failed to load project by URL ID:', err);
          setLoadError(err.message || t('projectWorkspace.errLoadFailed'));
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Scroll to the top of the page whenever the workspace step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  const isLocked = ['awarded', 'submitted', 'archived', 'declined'].includes(currentProject?.status);

  const goToStep = (targetStep) => {
    // If project is locked (awarded, submitted, archived, or declined), step 1 (upload) and step 2 (edit) are locked and not navigable
    if (isLocked && (targetStep === 1 || targetStep === 2)) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

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
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject.id;
      navigate(`/${username}/takeoff/${activeId}/results`);
    } else {
      navigate(`/${username}/results`);
    }
  };

  const handleBackToEdit = () => {
    if (isLocked) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  // If new draft takeoff without items and without a projectId, redirect to projects dashboard
  useEffect(() => {
    if (!loading && !projectId && (!items || items.length === 0)) {
      navigate(`/${username}`, { replace: true });
    }
  }, [loading, projectId, items, username, navigate]);

  const handleDuplicate = async () => {
    if (!currentProject?.id) return;
    try {
      setLoading(true);
      const cloned = await projectsApi.clone(currentProject.id);
      if (cloned?.id) {
        navigate(`/${username}/takeoff/${cloned.id}/edit`);
      }
    } catch (err) {
      console.error('Failed to duplicate project:', err);
      setLoadError(err.message || t('projectWorkspace.errDuplicateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            {t('projectWorkspace.loadingTakeoff', { id: projectId || '' })}
          </p>
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
        <h3 className="text-lg font-bold text-slate-900 mb-1">{t('projectWorkspace.couldNotLoadTitle')}</h3>
        <p className="text-sm text-slate-500 mb-5">{loadError}</p>
        <Link
          to={`/${username}`}
          className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
        >
          {t('projectWorkspace.backToProjects')}
        </Link>
      </div>
    );
  }

  if (!projectId && (!items || items.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">{t('projectWorkspace.redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/${username}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          {t('projectWorkspace.backToProjects')}
        </Link>
        {currentProject?.name && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 px-2.5 py-1 rounded-lg">
              {t('projectWorkspace.projectPrefix', { name: currentProject.name })}
            </span>
            {currentProject?.status === 'awarded' && (
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>{t('projectWorkspace.statusAwarded')}</span>
              </span>
            )}
            {currentProject?.status === 'submitted' && (
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>{t('projectWorkspace.statusSubmitted')}</span>
              </span>
            )}
            {currentProject?.status === 'archived' && (
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>{t('projectWorkspace.statusArchived')}</span>
              </span>
            )}
            {currentProject?.status === 'declined' && (
              <span className="text-xs font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>{t('projectWorkspace.statusDeclined')}</span>
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
          importContext={importContext}
          onImportContextChange={setImportContext}
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
