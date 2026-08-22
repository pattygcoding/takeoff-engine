import enTranslations from '../locales/en.json';

const resources = {
  en: enTranslations,
};

let currentLanguage = 'en';

/**
 * Helper to resolve nested keys like "clientProposal.loadingDetails"
 */
export function getTranslation(key, params = {}, lang = currentLanguage) {
  const dictionary = resources[lang] || resources.en;
  const parts = key.split('.');
  let current = dictionary;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to key itself if not found
      return key;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  // Replace {{param}} placeholders
  return current.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, match) => {
    return params[match] !== undefined ? params[match] : `{{${match}}}`;
  });
}

export const i18n = {
  t: getTranslation,
  getLanguage: () => currentLanguage,
  setLanguage: (lang) => {
    if (resources[lang]) {
      currentLanguage = lang;
    }
  },
  addResource: (lang, translations) => {
    resources[lang] = { ...(resources[lang] || {}), ...translations };
  },
};
