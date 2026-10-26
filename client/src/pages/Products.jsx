import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Boxes,
  Filter,
  PackagePlus,
  Pencil,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api/client.js';
import Badge from '../components/Badge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { TableSkeleton } from '../components/Loaders.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import ProductModal from '../components/ProductModal.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import StockBadge from '../components/StockBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency, formatNumber } from '../utils/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All stock levels' },
  { value: 'ok', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'quantity', label: 'Lowest stock' },
  { value: '-quantity', label: 'Highest stock' },
  { value: '-unitPrice', label: 'Highest price' },
  { value: 'sku', label: 'SKU' },
];

export default function Products() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    sort: '-createdAt',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [productForm, setProductForm] = useState({ open: false, product: null });
  const [adjust, setAdjust] = useState({ open: false, product: null });
  const [deleting, setDeleting] = useState({ open: false, product: null, busy: false });

  const canEdit = ['admin', 'manager'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/categories'), api.get('/suppliers')])
      .then(([categoriesResponse, suppliersResponse]) => {
        if (cancelled) return;
        setCategories(categoriesResponse.data.items);
        setSuppliers(suppliersResponse.data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const { data: response } = await api.get('/products', {
        params: {
          search: filters.search || undefined,
          category: filters.category || undefined,
          status: filters.status || undefined,
          sort: filters.sort,
          page,
          limit: 10,
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

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category._id, label: category.name })),
    [categories]
  );

  const activeFilters = Boolean(filters.search || filters.category || filters.status);

  const resetFilters = () => {
    setSearchInput('');
    setFilters({ search: '', category: '', status: '', sort: '-createdAt' });
    setPage(1);
  };

  const handleSavedProduct = (_product, message) => {
    toast.success('Saved', message || 'Product saved successfully');
    load();
  };

  const handleMovementSaved = (_movement, message) => {
    toast.success('Stock updated', message || 'Stock movement recorded');
    load();
  };

  const confirmDelete = async () => {
    setDeleting((current) => ({ ...current, busy: true }));
    try {
      const { data: response } = await api.delete(`/products/${deleting.product._id}`);
      toast.success('Product deleted', response.message);
      setDeleting({ open: false, product: null, busy: false });
      load();
    } catch (err) {
      toast.error('Could not delete product', err.message);
      setDeleting((current) => ({ ...current, busy: false }));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage SKUs, pricing, reorder levels and on-hand stock."
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
              <RotateCw size={16} className={loading ? 'spin' : ''} /> Refresh
            </button>
            {canEdit && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setProductForm({ open: true, product: null })}
              >
                <PackagePlus size={16} /> New product
              </button>
            )}
          </>
        }
      />

      <div className="toolbar">
        <div className="toolbar__search">
          <Search size={17} />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, SKU, location…"
            aria-label="Search products"
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
            value={filters.category}
            onChange={(event) => {
              setFilters((current) => ({ ...current, category: event.target.value }));
              setPage(1);
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar__select">
          <SlidersHorizontal size={15} />
          <select
            value={filters.status}
            onChange={(event) => {
              setFilters((current) => ({ ...current, status: event.target.value }));
              setPage(1);
            }}
            aria-label="Filter by stock level"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar__select">
          <select
            value={filters.sort}
            onChange={(event) => {
              setFilters((current) => ({ ...current, sort: event.target.value }));
              setPage(1);
            }}
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <TableSkeleton rows={7} columns={6} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={activeFilters ? Filter : Boxes}
            title={activeFilters ? 'No products match those filters' : 'Your catalogue is empty'}
            message={
              activeFilters
                ? 'Try a different search term or clear the filters to see everything.'
                : canEdit
                  ? 'Add your first product to start tracking stock levels.'
                  : 'An administrator or manager can add products.'
            }
            action={
              activeFilters ? (
                <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : (
                canEdit && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setProductForm({ open: true, product: null })}
                  >
                    <Plus size={16} /> Add product
                  </button>
                )
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table--products">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>On hand</th>
                    <th>Reorder</th>
                    <th>Pricing</th>
                    <th>Stock value</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="cell-product">
                          <span
                            className="cell-product__dot"
                            style={{ background: product.category?.color || '#94a3b8' }}
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <span>
                              {product.sku}
                              {product.location ? ` · ${product.location}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {product.category ? (
                          <Badge tone="neutral">{product.category.name}</Badge>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <StockBadge status={product.stockStatus} quantity={product.quantity} unit={product.unit} />
                      </td>
                      <td>{formatNumber(product.reorderLevel)}</td>
                      <td>
                        <div className="cell-price">
                          <strong>{formatCurrency(product.unitPrice)}</strong>
                          <span>cost {formatCurrency(product.costPrice)}</span>
                        </div>
                      </td>
                      <td className="nowrap">{formatCurrency(product.stockValue)}</td>
                      <td>
                        <div className="row-actions">
                          {canEdit && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Record stock movement"
                              onClick={() => setAdjust({ open: true, product })}
                            >
                              <ArrowLeftRight size={16} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Edit product"
                              onClick={() => setProductForm({ open: true, product })}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title="Delete product"
                              onClick={() => setDeleting({ open: true, product, busy: false })}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card__footer">
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                limit={data.limit}
                onChange={setPage}
                label="products"
              />
            </div>
          </>
        )}
      </section>

      <ProductModal
        open={productForm.open}
        product={productForm.product}
        categories={categories}
        suppliers={suppliers}
        onClose={() => setProductForm({ open: false, product: null })}
        onSaved={handleSavedProduct}
      />

      <StockAdjustModal
        open={adjust.open}
        product={adjust.product}
        onClose={() => setAdjust({ open: false, product: null })}
        onSaved={handleMovementSaved}
      />

      <ConfirmDialog
        open={deleting.open}
        title="Delete product"
        message={`Delete "${deleting.product?.name}"? Its stock history stays in the audit trail, but this SKU will be removed from inventory.`}
        confirmLabel="Delete product"
        busy={deleting.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting({ open: false, product: null, busy: false })}
      />
    </div>
  );
}
