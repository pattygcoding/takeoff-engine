import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import LanguageSelector from '@/components/shared/LanguageSelector';
import ThemeToggle from '@/components/shared/ThemeToggle';
import SeoHead from '@/components/shared/SeoHead';

export default function TermsOfServicePage() {
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
        title={t('termsOfService.title', 'Terms of Service') + ' — Takeoff Engine'}
        description={t('termsOfService.subtitle', 'General terms governing your use of Takeoff Engine')}
        canonicalUrl="https://takeoffengine.com/terms-of-service"
      />
      {/* Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition cursor-pointer"
              title={t('common.goBack')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t('termsOfService.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('termsOfService.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="header" />
            <LanguageSelector variant="light" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex-1 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {t('termsOfService.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('termsOfService.effectiveDate', { date: 'August 2026' })} • {t('termsOfService.subtitle')}
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">1</span>
              {t('termsOfService.s1Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('termsOfService.s1Body')}
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">2</span>
              {t('termsOfService.s2Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('termsOfService.s2Body')}
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">3</span>
              {t('termsOfService.s3Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {t('termsOfService.s3Body')}
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">4</span>
              {t('termsOfService.s4Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('termsOfService.s4Body')}
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">5</span>
              {t('termsOfService.s5Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('termsOfService.s5Body')}
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">6</span>
              {t('termsOfService.s6Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('termsOfService.s6Body')}
            </p>
            <div className="pt-2">
              <a
                href="mailto:pattygsocials@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
              >
                ✉ pattygsocials@gmail.com
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
