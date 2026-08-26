import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';

export default function AppFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  // If on client proposal view, skip global footer (proposal has dedicated client-facing footer)
  if (location.pathname.startsWith('/p/')) {
    return null;
  }

  const isDarkLanding = location.pathname === '/home' || (!isAuthenticated && (location.pathname === '/' || location.pathname === ''));

  return (
    <footer
      className={`no-print border-t transition-colors text-xs py-8 ${
        isDarkLanding
          ? 'bg-slate-950 border-slate-800 text-slate-500'
          : 'bg-white border-slate-200 text-slate-500 mt-auto'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <p className="font-bold text-sm tracking-tight text-slate-700 dark:text-slate-300">
            {t('footer.brandName')}
          </p>
          <p className="text-[11px] text-slate-400">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated && user?.username) {
                navigate(`/${user.username}`);
              } else {
                navigate('/home');
              }
            }}
            className="hover:text-indigo-600 transition"
          >
            {isAuthenticated ? t('footer.dashboard') : t('footer.home')}
          </button>

          <button
            type="button"
            onClick={() => navigate('/guide')}
            className="hover:text-indigo-600 transition"
          >
            {t('footer.documentation')}
          </button>

          <button
            type="button"
            onClick={() => navigate('/terms')}
            className="hover:text-indigo-600 transition"
          >
            {t('footer.acceptableUsePolicy')}
          </button>

          <button
            type="button"
            onClick={() => navigate('/disclaimer')}
            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline transition"
          >
            {t('footer.legalDisclaimer')}
          </button>
        </div>
      </div>
    </footer>
  );
}
