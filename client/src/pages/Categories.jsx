import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Palette, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import api from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Spinner } from '../components/Loaders.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency, formatNumber } from '../utils/format.js';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

const EMPTY = { name: '', description: '', color: COLORS[0] };

export default function Categories() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ open: false, category: null, values: EMPTY, error: '', busy: false });
  const [deleting, setDeleting] = useState({ open: false, category: null, busy: false });

  const canEdit = ['admin', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/categories');
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setForm({ open: true, category: null, values: EMPTY, error: '', busy: false });

  const openEdit = (category) =>
    setForm({
      open: true,
      category,
      values: {
        name: category.name,
        description: category.description || '',
        color: category.color || COLORS[0],
      },
      error: '',
      busy: false,
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setForm((current) => ({ ...current, busy: true, error: '' }));
    try {
      if (form.category) {
        await api.put(`/categories/${form.category._id}`, form.values);
        toast.success('Category updated', `"${form.values.name}" has been saved.`);
      } else {
        await api.post('/categories', form.values);
        toast.success('Category created', `"${form.values.name}" is ready to use.`);
      }
      setForm((current) => ({ ...current, open: false, busy: false }));
      load();
    } catch (err) {
      setForm((current) => ({ ...current, busy: false, error: err.message }));
    }
  };

  const confirmDelete = async () => {
    setDeleting((current) => ({ ...current, busy: true }));
    try {
      await api.delete(`/categories/${deleting.category._id}`, { params: { force: true } });
      toast.success('Category deleted', 'Its products are now uncategorised.');
      setDeleting({ open: false, category: null, busy: false });
      load();
    } catch (err) {
      toast.error('Could not delete category', err.message);
      setDeleting((current) => ({ ...current, busy: false }));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Organisation"
        title="Categories"
        description="Group products so stock reporting stays meaningful."
        actions={
          canEdit && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              <Plus size={16} /> New category
            </button>
          )
        }
      />

      {error && (
        <div className="alert alert--danger">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card">
          <Spinner label="Loading categories…" />
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Tags}
            title="No categories yet"
            message="Categories make it easy to filter products and understand where stock value sits."
            action={
              canEdit && (
                <button type="button" className="btn btn--primary" onClick={openCreate}>
                  <Plus size={16} /> Create your first category
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="category-grid">
          {items.map((category) => (
            <article key={category._id} className="category-card">
              <header className="category-card__head">
                <span className="category-card__badge" style={{ background: `${category.color}1a`, color: category.color }}>
                  <Tags size={18} />
                </span>
                <div className="row-actions">
                  {canEdit && (
                    <button type="button" className="icon-btn" onClick={() => openEdit(category)} title="Edit category">
                      <Pencil size={15} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => setDeleting({ open: true, category, busy: false })}
                      title="Delete category"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </header>

              <h3>{category.name}</h3>
              <p className="category-card__description">{category.description || 'No description yet.'}</p>

              <div className="category-card__stats">
                <div>
                  <span>Products</span>
                  <strong>{formatNumber(category.productCount)}</strong>
                </div>
                <div>
                  <span>Units</span>
                  <strong>{formatNumber(category.totalUnits)}</strong>
                </div>
                <div>
                  <span>Value</span>
                  <strong>{formatCurrency(category.stockValue)}</strong>
                </div>
              </div>

              <div className="category-card__bar">
                <span style={{ background: category.color }} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={form.open}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        title={form.category ? 'Edit category' : 'New category'}
        subtitle="Categories power the dashboard breakdown and product filters."
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setForm((current) => ({ ...current, open: false }))}
              disabled={form.busy}
            >
              Cancel
            </button>
            <button type="submit" form="category-form" className="btn btn--primary" disabled={form.busy}>
              {form.busy ? (
                <>
                  <Loader2 size={16} className="spin" /> Saving…
                </>
              ) : form.category ? (
                'Save changes'
              ) : (
                'Create category'
              )}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="form-grid">
          {form.error && (
            <div className="alert alert--danger form-grid__full">
              <AlertCircle size={16} />
              <span>{form.error}</span>
            </div>
          )}

          <label className="field form-grid__full">
            <span>Category name *</span>
            <input
              value={form.values.name}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, name: event.target.value } }))}
              placeholder="e.g. Electronics"
              required
              autoFocus
            />
          </label>

          <label className="field form-grid__full">
            <span>Description</span>
            <textarea
              rows="3"
              value={form.values.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, values: { ...current.values, description: event.target.value } }))
              }
              placeholder="What belongs in this category?"
            />
          </label>

          <div className="field form-grid__full">
            <span>
              <Palette size={14} /> Colour
            </span>
            <div className="color-picker">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-picker__swatch ${form.values.color === color ? 'is-active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm((current) => ({ ...current, values: { ...current.values, color } }))}
                  aria-label={`Use colour ${color}`}
                />
              ))}
              <input
                type="color"
                value={form.values.color}
                onChange={(event) =>
                  setForm((current) => ({ ...current, values: { ...current.values, color: event.target.value } }))
                }
                aria-label="Custom colour"
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting.open}
        title="Delete category"
        message={`Delete "${deleting.category?.name}"? ${deleting.category?.productCount || 0} product(s) will become uncategorised. This cannot be undone.`}
        confirmLabel="Delete category"
        busy={deleting.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting({ open: false, category: null, busy: false })}
      />
    </div>
  );
}
