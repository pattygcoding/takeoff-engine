import enTranslations from '@/lang/en.json' with { type: 'json' };

/** A locale dictionary: nested objects with translatable string leaves. */
export type TranslationTree = { [key: string]: unknown };

export type TranslationParams = Record<string, string | number>;

const resources: Record<string, TranslationTree> = {
  en: enTranslations as unknown as TranslationTree,
};

const localeLoaders: Record<string, () => Promise<TranslationTree>> = {
  es: () => import('@/lang/es.json').then((mod) => mod.default as unknown as TranslationTree),
  fr: () => import('@/lang/fr.json').then((mod) => mod.default as unknown as TranslationTree),
  pt: () => import('@/lang/pt.json').then((mod) => mod.default as unknown as TranslationTree),
};

const pendingLoads: Record<string, Promise<TranslationTree> | undefined> = {};

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt'];

export function isLanguageLoaded(lang: string): boolean {
  return Boolean(resources[lang]);
}

export function loadLanguage(lang: string): Promise<TranslationTree> {
  const existing = resources[lang];
  if (existing) return Promise.resolve(existing);
  const loader = localeLoaders[lang];
  if (!loader) return Promise.resolve(resources.en);
  const pending = (pendingLoads[lang] ??= loader()
    .then((dictionary) => {
      resources[lang] = dictionary;
      return dictionary;
    })
    .catch((error: unknown) => {
      delete pendingLoads[lang];
      throw error;
    }));
  return pending;
}

let currentLanguage = 'en';

/** Walks a nested dictionary by dotted path, returning the string leaf or `undefined`. */
function resolvePath(root: TranslationTree, parts: string[]): string | undefined {
  let current: unknown = root;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Second argument accepted by `getTranslation`/`t`. Historically callers passed a
 * literal fallback string here (which is ignored — the dictionary, then the key
 * itself, is the fallback). Both shapes stay accepted for source compatibility.
 */
export type TranslationParamsInput = TranslationParams | string;

/** Replaces `{{param}}` placeholders, leaving unknown placeholders untouched. */
function interpolate(template: string, params: TranslationParamsInput): string {
  const values: TranslationParams = params && typeof params === 'object' ? params : {};
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, match: string) => {
    const value = values[match];
    return value !== undefined ? String(value) : `{{${match}}}`;
  });
}

/**
 * Helper to resolve nested keys like "clientProposal.loadingDetails".
 * Falls back to the English dictionary (then to the key itself) when a translation is missing.
 */
export function getTranslation(
  key: string,
  params: TranslationParamsInput = {},
  lang: string = currentLanguage,
): string {
  const dictionary = resources[lang] || resources.en;
  const parts = key.split('.');
  const resolved =
    resolvePath(dictionary, parts) ?? (lang !== 'en' ? resolvePath(resources.en, parts) : undefined);
  if (resolved === undefined) return key;
  return interpolate(resolved, params);
}

export const i18n = {
  t: getTranslation,
  getLanguage: (): string => currentLanguage,
  setLanguage: (lang: string): void => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      currentLanguage = lang;
      loadLanguage(lang).catch(() => {});
    }
  },
  addResource: (lang: string, translations: TranslationTree): void => {
    resources[lang] = { ...(resources[lang] || {}), ...translations };
  },
};
