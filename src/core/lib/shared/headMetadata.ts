/**
 * Prunes duplicate SEO tags from `<head>`.
 *
 * Two sources of duplicates exist, and they must be handled differently:
 *
 * 1. Tags the document shipped — `index.html` or a prerendered route (see
 *    `scripts/prerender-public.mjs`). After a client-side navigation the head still holds the tags of
 *    the route the HTML was captured for, so the stale copies have to go. These are safe to remove.
 * 2. Tags React renders. React 19 hoists the `<title>`/`<meta>`/`<link>` elements the app renders
 *    (through `react-helmet-async`'s React 19 dispatcher) into `<head>` and keeps the DOM node on the
 *    fiber. It removes them itself when the route unmounts, by walking `stateNode.parentNode`
 *    (ReactFiberCommitWork, the `HostHoistable` deletion case). Detaching one of those nodes here
 *    leaves React holding a node that is no longer in the document, so the next unmount throws
 *    `Cannot read properties of null (reading 'removeChild')` *inside React's commit phase* — which
 *    aborts the whole update: the URL changes while the DOM freezes, and the app only recovers on a
 *    reload (the sign-in / navigation hang). These must never be removed here.
 *
 * Only SEO tags are considered; template tags (charset, viewport, icons, scripts, stylesheets,
 * preloads) are never touched.
 */

const NAME_KEYS = new Set(['description', 'robots', 'keywords']);

/**
 * Meta properties that legitimately repeat with different content — each occurrence is its own tag,
 * not a duplicate (`og:locale:alternate` lists one entry per alternate locale).
 */
const REPEATABLE_PROPERTY_KEYS = new Set(['og:image', 'og:image:alt', 'og:locale:alternate']);

/** Key for a `<link>` tag: the canonical link and each hreflang alternate are distinct. */
function linkMetadataKey(node: Element): string | null {
  const rel = node.getAttribute('rel');
  if (rel === 'canonical') return 'link:canonical';
  if (rel !== 'alternate') return null;
  const hreflang = node.getAttribute('hreflang');
  return hreflang ? `link:alternate:${hreflang}` : null;
}

/**
 * Key for a `<meta>` tag. `property` wins over `name`, and the repeatable Open Graph properties
 * include their content so that each occurrence stays its own tag.
 */
function metaMetadataKey(node: Element): string | null {
  const property = node.getAttribute('property');
  if (property) {
    const content = REPEATABLE_PROPERTY_KEYS.has(property) ? `:${node.getAttribute('content') ?? ''}` : '';
    return `meta:property:${property}${content}`;
  }
  const name = node.getAttribute('name');
  if (!name || !(NAME_KEYS.has(name) || name.startsWith('twitter:'))) return null;
  return `meta:name:${name}`;
}

function metadataKey(node: Element): string | null {
  const tag = node.tagName.toLowerCase();

  if (tag === 'title') return 'title';
  if (tag === 'link') return linkMetadataKey(node);
  if (tag === 'meta') return metaMetadataKey(node);

  return null;
}

/** Buckets `<head>` children by their SEO key; tags without a key are left out entirely. */
function groupByMetadataKey(children: Element[]): Map<string, Element[]> {
  const byKey = new Map<string, Element[]>();
  for (const node of children) {
    const key = metadataKey(node);
    if (!key) continue;
    const group = byKey.get(key);
    if (group) group.push(node);
    else byKey.set(key, [node]);
  }
  return byKey;
}

/**
 * The occurrences of a duplicated key that should be dropped.
 *
 * A React-rendered tag for the same key means every document copy is the stale one; otherwise the
 * duplicates all belong to the document and only the newest wins.
 */
function staleNodes(group: Element[], documentOwned?: Set<Element>): Element[] {
  if (!documentOwned) return group.slice(0, -1);
  const owned = group.filter((node) => documentOwned.has(node));
  return owned.length < group.length ? owned : group.slice(0, -1);
}

/**
 * Keeps only the newest occurrence of each SEO tag.
 *
 * `documentOwned` — when supplied — is the set of tags that were already in `<head>` before React
 * took the page over. Only those are ever removed; tags React added (it hoists them into `<head>` and
 * unmounts them itself) are always left in place, even when they collide on a key.
 */
export function pruneDuplicateHeadMetadata(head: HTMLElement = document.head, documentOwned?: Set<Element>): void {
  for (const group of groupByMetadataKey(Array.from(head.children)).values()) {
    if (group.length < 2) continue;
    for (const node of staleNodes(group, documentOwned)) node.remove();
  }
}

/** Installs a head observer that keeps duplicates pruned for the life of the page. */
export function installHeadMetadataDedupe(head: HTMLElement = document.head): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};

  // Called from main.tsx before the app is rendered, so everything in <head> right now is document
  // markup (index.html / a prerendered route) — the only tags this helper is allowed to remove.
  let documentOwned = new Set<Element>(Array.from(head.children));

  let scheduled: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (scheduled !== undefined) return;
    scheduled = setTimeout(() => {
      scheduled = undefined;
      // Drop tags that are already gone so the set only tracks what is still in <head>.
      documentOwned = new Set(Array.from(documentOwned).filter((node) => node.parentNode === head));
      pruneDuplicateHeadMetadata(head, documentOwned);
    }, 0);
  };

  pruneDuplicateHeadMetadata(head, documentOwned);
  const observer = new MutationObserver(schedule);
  observer.observe(head, { childList: true });

  return () => {
    observer.disconnect();
    if (scheduled !== undefined) clearTimeout(scheduled);
  };
}
