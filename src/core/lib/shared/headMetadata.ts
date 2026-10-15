/**
 * Prunes duplicate SEO tags from `<head>`.
 *
 * `react-helmet-async` appends a fresh copy of each tag on every re-render instead of replacing
 * the previous one (its tags carry no marker it can adopt — see the `data-rh` finding in
 * scripts/prerender-public.mjs). The app re-renders routinely (auth settling, the `?lang=` URL
 * sync), so the head accumulates duplicate title/description/canonical/hreflang/OG/Twitter tags,
 * which is bad for SEO and for anything that reads raw HTML.
 *
 * Only SEO tags are considered; template/React-owned tags (charset, viewport, icons, scripts,
 * stylesheets, preloads) are never touched.
 */

const NAME_KEYS = new Set(['description', 'robots', 'keywords']);

function metadataKey(node: Element): string | null {
  const tag = node.tagName.toLowerCase();

  if (tag === 'title') return 'title';

  if (tag === 'link') {
    const rel = node.getAttribute('rel');
    if (rel === 'canonical') return 'link:canonical';
    if (rel === 'alternate') {
      const hreflang = node.getAttribute('hreflang');
      if (hreflang) return `link:alternate:${hreflang}`;
    }
    return null;
  }

  if (tag === 'meta') {
    const property = node.getAttribute('property');
    if (property) return `meta:property:${property}`;
    const name = node.getAttribute('name');
    if (name && (NAME_KEYS.has(name) || name.startsWith('twitter:'))) return `meta:name:${name}`;
  }

  return null;
}

/** Keeps only the newest occurrence of each SEO tag. */
export function pruneDuplicateHeadMetadata(head: HTMLElement = document.head): void {
  const newest = new Map<string, Element>();
  for (const node of Array.from(head.children)) {
    const key = metadataKey(node);
    if (!key) continue;
    newest.get(key)?.remove();
    newest.set(key, node);
  }
}

/** Installs a head observer that keeps duplicates pruned for the life of the page. */
export function installHeadMetadataDedupe(head: HTMLElement = document.head): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};

  let scheduled: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (scheduled !== undefined) return;
    scheduled = setTimeout(() => {
      scheduled = undefined;
      pruneDuplicateHeadMetadata(head);
    }, 0);
  };

  pruneDuplicateHeadMetadata(head);
  const observer = new MutationObserver(schedule);
  observer.observe(head, { childList: true });

  return () => {
    observer.disconnect();
    if (scheduled !== undefined) clearTimeout(scheduled);
  };
}
