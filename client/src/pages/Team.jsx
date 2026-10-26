import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';
import api from '../api/client.js';
import Badge from '../components/Badge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { TableSkeleton } from '../components/Loaders.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_META, formatDate } from '../utils/format.js';

const EMPTY = { name: '', email: '', password: '', role: 'staff' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Team() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ open: false, values: EMPTY, error: '', busy: false });
  const [deleting, setDeleting] = useState({ open: false, member: null, busy: false });
  const [reset, setReset] = useState({ open: false, member: null, password: '', error: '', busy: false });
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
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

  const handleCreate = async (event) => {
    event.preventDefault();
    setForm((current) => ({ ...current, busy: true, error: '' }));
    try {
      await api.post('/users', form.values);
      toast.success('Team member added', `${form.values.name} can now sign in.`);
      setForm({ open: false, values: EMPTY, error: '', busy: false });
      load();
    } catch (err) {
      setForm((current) => ({ ...current, busy: false, error: err.message }));
    }
  };

  const patchMember = async (member, payload, successMessage) => {
    setUpdatingId(member._id);
    try {
      const { data } = await api.patch(`/users/${member._id}`, payload);
      setItems((current) => current.map((item) => (item._id === member._id ? data.user : item)));
      toast.success('Team updated', successMessage);
    } catch (err) {
      toast.error('Could not update team member', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setReset((current) => ({ ...current, busy: true, error: '' }));
    try {
      await api.patch(`/users/${reset.member._id}`, { password: reset.password });
      toast.success('Password reset', `Share the new password with ${reset.member.name} privately.`);
      setReset({ open: false, member: null, password: '', error: '', busy: false });
    } catch (err) {
      setReset((current) => ({ ...current, busy: false, error: err.message }));
    }
  };

  const confirmDelete = async () => {
    setDeleting((current) => ({ ...current, busy: true }));
    try {
      await api.delete(`/users/${deleting.member._id}`);
      toast.success('Team member removed', `${deleting.member.name} no longer has access.`);
      setDeleting({ open: false, member: null, busy: false });
      load();
    } catch (err) {
      toast.error('Could not remove team member', err.message);
      setDeleting((current) => ({ ...current, busy: false }));
    }
  };

  const activeAdmins = items.filter((item) => item.role === 'admin' && item.active).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Team"
        description="Invite colleagues and control what they can do in the workspace."
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setForm({ open: true, values: EMPTY, error: '', busy: false })}
          >
            <Plus size={16} /> Add team member
          </button>
        }
      />

      <div className="alert alert--info">
        <ShieldCheck size={18} />
        <span>
          <strong>Admin</strong> can do everything · <strong>Manager</strong> manages products, categories,
          suppliers and stock · <strong>Staff</strong> records stock movements and views inventory.
        </span>
      </div>

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
          <TableSkeleton rows={4} columns={5} />
        ) : (
          <div className="table-wrap">
            <table className="table table--team">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((member) => {
                  const isSelf = member._id === currentUser?._id;
                  const roleMeta = ROLE_META[member.role] || ROLE_META.staff;
                  const isLastAdmin = member.role === 'admin' && activeAdmins <= 1;

                  return (
                    <tr key={member._id}>
                      <td>
                        <div className="member-cell">
                          <span className={`avatar ${member.active ? '' : 'avatar--muted'}`}>
                            {initials(member.name)}
                          </span>
                          <div>
                            <strong>
                              {member.name} {isSelf && <span className="you-tag">you</span>}
                            </strong>
                            <span>{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="select--compact"
                          value={member.role}
                          disabled={isSelf || updatingId === member._id}
                          onChange={(event) =>
                            patchMember(member, { role: event.target.value }, `${member.name} is now a ${event.target.value}.`)
                          }
                          aria-label={`Role for ${member.name}`}
                        >
                          <option value="admin">Administrator</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      </td>
                      <td>
                        <Badge tone={member.active ? 'success' : 'neutral'} dot>
                          {member.active ? 'Active' : 'Deactivated'}
                        </Badge>
                        <span className="role-hint">{roleMeta.label}</span>
                      </td>
                      <td className="nowrap">{formatDate(member.createdAt)}</td>
                      <td>
                        <div className="row-actions">
                          {!isSelf && (
                            <button
                              type="button"
                              className="icon-btn"
                              title={member.active ? 'Deactivate member' : 'Activate member'}
                              disabled={updatingId === member._id || (member.active && isLastAdmin)}
                              onClick={() =>
                                patchMember(
                                  member,
                                  { active: !member.active },
                                  `${member.name} was ${member.active ? 'deactivated' : 'reactivated'}.`
                                )
                              }
                            >
                              {member.active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Reset password"
                              onClick={() =>
                                setReset({ open: true, member, password: '', error: '', busy: false })
                              }
                            >
                              <KeyRound size={16} />
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              title="Remove member"
                              disabled={isLastAdmin}
                              onClick={() => setDeleting({ open: true, member, busy: false })}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={form.open}
        onClose={() => setForm((current) => ({ ...current, open: false }))}
        title="Add team member"
        subtitle="They can sign in immediately with the password you set."
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
            <button type="submit" form="member-form" className="btn btn--primary" disabled={form.busy}>
              {form.busy ? (
                <>
                  <Loader2 size={16} className="spin" /> Adding…
                </>
              ) : (
                'Add member'
              )}
            </button>
          </>
        }
      >
        <form id="member-form" className="form-grid" onSubmit={handleCreate}>
          {form.error && (
            <div className="alert alert--danger form-grid__full">
              <AlertCircle size={16} />
              <span>{form.error}</span>
            </div>
          )}

          <label className="field form-grid__full">
            <span>Full name *</span>
            <input
              value={form.values.name}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, name: event.target.value } }))}
              placeholder="Jordan Lee"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Email *</span>
            <input
              type="email"
              value={form.values.email}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, email: event.target.value } }))}
              placeholder="jordan@company.com"
              required
            />
          </label>

          <label className="field">
            <span>Role</span>
            <select
              value={form.values.role}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, role: event.target.value } }))}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <label className="field form-grid__full">
            <span>Temporary password *</span>
            <input
              type="password"
              value={form.values.password}
              onChange={(event) => setForm((current) => ({ ...current, values: { ...current.values, password: event.target.value } }))}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={reset.open}
        onClose={() => setReset({ open: false, member: null, password: '', error: '', busy: false })}
        title="Reset password"
        subtitle={reset.member ? `Set a new password for ${reset.member.name}` : ''}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setReset({ open: false, member: null, password: '', error: '', busy: false })}
              disabled={reset.busy}
            >
              Cancel
            </button>
            <button type="submit" form="reset-form" className="btn btn--primary" disabled={reset.busy}>
              {reset.busy ? (
                <>
                  <Loader2 size={16} className="spin" /> Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </>
        }
      >
        <form id="reset-form" className="form-grid" onSubmit={handleResetPassword}>
          {reset.error && (
            <div className="alert alert--danger form-grid__full">
              <AlertCircle size={16} />
              <span>{reset.error}</span>
            </div>
          )}
          <label className="field form-grid__full">
            <span>New temporary password *</span>
            <input
              type="password"
              minLength={8}
              value={reset.password}
              onChange={(event) => setReset((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 8 characters"
              required
              autoFocus
            />
          </label>
          <p className="hint form-grid__full">
            Existing sessions stay valid until they expire. The member should change this password from
            Settings after signing in.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting.open}
        title="Remove team member"
        message={`Remove ${deleting.member?.name}? They will lose access immediately. Their stock movement history stays intact.`}
        confirmLabel="Remove member"
        busy={deleting.busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting({ open: false, member: null, busy: false })}
      />
    </div>
  );
}
