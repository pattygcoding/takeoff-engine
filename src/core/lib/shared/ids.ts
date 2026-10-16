/**
 * Shared identifier generation for client-side list items (takeoff rows, scope items,
 * rate misc items, rate-adjacent records, ...).
 *
 * `Math.random()` is deliberately never used here: it is a non-cryptographic PRNG and
 * therefore not a safe source of randomness (Sonar S2245 / CWE-338). The Web Crypto UUID
 * generator is preferred, with a timestamp plus an in-process counter as the only
 * fallback, so two ids created in the same millisecond still differ.
 */

let fallbackCounter = 0;

/** Returns a unique id, optionally prefixed (e.g. `newId('preset_')`). */
export function newId(prefix = ''): string {
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : '';
  if (uuid) return `${prefix}${uuid}`;
  fallbackCounter += 1;
  return `${prefix}${Date.now()}_${fallbackCounter}`;
}
