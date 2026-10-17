import React from 'react';
import { Check, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';

type SectionVariant = 'default' | 'guarantee' | 'warning' | 'highlight' | 'contact' | 'closing';

interface RefundSection {
  n: number;
  title: string;
  body: string;
  variant: SectionVariant;
}

const REFUND_SECTIONS: RefundSection[] = [
  { n: 1, title: 's1Title', body: 's1Body', variant: 'default' },
  { n: 2, title: 's2Title', body: 's2Body', variant: 'guarantee' },
  { n: 3, title: 's3Title', body: 's3Body', variant: 'default' },
  { n: 4, title: 's4Title', body: 's4Body', variant: 'default' },
  { n: 5, title: 's5Title', body: 's5Body', variant: 'warning' },
  { n: 6, title: 's6Title', body: 's6Body', variant: 'highlight' },
  { n: 7, title: 's7Title', body: 's7Body', variant: 'contact' },
  { n: 8, title: 's8Title', body: 's8Body', variant: 'closing' },
];

const SECTION_CLASSES: Record<SectionVariant, string> = {
  default: '',
  guarantee:
    'rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-5',
  warning:
    'rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-5',
  highlight:
    'rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-5',
  contact: 'pt-4',
  closing: 'pt-4 border-t border-slate-100 dark:border-slate-800',
};

const TITLE_CLASSES: Record<SectionVariant, string> = {
  default: 'text-slate-900 dark:text-white',
  guarantee: 'text-emerald-950 dark:text-emerald-200',
  warning: 'text-amber-950 dark:text-amber-200',
  highlight: 'text-slate-900 dark:text-white',
  contact: 'text-slate-900 dark:text-white',
  closing: 'text-slate-900 dark:text-white',
};

const BADGE_CLASSES: Record<SectionVariant, string> = {
  default: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  guarantee: 'bg-emerald-600 text-white',
  warning: 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300',
  highlight: 'bg-slate-700 dark:bg-slate-600 text-white',
  contact: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  closing: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
};

const BODY_CLASSES: Record<SectionVariant, string> = {
  default: 'text-slate-600 dark:text-slate-300',
  guarantee: 'text-emerald-900 dark:text-emerald-300 font-medium',
  warning: 'text-slate-700 dark:text-slate-300 font-medium',
  highlight: 'text-slate-700 dark:text-slate-300 font-medium',
  contact: 'text-slate-600 dark:text-slate-300',
  closing: 'text-slate-600 dark:text-slate-300',
};

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
        title={t('core.refundPolicy.title', 'Refund & Cancellation Policy') + ' — Takeoff Engine'}
        description={t('core.refundPolicy.subtitle', 'Clear, straightforward guidelines on cancellations, refunds, and renewals')}
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
              title={t('core.common.goBack')}
            >
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t('core.refundPolicy.badge')}
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {t('core.refundPolicy.title')}
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
              {t('core.refundPolicy.headerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('core.refundPolicy.effectiveDate', { date: 'August 2026' })} • {t('core.refundPolicy.subtitle')}
            </p>
          </div>

          {REFUND_SECTIONS.map(({ n, title, body, variant }) => (
            <section key={n} className={`space-y-3 ${SECTION_CLASSES[variant]}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${TITLE_CLASSES[variant]}`}>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${BADGE_CLASSES[variant]}`}>
                  {variant === 'guarantee' ? <Check className="w-3.5 h-3.5" /> : n}
                </span>
                {t(`core.refundPolicy.${title}`)}
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${BODY_CLASSES[variant]}`}>
                {t(`core.refundPolicy.${body}`)}
              </p>
              {variant === 'contact' && (
                <div className="pt-2">
                  <a
                    href="mailto:pattygsocials@gmail.com"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
