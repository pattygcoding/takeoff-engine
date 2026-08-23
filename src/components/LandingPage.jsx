import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { useTranslation } from '@/context/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/25">
              T
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Takeoff Engine
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <LanguageSelector variant="dark" />
            <a href="#calculator" className="hover:text-white transition">{t('landing.nav.freeCalculator')}</a>
            <a href="#features" className="hover:text-white transition">{t('landing.nav.features')}</a>
            <a href="#comparison" className="hover:text-white transition">{t('landing.nav.whyUs')}</a>
            <a href="#pricing" className="hover:text-white transition">{t('landing.nav.pricing')}</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              {t('landing.nav.signIn')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              {t('landing.nav.getStartedFree')}
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector variant="dark" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
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
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-3">
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('landing.nav.freeCalculator')}
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('landing.nav.features')}
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('landing.nav.whyUs')}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {t('landing.nav.pricing')}
            </a>
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-center px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                {t('landing.nav.signIn')}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="w-full text-center px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl"
              >
                {t('landing.nav.getStartedFree')}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {t('landing.hero.badge')}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            {t('landing.hero.title')}{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t('landing.hero.titleHighlight')}
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 transition transform hover:-translate-y-0.5"
            >
              {t('landing.hero.ctaTrial')}
            </button>
            <a
              href="#calculator"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition"
            >
              {t('landing.hero.ctaCalculator')}
            </a>
          </div>

          <div className="mt-6 text-xs text-slate-500 flex items-center justify-center gap-6">
            <span>{t('landing.hero.badgeNoCard')}</span>
            <span>{t('landing.hero.badgeInstantExports')}</span>
            <span>{t('landing.hero.badgeColumnMapper')}</span>
          </div>
        </div>
      </section>

      {/* Free Interactive Calculator Lead Magnet Widget */}
      <section id="calculator" className="py-20 bg-slate-800/50 border-y border-slate-800 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              {t('landing.calculator.tag')}
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {t('landing.calculator.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              {t('landing.calculator.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Calculator Inputs */}
            <div className="lg:col-span-6 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>📐</span> {t('landing.calculator.parametersTitle')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.pipeLength')}
                  </label>
                  <input
                    type="number"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.cutDepth')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={trenchDepth}
                    onChange={(e) => setTrenchDepth(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.trenchWidth')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={trenchWidth}
                    onChange={(e) => setTrenchWidth(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.pipeDiameter')}
                  </label>
                  <input
                    type="number"
                    value={pipeDiameterInches}
                    onChange={(e) => setPipeDiameterInches(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.excavationCost')}
                  </label>
                  <input
                    type="number"
                    value={excavationRatePerCy}
                    onChange={(e) => setExcavationRatePerCy(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('landing.calculator.crewLaborRate')}
                  </label>
                  <input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Calculation Output Dashboard */}
            <div className="lg:col-span-6 bg-gradient-to-b from-indigo-950/60 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {t('landing.calculator.outputHeader')}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {t('landing.calculator.liveSync')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">{t('landing.calculator.totalExcavation')}</span>
                  <div className="text-2xl font-black text-white">
                    {formatNumber(totalExcavationCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">{t('landing.calculator.netBackfill')}</span>
                  <div className="text-2xl font-black text-cyan-400">
                    {formatNumber(backfillCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-900/30 p-5 rounded-2xl border border-indigo-500/20 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300">{t('landing.calculator.machineCost')}</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedExcavationCost)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-300">
                    {t('landing.calculator.crewProduction', { hours: formatNumber(estimatedCrewHours, 1) })}
                  </span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedLaborCost)}</span>
                </div>
                <div className="pt-3 border-t border-indigo-500/30 flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-200">{t('landing.calculator.directBid')}</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(estimatedTotalTrenchBid)}</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition text-center block mb-2"
                >
                  {t('landing.calculator.importCta')}
                </button>
                <p className="text-xs text-slate-400">
                  {t('landing.calculator.exportPrompt')}{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                  >
                    {t('landing.calculator.createAccount')}
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
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{t('landing.comparison.tag')}</span>
          <h2 className="text-3xl font-extrabold text-white mt-2">
            {t('landing.comparison.title')}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {t('landing.comparison.subtitle')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6 bg-slate-900/40">{t('landing.comparison.thCapability')}</th>
                <th className="py-4 px-6 bg-indigo-950/60 text-indigo-300 border-x border-indigo-500/30">{t('landing.comparison.thTakeoffEngine')}</th>
                <th className="py-4 px-6 bg-slate-900/40">{t('landing.comparison.thExcel')}</th>
                <th className="py-4 px-6 bg-slate-900/40">{t('landing.comparison.thEnterprise')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">{t('landing.comparison.row1Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">{t('landing.comparison.row1Te')}</td>
                <td className="py-4 px-6 text-slate-400">{t('landing.comparison.row1Excel')}</td>
                <td className="py-4 px-6 text-red-400">{t('landing.comparison.row1Ent')}</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">{t('landing.comparison.row2Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">{t('landing.comparison.row2Te')}</td>
                <td className="py-4 px-6 text-slate-500">{t('landing.comparison.row2Excel')}</td>
                <td className="py-4 px-6 text-slate-400">{t('landing.comparison.row2Ent')}</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">{t('landing.comparison.row3Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">{t('landing.comparison.row3Te')}</td>
                <td className="py-4 px-6 text-slate-500">{t('landing.comparison.row3Excel')}</td>
                <td className="py-4 px-6 text-slate-400">{t('landing.comparison.row3Ent')}</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">{t('landing.comparison.row4Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">{t('landing.comparison.row4Te')}</td>
                <td className="py-4 px-6 text-slate-500">{t('landing.comparison.row4Excel')}</td>
                <td className="py-4 px-6 text-slate-500">{t('landing.comparison.row4Ent')}</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">{t('landing.comparison.row5Label')}</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">{t('landing.comparison.row5Te')}</td>
                <td className="py-4 px-6 text-slate-500">{t('landing.comparison.row5Excel')}</td>
                <td className="py-4 px-6 text-emerald-400">{t('landing.comparison.row5Ent')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section id="pricing" className="py-20 bg-slate-800/40 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{t('landing.pricing.tag')}</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Trial Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('landing.pricing.freeTrial.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('landing.pricing.freeTrial.price')}</span>
                  <span className="text-xs text-slate-400">{t('landing.pricing.freeTrial.cadence')}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">{t('landing.pricing.freeTrial.noCard')}</div>
                <p className="text-xs text-slate-400 mt-2">{t('landing.pricing.freeTrial.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.freeTrial.f1')}</strong></li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.freeTrial.f2')}</li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.freeTrial.f3')}</li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.freeTrial.f4')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                {t('landing.pricing.freeTrial.cta')}
              </button>
            </div>

            {/* Starter Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('landing.pricing.starter.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('landing.pricing.starter.price')}</span>
                  <span className="text-xs text-slate-400">{t('landing.pricing.starter.cadence')}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{t('landing.pricing.starter.yearly')}</div>
                <p className="text-xs text-slate-400 mt-2">{t('landing.pricing.starter.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.starter.f1')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.starter.f2')}</strong></li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f3')}</li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f4')}</li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.starter.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                {t('landing.pricing.starter.cta')}
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                {t('landing.pricing.pro.mostPopular')}
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{t('landing.pricing.pro.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('landing.pricing.pro.price')}</span>
                  <span className="text-xs text-slate-400">{t('landing.pricing.pro.cadence')}</span>
                </div>
                <div className="text-[10px] text-indigo-300/80 font-medium mt-0.5">{t('landing.pricing.pro.yearly')}</div>
                <p className="text-xs text-slate-300 mt-2">{t('landing.pricing.pro.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f1')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f2')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f3')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.pro.f4')}</strong></li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.pro.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                {t('landing.pricing.pro.cta')}
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{t('landing.pricing.enterprise.tier')}</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{t('landing.pricing.enterprise.price')}</span>
                  <span className="text-xs text-slate-400">{t('landing.pricing.enterprise.cadence')}</span>
                </div>
                <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">{t('landing.pricing.enterprise.yearly')}</div>
                <p className="text-xs text-slate-300 mt-2">{t('landing.pricing.enterprise.description')}</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.enterprise.f1')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.enterprise.f2')}</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>{t('landing.pricing.enterprise.f3')}</strong></li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.enterprise.f4')}</li>
                  <li className="flex items-center gap-2">✓ {t('landing.pricing.enterprise.f5')}</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition"
              >
                {t('landing.pricing.enterprise.cta')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <button onClick={() => navigate('/home')} className="hover:text-white transition">
              {t('landing.footer.home')}
            </button>
            <a href="#calculator" className="hover:text-white transition">
              {t('landing.footer.trenchCalculator')}
            </a>
            <a href="#pricing" className="hover:text-white transition">
              {t('landing.footer.pricingPlans')}
            </a>
            <button onClick={() => navigate('/login')} className="hover:text-white transition">
              {t('landing.footer.signIn')}
            </button>
            <button onClick={() => navigate('/register')} className="hover:text-white transition">
              {t('landing.footer.createAccount')}
            </button>
            <button onClick={() => navigate('/terms')} className="text-indigo-400 hover:text-indigo-300 font-medium transition">
              {t('footer.acceptableUsePolicy')}
            </button>
          </div>
          <p className="font-semibold text-slate-400">{t('landing.footer.tagline')}</p>
          <p>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>

      {/* In-Development Disclaimer Modal */}
      {showDevDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shrink-0">
                🚧
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-1.5">
                  {t('landing.disclaimer.tag')}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t('landing.disclaimer.title')}
                </h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {t('landing.disclaimer.welcome')}
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2 mb-6 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{t('landing.disclaimer.p1')}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{t('landing.disclaimer.p2')}</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDismissDisclaimer}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-400/20"
              >
                {t('landing.disclaimer.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
