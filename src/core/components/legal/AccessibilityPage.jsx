import { useTranslation } from '@/core/components/context/I18nContext';
import SeoHead from '@/core/components/shared/SeoHead';

export default function AccessibilityPage() {
  const { t } = useTranslation();

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-slate-900 dark:text-slate-100">
      <SeoHead
        title={`${t('core.accessibility.statement.title')} - Takeoff Engine`}
        description={t('core.accessibility.statement.intro')}
        canonicalUrl="https://takeoffengine.com/accessibility"
      />
      <h1 className="text-3xl font-bold mb-4">{t('core.accessibility.statement.title')}</h1>
      <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.intro')}</p>
      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">{t('core.accessibility.statement.statusTitle')}</h2>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.status')}</p>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.limitations')}</p>
        <a href="https://www.w3.org/TR/WCAG22/" className="inline-block py-1 underline text-indigo-700 dark:text-indigo-300">
          {t('core.accessibility.statement.standard')}
        </a>
      </section>
      <section className="mt-8 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/60 dark:bg-amber-950/30">
        <h2 className="text-xl font-bold">{t('core.accessibility.statement.noticeTitle')}</h2>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.notice')}</p>
      </section>
      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-bold">{t('core.accessibility.statement.contactTitle')}</h2>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.contact')}</p>
        <a href="mailto:pattygsocials@gmail.com" className="inline-block py-1 break-all underline text-indigo-700 dark:text-indigo-300">
          pattygsocials@gmail.com
        </a>
        <p className="leading-relaxed text-slate-700 dark:text-slate-300">{t('core.accessibility.statement.details')}</p>
      </section>
    </article>
  );
}