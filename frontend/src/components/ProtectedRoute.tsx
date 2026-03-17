import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
    requiredRole?: 'user' | 'admin';
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        // If an admin attempts to access a student route (rare), or student attempts admin
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>⛔</div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '18px' }}>
                    You do not have permission to access {requiredRole === 'admin' ? 'administrative' : 'student'} features.
                </p>
                <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="btn-primary" 
                    style={{ padding: '12px 32px' }}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;