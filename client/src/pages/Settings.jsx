import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Server, ShieldCheck, UserRound } from 'lucide-react';
import api from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_META, formatDate } from '../utils/format.js';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then(({ data }) => setHealth(data))
      .catch(() => setHealth({ status: 'unreachable', database: 'unknown' }));
  }, []);

  const roleMeta = ROLE_META[user?.role] || ROLE_META.staff;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setBusy(true);
    try {
      await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed', 'Use your new password the next time you sign in.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, password and workspace diagnostics."
      />

      <div className="settings-grid">
        <section className="card">
          <div className="card__head">
            <div>
              <h2>Your profile</h2>
              <p>Account details for this session</p>
            </div>
            <UserRound size={20} className="muted" />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{user?.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleMeta.label}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(user?.createdAt)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="inline-status">
                <CheckCircle2 size={15} /> Active
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h2>Change password</h2>
              <p>Choose something you have not used elsewhere</p>
            </div>
            <KeyRound size={20} className="muted" />
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert--danger form-grid__full">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <label className="field form-grid__full">
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.newPassword}
                onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </label>

            <div className="form-grid__full form-actions">
              <p className="hint">Minimum 8 characters. You will stay signed in on this device.</p>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={16} className="spin" /> Updating…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h2>System status</h2>
              <p>Live diagnostics for this deployment</p>
            </div>
            <Server size={20} className="muted" />
          </div>
          <dl className="detail-list">
            <div>
              <dt>API</dt>
              <dd className="inline-status">
                <span className={`health-dot ${health?.status === 'ok' ? 'is-ok' : 'is-bad'}`} />
                {health ? (health.status === 'ok' ? 'Operational' : 'Unreachable') : 'Checking…'}
              </dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{health?.database || 'Checking…'}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{health ? `${Math.floor((health.uptime || 0) / 60)} min ${Math.round((health.uptime || 0) % 60)} s` : '—'}</dd>
            </div>
            <div>
              <dt>Stack</dt>
              <dd>React · Node.js · Express · MongoDB</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <div className="card__head">
            <div>
              <h2>About StockPilot</h2>
              <p>Inventory &amp; stock management system</p>
            </div>
            <ShieldCheck size={20} className="muted" />
          </div>
          <p className="about-copy">
            StockPilot is a full-stack demo application. Products, categories, suppliers, stock movements and
            team accounts are stored in MongoDB; the API and React build are served together from a single
            Render web service.
          </p>
          <p className="hint">
            Version 1.0.0 · Data you create here is persisted in your own MongoDB Atlas cluster.
          </p>
        </section>
      </div>
    </div>
  );
}
