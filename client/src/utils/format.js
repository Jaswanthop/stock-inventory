const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US');

export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

export const formatNumber = (value) => numberFormatter.format(Number(value) || 0);

export function formatCompact(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return numberFormatter.format(number);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(value) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export const STOCK_META = {
  ok: { label: 'In stock', tone: 'success' },
  low: { label: 'Low stock', tone: 'warning' },
  out: { label: 'Out of stock', tone: 'danger' },
};

export const MOVEMENT_META = {
  IN: { label: 'Stock in', tone: 'success' },
  OUT: { label: 'Stock out', tone: 'danger' },
  ADJUST: { label: 'Adjustment', tone: 'info' },
};

/**
 * Signed stock change for a movement.
 * For adjustments, `quantity` is the counted total, so the delta is derived
 * from the before/after values stored in the ledger.
 */
export function movementDelta(movement) {
  if (!movement) return 0;
  if (movement.type === 'ADJUST') {
    return Number(movement.newQty || 0) - Number(movement.previousQty || 0);
  }
  if (movement.type === 'OUT') return -Math.abs(Number(movement.quantity) || 0);
  return Math.abs(Number(movement.quantity) || 0);
}

export function formatDelta(delta) {
  const value = Number(delta) || 0;
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

export const REASONS = [
  { value: 'purchase', label: 'Purchase / restock' },
  { value: 'sale', label: 'Sale / order' },
  { value: 'return', label: 'Customer return' },
  { value: 'damage', label: 'Damage / shrinkage' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'correction', label: 'Stock count correction' },
  { value: 'other', label: 'Other' },
];

export const ROLE_META = {
  admin: { label: 'Administrator', tone: 'brand' },
  manager: { label: 'Manager', tone: 'info' },
  staff: { label: 'Staff', tone: 'neutral' },
};
