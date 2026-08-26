import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '@/lib/product/projects';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  awarded: {
    label: 'Awarded',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  declined: {
    label: 'Declined',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
  },
};

export default function ProjectDashboard({ onOpenProject, onNewTakeoff }) {
  const { user, isAdmin } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Modals state
  const [renameModalProject, setRenameModalProject] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [statusModalProject, setStatusModalProject] = useState(null);
  const [newStatusInput, setNewStatusInput] = useState('draft');
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [isCloningId, setIsCloningId] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsApi.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not retrieve remote projects:', err);
      // Only show error message for non-404 network errors, otherwise gracefully default to empty project list
      if (err.message && !err.message.includes('404') && !err.message.includes('Not Found')) {
        setError(err.message || t('projectDashboard.errLoadFailed'));
      } else {
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.client_name && project.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.location && project.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpen = (project, targetStep = 'edit') => {
    onOpenProject(project, targetStep);
  };

  const handleClone = async (project) => {
    try {
      setIsCloningId(project.id);
      setActionMenuOpenId(null);
      const cloned = await projectsApi.clone(project.id);
      setProjects((prev) => [cloned, ...prev]);
    } catch (err) {
      await showAlert({
        title: t('projectDashboard.errDuplicateTitle'),
        message: err.message || t('projectDashboard.errDuplicateMessage'),
        variant: 'error',
      });
    } finally {
      setIsCloningId(null);
    }
  };

  const handleArchiveToggle = async (project) => {
    const rawStatus = (project.status || 'draft').toLowerCase().trim();
    const isArchived = rawStatus === 'archived';
    const nextStatus = isArchived ? 'draft' : 'archived';
    try {
      setActionMenuOpenId(null);
      const updated = await projectsApi.update(project.id, {
        status: nextStatus,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: updated.status } : p))
      );
      if (!isArchived) {
        setStatusFilter('archived');
      }
      await showAlert({
        title: isArchived ? t('projectDashboard.unarchivedTitle') : t('projectDashboard.archivedTitle'),
        message: isArchived
          ? t('projectDashboard.unarchivedMessage', { name: project.name })
          : t('projectDashboard.archivedMessage', { name: project.name }),
        variant: 'success',
      });
    } catch (err) {
      await showAlert({
        title: t('projectDashboard.errArchiveTitle'),
        message: err.message || t('projectDashboard.errArchiveMessage'),
        variant: 'error',
      });
    }
  };

  const handleDelete = async (project, isAdminDelete = false) => {
    const isSpecialAdminDelete = isAdminDelete || (isAdmin && !['draft', 'archived'].includes(project.status));

    const confirmed = await showConfirm({
      title: isSpecialAdminDelete ? t('projectDashboard.adminDeleteConfirmTitle') : t('projectDashboard.deleteConfirmTitle'),
      message: isSpecialAdminDelete
        ? t('projectDashboard.adminDeleteConfirmMessage', { name: project.name, status: project.status || 'active' })
        : t('projectDashboard.deleteConfirmMessage', { name: project.name }),
      confirmText: isSpecialAdminDelete ? t('projectDashboard.adminDeleteConfirmButton') : t('projectDashboard.deleteConfirmButton'),
      confirmVariant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    try {
      setIsDeletingId(project.id);
      setActionMenuOpenId(null);
      await projectsApi.delete(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      await showAlert({
        title: t('projectDashboard.errDeleteTitle'),
        message: err.message || t('projectDashboard.errDeleteMessage'),
        variant: 'error',
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameInput.trim() || !renameModalProject) return;

    try {
      const updated = await projectsApi.update(renameModalProject.id, {
        name: renameInput.trim(),
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === renameModalProject.id ? { ...p, name: updated.name } : p))
      );
      setRenameModalProject(null);
      setRenameInput('');
    } catch (err) {
      await showAlert({
        title: t('projectDashboard.errRenameTitle'),
        message: err.message || t('projectDashboard.errRenameMessage'),
        variant: 'error',
      });
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalProject) return;

    try {
      const updated = await projectsApi.update(statusModalProject.id, {
        status: newStatusInput,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === statusModalProject.id ? { ...p, status: updated.status } : p))
      );
      setStatusModalProject(null);
    } catch (err) {
      await showAlert({
        title: t('projectDashboard.errStatusUpdateTitle'),
        message: err.message || t('projectDashboard.errStatusUpdateMessage'),
        variant: 'error',
      });
    }
  };

  const formatCurrency = (val) => {
    if (!val || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & New Takeoff Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {t('projectDashboard.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('projectDashboard.subtitle')}
          </p>
        </div>

        <button
          onClick={onNewTakeoff}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('projectDashboard.newTakeoff')}
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t('projectDashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'draft', 'submitted', 'awarded', 'declined', 'archived'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setStatusFilter(statusKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === statusKey
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {statusKey}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
          <p className="text-slate-500 font-medium">{t('projectDashboard.loading')}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 shadow-sm">
          <p className="font-semibold mb-2">{t('projectDashboard.errorLoading')}</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"
          >
            {t('projectDashboard.tryAgain')}
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {searchQuery || statusFilter !== 'all'
              ? t('projectDashboard.noMatchesFound')
              : t('projectDashboard.noProjectsYet')}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchQuery || statusFilter !== 'all'
              ? t('projectDashboard.noMatchesHelp')
              : t('projectDashboard.noProjectsHelp')}
          </p>
          <button
            onClick={onNewTakeoff}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('projectDashboard.uploadTakeoffFile')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const rawStatus = (project.status || 'draft').toLowerCase().trim();
            const statusStyle = STATUS_CONFIG[rawStatus] || STATUS_CONFIG.draft;
            const isDraft = rawStatus === 'draft';
            const isArchived = rawStatus === 'archived';
            const isDeclined = rawStatus === 'declined';
            const isSubmittedOrAwarded = rawStatus === 'submitted' || rawStatus === 'awarded';
            const summary = project.latestEstimate?.summary_json || {};
            const bidTotal = summary.finalBidAmount || 0;
            const isCloning = isCloningId === project.id;
            const isDeleting = isDeletingId === project.id;

            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition duration-200 flex flex-col justify-between group relative ${
                  actionMenuOpenId === project.id ? 'z-30' : 'z-0'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span
                      onClick={() => {
                        setStatusModalProject(project);
                        setNewStatusInput(project.status || 'draft');
                      }}
                      className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.badgeClass} hover:opacity-80 transition`}
                      title={t('projectDashboard.clickToChangeStatus')}
                    >
                      {statusStyle.label}
                    </span>

                    {/* Action Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuOpenId(actionMenuOpenId === project.id ? null : project.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>

                      {actionMenuOpenId === project.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActionMenuOpenId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-sm">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                handleOpen(project, isDraft ? 'edit' : 'results');
                              }}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {isDraft ? t('projectDashboard.openTakeoff') : t('projectDashboard.viewTakeoffSummary') || t('projectDashboard.openTakeoff')}
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setRenameModalProject(project);
                                setRenameInput(project.name);
                              }}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              {t('projectDashboard.rename')}
                            </button>

                            <button
                              onClick={() => handleClone(project)}
                              disabled={isCloning}
                              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                            >
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {isCloning ? t('projectDashboard.duplicating') : t('projectDashboard.duplicate')}
                            </button>

                            {/* Draft or Declined projects: Show Archive and Delete */}
                            {(isDraft || isDeclined) && (
                              <>
                                <button
                                  onClick={() => handleArchiveToggle(project)}
                                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                  {t('projectDashboard.archiveProject')}
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <button
                                  onClick={() => handleDelete(project)}
                                  disabled={isDeleting}
                                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  {isDeleting ? t('projectDashboard.deleting') : t('projectDashboard.delete')}
                                </button>
                              </>
                            )}

                            {/* Archived projects: Show Restore and Delete */}
                            {isArchived && (
                              <>
                                <button
                                  onClick={() => handleArchiveToggle(project)}
                                  className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  {t('projectDashboard.restoreToDraft')}
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <button
                                  onClick={() => handleDelete(project)}
                                  disabled={isDeleting}
                                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  {isDeleting ? t('projectDashboard.deleting') : t('projectDashboard.delete')}
                                </button>
                              </>
                            )}

                            {/* Submitted or Awarded projects: Standard users cannot delete, but Admin users get 'Admin Delete' */}
                            {isAdmin && !isDraft && !isDeclined && !isArchived && (
                              <>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleDelete(project, true)}
                                  disabled={isDeleting}
                                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                  {isDeleting ? t('projectDashboard.deleting') : t('projectDashboard.adminDelete')}
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <h3
                    onClick={() => handleOpen(project)}
                    className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition cursor-pointer line-clamp-1"
                  >
                    {project.name}
                  </h3>

                  {(project.client_name || project.location) && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {project.client_name}
                      {project.client_name && project.location && ' • '}
                      {project.location}
                    </p>
                  )}
                </div>

                {/* Estimate Snapshot */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 mt-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">{t('projectDashboard.totalBidAmount')}</span>
                      <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {formatCurrency(bidTotal)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate(project.updated_at || project.created_at)}
                    </span>
                  </div>
                </div>

                {/* Open Button Footer */}
                <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpen(project, 'results')}
                    className="w-full py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {t('projectDashboard.openEstimate')}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rename Modal */}
      {renameModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('projectDashboard.renameModalTitle')}</h3>
            <p className="text-xs text-slate-500 mb-4">{t('projectDashboard.renameModalSubtitle')}</p>
            <form onSubmit={handleRenameSubmit}>
              <input
                type="text"
                required
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                placeholder={t('projectDashboard.projectNamePlaceholder')}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModalProject(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {t('projectDashboard.saveName')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('projectDashboard.changeStatusTitle')}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('projectDashboard.changeStatusSubtitle', { name: statusModalProject.name })}
            </p>
            <form onSubmit={handleStatusSubmit}>
              <div className="space-y-2 mb-6">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <label
                    key={key}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      newStatusInput === key
                        ? 'border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="projectStatus"
                        value={key}
                        checked={newStatusInput === key}
                        onChange={(e) => setNewStatusInput(e.target.value)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                      {key}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalProject(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {t('projectDashboard.updateStatus')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
