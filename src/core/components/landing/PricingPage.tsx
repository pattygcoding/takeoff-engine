import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PricingStatus,
  useAccountCreationDisabled,
  usePricingDisplay,
} from '@/core/components/context/PricingContext';
import SeoHead from '@/core/components/shared/SeoHead';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

/**
 * Standalone `/pricing` page.
 *
 * The plan chart below is a deliberate copy of the `#pricing` section in
 * `core/components/landing/LandingPage.tsx`. The landing page keeps its own copy so that section is
 * unchanged, which means **a plan, price, feature bullet or CTA change has to be made in both
 * files**. If maintaining two copies ever becomes a problem, extract the section into a shared
 * component and have both surfaces render it.
 *
 * Two intentional differences from the landing copy, both for standalone-document reasons:
 *   - the section title is the page's `h1` and plan tiers are `h2` (the landing page nests the same
 *     block under its hero `h1`, so it uses `h2`/`h3`). Visually identical; required because axe's
 *     `heading-order` rule flags a skipped level on a page audited as a whole.
 *   - no top border: the landing page uses it to divide stacked sections, and the app header already
 *     draws one directly above this page's content.
 */
export default function PricingPage() {
  const navigate = useNavigate();
  const { t, prices, ready } = usePricingDisplay();
  const accountCreationDisabled = useAccountCreationDisabled();
  const accountCreationTitle = accountCreationDisabled ? t('core.catalogPricing.accountCreationDisabled') : undefined;

  const {
    STARTER_MONTHLY_PRICE, PRO_MONTHLY_PRICE, ENTERPRISE_MONTHLY_PRICE,
    STARTER_YEARLY_PRICE, PRO_YEARLY_PRICE, ENTERPRISE_YEARLY_PRICE, EXTRA_SEAT_MONTHLY_PRICE,
  } = prices;

  const plans = [
    {
      key: 'freeTrial',
      price: t('core.landing.pricing.freeTrial.price'),
      sub: t('core.landing.pricing.freeTrial.noCard'),
      features: [1, 2, 3, 4].map((n) => t(`core.landing.pricing.freeTrial.f${n}`)),
    },
    {
      key: 'starter',
      price: t('core.landing.pricing.starter.price', { price: STARTER_MONTHLY_PRICE }),
      sub: t('core.landing.pricing.starter.yearly', { yearly: STARTER_YEARLY_PRICE }),
      features: [
        t('core.landing.pricing.starter.f1', { seats: STARTER_PLAN_SEATS }),
        ...[2, 3, 4, 5].map((n) => t(`core.landing.pricing.starter.f${n}`)),
      ],
    },
    {
      key: 'pro',
      highlight: true,
      price: t('core.landing.pricing.pro.price', { price: PRO_MONTHLY_PRICE }),
      sub: t('core.landing.pricing.pro.yearly', { yearly: PRO_YEARLY_PRICE }),
      features: [
        t('core.landing.pricing.pro.f1', { seats: PRO_PLAN_SEATS }),
        ...[2, 3, 4, 5].map((n) => t(`core.landing.pricing.pro.f${n}`)),
      ],
    },
    {
      key: 'enterprise',
      price: t('core.landing.pricing.enterprise.price', { price: ENTERPRISE_MONTHLY_PRICE }),
      sub: t('core.landing.pricing.enterprise.yearly', { yearly: ENTERPRISE_YEARLY_PRICE }),
      features: [
        t('core.landing.pricing.enterprise.f1', { seats: ENTERPRISE_PLAN_SEATS }),
        t('core.landing.pricing.enterprise.f2', { price: EXTRA_SEAT_MONTHLY_PRICE }),
        ...[3, 4, 5].map((n) => t(`core.landing.pricing.enterprise.f${n}`)),
      ],
    },
  ];

  return (
    <div className="pb-[72px] pt-[56px] sm:pb-[104px] sm:pt-[72px]">
      <SeoHead
        title={t('core.seo.pricing.title', 'Pricing & Plans | Takeoff Engine')}
        description={t('core.seo.pricing.description', 'Simple, transparent pricing for construction takeoff, estimating and client proposal software.')}
        canonicalUrl="https://takeoffengine.com/pricing"
      />

      <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
        {/* Section header inlined from the landing page's SectionHeader, promoted to the page's h1. */}
        <div className="mb-12">
          <p className="inline-flex items-center border border-current px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.07em]">
            {t('core.landing.pricing.tag')}
          </p>
          <h1 className="mt-4 text-[32px] sm:text-[42px] leading-[1.08] tracking-[-0.035em] font-extrabold max-w-[19em]">
            {t('core.landing.pricing.title')}
          </h1>
          <p className="mt-4 text-[17px] max-w-[46em] text-[var(--lp-muted)]">
            {t('core.landing.pricing.subtitle')}
          </p>
        </div>

        <PricingStatus />

        <div className="border-2 border-[var(--lp-ink)] bg-[var(--lp-card)]">
          <div className="hidden lg:grid grid-cols-[1.15fr_minmax(160px,.85fr)_1.9fr_auto] gap-9 px-[30px] py-[13px] bg-[var(--lp-paper)] border-b-2 border-[var(--lp-ink)] text-xs font-bold tracking-[0.06em] uppercase text-[var(--lp-muted)]">
            <span>{t('core.landing.pricing.colPlan')}</span>
            <span>{t('core.landing.pricing.colPrice')}</span>
            <span>{t('core.landing.pricing.colIncluded')}</span>
            <span className="min-w-[170px]" />
          </div>

          {plans.map((plan, idx) => (
            <div
              key={plan.key}
              className={`relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.15fr_minmax(160px,.85fr)_1.9fr_auto] gap-x-9 gap-y-5 p-6 sm:p-[30px] items-center ${
                idx < plans.length - 1 ? 'border-b border-[var(--lp-ink)]' : ''
              } ${plan.highlight ? 'bg-[var(--lp-tint)] pl-9 sm:pl-[38px]' : ''}`}
            >
              {plan.highlight && (
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--lp-accent)] border-r-2 border-[var(--lp-ink)]" />
              )}
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.025em] flex items-center gap-3 flex-wrap">
                  {t(`core.landing.pricing.${plan.key}.tier`)}
                  {plan.highlight && (
                    <span className="text-[11px] font-semibold tracking-[0.06em] uppercase bg-[var(--lp-accent)] text-white px-2 py-1">
                      {t('core.landing.pricing.pro.mostPopular')}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-[var(--lp-muted)] mt-1.5 max-w-[19em]">{t(`core.landing.pricing.${plan.key}.description`)}</p>
              </div>
              <div>
                <div className={`flex items-baseline gap-1 font-mono font-semibold text-[30px] lg:text-[26px] xl:text-[30px] tracking-[-0.04em] tabular-nums ${ready || plan.key === 'freeTrial' ? 'flex-nowrap whitespace-nowrap' : 'flex-wrap'}`}>
                  <span data-price-amount>{plan.price}</span>
                  <small data-price-cadence className="shrink-0 whitespace-nowrap font-sans font-normal text-[13px] tracking-normal text-[var(--lp-muted)]">
                    {t(`core.landing.pricing.${plan.key}.cadence`)}
                  </small>
                </div>
                <div className="text-[12.5px] text-[var(--lp-muted)] mt-1">{plan.sub}</div>
              </div>
              <ul className="sm:col-span-2 lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-[9px] text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-baseline gap-2.5">
                    <span aria-hidden="true" className="w-[7px] h-[7px] bg-[var(--lp-ink)] shrink-0 translate-y-[-1px]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={accountCreationDisabled || (plan.key !== 'freeTrial' && !ready)}
                title={accountCreationTitle}
                onClick={() => navigate('/register')}
                className={`lp-btn sm:col-span-2 lg:col-span-1 lg:min-w-[170px] ${plan.highlight ? '' : 'lp-btn-outline'}`}
              >
                {t(`core.landing.pricing.${plan.key}.cta`)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

