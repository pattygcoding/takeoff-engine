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
