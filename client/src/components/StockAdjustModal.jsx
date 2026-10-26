import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, Loader2, Scale } from 'lucide-react';
import Modal from './Modal.jsx';
import api from '../api/client.js';
import { REASONS } from '../utils/format.js';

const TYPES = [
  { value: 'IN', label: 'Stock in', icon: ArrowDownToLine, hint: 'Receive from a supplier' },
  { value: 'OUT', label: 'Stock out', icon: ArrowUpFromLine, hint: 'Fulfil a sale or usage' },
  { value: 'ADJUST', label: 'Stock count', icon: Scale, hint: 'Set the exact counted amount' },
];

const DEFAULT_REASON = { IN: 'purchase', OUT: 'sale', ADJUST: 'correction' };

export default function StockAdjustModal({ open, product = null, products = [], onClose, onSaved }) {
  const [selectedId, setSelectedId] = useState(product?._id || '');
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('purchase');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const active = product || products.find((item) => item._id === selectedId) || null;

  useEffect(() => {
    if (!open) return;
    setSelectedId(product?._id || '');
    setType('IN');
    setQuantity('1');
    setReason('purchase');
    setReference('');
    setNote('');
    setError('');
  }, [open, product?._id]);

  const changeType = (nextType) => {
    setType(nextType);
    setReason(DEFAULT_REASON[nextType]);
    if (nextType === 'ADJUST') setQuantity(String(active?.quantity ?? 0));
    else setQuantity('1');
  };

  const projected = useMemo(() => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount)) return active?.quantity ?? 0;
    if (type === 'IN') return (active?.quantity || 0) + amount;
    if (type === 'OUT') return (active?.quantity || 0) - amount;
    return amount;
  }, [type, quantity, active]);

  const invalidOut = type === 'OUT' && projected < 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!active) {
      setError('Choose a product first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/movements', {
        productId: active._id,
        type,
        quantity: Number(quantity),
        reason,
        reference,
        note,
      });
      onSaved?.(data.movement, data.message, data.product);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = type === 'IN' ? 'Add stock' : type === 'OUT' ? 'Remove stock' : 'Set stock level';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record stock movement"
      subtitle={active ? `${active.name} · ${active.sku}` : 'Receive, ship or recount a product'}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            form="movement-form"
            className="btn btn--primary"
            disabled={busy || invalidOut || !active}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="spin" /> Recording…
              </>
            ) : (
              actionLabel
            )}
          </button>
        </>
      }
    >
      <form id="movement-form" onSubmit={handleSubmit} className="movement-form">
        {error && (
          <div className="alert alert--danger" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!product && (
          <label className="field">
            <span>Product *</span>
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setQuantity(type === 'ADJUST' ? '0' : '1');
              }}
              required
            >
              <option value="">Select a product…</option>
              {products.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} ({item.sku}) — {item.quantity} {item.unit}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="movement-product">
          <div>
            <p>Current stock</p>
            <strong>
              {active?.quantity ?? 0} <span>{active?.unit || 'pcs'}</span>
            </strong>
          </div>
          <div className="movement-product__arrow">→</div>
          <div>
            <p>After this movement</p>
            <strong className={projected < 0 ? 'text-danger' : ''}>
              {active ? projected : 0} <span>{active?.unit || 'pcs'}</span>
            </strong>
          </div>
          <div>
            <p>Reorder level</p>
            <strong>{active?.reorderLevel ?? 0}</strong>
          </div>
        </div>

        <div className="segment">
          {TYPES.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              className={`segment__item ${type === value ? 'is-active' : ''}`}
              onClick={() => changeType(value)}
            >
              <Icon size={18} />
              <span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>{type === 'ADJUST' ? 'Counted quantity *' : 'Quantity *'}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Reason</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Reference</span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="PO-1042 / SO-2087"
            />
          </label>

          <label className="field form-grid__full">
            <span>Note</span>
            <textarea
              rows="2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional context for the audit trail"
            />
          </label>
        </div>

        {invalidOut && (
          <p className="inline-error">
            Only {active?.quantity ?? 0} {active?.unit || 'pcs'} available — remove {active?.quantity ?? 0} or less.
          </p>
        )}

        {type === 'ADJUST' && (
          <p className="hint">
            A stock count sets the on-hand quantity to the number entered and records the difference in the ledger.
          </p>
        )}
      </form>
    </Modal>
  );
}
