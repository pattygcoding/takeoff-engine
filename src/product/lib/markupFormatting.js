function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function formatMarkupLine(label, amount, pct, t = null, isFixed = false) {
  const normalizedPct = Number(pct ?? 0) || 0;
  const normalizedAmount = Number(amount) || 0;

  if (isFixed) {
    return `${label}: ${formatCurrency(normalizedAmount)}`;
  }

  const basisText = t
    ? t('product.markup.percentBasis', { pct: normalizedPct })
    : `${normalizedPct}% of the initial estimated cost before contingency and profit are applied`;

  return `${label}: ${formatCurrency(normalizedAmount)} (${basisText})`;
}

export function formatMarkupBasisNote(t = null) {
  return t
    ? t('product.markup.markupBasisNote')
    : 'All markup percentages are calculated against the initial direct cost, not compounded on the final total.';
}
