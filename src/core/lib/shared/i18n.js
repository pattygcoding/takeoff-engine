import enTranslations from '@/lang/en.json' with { type: 'json' };

const resources = {
  en: enTranslations,
};

const localeLoaders = {
  es: () => import('@/lang/es.json'),
  fr: () => import('@/lang/fr.json'),
  pt: () => import('@/lang/pt.json'),
};

const pendingLoads = {};

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt'];

export function isLanguageLoaded(lang) {
  return Boolean(resources[lang]);
}

export function loadLanguage(lang) {
  if (resources[lang]) return Promise.resolve(resources[lang]);
  const loader = localeLoaders[lang];
  if (!loader) return Promise.resolve(resources.en);
  pendingLoads[lang] ??= loader()
    .then((mod) => {
      resources[lang] = mod.default || mod;
      return resources[lang];
    })
    .catch((error) => {
      delete pendingLoads[lang];
      throw error;
    });
  return pendingLoads[lang];
}

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
      // If language was not English, fallback to English dictionary before giving up
      if (lang !== 'en' && resources.en) {
        let fallbackCurrent = resources.en;
        for (const fallbackPart of parts) {
          if (fallbackCurrent && typeof fallbackCurrent === 'object' && fallbackPart in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[fallbackPart];
          } else {
            return key;
          }
        }
        if (typeof fallbackCurrent === 'string') {
          return fallbackCurrent.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, match) => {
            return params[match] !== undefined ? params[match] : `{{${match}}}`;
          });
        }
      }
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
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      currentLanguage = lang;
      loadLanguage(lang).catch(() => {});
    }
  },
  addResource: (lang, translations) => {
    resources[lang] = { ...(resources[lang] || {}), ...translations };
  },
};
