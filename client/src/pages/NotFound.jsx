import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="not-found">
      <span className="not-found__icon">
        <Compass size={30} />
      </span>
      <p className="not-found__code">404</p>
      <h1>This shelf is empty</h1>
      <p>The page you were looking for does not exist or has moved.</p>
      <Link to="/" className="btn btn--primary">
        Back to dashboard
      </Link>
    </div>
  );
}
