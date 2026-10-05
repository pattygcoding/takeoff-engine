// Each deploy replaces every hashed asset, so a browser still running an older build (cached
// index.html or a tab left open) fails to fetch its lazy chunks. A single reload picks up the new build.

const RELOAD_KEY = 'takeoff_stale_build_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

const STALE_BUILD_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite preload helper
];

export function isStaleBuildError(error) {
  const message = typeof error === 'string' ? error : error?.message;
  return typeof message === 'string' && STALE_BUILD_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Reloads the page unless it was already reloaded for this reason moments ago, which would mean
 * the failure is not caused by a stale build and reloading again would loop.
 * Returns true when a reload was started.
 */
export function reloadForStaleBuild({ storage = globalThis.sessionStorage, location = globalThis.location, now = Date.now() } = {}) {
  try {
    const lastReload = Number(storage?.getItem(RELOAD_KEY)) || 0;
    if (now - lastReload < RELOAD_COOLDOWN_MS) return false;
    storage?.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  location.reload();
  return true;
}
