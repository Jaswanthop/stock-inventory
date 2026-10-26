import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_META } from '../utils/format.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/movements', label: 'Stock movements', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
];

const ADMIN_ITEMS = [{ to: '/team', label: 'Team', icon: Users }];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/movements': 'Stock movements',
  '/categories': 'Categories',
  '/suppliers': 'Suppliers',
  '/team': 'Team',
  '/settings': 'Settings',
};

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const roleMeta = ROLE_META[user?.role] || ROLE_META.staff;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderLink = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <span className="brand-mark">
            <Package size={20} />
          </span>
          <div>
            <p className="brand-name">StockPilot</p>
            <p className="brand-sub">Inventory control</p>
          </div>
          <button
            type="button"
            className="icon-btn sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {NAV_ITEMS.map(renderLink)}

          {user?.role === 'admin' && (
            <>
              <p className="nav-label">Administration</p>
              {ADMIN_ITEMS.map(renderLink)}
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar">{initials(user?.name)}</span>
            <div className="sidebar__user-info">
              <p>{user?.name}</p>
              <span>{roleMeta.label}</span>
            </div>
          </div>
          <div className="sidebar__actions">
            <NavLink to="/settings" className="icon-btn" aria-label="Settings" title="Settings">
              <Settings size={17} />
            </NavLink>
            <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} role="presentation" />}

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              type="button"
              className="icon-btn topbar__menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="topbar__crumb">StockPilot / {PAGE_TITLES[location.pathname] || 'Workspace'}</p>
              <p className="topbar__title">{PAGE_TITLES[location.pathname] || 'Workspace'}</p>
            </div>
          </div>
          <div className="topbar__right">
            <span className="status-pill">
              <span className="status-pill__dot" /> API connected
            </span>
            <div className="topbar__user">
              <span className="avatar avatar--sm">{initials(user?.name)}</span>
              <div>
                <p>{user?.name}</p>
                <span>{roleMeta.label}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
