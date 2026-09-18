import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import LanguageSelector from '@/core/components/shared/LanguageSelector';
import SeoHead from '@/core/components/shared/SeoHead';
import AccessibleDialog from '@/core/components/shared/AccessibleDialog';
import { Ruler, Check, X, AlertTriangle, ArrowRight, ArrowDown, Construction } from 'lucide-react';
import {
  STARTER_MONTHLY_PRICE,
  PRO_MONTHLY_PRICE,
  ENTERPRISE_MONTHLY_PRICE,
  STARTER_YEARLY_PRICE,
  PRO_YEARLY_PRICE,
  ENTERPRISE_YEARLY_PRICE,
  EXTRA_SEAT_MONTHLY_PRICE,
  STARTER_PLAN_SEATS,
  PRO_PLAN_SEATS,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showDevDisclaimer, setShowDevDisclaimer] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDismissDisclaimer = () => {
    setShowDevDisclaimer(false);
  };

  // Free Interactive Trench & Earthwork Calculator State
  const [pipeLength, setPipeLength] = useState(500);
  const [trenchDepth, setTrenchDepth] = useState(5);
  const [trenchWidth, setTrenchWidth] = useState(3);
  const [pipeDiameterInches, setPipeDiameterInches] = useState(8);
  const [laborRate, setLaborRate] = useState(65);
  const [excavationRatePerCy, setExcavationRatePerCy] = useState(18);

  // Calculations for live widget
  const trenchVolCuFt = pipeLength * trenchDepth * trenchWidth;
  const totalExcavationCuYd = trenchVolCuFt / 27;
  
  // Bedding / Displaced pipe volume approximation
  const pipeRadiusFt = (pipeDiameterInches / 12) / 2;
  const pipeVolCuFt = Math.PI * Math.pow(pipeRadiusFt, 2) * pipeLength;
  const backfillCuYd = Math.max(0, (trenchVolCuFt - pipeVolCuFt) / 27);
  
  // Estimated production & cost
  const estimatedExcavationCost = totalExcavationCuYd * excavationRatePerCy;
  const estimatedCrewHours = Math.max(1, totalExcavationCuYd / 25); // ~25 CY/hr baseline crew production
  const estimatedLaborCost = estimatedCrewHours * laborRate;
  const estimatedTotalTrenchBid = estimatedExcavationCost + estimatedLaborCost;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      <SeoHead
        title={t('core.seo.landing.title', 'Takeoff Engine — Construction Proposal Maker & Takeoff Software')}
        description={t('core.seo.landing.description', 'Generate accurate civil takeoff estimates, trench volume calculations, and client-ready digital construction proposals from Bluebeam and Excel spreadsheets.')}
        canonicalUrl="https://takeoffengine.com/home"
      />
      {/* Navigation Header */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/home"
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-xl font-bold text-slate-100">
              Takeoff Engine
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <LanguageSelector variant="dark" />
            <a href="#calculator" className="hover:text-white transition">{t('core.landing.nav.freeCalculator')}</a>
            <a href="#features" className="hover:text-white transition">{t('core.landing.nav.features')}</a>
            <a href="#comparison" className="hover:text-white transition">{t('core.landing.nav.whyUs')}</a>
            <a href="#pricing" className="hover:text-white transition">{t('core.landing.nav.pricing')}</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              {t('core.landing.nav.signIn')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
            >
              {t('core.landing.nav.getStartedFree')}
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector variant="dark" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label={t('core.accessibility.toggleMenu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div hidden={!mobileMenuOpen} id="landing-mobile-menu" className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-3">
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('core.landing.nav.freeCalculator')}
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('core.landing.nav.features')}
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('core.landing.nav.whyUs')}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('core.landing.nav.pricing')}
            </a>
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-center px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                {t('core.landing.nav.signIn')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="w-full text-center px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl"
              >
                {t('core.landing.nav.getStartedFree')}
              </button>
            </div>
          </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-slate-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div aria-hidden="true" className="h-[28px] mb-8" />

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            <span className="block">{t('core.landing.hero.title')}</span>
            <span className="block text-emerald-400">
              {t('core.landing.hero.titleHighlight')}
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('core.landing.hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
            >
              {t('core.landing.hero.ctaTrial')}
            </button>
            <a
              href="#calculator"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition inline-flex items-center justify-center gap-2"
            >
              {t('core.landing.hero.ctaCalculator')} <ArrowDown className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-6 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-6">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> {t('core.landing.hero.badgeNoCard')}</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> {t('core.landing.hero.badgeInstantExports')}</span>
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> {t('core.landing.hero.badgeColumnMapper')}</span>
          </div>
        </div>
      </section>

      {/* Free Interactive Calculator Lead Magnet Widget */}
      <section id="calculator" className="py-20 bg-slate-800/50 border-y border-slate-800 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {t('core.landing.calculator.tag')}
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {t('core.landing.calculator.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              {t('core.landing.calculator.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Calculator Inputs */}
            <div className="lg:col-span-6 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span><Ruler className="w-4 h-4" /></span> {t('core.landing.calculator.parametersTitle')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="calculator-length" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.pipeLength')}
                  </label>
                  <input
                    id="calculator-length"
                    type="number"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="calculator-depth" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.cutDepth')}
                  </label>
                  <input
                    id="calculator-depth"
                    type="number"
                    step="0.5"
                    value={trenchDepth}
                    onChange={(e) => setTrenchDepth(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="calculator-width" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.trenchWidth')}
                  </label>
                  <input
                    id="calculator-width"
                    type="number"
                    step="0.5"
                    value={trenchWidth}
                    onChange={(e) => setTrenchWidth(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="calculator-diameter" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.pipeDiameter')}
                  </label>
                  <input
                    id="calculator-diameter"
                    type="number"
                    value={pipeDiameterInches}
                    onChange={(e) => setPipeDiameterInches(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label htmlFor="calculator-excavation" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.excavationCost')}
                  </label>
                  <input
                    id="calculator-excavation"
                    type="number"
                    value={excavationRatePerCy}
                    onChange={(e) => setExcavationRatePerCy(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="calculator-labor" className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('core.landing.calculator.crewLaborRate')}
                  </label>
                  <input
                    id="calculator-labor"
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Calculation Output Dashboard */}
            <div className="lg:col-span-6 bg-gradient-to-b from-slate-800/80 to-slate-900 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('core.landing.calculator.outputHeader')}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {t('core.landing.calculator.liveSync')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">{t('core.landing.calculator.totalExcavation')}</span>
                  <div className="text-2xl font-black text-white">
                    {formatNumber(totalExcavationCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">{t('core.landing.calculator.netBackfill')}</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {formatNumber(backfillCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/20 p-5 rounded-2xl border border-emerald-500/20 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300">{t('core.landing.calculator.machineCost')}</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedExcavationCost)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-300">
                    {t('core.landing.calculator.crewProduction', { hours: formatNumber(estimatedCrewHours, 1) })}
                  </span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedLaborCost)}</span>
                </div>
                <div className="pt-3 border-t border-emerald-500/20 flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-200">{t('core.landing.calculator.directBid')}</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(estimatedTotalTrenchBid)}</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition text-center mb-2 inline-flex items-center justify-center gap-2"
                >
                  {t('core.landing.calculator.importCta')} <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-slate-400">
                  {t('core.landing.calculator.exportPrompt')}{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline inline-flex items-center gap-1"
                  >
                    {t('core.landing.calculator.createAccount')} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section id="comparison" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('core.landing.comparison.tag')}</span>
          <h2 className="text-3xl font-extrabold text-white mt-2">
            {t('core.landing.comparison.title')}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {t('core.landing.comparison.subtitle')}
          </p>
        </div>

        <div tabIndex={0} role="region" aria-label={t('core.landing.comparison.title')} className="overflow-x-auto border-[1.5px] border-slate-100/80 bg-slate-950/80">
          <table className="w-full table-fixed text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6 bg-slate-900/40 align-top">{t('core.landing.comparison.thCapability')}</th>
                <th className="py-4 px-6 bg-emerald-950/40 text-emerald-300 border-x border-emerald-500/20 align-top">{t('core.landing.comparison.thTakeoffEngine')}</th>
                <th className="py-4 px-6 bg-slate-900/40 align-top">{t('core.landing.comparison.thExcel')}</th>
                <th className="py-4 px-6 bg-slate-900/40 align-top">{t('core.landing.comparison.thEnterprise')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200 align-middle">{t('core.landing.comparison.row1Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/20 align-middle">{t('core.landing.comparison.row1Te', { price: Math.floor(STARTER_MONTHLY_PRICE) })}</td>
                <td className="py-4 px-6 text-slate-400 align-middle">{t('core.landing.comparison.row1Excel')}</td>
                <td className="py-4 px-6 text-red-400 align-middle">{t('core.landing.comparison.row1Ent')}</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200 align-middle">{t('core.landing.comparison.row2Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/20 align-middle">
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {t('core.landing.comparison.row2Te')}</span>
                </td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row2Excel')}</span></td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row2Ent')}</span></td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200 align-middle">{t('core.landing.comparison.row3Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/20 align-middle">
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {t('core.landing.comparison.row3Te')}</span>
                </td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row3Excel')}</span></td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row3Ent')}</span></td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200 align-middle">{t('core.landing.comparison.row4Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/20 align-middle">
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {t('core.landing.comparison.row4Te')}</span>
                </td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row4Excel')}</span></td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row4Ent')}</span></td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200 align-middle">{t('core.landing.comparison.row5Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/20 align-middle">
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" /> {t('core.landing.comparison.row5Te')}</span>
                </td>
                <td className="py-4 px-6 text-slate-400 align-middle"><span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row5Excel')}</span></td>
                <td className="py-4 px-6 text-emerald-400 align-middle"><span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" />{t('core.landing.comparison.row5Ent')}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section id="pricing" className="py-20 bg-slate-800/40 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('core.landing.pricing.tag')}</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {t('core.landing.pricing.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {t('core.landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Trial Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('core.landing.pricing.freeTrial.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('core.landing.pricing.freeTrial.price')}</span>
                  <span className="text-xs text-slate-400">{t('core.landing.pricing.freeTrial.cadence')}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{t('core.landing.pricing.freeTrial.noCard')}</div>
                <p className="text-xs text-slate-400 mt-2">{t('core.landing.pricing.freeTrial.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.freeTrial.f1')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f2')}</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f3')}</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.freeTrial.f4')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('core.landing.pricing.freeTrial.cta')}
              </button>
            </div>

            {/* Starter Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('core.landing.pricing.starter.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('core.landing.pricing.starter.price', { price: STARTER_MONTHLY_PRICE })}</span>
                  <span className="text-xs text-slate-400">{t('core.landing.pricing.starter.cadence')}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{t('core.landing.pricing.starter.yearly', { yearly: STARTER_YEARLY_PRICE })}</div>
                <p className="text-xs text-slate-400 mt-2">{t('core.landing.pricing.starter.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.starter.f1', { seats: STARTER_PLAN_SEATS })}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <strong>{t('core.landing.pricing.starter.f2')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f3')}</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f4')}</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t('core.landing.pricing.starter.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t('core.landing.pricing.starter.cta')}
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 p-6 rounded-3xl border-2 border-emerald-500/40 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                {t('core.landing.pricing.pro.mostPopular')}
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{t('core.landing.pricing.pro.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('core.landing.pricing.pro.price', { price: PRO_MONTHLY_PRICE })}</span>
                  <span className="text-xs text-slate-400">{t('core.landing.pricing.pro.cadence')}</span>
                </div>
                <div className="text-[10px] text-emerald-300/80 font-medium mt-0.5">{t('core.landing.pricing.pro.yearly', { yearly: PRO_YEARLY_PRICE })}</div>
                <p className="text-xs text-slate-300 mt-2">{t('core.landing.pricing.pro.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f1', { seats: PRO_PLAN_SEATS })}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f2')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f3')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <strong>{t('core.landing.pricing.pro.f4')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {t('core.landing.pricing.pro.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                {t('core.landing.pricing.pro.cta')}
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{t('core.landing.pricing.enterprise.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('core.landing.pricing.enterprise.price', { price: ENTERPRISE_MONTHLY_PRICE })}</span>
                  <span className="text-xs text-slate-400">{t('core.landing.pricing.enterprise.cadence')}</span>
                </div>
                <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">{t('core.landing.pricing.enterprise.yearly', { yearly: ENTERPRISE_YEARLY_PRICE })}</div>
                <p className="text-xs text-slate-300 mt-2">{t('core.landing.pricing.enterprise.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>{t('core.landing.pricing.enterprise.f1', { seats: ENTERPRISE_PLAN_SEATS })}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>{t('core.landing.pricing.enterprise.f2', { price: EXTRA_SEAT_MONTHLY_PRICE })}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <strong>{t('core.landing.pricing.enterprise.f3')}</strong></li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('core.landing.pricing.enterprise.f4')}</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {t('core.landing.pricing.enterprise.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="mt-6 w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition cursor-pointer"
              >
                {t('core.landing.pricing.enterprise.cta')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <button onClick={() => navigate('/home')} className="hover:text-white transition">
              {t('core.landing.footer.home')}
            </button>
            <a href="#calculator" className="hover:text-white transition">
              {t('core.landing.footer.trenchCalculator')}
            </a>
            <a href="#pricing" className="hover:text-white transition">
              {t('core.landing.footer.pricingPlans')}
            </a>
            <button onClick={() => navigate('/login')} className="hover:text-white transition">
              {t('core.landing.footer.signIn')}
            </button>
            <button onClick={() => navigate('/register')} className="hover:text-white transition">
              {t('core.landing.footer.createAccount')}
            </button>
            <button onClick={() => navigate('/terms')} className="text-slate-400 hover:text-white font-medium transition">
              {t('core.footer.acceptableUsePolicy')}
            </button>
            <button onClick={() => navigate('/disclaimer')} className="text-amber-400 hover:text-amber-300 font-medium transition">
              {t('core.footer.legalDisclaimer')}
            </button>
          </div>
          <p className="font-semibold text-slate-400">{t('core.landing.footer.tagline')}</p>
          <p>{t('core.landing.footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>

      {/* In-Development Disclaimer Modal */}
      {showDevDisclaimer && (
        <AccessibleDialog onClose={handleDismissDisclaimer} aria-labelledby="development-notice-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Construction className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-1.5">
                  {t('core.landing.disclaimer.tag')}
                </span>
                <h2 id="development-notice-title" className="text-xl font-bold text-white tracking-tight">
                  {t('core.landing.disclaimer.title')}
                </h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {t('core.landing.disclaimer.welcome')}
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2 mb-6 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{t('core.landing.disclaimer.p1')}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{t('core.landing.disclaimer.p2')}</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDismissDisclaimer}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-400/20"
              >
                {t('core.landing.disclaimer.confirm')}
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
