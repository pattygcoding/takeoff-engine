import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTranslation, i18n, SUPPORTED_LANGUAGES } from '@/core/lib/shared/i18n';

const I18nContext = createContext({
  t: (key, params) => key,
  language: 'en',
  setLanguage: () => {},
});

function getInitialLanguage() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang')?.toLowerCase();
    if (langParam && SUPPORTED_LANGUAGES.includes(langParam)) {
      return langParam;
    }
    const stored = localStorage.getItem('takeoff-engine.lang')?.toLowerCase();
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
  }
  return 'en';
}

export function I18nProvider({ children, defaultLanguage = 'en' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguageState] = useState(getInitialLanguage);

  // Synchronize URL search params whenever language changes or location changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const currentParam = params.get('lang')?.toLowerCase();

    // 1. If URL contains a valid ?lang parameter that differs from current state, adopt it
    if (currentParam && SUPPORTED_LANGUAGES.includes(currentParam)) {
      if (currentParam !== language) {
        i18n.setLanguage(currentParam);
        setLanguageState(currentParam);
        try {
          localStorage.setItem('takeoff-engine.lang', currentParam);
        } catch (e) {
          // ignore
        }
      }
      return;
    }

    // 2. If URL does not have a ?lang parameter, or has an invalid one, enforce active language (?lang=en, ?lang=es, etc.)
    if (currentParam !== language) {
      params.set('lang', language);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
    }
  }, [location.pathname, location.search, language, navigate]);

  const changeLanguage = useCallback(
    (lang) => {
      if (!SUPPORTED_LANGUAGES.includes(lang)) return;
      i18n.setLanguage(lang);
      setLanguageState(lang);
      try {
        localStorage.setItem('takeoff-engine.lang', lang);
      } catch (e) {
        // ignore
      }

      const params = new URLSearchParams(location.search);
      params.set('lang', lang);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
    },
    [location.pathname, location.search, navigate]
  );

  const t = useCallback(
    (key, params) => {
      return getTranslation(key, params, language);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      t,
      language,
      setLanguage: changeLanguage,
    }),
    [t, language, changeLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      t: (key, params) => getTranslation(key, params, 'en'),
      language: 'en',
      setLanguage: () => {},
    };
  }
  return context;
}


