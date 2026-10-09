import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getTranslation } from '@/core/lib/shared/i18n';
import { isStaleBuildError, reloadForStaleBuild } from '@/core/lib/shared/staleBuild';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  staleBuild: boolean;
  reloading: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, staleBuild: false, reloading: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, staleBuild: isStaleBuildError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (isStaleBuildError(error) && reloadForStaleBuild()) {
      this.setState({ reloading: true });
      return;
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('takeoff_lang') || 'en' : 'en';

      if (this.state.reloading) {
        return (
          <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
            <div role="status" className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">
              {getTranslation('core.errorBoundary.updating', {}, savedLang)}
            </div>
          </div>
        );
      }

      const message = this.state.staleBuild
        ? getTranslation('core.errorBoundary.newVersionMessage', {}, savedLang)
        : this.state.error?.message || getTranslation('core.errorBoundary.defaultMessage', {}, savedLang);

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {getTranslation('core.errorBoundary.title', {}, savedLang)}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
            >
              {getTranslation('core.errorBoundary.reloadPage', {}, savedLang)}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
