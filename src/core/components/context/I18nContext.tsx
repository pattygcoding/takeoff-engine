import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTranslation, i18n, isLanguageLoaded, loadLanguage, SUPPORTED_LANGUAGES } from '@/core/lib/shared/i18n';
import type { TranslationParams } from '@/core/lib/shared/i18n';

export type TranslateFunction = (key: string, params?: TranslationParams) => string;

interface I18nContextValue {
  t: TranslateFunction;
  language: string;
  setLanguage: (lang: string) => void;
}

const I18nContext = createContext<I18nContextValue>({
  t: (key) => key,
  language: 'en',
  setLanguage: () => {},
});

function getInitialLanguage(): string {
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

export function I18nProvider({ children, defaultLanguage = 'en' }: { children: ReactNode; defaultLanguage?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguageState] = useState<string>(getInitialLanguage);
  const [loadedLanguage, setLoadedLanguage] = useState<string>(() => (isLanguageLoaded(language) ? language : 'en'));

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    i18n.setLanguage(language);
    loadLanguage(language)
      .then(() => {
        if (!cancelled) setLoadedLanguage(language);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [language]);

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
      navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, language, navigate]);

  const changeLanguage = useCallback(
    (lang: string) => {
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
      navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true });
    },
    [location.pathname, location.search, location.hash, navigate]
  );

  const t = useCallback<TranslateFunction>(
    (key, params) => {
      return getTranslation(key, params, loadedLanguage);
    },
    [loadedLanguage]
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

export function useTranslation(): I18nContextValue {
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


