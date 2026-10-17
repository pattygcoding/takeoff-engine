import { useTranslation } from '@/core/components/context/I18nContext';

/**
 * Desktop-only brand panel shown beside the sign-in / sign-up / reset form.
 *
 * It reuses the landing page's hero copy and inverse palette so the auth screens
 * read as the same product as the marketing site: an ink panel that stays dark in
 * both themes, carrying the wordmark, the accent-marked hero headline, the trial
 * value props and a trust line. Below `lg` it is hidden, leaving the single form
 * column that is the correct mobile layout.
 */
export default function AuthBrandPanel() {
  const { t } = useTranslation();

  const valueProps = [
    t('core.landing.pricing.freeTrial.f1'),
    t('core.landing.pricing.freeTrial.f2'),
    t('core.landing.pricing.freeTrial.f3'),
  ];

  return (
    <div className="hidden flex-col justify-between gap-10 bg-[var(--lp-inverse)] p-9 text-[var(--lp-inverse-text)] lg:flex lg:p-11">
      {/* The same mark the app header and landing page draw, inverted for the dark panel. */}
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative h-[26px] w-[26px] shrink-0 bg-white">
          <span className="absolute right-0 bottom-0 h-[11px] w-[11px] bg-[var(--lp-accent)]" />
        </span>
        <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
          {t('core.footer.brandName')}
        </span>
      </div>

      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/80">
          {t('core.landing.topbar.tagline')}
        </p>
        <h2 className="mt-4 text-[30px] font-extrabold leading-[1.16] tracking-[-0.03em] text-white lg:text-[34px]">
          {t('core.landing.hero.title')}{' '}
          <mark className="whitespace-nowrap bg-[var(--lp-accent)] px-[0.12em] text-white">
            {t('core.landing.hero.titleHighlight')}
          </mark>
        </h2>
        <ul className="mt-7 space-y-3 text-[14px] leading-[1.5]">
          {valueProps.map((valueProp) => (
            <li key={valueProp} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[7px] h-2 w-2 shrink-0 bg-[var(--lp-accent)]" />
              <span>{valueProp}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-center gap-2.5 border-t border-[var(--lp-inverse-rule)] pt-5 text-[13px]">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-[var(--lp-accent)]" />
        {t('core.landing.hero.badgeNoCard')}
      </p>
    </div>
  );
}
