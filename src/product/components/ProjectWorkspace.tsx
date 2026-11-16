import { useState, useEffect, useRef } from 'react';
import { Check, CopyPlus, Lock, Pencil, X } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Stepper from './Stepper';
import EditStep from './EditStep';
import ResultsStep from './ResultsStep';
import ExportHubPage from './ExportHubPage';
import { projectsApi } from '@/product/lib/projects';
import { useLiveEstimate } from '@/product/lib/useLiveEstimate';
import {
  isLocalDraftDirty,
  recordSavedFingerprint,
  useProjectAutosave,
} from '@/product/lib/useProjectAutosave';
import { buildEstimateSummary } from '@/product/lib/estimateSummary';
import { useTranslation } from '@/core/components/context/I18nContext';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
import type { Dispatch, SetStateAction } from 'react';
import type { ColumnDefinition, ImportContext, Project, Rates, TakeoffItem } from '@/types/models';

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
  columns = [],
  setColumns,
}: Readonly<{
  step?: number;
  items: TakeoffItem[];
  setItems: Dispatch<SetStateAction<TakeoffItem[]>>;
  rates: Rates;
  setRates: Dispatch<SetStateAction<Rates>>;
  currentProject: Project | null;
  setCurrentProject: Dispatch<SetStateAction<Project | null>>;
  importContext?: ImportContext;
  setImportContext: Dispatch<SetStateAction<ImportContext>>;
  /** Ordered column schema (canonical + passthrough columns) shared with the grid and exporters. */
  columns?: ColumnDefinition[];
  /** Persists a column schema change made in the takeoff grid. */
  setColumns?: Dispatch<SetStateAction<ColumnDefinition[]>>;
}>) {
  const { username, projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [customDraftName, setCustomDraftName] = useState('');

  const guard = useSingleFlight();
  // The load effect runs only when the project id changes, so it reads the local draft through a
  // ref instead of re-running (and re-fetching) on every grid edit.
  const localDraft = useRef({ items, rates, columns });
  localDraft.current = { items, rates, columns };
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
          const cloudItems = Array.isArray(est?.items_json)
            ? est.items_json
            : Array.isArray(fullProject.items)
              ? fullProject.items
              : null;
          const cloudRates =
            est?.rates_json && typeof est.rates_json === 'object' && Object.keys(est.rates_json).length > 0
              ? est.rates_json
              : fullProject.rates && typeof fullProject.rates === 'object' && Object.keys(fullProject.rates).length > 0
                ? fullProject.rates
                : null;
          // Restore the saved column schema so renamed/added/deleted passthrough columns come back.
          const cloudColumns = est?.columns_json ?? fullProject.columns;

          // Never replace edits this browser has not pushed to the cloud yet.
          const draft = localDraft.current;
          if (!isLocalDraftDirty(fullProject.id, draft.items, draft.rates, draft.columns)) {
            if (cloudItems) setItems(cloudItems);
            if (cloudRates) setRates(cloudRates);
            if (setColumns && Array.isArray(cloudColumns)) setColumns(cloudColumns);
            recordSavedFingerprint(
              fullProject.id,
              cloudItems ?? draft.items,
              cloudRates ?? draft.rates,
              Array.isArray(cloudColumns) ? cloudColumns : draft.columns,
            );
          }
          // If project is locked (awarded, declined, submitted, archived) and user navigated directly to step 2 (edit) or step 1, redirect to results (step 3)
          if (['awarded', 'declined', 'submitted', 'archived'].includes(fullProject?.status) && step === 2) {
            navigate(`/${username}/takeoff/${projectId}/results`, { replace: true });
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Failed to load project by URL ID:', err);
          setLoadError(err.message || t('product.projectWorkspace.errLoadFailed'));
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

  const isLocked = ['awarded', 'submitted', 'archived', 'declined'].includes(currentProject?.status ?? '');

  const goToStep = (targetStep: number) => {
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
    } else if (targetStep === 1) {
      navigate(`/${username}/upload`);
    } else if (targetStep === 2) {
      navigate(`/${username}/edit`);
    } else if (targetStep === 3) {
      navigate(`/${username}/results`);
    } else if (targetStep === 4) {
      navigate(`/${username}/export`);
    }
  };

  const handleCalculate = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject?.id;
      navigate(`/${username}/takeoff/${activeId}/results`);
    } else {
      navigate(`/${username}/results`);
    }
  };

  const handleBackToEdit = () => {
    if (isLocked) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (projectId || currentProject?.id) {
      const activeId = projectId || currentProject?.id;
      navigate(`/${username}/takeoff/${activeId}/edit`);
    } else {
      navigate(`/${username}/edit`);
    }
  };

  const handleProjectSaved = (savedProj: Project) => {
    setCurrentProject(savedProj);
    // If a newly created project was saved, update URL to include the new takeoff ID seamlessly
    if (savedProj?.id && (!projectId || projectId !== savedProj.id)) {
      navigate(`/${username}/takeoff/${savedProj.id}/${step === 3 ? 'results' : 'edit'}`, { replace: true });
    }
  };

  // One live estimate feeds both the Step 2 totals bar and the autosaved `summary_json`.
  const live = useLiveEstimate(items, rates);
  const draftName =
    customDraftName.trim() ||
    currentProject?.name ||
    importContext?.quoteMeta?.projectAddress ||
    importContext?.quoteMeta?.documentTitle ||
    importContext?.file?.name?.replace(/\.[^.]+$/, '') ||
    t('product.projectWorkspace.untitledTakeoff', 'Untitled takeoff');

  const startEditingProjectName = () => {
    if (isLocked) return;
    setNameDraft(currentProject?.name || draftName);
    setEditingName(true);
  };

  const commitProjectName = async () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (!trimmed) return;
    setCustomDraftName(trimmed);
    if (currentProject?.id && trimmed !== currentProject.name) {
      try {
        const updated = await projectsApi.update(String(currentProject.id), { name: trimmed });
        if (updated) setCurrentProject(updated);
      } catch (err) {
        console.error('Failed to rename project:', err);
      }
    }
  };

  // Drafts save themselves: the first Step 2 edit creates the project, later edits update it.
  const autosave = useProjectAutosave({
    project: currentProject,
    items,
    rates,
    columns,
    summary: live.ready ? buildEstimateSummary(live.totals, items.length) : undefined,
    draftName,
    enabled: !isLocked,
    onSaved: handleProjectSaved,
  });

  // If new draft takeoff without items and without a projectId, redirect to projects dashboard
  useEffect(() => {
    if (!loading && !projectId && (!items || items.length === 0)) {
      navigate(`/${username}`, { replace: true });
    }
  }, [loading, projectId, items, username, navigate]);

  const handleDuplicate = guard(() => `duplicate:${currentProject?.id || 'none'}`, async () => {
    if (!currentProject?.id) return;
    try {
      setLoading(true);
      const cloned = await projectsApi.clone(String(currentProject.id));
      if (cloned?.id) {
        navigate(`/${username}/takeoff/${cloned.id}/edit`);
      }
    } catch (err) {
      console.error('Failed to duplicate project:', err);
      setLoadError((err as Error).message || t('product.projectWorkspace.errDuplicateFailed'));
    } finally {
      setLoading(false);
    }
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            {t('product.projectWorkspace.loadingTakeoff', { id: projectId || '' })}
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-2xl shadow-sm border border-red-200 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">{t('product.projectWorkspace.couldNotLoadTitle')}</h3>
        <p className="text-sm text-slate-500 mb-5">{loadError}</p>
        <Link
          to={`/${username}`}
          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
        >
          {t('product.projectWorkspace.backToProjects')}
        </Link>
      </div>
    );
  }

  if (!projectId && (!items || items.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">{t('product.projectWorkspace.redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="no-print bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/${username}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            {t('product.projectWorkspace.backToProjects')}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {editingName && !isLocked ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void commitProjectName();
                }}
                className="inline-flex items-center gap-1.5"
              >
                <input
                  type="text"
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={120}
                  aria-label={t('product.projectWorkspace.renameProjectLabel')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                />
                <button
                  type="submit"
                  aria-label={t('product.projectWorkspace.saveProjectNameLabel')}
                  className="p-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  aria-label={t('core.common.cancel')}
                  className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            ) : !isLocked ? (
              <button
                type="button"
                onClick={startEditingProjectName}
                title={t('product.projectWorkspace.clickToRename')}
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <span className="truncate max-w-[220px] sm:max-w-[320px]">
                  {currentProject?.name || draftName}
                </span>
                <Pencil className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" aria-hidden="true" />
              </button>
            ) : (
              currentProject?.name && (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                  {t('product.projectWorkspace.projectPrefix', { name: currentProject.name })}
                </span>
              )
            )}

            {currentProject?.status === 'awarded' && (
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span><Lock className="w-3 h-3" aria-hidden="true" /></span>
                <span>{t('product.projectWorkspace.statusAwarded')}</span>
              </span>
            )}
            {currentProject?.status === 'submitted' && (
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span><Lock className="w-3 h-3" aria-hidden="true" /></span>
                <span>{t('product.projectWorkspace.statusSubmitted')}</span>
              </span>
            )}
            {currentProject?.status === 'archived' && (
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span><Lock className="w-3 h-3" aria-hidden="true" /></span>
                <span>{t('product.projectWorkspace.statusArchived')}</span>
              </span>
            )}
            {currentProject?.status === 'declined' && (
              <span className="text-xs font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span><Lock className="w-3 h-3" aria-hidden="true" /></span>
                <span>{t('product.projectWorkspace.statusDeclined')}</span>
              </span>
            )}

            {/* Drafts can be duplicated too: the clone starts as a fresh draft of the same takeoff. */}
            {currentProject?.id && !isLocked && (
              <button
                type="button"
                onClick={() => void handleDuplicate()}
                title={t(
                  'product.projectWorkspace.duplicateProjectHint',
                  'Duplicate this draft as a new project',
                )}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
                {t('product.projectWorkspace.duplicateProject', 'Duplicate')}
              </button>
            )}
          </div>
        </div>
      </div>

      <Stepper step={step} onStepClick={goToStep} isAwarded={isLocked} hasItems={items.length > 0} />

      {step === 2 && (
        <EditStep
          items={items}
          onItemsChange={setItems}
          rates={rates}
          onRatesChange={setRates}
          onCalculate={handleCalculate}
          readOnly={isLocked}
          projectStatus={currentProject?.status}
          onDuplicate={currentProject?.id ? handleDuplicate : undefined}
          importContext={importContext}
          onImportContextChange={setImportContext}
          columns={columns}
          onColumnsChange={setColumns}
          live={live}
          saveState={autosave}
        />
      )}

      {step === 3 && (
        <ResultsStep
          items={items}
          rates={rates}
          currentProject={currentProject}
          importContext={importContext}
          onProjectSaved={handleProjectSaved}
          onBack={handleBackToEdit}
          readOnly={isLocked}
          projectStatus={currentProject?.status}
          onDuplicate={currentProject?.id ? handleDuplicate : undefined}
          columns={columns}
          saveState={autosave}
        />
      )}

      {step === 4 && (
        <ExportHubPage
          items={items}
          rates={rates}
          currentProject={currentProject}
          columns={columns}
        />
      )}
    </>
  );
}
