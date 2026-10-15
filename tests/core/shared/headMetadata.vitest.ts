import { describe, expect, it } from 'vitest';
import { pruneDuplicateHeadMetadata } from '@/core/lib/shared/headMetadata';

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
});
