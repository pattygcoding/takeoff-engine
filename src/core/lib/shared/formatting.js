export function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value, decimals = 2) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}