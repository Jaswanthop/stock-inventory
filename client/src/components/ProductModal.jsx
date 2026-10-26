import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import api from '../api/client.js';

const EMPTY = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  quantity: '0',
  reorderLevel: '10',
  costPrice: '0',
  unitPrice: '0',
  unit: 'pcs',
  location: '',
  description: '',
};

export default function ProductModal({ open, product, categories, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(product);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category?._id || product.category || '',
        supplier: product.supplier?._id || product.supplier || '',
        quantity: String(product.quantity ?? 0),
        reorderLevel: String(product.reorderLevel ?? 0),
        costPrice: String(product.costPrice ?? 0),
        unitPrice: String(product.unitPrice ?? 0),
        unit: product.unit || 'pcs',
        location: product.location || '',
        description: product.description || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, product]);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        category: form.category || null,
        supplier: form.supplier || null,
        quantity: Number(form.quantity),
        reorderLevel: Number(form.reorderLevel),
        costPrice: Number(form.costPrice),
        unitPrice: Number(form.unitPrice),
      };

      if (isEdit) {
        delete payload.quantity; // quantity changes go through the stock ledger
        const { data } = await api.put(`/products/${product._id}`, payload);
        onSaved?.(data.product, data.message);
      } else {
        const { data } = await api.post('/products', payload);
        onSaved?.(data.product, data.message);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'New product'}
      subtitle={isEdit ? `Update details for ${product?.name}` : 'Add a SKU to your inventory catalogue'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn btn--primary" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={16} className="spin" /> Saving…
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create product'
            )}
          </button>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert--danger form-grid__full" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <label className="field form-grid__full">
          <span>Product name *</span>
          <input value={form.name} onChange={update('name')} placeholder="e.g. Wireless Mouse Pro" required />
        </label>

        <label className="field">
          <span>SKU *</span>
          <input
            value={form.sku}
            onChange={update('sku')}
            placeholder="EL-MO-1001"
            required
            style={{ textTransform: 'uppercase' }}
          />
        </label>

        <label className="field">
          <span>Unit of measure</span>
          <input value={form.unit} onChange={update('unit')} placeholder="pcs" />
        </label>

        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={update('category')}>
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Supplier</span>
          <select value={form.supplier} onChange={update('supplier')}>
            <option value="">No supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Opening quantity {isEdit && <em>(use stock ledger)</em>}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={update('quantity')}
            disabled={isEdit}
            required
          />
        </label>

        <label className="field">
          <span>Reorder level</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.reorderLevel}
            onChange={update('reorderLevel')}
            required
          />
        </label>

        <label className="field">
          <span>Cost price (USD)</span>
          <input type="number" min="0" step="0.01" value={form.costPrice} onChange={update('costPrice')} />
        </label>

        <label className="field">
          <span>Selling price (USD)</span>
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={update('unitPrice')} />
        </label>

        <label className="field">
          <span>Storage location</span>
          <input value={form.location} onChange={update('location')} placeholder="A1-01" />
        </label>

        <label className="field form-grid__full">
          <span>Description</span>
          <textarea
            rows="3"
            value={form.description}
            onChange={update('description')}
            placeholder="Optional notes about this product"
          />
        </label>
      </form>
    </Modal>
  );
}
