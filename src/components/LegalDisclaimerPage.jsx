import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function LegalDisclaimerPage() {
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
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 flex flex-col">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
              title={t('common.goBack')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                {t('legalDisclaimer.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {t('legalDisclaimer.title')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector variant="light" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex-1 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-200 pb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {t('legalDisclaimer.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t('legalDisclaimer.effectiveDate', { date: 'August 2026' })} • {t('legalDisclaimer.subtitle')}
            </p>
          </div>

          {/* Section 1: Estimation Nature & No Professional Engineering Guarantee (Highlighted) */}
          <section className="space-y-4 rounded-xl bg-amber-50/70 border border-amber-200/90 p-5">
            <h3 className="text-lg font-bold text-amber-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center text-xs font-black">1</span>
              {t('legalDisclaimer.s1Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {t('legalDisclaimer.s1Body')}
            </p>
          </section>

          {/* Section 2: Contractor Responsibility & Mandatory Field Verification */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">2</span>
              {t('legalDisclaimer.s2Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('legalDisclaimer.s2Body')}
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <li>{t('legalDisclaimer.s2Item1')}</li>
              <li>{t('legalDisclaimer.s2Item2')}</li>
              <li>{t('legalDisclaimer.s2Item3')}</li>
              <li>{t('legalDisclaimer.s2Item4')}</li>
            </ul>
          </section>

          {/* Section 3: As-Is Platform & Warranty Disclaimer */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">3</span>
              {t('legalDisclaimer.s3Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('legalDisclaimer.s3Body')}
            </p>
          </section>

          {/* Section 4: Limitation of Liability & Consequential Damages (Highlighted) */}
          <section className="space-y-4 rounded-xl bg-red-50/60 border border-red-200/80 p-5">
            <h3 className="text-lg font-bold text-red-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-200/80 text-red-900 flex items-center justify-center text-xs font-black">4</span>
              {t('legalDisclaimer.s4Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {t('legalDisclaimer.s4Body')}
            </p>
            <ul className="list-disc list-outside ml-6 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <li>{t('legalDisclaimer.s4Item1')}</li>
              <li>{t('legalDisclaimer.s4Item2')}</li>
              <li>{t('legalDisclaimer.s4Item3')}</li>
            </ul>
          </section>

          {/* Section 5: Third-Party Data, Software Integrations & CSV/Excel Inputs */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">5</span>
              {t('legalDisclaimer.s5Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('legalDisclaimer.s5Body')}
            </p>
          </section>

          {/* Section 6: Client Proposals, Electronic Signatures & Binding Contracts */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">6</span>
              {t('legalDisclaimer.s6Title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('legalDisclaimer.s6Body')}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
