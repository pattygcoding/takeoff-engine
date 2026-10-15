import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { installHeadMetadataDedupe } from '@/core/lib/shared/headMetadata';

/**
 * React 19 hoists the <title>/<meta>/<link> elements a component renders into <head> and removes them
 * itself on unmount by walking `stateNode.parentNode`. Detaching one of those nodes from outside React
 * left React holding a parentless node, so the next unmount threw `Cannot read properties of null
 * (reading 'removeChild')` inside React's commit phase — which aborted the update and froze the UI
 * (clicking Sign In changed the URL but the page kept rendering the previous route until a reload).
 */
function RouteHead() {
  return (
    <>
      <title>Route title</title>
      <meta name="description" content="route" />
      <link rel="canonical" href="https://example.com/route" />
      <meta property="og:locale:alternate" content="es_ES" />
      <meta property="og:locale:alternate" content="fr_FR" />
      <meta property="og:locale:alternate" content="pt_BR" />
    </>
  );
}

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('head metadata de-duplication vs React-owned tags', () => {
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
  });

  it('never detaches the SEO tags React hoisted into <head>, so unmounting stays safe', async () => {
    document.head.innerHTML = `
      <title>Document title</title>
      <meta name="description" content="document" />
      <link rel="canonical" href="https://example.com/document" />
    `;
    const stop = installHeadMetadataDedupe(document.head);

    try {
      const { unmount } = render(<RouteHead />);
      await settle();

      // The document's copies were superseded (single set remains) …
      expect(document.head.querySelectorAll('title')).toHaveLength(1);
      expect(document.head.querySelector('title')?.textContent).toBe('Route title');
      expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);

      // … every distinct alternate locale is still there, and none of React's tags were detached.
      expect(document.head.querySelectorAll('meta[property="og:locale:alternate"]')).toHaveLength(3);

      expect(() => unmount()).not.toThrow();
    } finally {
      stop();
    }
  });
});
