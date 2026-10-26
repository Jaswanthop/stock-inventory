import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import api from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Spinner } from '../components/Loaders.jsx';
import StockBadge from '../components/StockBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  MOVEMENT_META,
  formatCurrency,
  formatDelta,
  formatNumber,
  movementDelta,
  relativeTime,
} from '../utils/format.js';

function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">
        <Icon size={20} />
      </span>
      <div>
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {hint && <p className="stat-card__hint">{hint}</p>}
      </div>
    </article>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.flatMap((day) => [day.in, day.out]));

  return (
    <div className="trend">
      <div className="trend__legend">
        <span>
          <i className="legend-dot legend-dot--in" /> Stock in
        </span>
        <span>
          <i className="legend-dot legend-dot--out" /> Stock out
        </span>
      </div>
      <div className="trend__chart">
        {trend.map((day) => (
          <div className="trend__day" key={day.date}>
            <div className="trend__bars">
              <div
                className="trend__bar trend__bar--in"
                style={{ height: `${Math.max(3, (day.in / max) * 100)}%` }}
                title={`${day.in} units received on ${day.date}`}
              />
              <div
                className="trend__bar trend__bar--out"
                style={{ height: `${Math.max(3, (day.out / max) * 100)}%` }}
                title={`${day.out} units shipped on ${day.date}`}
              />
            </div>
            <span className="trend__label">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const summary = data?.summary;
  const maxCategoryValue = Math.max(1, ...(data?.categoryBreakdown || []).map((item) => item.value));

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}`}
        title="Inventory overview"
        description="A live snapshot of stock levels, value and recent warehouse activity."
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <Link to="/products" className="btn btn--primary">
              <Boxes size={16} /> Manage products
            </Link>
          </>
        }
      />

      {error && (
        <div className="alert alert--danger">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="card">
          <Spinner label="Loading dashboard…" />
        </div>
      ) : (
        summary && (
          <>
            <section className="stat-grid">
              <StatCard
                icon={Boxes}
                label="Active products"
                value={formatNumber(summary.products)}
                hint={`${summary.categories} categories · ${summary.suppliers} suppliers`}
                tone="brand"
              />
              <StatCard
                icon={PackageCheck}
                label="Units on hand"
                value={formatNumber(summary.units)}
                hint="Across all active SKUs"
                tone="info"
              />
              <StatCard
                icon={CircleDollarSign}
                label="Inventory cost value"
                value={formatCurrency(summary.stockValue)}
                hint={`${formatCurrency(summary.potentialMargin)} potential margin`}
                tone="success"
              />
              <StatCard
                icon={AlertTriangle}
                label="Needs attention"
                value={formatNumber(summary.lowStock + summary.outOfStock)}
                hint={`${summary.lowStock} low · ${summary.outOfStock} out of stock`}
                tone="warning"
              />
            </section>

            <div className="dashboard-grid">
              <section className="card card--chart">
                <div className="card__head">
                  <div>
                    <h2>Stock flow</h2>
                    <p>Units received and shipped over the last 7 days</p>
                  </div>
                  <Badge tone="brand" dot>
                    Live
                  </Badge>
                </div>
                <TrendChart trend={data.trend} />
              </section>

              <section className="card">
                <div className="card__head">
                  <div>
                    <h2>Stock value by category</h2>
                    <p>Where your inventory capital is tied up</p>
                  </div>
                  <Link to="/categories" className="link-sm">
                    View all
                  </Link>
                </div>

                {data.categoryBreakdown.length === 0 ? (
                  <EmptyState
                    title="No categories yet"
                    message="Add products with categories to see the value breakdown."
                  />
                ) : (
                  <ul className="category-bars">
                    {data.categoryBreakdown.map((category) => (
                      <li key={category.name}>
                        <div className="category-bars__row">
                          <span className="category-bars__name">
                            <i style={{ background: category.color }} /> {category.name}
                          </span>
                          <span>{formatCurrency(category.value)}</span>
                        </div>
                        <div className="progress">
                          <span
                            style={{
                              width: `${Math.max(3, (category.value / maxCategoryValue) * 100)}%`,
                              background: category.color,
                            }}
                          />
                        </div>
                        <p className="category-bars__meta">
                          {category.products} products · {formatNumber(category.units)} units
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="dashboard-grid">
              <section className="card">
                <div className="card__head">
                  <div>
                    <h2>Low stock alerts</h2>
                    <p>SKUs at or below their reorder level</p>
                  </div>
                  <Link to="/products?status=low" className="link-sm">
                    View all
                  </Link>
                </div>

                {data.lowStock.length === 0 ? (
                  <EmptyState
                    icon={PackageCheck}
                    title="Every shelf is stocked"
                    message="No products are below their reorder level right now."
                  />
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>On hand</th>
                          <th>Reorder at</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lowStock.map((product) => (
                          <tr key={product._id}>
                            <td>
                              <div className="cell-product">
                                <span
                                  className="cell-product__dot"
                                  style={{ background: product.category?.color || '#94a3b8' }}
                                />
                                <div>
                                  <Link to={`/products?search=${encodeURIComponent(product.sku)}`}>
                                    {product.name}
                                  </Link>
                                  <span>{product.sku}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <StockBadge status={product.stockStatus} quantity={product.quantity} unit={product.unit} />
                            </td>
                            <td>{product.reorderLevel}</td>
                            <td>
                              <Badge tone={product.stockStatus === 'out' ? 'danger' : 'warning'} dot>
                                {product.stockStatus === 'out' ? 'Reorder now' : 'Reorder soon'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="card">
                <div className="card__head">
                  <div>
                    <h2>Top stock value</h2>
                    <p>Products tying up the most working capital</p>
                  </div>
                </div>

                {data.topProducts.length === 0 ? (
                  <EmptyState title="No products yet" message="Add your first product to get started." />
                ) : (
                  <ul className="top-list">
                    {data.topProducts.map((product, index) => (
                      <li key={product._id}>
                        <span className="top-list__rank">{index + 1}</span>
                        <div className="top-list__main">
                          <p>{product.name}</p>
                          <span>
                            {product.sku} · {formatNumber(product.quantity)} {product.unit}
                          </span>
                        </div>
                        <strong>{formatCurrency(product.stockValue)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="card">
              <div className="card__head">
                <div>
                  <h2>Recent activity</h2>
                  <p>The latest stock movements recorded by your team</p>
                </div>
                <Link to="/movements" className="link-sm">
                  Full ledger
                </Link>
              </div>

              {data.recentMovements.length === 0 ? (
                <EmptyState
                  title="No movements yet"
                  message="Record a receipt or sale to start building your audit trail."
                />
              ) : (
                <ul className="activity">
                  {data.recentMovements.map((movement) => {
                    const meta = MOVEMENT_META[movement.type] || MOVEMENT_META.ADJUST;
                    return (
                      <li key={movement._id}>
                        <span className={`activity__icon activity__icon--${movement.type.toLowerCase()}`}>
                          {movement.type === 'IN' ? (
                            <ArrowDownRight size={17} />
                          ) : movement.type === 'OUT' ? (
                            <ArrowUpRight size={17} />
                          ) : (
                            <TrendingUp size={17} />
                          )}
                        </span>
                        <div className="activity__body">
                          <p>
                            <strong>{formatDelta(movementDelta(movement))}</strong> {movement.productName}{' '}
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </p>
                          <span>
                            {movement.performedByName} · {relativeTime(movement.createdAt)} ·{' '}
                            {movement.previousQty} → {movement.newQty}
                          </span>
                        </div>
                        <span className="activity__ref">{movement.reference || '—'}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {summary.outOfStock > 0 && (
              <div className="alert alert--warning">
                <PackageX size={18} />
                <span>
                  <strong>{summary.outOfStock}</strong> product
                  {summary.outOfStock === 1 ? ' is' : 's are'} completely out of stock.{' '}
                  <Link to="/products?status=out">Review and reorder</Link>.
                </span>
              </div>
            )}

            <div className="quick-links">
              <Link to="/movements" className="quick-link">
                <span className="quick-link__icon">
                  <ShoppingCart size={18} />
                </span>
                <div>
                  <p>Record a stock movement</p>
                  <span>Receipts, sales and cycle counts</span>
                </div>
              </Link>
              <Link to="/suppliers" className="quick-link">
                <span className="quick-link__icon">
                  <PackageCheck size={18} />
                </span>
                <div>
                  <p>Manage suppliers</p>
                  <span>Keep purchasing contacts current</span>
                </div>
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
}
