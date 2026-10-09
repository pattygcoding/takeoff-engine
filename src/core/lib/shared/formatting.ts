/** Formats a numeric value as US currency; non-numeric input falls back to `$0.00`. */
export function formatCurrency(value: number | string | null | undefined): string {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

/** Formats a numeric value with a fixed number of decimals; non-numeric input falls back to `0`. */
export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}