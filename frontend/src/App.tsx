import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthProvider';

const LandingPage = lazy(() => import('./components/LandingPage'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const UploadForm = lazy(() => import('./components/UploadForm'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const BatchResultsPage = lazy(() => import('./components/BatchResultsPage'));

function App() {
  const location = useLocation();
  const pageVariants = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  };
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <div>
          <Suspense
            fallback={
              <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading experience...</p>
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                className="route-view"
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Routes location={location}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  {/* Protected routes for all authenticated users */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/upload" element={<UploadForm />} />
                  </Route>
                  {/* Admin-only routes */}
                  <Route element={<ProtectedRoute requiredRole="admin" />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/batch/:batchId" element={<BatchResultsPage />} />
                  </Route>
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
