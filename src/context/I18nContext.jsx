import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { getTranslation, i18n } from '../lib/i18n';

const I18nContext = createContext({
  t: (key, params) => key,
  language: 'en',
  setLanguage: () => {},
});

export function I18nProvider({ children, defaultLanguage = 'en' }) {
  const [language, setLanguageState] = useState(defaultLanguage);

  const changeLanguage = useCallback((lang) => {
    i18n.setLanguage(lang);
    setLanguageState(lang);
  }, []);

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
