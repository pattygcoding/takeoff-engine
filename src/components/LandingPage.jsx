import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '@/lib/calculations';

export default function LandingPage() {
  const navigate = useNavigate();
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
            <a href="#calculator" className="hover:text-white transition">Free Calculator</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#comparison" className="hover:text-white transition">Why Us</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
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
              Free Calculator
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Features
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Why Us
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Pricing
            </a>
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-center px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="w-full text-center px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl"
              >
                Get Started Free
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
            Designed for Utility, Civil &amp; Earthwork Subcontractors
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Turn Construction Takeoffs Into Professional Proposals in{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              60 Seconds
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Import CSV &amp; Excel sheets directly from Bluebeam, PlanSwift, or Trimble. Auto-calculate trench volumes, production labor hours, and client proposals with digital signatures.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 transition transform hover:-translate-y-0.5"
            >
              Start Free Trial (5 Free Takeoffs)
            </button>
            <a
              href="#calculator"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition"
            >
              Test Live Calculator ↓
            </a>
          </div>

          <div className="mt-6 text-xs text-slate-500 flex items-center justify-center gap-6">
            <span>✓ No credit card required</span>
            <span>✓ Instant PDF &amp; Word exports</span>
            <span>✓ Auto column alias mapper</span>
          </div>
        </div>
      </section>

      {/* Free Interactive Calculator Lead Magnet Widget */}
      <section id="calculator" className="py-20 bg-slate-800/50 border-y border-slate-800 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Interactive Free Tool
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              Instant Trench Excavation &amp; Earthwork Calculator
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Test our estimation engine right now without signing up. Adjust pipe dimensions and see instant cubic yardage, backfill volume, and crew labor projections.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Calculator Inputs */}
            <div className="lg:col-span-6 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>📐</span> Trench &amp; Utility Parameters
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Pipe Run Length (LF)
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
                    Average Cut Depth (FT)
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
                    Trench Width (FT)
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
                    Pipe Diameter (Inches)
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
                    Excavation Unit Cost ($/CY)
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
                    Crew Labor Rate ($/HR)
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
                  Calculated Output
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Live Sync
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Total Excavation Volume</span>
                  <div className="text-2xl font-black text-white">
                    {formatNumber(totalExcavationCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Net Backfill Volume</span>
                  <div className="text-2xl font-black text-cyan-400">
                    {formatNumber(backfillCuYd, 1)} <span className="text-sm font-normal text-slate-400">CY</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-900/30 p-5 rounded-2xl border border-indigo-500/20 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300">Excavation Machine Cost</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedExcavationCost)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-300">Crew Production Labor ({formatNumber(estimatedCrewHours, 1)} hrs)</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(estimatedLaborCost)}</span>
                </div>
                <div className="pt-3 border-t border-indigo-500/30 flex justify-between items-center">
                  <span className="text-sm font-bold text-indigo-200">Estimated Direct Trench Bid</span>
                  <span className="text-2xl font-black text-emerald-400">{formatCurrency(estimatedTotalTrenchBid)}</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition text-center block mb-2"
                >
                  Import Complete Multi-Line Takeoff Sheet →
                </button>
                <p className="text-xs text-slate-400">
                  Want to export this as a Word / PDF bid proposal?{' '}
                  <button
                    onClick={() => navigate('/register')}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                  >
                    Create Free Account →
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
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Comparison</span>
          <h2 className="text-3xl font-extrabold text-white mt-2">
            Why Contractors Choose Takeoff Engine
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Stop building fragile Excel macros or overpaying $3,000/yr for bloated desktop software.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6 bg-slate-900/40">Capability</th>
                <th className="py-4 px-6 bg-indigo-950/60 text-indigo-300 border-x border-indigo-500/30">Takeoff Engine</th>
                <th className="py-4 px-6 bg-slate-900/40">Manual Excel Spreadsheets</th>
                <th className="py-4 px-6 bg-slate-900/40">Enterprise Heavy Estimators</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">Pricing / Commitment</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">Free to start / $19-$49/mo</td>
                <td className="py-4 px-6 text-slate-400">Free (High time cost)</td>
                <td className="py-4 px-6 text-red-400">$3,000 - $10,000/year upfront</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">Auto Column Header Mapping</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">✓ Intelligent Aliases</td>
                <td className="py-4 px-6 text-slate-500">✕ Manual copy-pasting</td>
                <td className="py-4 px-6 text-slate-400">⚠️ Complex setup required</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">One-Click Client Proposal &amp; Word Export</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">✓ Branded PDF &amp; .DOCX</td>
                <td className="py-4 px-6 text-slate-500">✕ Manual document formatting</td>
                <td className="py-4 px-6 text-slate-400">⚠️ Clunky reports</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">Public Portal &amp; Client E-Signature</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">✓ Included (US-010)</td>
                <td className="py-4 px-6 text-slate-500">✕ None (Requires DocuSign)</td>
                <td className="py-4 px-6 text-slate-500">✕ None</td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-medium text-slate-200">Reusable Rate &amp; Material Libraries</td>
                <td className="py-4 px-6 font-bold text-emerald-400 bg-indigo-950/30 border-x border-indigo-500/20">✓ 1-Click Library Switcher</td>
                <td className="py-4 px-6 text-slate-500">✕ Broken formula links</td>
                <td className="py-4 px-6 text-emerald-400">✓ Database included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Table Section */}
      <section id="pricing" className="py-20 bg-slate-800/40 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Simple Transparent Pricing</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              Start Free, Upgrade When You Win Bids
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every plan includes full calculating features, exports, and instant cloud saves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Trial Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Free Trial</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$0</span>
                  <span className="text-xs text-slate-400">/ forever</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">no credit card required</div>
                <p className="text-xs text-slate-400 mt-2">Perfect for evaluating your first job bids.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>5 Free Takeoff Exports</strong></li>
                  <li className="flex items-center gap-2">✓ CSV &amp; Excel column mapper</li>
                  <li className="flex items-center gap-2">✓ Full trench &amp; production math</li>
                  <li className="flex items-center gap-2">✓ 1 Custom Rate Library</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Get Started Free
              </button>
            </div>

            {/* Starter Tier */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter Tier</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$29.99</span>
                  <span className="text-xs text-slate-400">/ mo</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">or $299.99/yr • plus tax</div>
                <p className="text-xs text-slate-400 mt-2">Great for solo estimators bidding jobs weekly.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>Single Estimator Seat</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Unlimited Calculations</strong></li>
                  <li className="flex items-center gap-2">✓ Standard Word &amp; PDF Export</li>
                  <li className="flex items-center gap-2">✓ 2 Custom Rate Libraries</li>
                  <li className="flex items-center gap-2">✓ Cloud Save &amp; Project Dashboard</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Choose Starter
              </button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                Most Popular
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Pro Tier</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$79.99</span>
                  <span className="text-xs text-slate-400">/ mo</span>
                </div>
                <div className="text-[10px] text-indigo-300/80 font-medium mt-0.5">or $799.99/yr • plus tax</div>
                <p className="text-xs text-slate-300 mt-2">Unlimited power & full PDF report layouts.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">✓ <strong>3 Team Seats Included</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>All 17+ Advanced PDF Formats</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Custom Branding &amp; Logos</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Client Portal &amp; E-Signatures</strong></li>
                  <li className="flex items-center gap-2">✓ Unlimited Custom Rate Libraries</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-amber-500/40 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Enterprise</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$199.99</span>
                  <span className="text-xs text-slate-400">/ mo</span>
                </div>
                <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">or $1999.99/yr • plus tax</div>
                <p className="text-xs text-slate-300 mt-2">Multi-seat collaboration for growing teams.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">✓ <strong>8 Base Team Seats Included</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>+$29.99/mo per extra seat (+ tax)</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>All 17+ Advanced PDF Formats</strong></li>
                  <li className="flex items-center gap-2">✓ Team Workspaces &amp; Shared Libraries</li>
                  <li className="flex items-center gap-2">✓ All Pro features + priority support</li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition"
              >
                Choose Enterprise
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
              Home
            </button>
            <a href="#calculator" className="hover:text-white transition">
              Trench Calculator
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Pricing Plans
            </a>
            <button onClick={() => navigate('/login')} className="hover:text-white transition">
              Sign In
            </button>
            <button onClick={() => navigate('/register')} className="hover:text-white transition">
              Create Account
            </button>
          </div>
          <p className="font-semibold text-slate-400">Takeoff Engine — Civil &amp; Utility Estimating Platform</p>
          <p>© {new Date().getFullYear()} Takeoff Engine. All rights reserved.</p>
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
                  Development Preview
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Work in Progress Notice
                </h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Welcome to <strong>Takeoff Engine</strong>! This application is currently under active development.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2 mb-6 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Some listed features, pricing plans, and integrations may not be fully functional or ready for production use yet.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>Calculations, exports, and mock sandbox flows are provided for testing and demonstration purposes.</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDismissDisclaimer}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-400/20"
              >
                I Understand, Continue to Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
