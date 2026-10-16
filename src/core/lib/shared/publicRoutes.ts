/**
 * Route helpers for the public marketing surface: the landing page and client proposal links.
 *
 * Both render their own chrome (header/top bar and footer), so the app shell has to stay out of the
 * way. The catch: GitHub Pages serves the prerendered `/home` route from a directory, so `/home`
 * arrives as `/home/`. Any comparison against the raw pathname must ignore trailing slashes —
 * otherwise the landing page looks like an app route and the app header/footer render on top of the
 * landing page's own, giving two stacked top banners.
 */

/** Strips trailing slashes so `/home/` and `/home` compare equal (`/` stays `/`). */
export function normalizePathname(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/(?<!\/)\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
}

/** True for the public landing page, which supplies its own header and footer. */
export function isPublicLandingPath(pathname: string, isAuthenticated: boolean): boolean {
  const path = normalizePathname(pathname);
  return path === '/home' || (!isAuthenticated && path === '/');
}

/** True for a public client proposal link (`/p/:token`), which supplies its own header and footer. */
export function isClientProposalPath(pathname: string): boolean {
  return normalizePathname(pathname).startsWith('/p/');
}
