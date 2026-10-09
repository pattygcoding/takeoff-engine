import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const workspacePath = isAuthenticated && user?.username ? `/${user.username}` : null;

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>{`${t('core.notFound.title')} - Takeoff Engine`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-300">404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-bold">{t('core.notFound.title')}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">{t('core.notFound.message')}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {workspacePath ? (
          <Link
            to={workspacePath}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition"
          >
            {t('core.notFound.goToWorkspace')}
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition"
          >
            {t('core.notFound.logIn')}
          </Link>
        )}
        <Link
          to="/home"
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
        >
          {t('core.notFound.goHome')}
        </Link>
      </div>
    </section>
  );
}
