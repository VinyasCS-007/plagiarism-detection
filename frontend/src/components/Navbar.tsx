import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="nav-shell glass">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <div className="brand-icon">P</div>
          <span className="brand-name text-gradient">PlagDetect</span>
        </Link>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={`btn-secondary nav-chip ${isActive('/dashboard') ? 'nav-link-active' : ''}`}>Dashboard</Link>
              <Link to="/upload" className={`btn-secondary nav-chip ${isActive('/upload') ? 'nav-link-active' : ''}`}>Upload Report</Link>
              {isAdmin && (
                <>
                  <Link to="/ai-check" className={`btn-secondary nav-chip ${isActive('/ai-check') ? 'nav-link-active' : ''}`}>Plagiarism Check</Link>
                  <Link to="/admin" className={`btn-secondary nav-chip ${isActive('/admin') ? 'nav-link-active' : ''}`}>Admin</Link>
                </>
              )}
              <button className="btn-secondary nav-chip" style={{ color: 'var(--error)' }} onClick={() => { logout(); window.location.href = '/'; }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={`btn-secondary nav-chip ${isActive('/login') ? 'nav-link-active' : ''}`}>Login</Link>
              <Link to="/register" className={`btn-primary nav-chip ${isActive('/register') ? 'nav-link-active' : ''}`}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
