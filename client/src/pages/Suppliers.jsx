import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import api from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { TableSkeleton } from '../components/Loaders.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatNumber } from '../utils/format.js';

const EMPTY = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  notes: '',
};

export default function Suppliers() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ open: false, supplier: null, values: EMPTY, error: '', busy: false });
  const [deleting, setDeleting] = useState({ open: false, supplier: null, busy: false });

  const canEdit = ['admin', 'manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/suppliers');
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((supplier) =>
      [supplier.name, supplier.contactName, supplier.email, supplier.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [items, search]);

  const openCreate = () => setForm({ open: true, supplier: null, values: EMPTY, error: '', busy: false });

  const openEdit = (supplier) =>
    setForm({
      open: true,
      supplier,
      values: {
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        website: supplier.website || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      },
      error: '',
      busy: false,
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setForm((current) => ({ ...current, busy: true, error: '' }));
    try {
      if (form.supplier) {
        await api.put(`/suppliers/${form.supplier._id}`, form.values);
        toast.success('Supplier updated', `"${form.values.name}" has been saved.`);
      } else {
        await api.post('/suppliers', form.values);
        toast.success('Supplier added', `"${form.values.name}" is now in your vendor list.`);
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
      await api.delete(`/suppliers/${deleting.supplier._id}`);
      toast.success('Supplier removed', 'Linked products now have no supplier.');
      setDeleting({ open: false, supplier: null, busy: false });
      load();
    } catch (err) {
      toast.error('Could not remove supplier', err.message);
      setDeleting((current) => ({ ...current, busy: false }));
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Procurement"
        title="Suppliers"
        description="Keep vendor contacts and purchasing relationships in one place."
        actions={
          canEdit && (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              <Plus size={16} /> New supplier
            </button>
          )
        }
      />

      {items.length > 0 && (
        <div className="toolbar">
          <div className="toolbar__search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers, contacts, email…"
              aria-label="Search suppliers"
            />
            {search && (
              <button type="button" className="icon-btn" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
          <p className="toolbar__meta">
            {filtered.length} of {items.length} suppliers
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert--danger">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <section className="card card--flush">
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? Search : Truck}
            title={search ? 'No suppliers match your search' : 'No suppliers yet'}
            message={
              search
                ? 'Try a different phrase or clear the search.'
                : 'Add the vendors you buy from so products can be linked to them.'
            }
            action={
              search ? (
                <button type="button" className="btn btn--ghost" onClick={() => setSearch('')}>
                  Clear search
                </button>
              ) : (
                canEdit && (
                  <button type="button" className="btn btn--primary" onClick={openCreate}>
                    <Plus size={16} /> Add supplier
                  </button>
                )
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table table--suppliers">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Products</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr key={supplier._id}>
                    <td>
                      <div className="supplier-cell">
                        <span className="supplier-cell__avatar">
                          <Building2 size={18} />
                        </span>
                        <div>
                          <strong>{supplier.name}</strong>
                          {supplier.address ? (
                            <span>
                              <MapPin size={12} /> {supplier.address}
                            </span>
                          ) : (
                            <span>No address on file</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        {supplier.contactName && <strong>{supplier.contactName}</strong>}
                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} className="inline-link">
                            <Mail size={12} /> {supplier.email}
                          </a>
                        ) : (
                          <span className="muted">No email</span>
                        )}
                      </div>
                    </td>
                    <td className="nowrap">
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} className="inline-link">
                          <Phone size={12} /> {supplier.phone}
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <strong>{formatNumber(supplier.productCount)}</strong>
                      <span className="muted"> / {formatNumber(supplier.totalUnits)} units</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(supplier)}
                            title="Edit supplier"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            onClick={() => setDeleting({ open: true, supplier, busy: false })}
                            title="Remove supplier"
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
        )}
      </section>

      <Modal
        open={form.open}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        title={form.supplier ? 'Edit supplier' : 'New supplier'}
        subtitle="These details appear on products and purchase references."
        size="lg"
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
            <button type="submit" form="supplier-form" className="btn btn--primary" disabled={form.busy}>
              {form.busy ? (
                <>
                  <Loader2 size={16} className="spin" /> Saving…
                </>
              ) : form.supplier ? (
                'Save changes'
              ) : (
                'Add supplier'
              )}
            </button>
          </>
        }
      >
        <form id="supplier-form" className="form-grid" onSubmit={handleSubmit}>
          {form.error && (
            <div className="alert alert--danger form-grid__full">
              <AlertCircle size={16} />
              <span>{form.error}</span>
            </div>
          )}

          <label className="field form-grid__full">
            <span>Company name *</span>
            <input
              value={form.values.name}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, name: event.target.value } }))}
              placeholder="e.g. Northwind Traders"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Contact person</span>
            <input
              value={form.values.contactName}
              onChange={(event) =>
                setForm((current) => ({ ...current, values: { ...current.values, contactName: event.target.value } }))
              }
              placeholder="Priya Menon"
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.values.email}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, email: event.target.value } }))}
              placeholder="orders@supplier.com"
            />
          </label>

          <label className="field">
            <span>Phone</span>
            <input
              value={form.values.phone}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, phone: event.target.value } }))}
              placeholder="+1 415 555 0132"
            />
          </label>

          <label className="field">
            <span>Website</span>
            <input
              value={form.values.website}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, website: event.target.value } }))}
              placeholder="https://supplier.com"
            />
          </label>

          <label className="field form-grid__full">
            <span>Address</span>
            <input
              value={form.values.address}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, address: event.target.value } }))}
              placeholder="500 Market Street, San Francisco, CA"
            />
          </label>

          <label className="field form-grid__full">
            <span>Notes</span>
            <textarea
              rows="3"
              value={form.values.notes}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, notes: event.target.value } }))}
              placeholder="Lead times, payment terms, minimum order…"
            />
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting.open}
        title="Remove supplier"
        message={`Remove "${deleting.supplier?.name}"? Linked products will stay in inventory but will no longer show a supplier.`}
        confirmLabel="Remove supplier"
        busy={deleting.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting({ open: false, supplier: null, busy: false })}
      />
    </div>
  );
}
