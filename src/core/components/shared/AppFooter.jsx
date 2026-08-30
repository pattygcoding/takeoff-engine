import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/core/components/context/I18nContext';
import { useAuth } from '@/core/components/context/AuthContext';

export default function AppFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  // If on client proposal view, skip global footer (proposal has dedicated client-facing footer)
  if (location.pathname.startsWith('/p/')) {
    return null;
  }

  const isDarkLanding = location.pathname === '/home' || (!isAuthenticated && (location.pathname === '/' || location.pathname === ''));

  return (
    <footer
      className={`no-print border-t transition-colors text-xs py-10 ${
        isDarkLanding
          ? 'bg-slate-950 border-slate-800/80 text-slate-400'
          : 'bg-slate-900 border-slate-800 text-slate-400 mt-auto'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main Multi-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          {/* Col 1: Brand & Description */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📐</span>
              <span className="font-extrabold text-base tracking-tight text-white">
                {t('footer.brandName')}
              </span>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              {t('footer.tagline', 'Automated Construction Estimating, Takeoffs & Bidding Platform for Contractors.')}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300 border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                PCI-DSS Compliant • Paddle MoR
              </span>
            </div>
          </div>

          {/* Col 2: Navigation & Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('footer.productCol', 'Product')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated && user?.username) {
                      navigate(`/${user.username}`);
                    } else {
                      navigate('/home');
                    }
                  }}
                  className="hover:text-white transition cursor-pointer"
                >
                  {isAuthenticated ? t('footer.dashboard') : t('footer.home')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/guide')}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.documentation')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/onboarding');
                    } else {
                      navigate('/home');
                      setTimeout(() => {
                        const el = document.getElementById('pricing');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.pricing', 'Pricing & Plans')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Compliance (Required by Paddle) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('footer.legalCol', 'Legal & Policies')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.termsOfService', 'Terms of Service')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.privacyPolicy', 'Privacy Policy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/refund')}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.refundPolicy', 'Refund & Cancellation Policy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/acceptable-use')}
                  className="hover:text-white transition cursor-pointer"
                >
                  {t('footer.acceptableUsePolicy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/disclaimer')}
                  className="text-amber-400 hover:text-amber-300 hover:underline transition cursor-pointer"
                >
                  {t('footer.legalDisclaimer')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Merchant of Record Notice */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('footer.contactCol', 'Contact & Inquiries')}
            </h4>
            <p className="text-xs text-slate-400">
              {t('footer.supportEmailLabel', 'Contact Support:')}
            </p>
            <a
              href="mailto:pattygsocials@gmail.com"
              className="inline-block text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition"
            >
              pattygsocials@gmail.com
            </a>
            <p className="text-[11px] text-slate-500 leading-normal pt-1">
              {t('footer.merchantOfRecordNotice', 'Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders.')}
            </p>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-500">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p className="text-slate-500">
            Powered by Takeoff Engine • Merchant of Record: Paddle.com
          </p>
        </div>
      </div>
    </footer>
  );
}

