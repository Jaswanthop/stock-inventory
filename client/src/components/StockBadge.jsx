import { STOCK_META } from '../utils/format.js';
import Badge from './Badge.jsx';

export default function StockBadge({ status, quantity, unit = 'pcs' }) {
  const meta = STOCK_META[status] || STOCK_META.ok;

  if (quantity === undefined) {
    return (
      <Badge tone={meta.tone} dot>
        {meta.label}
      </Badge>
    );
  }

  return (
    <div className="stock-cell">
      <strong className={status === 'out' ? 'text-danger' : status === 'low' ? 'text-warning' : ''}>
        {quantity}
        <span className="stock-cell__unit"> {unit}</span>
      </strong>
      <Badge tone={meta.tone} dot>
        {meta.label}
      </Badge>
    </div>
  );
}
