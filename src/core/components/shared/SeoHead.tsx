import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from '@/core/components/context/I18nContext';
import { SUPPORTED_LANGUAGES } from '@/core/lib/shared/i18n';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  schemaData?: Record<string, unknown> | null;
}

const DEFAULT_LANGUAGE = 'en';

/** OpenGraph locale codes (`language_TERRITORY`) for each supported language. */
const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  pt: 'pt_BR',
};

/**
 * Social scrapers (Facebook, LinkedIn, X) do not render SVG, so the preview image must be a
 * raster format. `og-preview.png` is generated from `og-preview.svg` via `npm run og:image`.
 */
const DEFAULT_OG_IMAGE = 'https://takeoffengine.com/og-preview.png';

/** Drops any query/hash so the active language can be re-attached cleanly. */
function normalizeBaseUrl(url: string): string {
  return url.split('#')[0].split('?')[0];
}

export default function SeoHead({
  title = 'Takeoff Engine — Civil & Utility Estimating Platform',
  description = 'Convert CSV and Excel takeoffs from Bluebeam, PlanSwift, or Agtek into professional client-ready construction proposals and detailed estimates.',
  canonicalUrl = 'https://takeoffengine.com/',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  schemaData = null,
}: SeoHeadProps) {
  // The app keeps the active language in the `?lang=` query param (see I18nProvider), so the
  // canonical URL and hreflang alternates must carry it — otherwise every language collapses
  // into a single canonical and translated pages are never indexed separately.
  const { language } = useTranslation();
  const activeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const baseUrl = normalizeBaseUrl(canonicalUrl);
  const urlForLanguage = (lang: string) => `${baseUrl}?lang=${lang}`;
  const canonicalHref = urlForLanguage(activeLanguage);

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Takeoff Engine',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    url: canonicalHref,
    description,
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      description: '5 Free Takeoff Exports on Trial',
    },
    featureList: [
      'Multi-Format Bluebeam & PlanSwift CSV/Excel Takeoff Import',
      'Automatic Column Mapping & Vendor Preset Library',
      'Trench Earthwork Cubic Yard Auto-Calculations',
      'Crew Production Labor Hours & Hourly Cost Multipliers',
      'Digital E-Signature Proposals & PDF Schedule of Values',
    ],
  };

  const finalSchema = schemaData || defaultSchema;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalHref} />

      {/* Language alternates (hreflang) so translated routes stay distinct and crawlable. */}
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link key={`hreflang-${lang}`} rel="alternate" hrefLang={lang} href={urlForLanguage(lang)} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={urlForLanguage(DEFAULT_LANGUAGE)} />

      {/* OpenGraph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalHref} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="Takeoff Engine" />
      <meta property="og:locale" content={OG_LOCALES[activeLanguage] ?? OG_LOCALES[DEFAULT_LANGUAGE]} />
      {SUPPORTED_LANGUAGES.filter((lang) => lang !== activeLanguage).map((lang) => (
        <meta key={`og-locale-${lang}`} property="og:locale:alternate" content={OG_LOCALES[lang]} />
      ))}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema)}
      </script>
    </Helmet>
  );
}
