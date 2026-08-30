import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';

export default function RefundPolicyPage() {
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
        title={t('refundPolicy.title', 'Refund & Cancellation Policy') + ' — Takeoff Engine'}
        description={t('refundPolicy.subtitle', 'Clear, straightforward guidelines on cancellations, refunds, and renewals')}
        canonicalUrl="https://takeoffengine.com/refund"
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('refundPolicy.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('refundPolicy.title')}
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
              {t('refundPolicy.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('refundPolicy.effectiveDate', { date: 'August 2026' })} • {t('refundPolicy.subtitle')}
            </p>
          </div>

          {/* Section 1: Cancellations */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">1</span>
              {t('refundPolicy.s1Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('refundPolicy.s1Body')}
            </p>
          </section>

          {/* Section 2: 14-Day Guarantee */}
          <section className="space-y-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-5">
            <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">✓</span>
              {t('refundPolicy.s2Title')}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 leading-relaxed font-medium">
              {t('refundPolicy.s2Body')}
            </p>
          </section>

          {/* Section 3: Renewals */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">2</span>
              {t('refundPolicy.s3Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('refundPolicy.s3Body')}
            </p>
          </section>

          {/* Section 4: Merchant of Record */}
          <section className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-700 dark:bg-slate-600 text-white flex items-center justify-center text-xs font-black">3</span>
              {t('refundPolicy.s4Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {t('refundPolicy.s4Body')}
            </p>
          </section>

          {/* Section 5: Support */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">4</span>
              {t('refundPolicy.s5Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('refundPolicy.s5Body')}
            </p>
            <div className="pt-2">
              <a
                href="mailto:pattygsocials@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
