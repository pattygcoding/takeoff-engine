import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SeoHead({
  title = 'Takeoff Engine — Civil & Utility Estimating Platform',
  description = 'Convert CSV and Excel takeoffs from Bluebeam, PlanSwift, or Agtek into professional client-ready construction proposals and detailed estimates.',
  canonicalUrl = 'https://takeoffengine.com/',
  ogType = 'website',
  ogImage = 'https://takeoffengine.com/og-preview.svg',
  schemaData = null,
}) {
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Takeoff Engine',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    url: canonicalUrl,
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
      <link rel="canonical" href={canonicalUrl} />

      {/* OpenGraph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Takeoff Engine" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema)}
      </script>
    </Helmet>
  );
}
