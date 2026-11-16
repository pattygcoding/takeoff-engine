/**
 * Release identity shown in the app and landing-page footers.
 *
 * Format: `beta v<YY><MMDD>.<N>` — see AGENTS.md ("Version bump on every push").
 *   YY   two-digit year of the push date
 *   MMDD month/day of the push date, no separators
 *   N    which push that day (1, 2, 3 …)
 *
 * Kept in one place so both footers always agree. Bump this string before every push; never edit a
 * footer component to change the version.
 */
export const APP_VERSION = 'beta v26.1116.1';