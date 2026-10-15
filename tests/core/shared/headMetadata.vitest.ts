import { describe, expect, it } from 'vitest';
import { installHeadMetadataDedupe, pruneDuplicateHeadMetadata } from '@/core/lib/shared/headMetadata';

function headWith(innerHtml: string): HTMLElement {
  const head = document.createElement('head');
  head.innerHTML = innerHtml;
  return head;
}

const count = (head: HTMLElement, selector: string) => head.querySelectorAll(selector).length;
const hrefOf = (head: HTMLElement, selector: string) => head.querySelector(selector)?.getAttribute('href');

describe('head metadata de-duplication', () => {
  it('keeps only the newest title, description and canonical', () => {
    const head = headWith(`
      <title>Old title</title>
      <meta name="description" content="old" />
      <link rel="canonical" href="https://example.com/old" />
      <title>New title</title>
      <meta name="description" content="new" />
      <link rel="canonical" href="https://example.com/new" />
    `);

    pruneDuplicateHeadMetadata(head);

    expect(count(head, 'title')).toBe(1);
    expect(head.querySelector('title')?.textContent).toBe('New title');
    expect(count(head, 'meta[name="description"]')).toBe(1);
    expect(head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('new');
    expect(count(head, 'link[rel="canonical"]')).toBe(1);
    expect(hrefOf(head, 'link[rel="canonical"]')).toBe('https://example.com/new');
  });

  it('de-duplicates OpenGraph/Twitter tags and keeps distinct hreflang alternates', () => {
    const head = headWith(`
      <meta property="og:title" content="old" />
      <meta property="og:title" content="new" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="alternate" hreflang="en" href="https://example.com/en" />
      <link rel="alternate" hreflang="es" href="https://example.com/es" />
      <link rel="alternate" hreflang="en" href="https://example.com/en" />
    `);

    pruneDuplicateHeadMetadata(head);

    expect(count(head, 'meta[property="og:title"]')).toBe(1);
    expect(head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('new');
    expect(count(head, 'meta[name="twitter:card"]')).toBe(1);
    expect(count(head, 'link[rel="alternate"][hreflang="en"]')).toBe(1);
    expect(count(head, 'link[rel="alternate"][hreflang="es"]')).toBe(1);
  });

  it('never touches template/React-owned tags', () => {
    const head = headWith(`
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" href="/favicon.png" />
      <link rel="stylesheet" href="/assets/index.css" />
      <link rel="modulepreload" href="/assets/entry.js" />
      <meta name="description" content="a" />
      <meta name="description" content="b" />
    `);

    pruneDuplicateHeadMetadata(head);

    expect(count(head, 'meta[charset]')).toBe(1);
    expect(count(head, 'meta[name="viewport"]')).toBe(1);
    expect(count(head, 'link[rel="icon"]')).toBe(1);
    expect(count(head, 'link[rel="stylesheet"]')).toBe(1);
    expect(count(head, 'link[rel="modulepreload"]')).toBe(1);
    expect(count(head, 'meta[name="description"]')).toBe(1);
  });

  it('keeps every tag React rendered, even when it collides with the document copy', () => {
    const head = headWith(`
      <title>Document title</title>
      <meta name="description" content="document" />
      <link rel="canonical" href="https://example.com/home" />
    `);
    const documentOwned = new Set<Element>(Array.from(head.children));

    // React 19 hoists the tags the app renders into <head> and unmounts them itself; detaching one of
    // them here made React throw `removeChild of null` on the next unmount (frozen UI).
    head.insertAdjacentHTML(
      'beforeend',
      `
      <title>Route title</title>
      <meta name="description" content="route" />
      <link rel="canonical" href="https://example.com/login" />
    `
    );

    pruneDuplicateHeadMetadata(head, documentOwned);

    expect(count(head, 'title')).toBe(1);
    expect(head.querySelector('title')?.textContent).toBe('Route title');
    expect(count(head, 'meta[name="description"]')).toBe(1);
    expect(head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('route');
    expect(count(head, 'link[rel="canonical"]')).toBe(1);
    expect(hrefOf(head, 'link[rel="canonical"]')).toBe('https://example.com/login');
  });

  it('keeps distinct repeated meta properties and only drops exact duplicates', () => {
    const head = headWith(`
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="es_ES" />
      <meta property="og:locale:alternate" content="fr_FR" />
      <meta property="og:locale:alternate" content="pt_BR" />
      <meta property="og:locale:alternate" content="pt_BR" />
    `);

    pruneDuplicateHeadMetadata(head);

    expect(count(head, 'meta[property="og:locale:alternate"]')).toBe(3);
    expect(count(head, 'meta[property="og:locale:alternate"][content="pt_BR"]')).toBe(1);
  });

  it('never removes a tag that appeared after the observer was installed', async () => {
    const head = headWith(`
      <title>Document title</title>
      <link rel="canonical" href="https://example.com/home" />
    `);
    const stop = installHeadMetadataDedupe(head);

    try {
      // Stand-in for a tag React hoisted into <head> after the app rendered.
      head.insertAdjacentHTML('beforeend', '<title>Route title</title>');

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      const titles = Array.from(head.querySelectorAll('title'));
      expect(titles).toHaveLength(1);
      expect(titles[0].textContent).toBe('Route title');
    } finally {
      stop();
    }
  });
});
