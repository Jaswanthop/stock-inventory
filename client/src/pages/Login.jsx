import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, BarChart3, Boxes, Eye, EyeOff, Loader2, Package, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const HIGHLIGHTS = [
  { icon: Boxes, title: 'Live stock ledger', text: 'Every receipt, sale and count adjustment is logged with a full audit trail.' },
  { icon: BarChart3, title: 'Clear analytics', text: 'Inventory value, stock health and 7-day movement trends at a glance.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Admins, managers and staff each see exactly what they need.' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <div className="auth-showcase__brand">
          <span className="brand-mark brand-mark--lg">
            <Package size={26} />
          </span>
          <div>
            <p className="auth-showcase__name">StockPilot</p>
            <p className="auth-showcase__tag">Inventory &amp; stock management</p>
          </div>
        </div>

        <div className="auth-showcase__copy">
          <h1>Know exactly what you have, where it is, and when to reorder.</h1>
          <p>
            StockPilot keeps your products, suppliers and stock movements in one tidy workspace so your
            team can stop guessing and start shipping.
          </p>
        </div>

        <ul className="auth-highlights">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="auth-highlights__icon">
                <Icon size={19} />
              </span>
              <div>
                <p>{title}</p>
                <span>{text}</span>
              </div>
            </li>
          ))}
        </ul>

        <p className="auth-showcase__foot">
          React · Node.js · Express · MongoDB · deployed on Render
        </p>
      </section>

      <section className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card__head">
            <span className="auth-card__badge">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Use your StockPilot account to manage inventory.</p>
          </div>

          {error && (
            <div className="alert alert--danger" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-with-action">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={17} className="spin" /> Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>

          {import.meta.env.DEV && (
            <div className="auth-demo">
              <p>Local demo credentials</p>
              <code>admin@stockpilot.dev</code>
              <code>Admin@12345</code>
            </div>
          )}

          <p className="auth-card__foot">
            New team members are invited by an administrator from the <strong>Team</strong> page.
          </p>
        </form>
      </section>
    </div>
  );
}
