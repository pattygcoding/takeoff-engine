/**
 * Route-chunk prefetching.
 *
 * Next.js `<Link>` prefetches the destination route while the browser is idle or the link is
 * hovered. This app uses declarative React Router, so we warm the likely-next chunks during idle
 * time instead — the first navigation then renders without waiting on a network fetch.
 */

/** Fire-and-forget dynamic import; failures are non-fatal (the route still loads on navigation). */
export function preloadRoute(loader: () => Promise<unknown>): void {
  void loader().catch(() => {});
}

/** Extra route chunks registered by other layers (e.g. product) — core stays product-agnostic. */
const registeredPreloaders: Array<() => Promise<unknown>> = [];

/** Registers additional route chunks to warm on public pages. */
export function registerRoutePreloaders(loaders: Array<() => Promise<unknown>>): void {
  for (const loader of loaders) {
    if (!registeredPreloaders.includes(loader)) registeredPreloaders.push(loader);
  }
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Runs the loaders once the browser is idle (or after a short timeout where
 * `requestIdleCallback` is unavailable). Returns a cleanup function for `useEffect`.
 */
export function preloadRoutesOnIdle(loaders: Array<() => Promise<unknown>> = []): () => void {
  if (typeof window === 'undefined') return () => {};
  const win = window as IdleWindow;
  const run = () => {
    for (const loader of [...loaders, ...registeredPreloaders]) preloadRoute(loader);
  };

  if (typeof win.requestIdleCallback === 'function') {
    const handle = win.requestIdleCallback(run);
    return () => win.cancelIdleCallback?.(handle);
  }

  const timer = window.setTimeout(run, 2000);
  return () => window.clearTimeout(timer);
}
