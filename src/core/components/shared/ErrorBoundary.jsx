import React from 'react';
import { getTranslation } from '@/core/lib/shared/i18n';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('takeoff_lang') || 'en' : 'en';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {getTranslation('core.errorBoundary.title', {}, savedLang)}
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {this.state.error?.message || getTranslation('core.errorBoundary.defaultMessage', {}, savedLang)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
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
