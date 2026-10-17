import React from 'react';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const handleBack = () => {
    if (isAuthenticated && user?.username) {
      navigate(`/${user.username}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 flex flex-col transition-colors duration-200">
      <SeoHead
        title={t('core.privacyPolicy.title', 'Privacy Policy') + ' — Takeoff Engine'}
        description={t('core.privacyPolicy.subtitle', 'How Takeoff Engine protects, handles, and processes your data')}
        canonicalUrl="https://takeoffengine.com/privacy"
      />
      {/* Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition cursor-pointer"
              title={t('core.common.goBack')}
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t('core.privacyPolicy.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('core.privacyPolicy.title')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex-1 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {t('core.privacyPolicy.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('core.privacyPolicy.effectiveDate', { date: 'August 2026' })} • {t('core.privacyPolicy.subtitle')}
            </p>
          </div>

          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => (
            <section
              key={n}
              className={`space-y-3 ${n === 6 ? 'rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5' : ''} ${n === 13 ? 'pt-4 border-t border-slate-100 dark:border-slate-800' : ''}`}
            >
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${n === 6 ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'}`}>
                  {n}
                </span>
                {t(`core.privacyPolicy.s${n}Title`)}
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${n === 6 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                {t(`core.privacyPolicy.s${n}Body`)}
              </p>
              {n === 13 && (
                <div className="pt-2">
                  <a
                    href="mailto:pattygsocials@gmail.com"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    <Mail className="w-4 h-4" /> pattygsocials@gmail.com
                  </a>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
