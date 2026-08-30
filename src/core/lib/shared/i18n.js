import enTranslations from '@/locales/en.json' with { type: 'json' };
import esTranslations from '@/locales/es.json' with { type: 'json' };
import frTranslations from '@/locales/fr.json' with { type: 'json' };
import ptTranslations from '@/locales/pt.json' with { type: 'json' };

const resources = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  pt: ptTranslations,
};

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt'];

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
    if (resources[lang]) {
      currentLanguage = lang;
    }
  },
  addResource: (lang, translations) => {
    resources[lang] = { ...(resources[lang] || {}), ...translations };
  },
};
