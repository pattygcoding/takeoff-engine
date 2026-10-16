/**
 * Field-value coercion helpers.
 *
 * Form state in the estimator is stored as strings, so the components spent a lot of
 * `Number(value) || fallback` / `value || ''` expressions. Repeating those inline is what pushed
 * several components past the cognitive-complexity budget (each standalone `||` counts as a
 * branch), so they are centralised here.
 */

/** `Number(value)` when it is a non-zero finite number, otherwise `fallback` (i.e. `Number(v) || fb`). */
export function toNumberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return parsed || fallback;
}

/** The string itself when it is a non-empty string, otherwise `''` (i.e. `v || ''` for text fields). */
export function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
