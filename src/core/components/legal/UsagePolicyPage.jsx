import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';

export default function UsagePolicyPage() {
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
        title={t('core.seo.policy.title', 'Acceptable Use Policy & Platform Terms — Takeoff Engine')}
        description={t('core.seo.policy.description', 'Review the acceptable use policy, compute fairness, rate limiting, and account standing guidelines for the Takeoff Engine estimating platform.')}
        canonicalUrl="https://takeoffengine.com/terms"
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t('core.usagePolicy.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('core.usagePolicy.title')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex-1 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {t('core.usagePolicy.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('core.usagePolicy.effectiveDate', { date: 'August 2026' })} • {t('core.usagePolicy.subtitle')}
            </p>
          </div>

          {/* Section 1: Introduction & Scope */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">1</span>
              {t('core.usagePolicy.s1Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('core.usagePolicy.s1Body')}
            </p>
          </section>

          {/* Section 2: Prohibited Conduct & System Abuse (Highlighted) */}
          <section className="space-y-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-5">
            <h3 className="text-lg font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-black">2</span>
              {t('core.usagePolicy.s2Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {t('core.usagePolicy.s2Intro')}
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <li>{t('core.usagePolicy.s2Item1')}</li>
              <li>{t('core.usagePolicy.s2Item2')}</li>
              <li>{t('core.usagePolicy.s2Item3')}</li>
              <li>{t('core.usagePolicy.s2Item4')}</li>
              <li>{t('core.usagePolicy.s2Item5')}</li>
            </ul>
          </section>

          {/* Section 3: Professional Conduct & Anti-Discrimination (Highlighted) */}
          <section className="space-y-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 p-5">
            <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-300 flex items-center justify-center text-xs font-black">3</span>
              {t('core.usagePolicy.s3Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {t('core.usagePolicy.s3Intro')}
            </p>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {t('core.usagePolicy.s3Body')}
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <li>{t('core.usagePolicy.s3Item1')}</li>
              <li>{t('core.usagePolicy.s3Item2')}</li>
              <li>{t('core.usagePolicy.s3Item3')}</li>
              <li>{t('core.usagePolicy.s3Item4')}</li>
            </ul>
          </section>

          {/* Section 4: Account Suspension, Termination & Enforcement */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">4</span>
              {t('core.usagePolicy.s4Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('core.usagePolicy.s4Body1')}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('core.usagePolicy.s4Body2')}
            </p>
          </section>

          {/* Section 5: Contact & Reporting Inquiries */}
          <section className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">5</span>
              {t('core.usagePolicy.s5Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('core.usagePolicy.s5Body')}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
