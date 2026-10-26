import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, limit, onChange, label = 'items' }) {
  if (!total) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const numbers = [];
  for (let index = 1; index <= pages; index += 1) {
    if (index === 1 || index === pages || Math.abs(index - page) <= 1) numbers.push(index);
    else if (numbers[numbers.length - 1] !== '…') numbers.push('…');
  }

  return (
    <div className="pagination">
      <p className="pagination__meta">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> {label}
      </p>
      <div className="pagination__controls">
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {numbers.map((number, index) =>
          number === '…' ? (
            <span key={`gap-${index}`} className="pagination__gap">
              …
            </span>
          ) : (
            <button
              key={number}
              type="button"
              className={`pagination__page ${number === page ? 'is-active' : ''}`}
              onClick={() => onChange(number)}
              aria-current={number === page ? 'page' : undefined}
            >
              {number}
            </button>
          )
        )}
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
