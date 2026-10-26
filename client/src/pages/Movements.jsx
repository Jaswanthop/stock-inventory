import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Filter,
  Plus,
  RotateCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import api from '../api/client.js';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { TableSkeleton } from '../components/Loaders.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { MOVEMENT_META, REASONS, formatDateTime, formatDelta, formatNumber, movementDelta } from '../utils/format.js';

const TYPE_OPTIONS = [
  { value: '', label: 'All movement types' },
  { value: 'IN', label: 'Stock in' },
  { value: 'OUT', label: 'Stock out' },
  { value: 'ADJUST', label: 'Adjustments' },
];

function reasonLabel(value) {
  return REASONS.find((reason) => reason.value === value)?.label || 'Other';
}

export default function Movements() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', type: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }));
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await api.get('/movements', {
        params: {
          search: filters.search || undefined,
          type: filters.type || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          page,
          limit: 15,
        },
      });
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = async () => {
    setModalOpen(true);
    if (products.length || loadingProducts) return;
    setLoadingProducts(true);
    try {
      const { data: response } = await api.get('/products/summary');
      setProducts(response.items);
    } catch (err) {
      toast.error('Could not load products', err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const activeFilters = Boolean(filters.search || filters.type || filters.from || filters.to);

  const resetFilters = () => {
    setSearchInput('');
    setFilters({ search: '', type: '', from: '', to: '' });
    setPage(1);
  };

  const totals = useMemo(() => {
    const received = data.items.filter((item) => item.type === 'IN').reduce((sum, item) => sum + item.quantity, 0);
    const shipped = data.items.filter((item) => item.type === 'OUT').reduce((sum, item) => sum + item.quantity, 0);
    return { received, shipped };
  }, [data.items]);

  const handleSaved = (_movement, message) => {
    toast.success('Stock updated', message || 'Movement recorded successfully');
    setPage(1);
    load();
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Audit trail"
        title="Stock movements"
        description="Every receipt, sale and cycle count, recorded with who did it and when."
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
              <RotateCw size={16} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button type="button" className="btn btn--primary" onClick={openModal}>
              <Plus size={16} /> Record movement
            </button>
          </>
        }
      />

      <div className="toolbar toolbar--wrap">
        <div className="toolbar__search">
          <Search size={17} />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search product, SKU, reference, user…"
            aria-label="Search movements"
          />
          {searchInput && (
            <button type="button" className="icon-btn" onClick={() => setSearchInput('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        <label className="toolbar__select">
          <Filter size={15} />
          <select
            value={filters.type}
            onChange={(event) => {
              setFilters((current) => ({ ...current, type: event.target.value }));
              setPage(1);
            }}
            aria-label="Filter by movement type"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar__date">
          <CalendarDays size={15} />
          <span>From</span>
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => {
              setFilters((current) => ({ ...current, from: event.target.value }));
              setPage(1);
            }}
            aria-label="From date"
          />
        </label>

        <label className="toolbar__date">
          <CalendarDays size={15} />
          <span>To</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => {
              setFilters((current) => ({ ...current, to: event.target.value }));
              setPage(1);
            }}
            aria-label="To date"
          />
        </label>

        {activeFilters && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert--danger">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <section className="card card--flush">
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={activeFilters ? 'No movements match those filters' : 'No stock activity yet'}
            message={
              activeFilters
                ? 'Try widening the date range or clearing the filters.'
                : 'Record your first receipt or sale to start the audit trail.'
            }
            action={
              activeFilters ? (
                <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={openModal}>
                  <Plus size={16} /> Record movement
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--movements">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Change</th>
                    <th>Stock after</th>
                    <th>Reason</th>
                    <th>Reference</th>
                    <th>Recorded by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((movement) => {
                    const meta = MOVEMENT_META[movement.type] || MOVEMENT_META.ADJUST;
                    const Icon =
                      movement.type === 'IN'
                        ? ArrowDownRight
                        : movement.type === 'OUT'
                          ? ArrowUpRight
                          : TrendingUp;

                    return (
                      <tr key={movement._id}>
                        <td className="nowrap">
                          <div className="cell-date">
                            <strong>{formatDateTime(movement.createdAt).split(',')[0]}</strong>
                            <span>{formatDateTime(movement.createdAt).split(',').slice(1).join(',').trim()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-product">
                            <span className={`movement-dot movement-dot--${movement.type.toLowerCase()}`}>
                              <Icon size={13} />
                            </span>
                            <div>
                              <strong>{movement.productName}</strong>
                              <span>{movement.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="nowrap">
                          {(() => {
                            const delta = movementDelta(movement);
                            const tone = delta > 0 ? 'in' : delta < 0 ? 'out' : 'adjust';
                            return <span className={`qty-cell qty-cell--${tone}`}>{formatDelta(delta)}</span>;
                          })()}
                        </td>
                        <td className="nowrap">
                          <span className="muted">{movement.previousQty}</span> →{' '}
                          <strong>{movement.newQty}</strong>
                        </td>
                        <td>{reasonLabel(movement.reason)}</td>
                        <td className="nowrap muted">{movement.reference || '—'}</td>
                        <td className="nowrap">{movement.performedByName || 'System'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="card__footer card__footer--split">
              <p className="pagination__meta">
                This page: <strong>+{formatNumber(totals.received)}</strong> received ·{' '}
                <strong>−{formatNumber(totals.shipped)}</strong> shipped
              </p>
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                limit={data.limit}
                onChange={setPage}
                label="movements"
              />
            </div>
          </>
        )}
      </section>

      <StockAdjustModal
        open={modalOpen}
        product={null}
        products={products}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
