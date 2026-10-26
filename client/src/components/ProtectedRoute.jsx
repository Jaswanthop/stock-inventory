import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './Loaders.jsx';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="forbidden">
        <h1>Access restricted</h1>
        <p>Your role ({user.role}) does not have permission to view this page.</p>
      </div>
    );
  }

  return <Outlet />;
}
