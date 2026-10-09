import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '@/core/lib/shared/formatting';
import {
  AccountCreationDisabledNotice,
  PricingStatus,
  useAccountCreationDisabled,
  usePricingDisplay,
} from '@/core/components/context/PricingContext';
import { useTheme } from '@/core/components/context/ThemeContext';
import LanguageSelector from '@/core/components/shared/LanguageSelector';
import SeoHead from '@/core/components/shared/SeoHead';
import AccessibleDialog from '@/core/components/shared/AccessibleDialog';
import InfisicalEnvironmentBadge from '@/core/components/landing/InfisicalEnvironmentBadge';
import { ArrowRight, ArrowDown, Sun, Moon } from 'lucide-react';
import {
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

const SUPPORT_EMAIL = 'pattygsocials@gmail.com';

// Dividers for the 4-step strip at 1, 2 and 4 columns.
const STEP_BORDERS = [
  '',
  'border-t sm:border-t-0 sm:border-l sm:pl-6',
  'border-t lg:border-t-0 lg:border-l lg:pl-6',
  'border-t lg:border-t-0 sm:border-l sm:pl-6',
];

function LogoMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative w-[26px] h-[26px] shrink-0 ${inverse ? 'bg-white' : 'bg-[var(--lp-ink)]'}`}
    >
      <span className="absolute right-0 bottom-0 w-[11px] h-[11px] bg-[var(--lp-accent)]" />
    </span>
  );
}

function SectionHeader({
  label,
  title,
  description,
  onBand = false,
}: {
  label: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onBand?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3 lg:gap-8 mb-12">
      <div className="text-[13px] font-semibold lg:pt-2.5">
        <span>{label}</span>
      </div>
      <div>
        <h2 className="text-[32px] sm:text-[42px] leading-[1.08] tracking-[-0.035em] font-extrabold max-w-[17em]">{title}</h2>
        {description && (
          <p className={`mt-4 text-[17px] max-w-[36em] ${onBand ? 'text-white' : 'text-[var(--lp-muted)]'}`}>{description}</p>
        )}
      </div>
    </div>
  );
}

// Comparison marker: filled = included, half = limited, empty = not available.
function Marker({ type }: { type?: string }) {
  const fill =
    type === 'yes'
      ? 'bg-[var(--lp-ink)]'
      : type === 'partial'
        ? 'bg-[linear-gradient(90deg,var(--lp-ink)_50%,transparent_50%)]'
        : 'bg-transparent';
  return <i aria-hidden="true" className={`inline-block w-3 h-3 border-2 border-[var(--lp-ink)] shrink-0 ${fill}`} />;
}

function CalcField({
  id,
  label,
  value,
  onChange,
  step,
  min = 0,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number | string;
  min?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        className="w-full font-mono tabular-nums text-xl font-medium py-1.5 border-0 border-b-2 border-[var(--lp-ink)] bg-transparent text-[var(--lp-ink)] rounded-none focus:outline-none focus:bg-[var(--lp-tint)]"
      />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, prices, ready } = usePricingDisplay();
  const accountCreationDisabled = useAccountCreationDisabled();
  const accountCreationTitle = accountCreationDisabled ? t('core.catalogPricing.accountCreationDisabled') : undefined;
  const {
    STARTER_MONTHLY_PRICE, PRO_MONTHLY_PRICE, ENTERPRISE_MONTHLY_PRICE,
    STARTER_YEARLY_PRICE, PRO_YEARLY_PRICE, ENTERPRISE_YEARLY_PRICE, EXTRA_SEAT_MONTHLY_PRICE,
  } = prices;
  const { isDark, toggleTheme } = useTheme();
  const [showDevDisclaimer, setShowDevDisclaimer] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Free Interactive Trench & Earthwork Calculator State
  const [pipeLength, setPipeLength] = useState(500);
  const [trenchDepth, setTrenchDepth] = useState(5);
  const [trenchWidth, setTrenchWidth] = useState(3);
  const [pipeDiameterInches, setPipeDiameterInches] = useState(8);
  const [laborRate, setLaborRate] = useState(65);
  const [excavationRatePerCy, setExcavationRatePerCy] = useState(18);

  const trenchVolCuFt = pipeLength * trenchDepth * trenchWidth;
  const totalExcavationCuYd = trenchVolCuFt / 27;
  const pipeRadiusFt = pipeDiameterInches / 12 / 2;
  const pipeVolCuFt = Math.PI * Math.pow(pipeRadiusFt, 2) * pipeLength;
  const backfillCuYd = Math.max(0, (trenchVolCuFt - pipeVolCuFt) / 27);
  const estimatedExcavationCost = totalExcavationCuYd * excavationRatePerCy;
  const estimatedCrewHours = Math.max(1, totalExcavationCuYd / 25); // ~25 CY/hr baseline crew production
  const estimatedLaborCost = estimatedCrewHours * laborRate;
  const estimatedTotalTrenchBid = estimatedExcavationCost + estimatedLaborCost;

  const themeLabel = isDark ? t('core.theme.switchToLight') : t('core.theme.switchToDark');

  const navLinks = [
    { href: '#calculator', label: t('core.landing.nav.freeCalculator') },
    { href: '#features', label: t('core.landing.nav.features') },
    { href: '#comparison', label: t('core.landing.nav.whyUs') },
    { href: '#pricing', label: t('core.landing.nav.pricing') },
  ];

  const sampleDate = new Date(2026, 0, 14).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const sampleRows: Array<[string, string, number, number]> = [
    [t('core.landing.sampleDoc.row1'), '277.8 CY', 18, 5000.4],
    [t('core.landing.sampleDoc.row2'), '500 LF', 14.5, 7250],
    [t('core.landing.sampleDoc.row3'), '62.0 CY', 38, 2356],
    [t('core.landing.sampleDoc.row4'), '271.3 CY', 11, 2984.3],
  ];
  const sampleTotal = sampleRows.reduce((sum, row) => sum + row[3], 0);

  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(`core.landing.steps.s${n}Title`),
    desc: t(`core.landing.steps.s${n}Desc`),
  }));

  const comparisonRows = [2, 3, 4, 5].map((n) => ({
    label: t(`core.landing.comparison.row${n}Label`),
    te: t(`core.landing.comparison.row${n}Te`),
    excel: t(`core.landing.comparison.row${n}Excel`),
    ent: t(`core.landing.comparison.row${n}Ent`),
    entMarker: { 2: 'partial', 3: 'partial', 4: 'none', 5: 'yes' }[n],
  }));

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

  const footerLegalLinks = [
    { to: '/accessibility', label: t('core.accessibility.statement.title') },
    { to: '/terms', label: t('core.footer.termsOfService') },
    { to: '/privacy', label: t('core.footer.privacyPolicy') },
    { to: '/refund', label: t('core.footer.refundPolicy') },
    { to: '/acceptable-use', label: t('core.footer.acceptableUsePolicy') },
    { to: '/disclaimer', label: t('core.footer.legalDisclaimer') },
  ];

  return (
    <div className="landing min-h-screen bg-[var(--lp-paper)] text-[var(--lp-ink)] leading-[1.55] antialiased selection:bg-[var(--lp-accent)] selection:text-white">
      <SeoHead
        title={t('core.seo.landing.title', 'Takeoff Engine — Construction Proposal Maker & Takeoff Software')}
        description={t('core.seo.landing.description', 'Generate accurate civil takeoff estimates, trench volume calculations, and client-ready digital construction proposals from Bluebeam and Excel spreadsheets.')}
        canonicalUrl="https://takeoffengine.com/home"
      />

      {/* Top bar */}
      <div className="bg-[var(--lp-inverse)] text-[var(--lp-inverse-text)] text-[12.5px]">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7 h-[34px] flex items-center justify-between">
          <span className="hidden sm:inline">{t('core.landing.topbar.tagline')}</span>
          <Link to="/guide" className="hover:text-white transition-colors">{t('core.footer.documentation')}</Link>
        </div>
      </div>

      {/* Header */}
      <nav className="sticky top-0 z-30 bg-[var(--lp-paper)] border-b-2 border-[var(--lp-ink)]">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7 h-[68px] flex items-center gap-6 lg:gap-9">
          <Link to="/home" className="flex items-center gap-[11px] font-extrabold text-[17px] tracking-[-0.02em]">
            <LogoMark />
            Takeoff Engine
          </Link>

          <div className="hidden md:block">
            <LanguageSelector variant="landing" />
          </div>

          <div className="hidden lg:flex gap-7 text-sm font-medium">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="py-1 border-b-2 border-transparent hover:border-[var(--lp-ink)] transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="ml-auto hidden md:flex items-center gap-5 text-sm font-medium">
            <button
              type="button"
              onClick={toggleTheme}
              title={themeLabel}
              aria-label={themeLabel}
              className="w-9 h-9 inline-flex items-center justify-center border border-[var(--lp-ink)] hover:bg-[var(--lp-ink)] hover:text-[var(--lp-paper)] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="hover:text-[var(--lp-accent-text)] transition-colors">
              {t('core.landing.nav.signIn')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              disabled={accountCreationDisabled}
              title={accountCreationTitle}
              className="lp-btn lp-btn-sm"
            >
              {t('core.landing.nav.getStartedFree')}
            </button>
          </div>

          <div className="ml-auto md:hidden flex items-center gap-2">
            <LanguageSelector variant="landing" />
            <button
              type="button"
              onClick={toggleTheme}
              title={themeLabel}
              aria-label={themeLabel}
              className="w-9 h-9 inline-flex items-center justify-center border border-[var(--lp-ink)]"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 inline-flex items-center justify-center border border-[var(--lp-ink)]"
              aria-label={t('core.accessibility.toggleMenu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="square" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="square" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div hidden={!mobileMenuOpen} id="landing-mobile-menu" className="md:hidden border-t border-[var(--lp-rule)] px-5 pt-2 pb-5">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-3 text-[15px] font-medium border-b border-[var(--lp-rule)]"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              className="lp-btn lp-btn-outline lp-btn-sm"
            >
              {t('core.landing.nav.signIn')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/register');
              }}
              disabled={accountCreationDisabled}
              title={accountCreationTitle}
              className="lp-btn lp-btn-sm"
            >
              {t('core.landing.nav.getStartedFree')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div id="features" className="pt-[52px] sm:pt-[84px] scroll-mt-20">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
          <h1 className="text-[38px] sm:text-[50px] lg:text-[68px] leading-[1.14] tracking-[-0.04em] font-extrabold max-w-[1010px]">
            {t('core.landing.hero.title')}{' '}
            <mark className="bg-[var(--lp-accent)] text-white px-[0.12em] whitespace-nowrap">
              {t('core.landing.hero.titleHighlight')}
            </mark>
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-[72px] mt-14 items-start">
            <div>
              <p className="text-[19px] leading-[1.55] max-w-[30em] text-[var(--lp-ink)]/85">{t('core.landing.hero.subtitle')}</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  disabled={accountCreationDisabled}
                  title={accountCreationTitle}
                  className="lp-btn"
                >
                  {t('core.landing.hero.ctaTrial')}
                </button>
                <a href="#calculator" className="lp-btn lp-btn-outline">
                  {t('core.landing.hero.ctaCalculator')} <ArrowDown className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
              <AccountCreationDisabledNotice className="mt-4 max-w-[30em]" />
              <div className="mt-6 pt-[18px] border-t border-[var(--lp-rule)] text-[13.5px] text-[var(--lp-muted)] flex flex-wrap gap-x-[22px] gap-y-1.5">
                {[t('core.landing.hero.badgeNoCard'), t('core.landing.hero.badgeInstantExports'), t('core.landing.hero.badgeColumnMapper')].map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-[9px]">
                    <span aria-hidden="true" className="w-2 h-2 bg-[var(--lp-accent)]" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Sample proposal document */}
            <figure className="bg-[var(--lp-card)] border-2 border-[var(--lp-ink)]" aria-label={t('core.landing.sampleDoc.ariaLabel')}>
              <div className="flex justify-between gap-3 px-[18px] py-[9px] bg-[var(--lp-inverse)] text-[var(--lp-inverse-text)] font-mono text-xs">
                <span className="truncate">sewer_main_takeoff.xlsx</span>
                <b className="font-medium text-[#93c5fd] shrink-0">{t('core.landing.sampleDoc.mapped')}</b>
              </div>
              <div className="flex justify-between items-end px-[18px] pt-5 pb-4 border-b-2 border-[var(--lp-ink)]">
                <div>
                  <p className="text-[22px] font-extrabold tracking-[-0.02em] leading-[1.1]">{t('core.landing.sampleDoc.title')}</p>
                  <p className="text-[12.5px] text-[var(--lp-muted)] mt-1">{t('core.landing.sampleDoc.project')}</p>
                </div>
                <div className="text-right font-mono text-xs text-[var(--lp-muted)]">
                  {t('core.landing.sampleDoc.number')}
                  <br />
                  {sampleDate}
                </div>
              </div>
              <table className="w-full border-collapse text-[13px] sm:text-[13.5px]">
                <thead>
                  <tr className="text-[11px] tracking-[0.06em] uppercase text-[var(--lp-muted)]">
                    <th className="text-left font-semibold px-3 sm:px-[18px] py-2.5 border-b border-[var(--lp-ink)]">{t('core.landing.sampleDoc.colItem')}</th>
                    <th className="text-right font-semibold px-3 sm:px-[18px] py-2.5 border-b border-[var(--lp-ink)]">{t('core.landing.sampleDoc.colQty')}</th>
                    <th className="hidden sm:table-cell text-right font-semibold px-[18px] py-2.5 border-b border-[var(--lp-ink)]">{t('core.landing.sampleDoc.colUnit')}</th>
                    <th className="text-right font-semibold px-3 sm:px-[18px] py-2.5 border-b border-[var(--lp-ink)]">{t('core.landing.sampleDoc.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map(([label, qty, unit, amount]) => (
                    <tr key={label}>
                      <td className="px-3 sm:px-[18px] py-[11px] border-b border-[var(--lp-rule)]">{label}</td>
                      <td className="px-3 sm:px-[18px] py-[11px] border-b border-[var(--lp-rule)] text-right font-mono text-[12px] sm:text-[12.5px] tabular-nums whitespace-nowrap">{qty}</td>
                      <td className="hidden sm:table-cell px-[18px] py-[11px] border-b border-[var(--lp-rule)] text-right font-mono text-[12.5px] tabular-nums">{formatCurrency(unit)}</td>
                      <td className="px-3 sm:px-[18px] py-[11px] border-b border-[var(--lp-rule)] text-right font-mono text-[12px] sm:text-[12.5px] tabular-nums">{formatCurrency(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center px-[18px] py-3.5 bg-[var(--lp-accent)] text-white border-b-2 border-[var(--lp-ink)]">
                <span className="font-bold text-sm">{t('core.landing.sampleDoc.total')}</span>
                <b className="font-mono font-semibold text-[22px] tabular-nums">{formatCurrency(sampleTotal)}</b>
              </div>
              <div className="flex justify-between items-end gap-4 px-[18px] pt-5 pb-3.5">
                <div>
                  <div className="border-b border-[var(--lp-ink)] min-w-[180px] pb-0.5 italic font-medium text-[21px] tracking-[-0.01em]">R. Hartwell</div>
                  <div className="text-[11px] text-[var(--lp-muted)] mt-1">{t('core.landing.sampleDoc.acceptedBy', { date: sampleDate })}</div>
                </div>
                <span className="font-mono font-semibold text-[11px] tracking-[0.05em] border-2 border-[var(--lp-accent)] text-[var(--lp-accent-text)] px-2 py-1">
                  {t('core.landing.sampleDoc.eSigned')}
                </span>
              </div>
              <figcaption className="text-[11.5px] text-[var(--lp-muted)] px-[18px] pb-3.5">{t('core.landing.sampleDoc.note')}</figcaption>
            </figure>
          </div>

          {/* Process strip */}
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-[88px] border-t-2 border-[var(--lp-ink)]">
            {steps.map((step, idx) => (
              <li
                key={step.title}
                className={`py-[22px] pb-[30px] lg:pr-6 border-[var(--lp-rule)] ${STEP_BORDERS[idx]}`}
              >
                <h2 className="text-lg font-bold mb-1.5 tracking-[-0.01em]">{step.title}</h2>
                <p className="text-sm text-[var(--lp-muted)]">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Calculator */}
      <section id="calculator" className="mt-[72px] sm:mt-[104px] py-[72px] sm:py-[104px] bg-[var(--lp-band)] text-white border-y-2 border-[var(--lp-ink)] scroll-mt-16">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
          <SectionHeader
            onBand
            label={t('core.landing.calculator.tag')}
            title={t('core.landing.calculator.title')}
            description={t('core.landing.calculator.description')}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] bg-[var(--lp-card)] text-[var(--lp-ink)] border-2 border-[var(--lp-ink)]">
            <div className="p-6 sm:p-8 lg:px-[34px] lg:pt-8 lg:pb-9 border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--lp-ink)]">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.07em] pb-3.5 mb-[26px] border-b border-[var(--lp-ink)]">
                {t('core.landing.calculator.parametersTitle')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-[26px]">
                <CalcField id="calculator-length" label={t('core.landing.calculator.pipeLength')} value={pipeLength} onChange={setPipeLength} />
                <CalcField id="calculator-depth" label={t('core.landing.calculator.cutDepth')} value={trenchDepth} onChange={setTrenchDepth} step="0.5" />
                <CalcField id="calculator-width" label={t('core.landing.calculator.trenchWidth')} value={trenchWidth} onChange={setTrenchWidth} step="0.5" />
                <CalcField id="calculator-diameter" label={t('core.landing.calculator.pipeDiameter')} value={pipeDiameterInches} onChange={setPipeDiameterInches} min={1} />
                <CalcField id="calculator-excavation" label={t('core.landing.calculator.excavationCost')} value={excavationRatePerCy} onChange={setExcavationRatePerCy} step="0.5" />
                <CalcField id="calculator-labor" label={t('core.landing.calculator.crewLaborRate')} value={laborRate} onChange={setLaborRate} />
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:px-[34px] lg:pt-8 lg:pb-9 flex flex-col bg-[var(--lp-card-alt)]" aria-live="polite">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.07em] pb-3.5 mb-2 border-b border-[var(--lp-ink)] flex justify-between gap-3">
                <span>{t('core.landing.calculator.outputHeader')}</span>
                <span className="font-medium normal-case tracking-normal text-[var(--lp-muted)]">{t('core.landing.calculator.liveSync')}</span>
              </h3>
              <table className="w-full border-collapse text-[14.5px]">
                <tbody>
                  <tr>
                    <td className="py-[13px] border-b border-[var(--lp-rule)]">{t('core.landing.calculator.totalExcavation')}</td>
                    <td className="py-[13px] border-b border-[var(--lp-rule)] text-right font-mono tabular-nums font-semibold text-[19px]">
                      {formatNumber(totalExcavationCuYd, 1)}
                      <small className="ml-1 font-normal text-xs text-[var(--lp-muted)]">CY</small>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-[13px] border-b border-[var(--lp-rule)]">{t('core.landing.calculator.netBackfill')}</td>
                    <td className="py-[13px] border-b border-[var(--lp-rule)] text-right font-mono tabular-nums font-semibold text-[19px]">
                      {formatNumber(backfillCuYd, 1)}
                      <small className="ml-1 font-normal text-xs text-[var(--lp-muted)]">CY</small>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-[13px] border-b border-[var(--lp-rule)]">{t('core.landing.calculator.machineCost')}</td>
                    <td className="py-[13px] border-b border-[var(--lp-rule)] text-right font-mono tabular-nums font-medium">{formatCurrency(estimatedExcavationCost)}</td>
                  </tr>
                  <tr>
                    <td className="py-[13px] border-b border-[var(--lp-rule)]">
                      {t('core.landing.calculator.crewProduction', { hours: formatNumber(estimatedCrewHours, 1) })}
                    </td>
                    <td className="py-[13px] border-b border-[var(--lp-rule)] text-right font-mono tabular-nums font-medium">{formatCurrency(estimatedLaborCost)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-between items-center gap-4 bg-[var(--lp-ink)] text-[var(--lp-paper)] px-5 py-[18px] mt-[22px]">
                <span className="font-semibold text-[15px]">{t('core.landing.calculator.directBid')}</span>
                <b className="font-mono font-semibold text-2xl sm:text-[28px] tabular-nums text-[var(--lp-accent-on-ink)]">
                  {formatCurrency(estimatedTotalTrenchBid)}
                </b>
              </div>
              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={accountCreationDisabled}
                title={accountCreationTitle}
                className="lp-btn mt-[26px] w-full"
              >
                {t('core.landing.calculator.importCta')} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <p className="text-[13px] text-[var(--lp-muted)] mt-3.5">
                {t('core.landing.calculator.exportPrompt')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  disabled={accountCreationDisabled}
                  title={accountCreationTitle}
                  className="text-[var(--lp-ink)] font-semibold underline underline-offset-[3px] hover:text-[var(--lp-accent-text)] disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {t('core.landing.calculator.createAccount')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="py-[72px] sm:py-[104px] scroll-mt-16">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
          <SectionHeader
            label={t('core.landing.comparison.tag')}
            title={t('core.landing.comparison.title')}
            description={t('core.landing.comparison.subtitle')}
          />

          <div tabIndex={0} role="region" aria-label={t('core.landing.comparison.title')} className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse bg-[var(--lp-card)] border-2 border-[var(--lp-ink)] text-[15px]">
              <thead>
                <tr className="text-xs tracking-[0.06em] uppercase font-bold">
                  <th className="px-[22px] py-4 text-left border-b-2 border-[var(--lp-ink)] text-[var(--lp-muted)] bg-[var(--lp-paper)]">{t('core.landing.comparison.thCapability')}</th>
                  <th className="px-[22px] py-4 text-left border-b-2 border-[var(--lp-ink)] bg-[var(--lp-accent)] text-white">{t('core.landing.comparison.thTakeoffEngine')}</th>
                  <th className="px-[22px] py-4 text-left border-b-2 border-[var(--lp-ink)] text-[var(--lp-muted)] bg-[var(--lp-paper)]">{t('core.landing.comparison.thExcel')}</th>
                  <th className="px-[22px] py-4 text-left border-b-2 border-[var(--lp-ink)] text-[var(--lp-muted)] bg-[var(--lp-paper)]">{t('core.landing.comparison.thEnterprise')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-[22px] py-5 border-b border-[var(--lp-rule)] font-bold w-[24%]">{t('core.landing.comparison.row1Label')}</td>
                  <td className="px-[22px] py-5 border-b border-[var(--lp-rule)] bg-[var(--lp-tint)] font-semibold border-x-2 border-x-[var(--lp-ink)]">
                    {t('core.landing.comparison.row1Te', { price: STARTER_MONTHLY_PRICE })}
                  </td>
                  <td className="px-[22px] py-5 border-b border-[var(--lp-rule)] text-[var(--lp-muted)]">{t('core.landing.comparison.row1Excel')}</td>
                  <td className="px-[22px] py-5 border-b border-[var(--lp-rule)] text-[var(--lp-danger)] font-semibold">{t('core.landing.comparison.row1Ent')}</td>
                </tr>
                {comparisonRows.map((row, idx) => {
                  const last = idx === comparisonRows.length - 1;
                  const cell = `px-[22px] py-5 align-middle ${last ? '' : 'border-b border-[var(--lp-rule)]'}`;
                  return (
                    <tr key={row.label}>
                      <td className={`${cell} font-bold`}>{row.label}</td>
                      <td className={`${cell} bg-[var(--lp-tint)] font-semibold border-x-2 border-x-[var(--lp-ink)]`}>
                        <span className="flex items-center gap-3"><Marker type="yes" />{row.te}</span>
                      </td>
                      <td className={cell}>
                        <span className="flex items-center gap-3 text-[var(--lp-muted)]"><Marker type="none" />{row.excel}</span>
                      </td>
                      <td className={cell}>
                        <span className="flex items-center gap-3 text-[var(--lp-muted)]"><Marker type={row.entMarker} />{row.ent}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-x-[26px] gap-y-2 mt-4 text-[13px] text-[var(--lp-muted)]">
            <span className="flex items-center gap-[9px]"><Marker type="yes" />{t('core.landing.comparison.legendIncluded')}</span>
            <span className="flex items-center gap-[9px]"><Marker type="partial" />{t('core.landing.comparison.legendLimited')}</span>
            <span className="flex items-center gap-[9px]"><Marker type="none" />{t('core.landing.comparison.legendNone')}</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-[72px] sm:py-[104px] border-t-2 border-[var(--lp-ink)] scroll-mt-16">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
          <SectionHeader
            label={t('core.landing.pricing.tag')}
            title={t('core.landing.pricing.title')}
            description={t('core.landing.pricing.subtitle')}
          />
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
                  <h3 className="text-[22px] font-extrabold tracking-[-0.025em] flex items-center gap-3 flex-wrap">
                    {t(`core.landing.pricing.${plan.key}.tier`)}
                    {plan.highlight && (
                      <span className="text-[11px] font-semibold tracking-[0.06em] uppercase bg-[var(--lp-accent)] text-white px-2 py-1">
                        {t('core.landing.pricing.pro.mostPopular')}
                      </span>
                    )}
                  </h3>
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
      </section>

      {/* Footer */}
      <footer className="bg-[var(--lp-inverse)] text-[var(--lp-inverse-text)] pt-[72px] pb-8 text-sm border-t-8 border-[var(--lp-accent)]">
        <div className="max-w-[1160px] mx-auto px-5 sm:px-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] gap-11">
            <div>
              <Link to="/home" className="flex items-center gap-[11px] font-extrabold text-[17px] tracking-[-0.02em] text-white mb-4">
                <LogoMark inverse />
                {t('core.footer.brandName')}
              </Link>
              <p className="text-[13px] max-w-[26em]">{t('core.footer.tagline')}</p>
              <span className="inline-block mt-[18px] text-xs border border-[var(--lp-inverse-rule)] px-2.5 py-1.5 text-white/85">
                PCI-DSS Compliant · Paddle MoR
              </span>
            </div>
            <div>
              <h2 className="text-xs tracking-[0.07em] uppercase font-bold text-white mb-[18px]">{t('core.footer.productCol')}</h2>
              <ul className="grid gap-2.5">
                <li><Link to="/home" className="hover:text-white">{t('core.footer.home')}</Link></li>
                <li><a href="#calculator" className="hover:text-white">{t('core.landing.footer.trenchCalculator')}</a></li>
                <li><Link to="/guide" className="hover:text-white">{t('core.footer.documentation')}</Link></li>
                <li><a href="#pricing" className="hover:text-white">{t('core.footer.pricing')}</a></li>
                <li><Link to="/login" className="hover:text-white">{t('core.landing.footer.signIn')}</Link></li>
                <li>
                  {accountCreationDisabled ? (
                    <span aria-disabled="true" title={accountCreationTitle} className="opacity-50 cursor-not-allowed">
                      {t('core.landing.footer.createAccount')}
                    </span>
                  ) : (
                    <Link to="/register" className="hover:text-white">{t('core.landing.footer.createAccount')}</Link>
                  )}
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs tracking-[0.07em] uppercase font-bold text-white mb-[18px]">{t('core.footer.legalCol')}</h2>
              <ul className="grid gap-2.5">
                {footerLegalLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs tracking-[0.07em] uppercase font-bold text-white mb-[18px]">{t('core.footer.contactCol')}</h2>
              <ul className="grid gap-2.5">
                <li>{t('core.footer.supportEmailLabel')}</li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white font-semibold hover:underline">{SUPPORT_EMAIL}</a>
                </li>
                <li className="text-[13px] leading-normal">{t('core.footer.merchantOfRecordNotice')}</li>
              </ul>
            </div>
          </div>
          <div className="mt-14 pt-6 border-t border-[var(--lp-inverse-rule)] flex flex-wrap justify-between gap-5 text-[12.5px]">
            <span>{t('core.footer.copyright', { year: new Date().getFullYear() })}</span>
            <span className="inline-flex items-center gap-2">
              <InfisicalEnvironmentBadge />
              <span>Powered by Takeoff Engine · Merchant of Record: Paddle.com</span>
            </span>
          </div>
        </div>
      </footer>

      {/* In-Development Disclaimer Modal */}
      {showDevDisclaimer && (
        <AccessibleDialog
          onClose={() => setShowDevDisclaimer(false)}
          aria-labelledby="development-notice-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="bg-[var(--lp-card)] text-[var(--lp-ink)] border-2 border-[var(--lp-ink)] max-w-lg w-full">
            <div className="h-2 bg-[var(--lp-accent)]" />
            <div className="p-6 sm:p-8">
              <span className="inline-block font-mono text-[11px] font-semibold tracking-[0.06em] uppercase border-2 border-[var(--lp-ink)] px-2 py-1 mb-3">
                {t('core.landing.disclaimer.tag')}
              </span>
              <h2 id="development-notice-title" className="text-2xl font-extrabold tracking-[-0.02em]">
                {t('core.landing.disclaimer.title')}
              </h2>
              <p className="text-[15px] mt-3">{t('core.landing.disclaimer.welcome')}</p>
              <ul className="mt-4 pt-4 border-t border-[var(--lp-rule)] space-y-2 text-sm text-[var(--lp-muted)]">
                {[t('core.landing.disclaimer.p1'), t('core.landing.disclaimer.p2')].map((point) => (
                  <li key={point} className="flex items-baseline gap-2.5">
                    <span aria-hidden="true" className="w-[7px] h-[7px] bg-[var(--lp-accent)] shrink-0 translate-y-[-1px]" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => setShowDevDisclaimer(false)} className="lp-btn w-full sm:w-auto">
                  {t('core.landing.disclaimer.confirm')}
                </button>
              </div>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
