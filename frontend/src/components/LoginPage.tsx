import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
    };
    const handleParallax = (e: React.MouseEvent<HTMLElement>) => {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rx = (0.5 - y / rect.height) * 8;
        const ry = (x / rect.width - 0.5) * 10;
        target.style.setProperty('--rx', `${rx}deg`);
        target.style.setProperty('--ry', `${ry}deg`);
        target.style.setProperty('--gx', `${(x / rect.width) * 100}%`);
        target.style.setProperty('--gy', `${(y / rect.height) * 100}%`);
    };
    const handleParallaxLeave = (e: React.MouseEvent<HTMLElement>) => {
        const target = e.currentTarget as HTMLElement;
        target.style.setProperty('--rx', '0deg');
        target.style.setProperty('--ry', '0deg');
        target.style.setProperty('--gx', '50%');
        target.style.setProperty('--gy', '50%');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/jwt/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: email,
                    password,
                    grant_type: "password"
                }),
            });

            if (!response.ok) throw new Error('Login failed');

            let data: any = null;

            if (response.status !== 204) {
                data = await response.json();
}

            login(data?.access_token || "session");
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <motion.div className="container auth-grid" variants={containerVariants} initial="hidden" animate="show">
                <motion.div className="auth-panel glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div className="pill">
                        <span className="dot"></span>
                        Secure Sign-In
                    </div>
                    <h1 className="auth-hero">Welcome back to Integrity OS</h1>
                    <p className="auth-copy">
                        Track every submission with clarity. Your dashboard is ready to light up the moment you sign in.
                    </p>
                    <ul className="auth-list">
                        <li><span className="text-gradient">✓</span> One-click access to all batch reports</li>
                        <li><span className="text-gradient">✓</span> Real-time plagiarism and AI detection updates</li>
                        <li><span className="text-gradient">✓</span> Cinema-grade reporting for faculty reviews</li>
                    </ul>
                    <div className="auth-footer">Need an account? <Link to="/register">Create one in minutes</Link></div>
                </motion.div>

                <motion.div className="auth-card glass glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div className="auth-header">
                        <div className="auth-chip">Sign In</div>
                        <h2 className="display-font" style={{ fontSize: '28px' }}>Log into your console</h2>
                        <p className="auth-footer">New here? <Link to="/register">Create an account</Link></p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary btn-lg btn-block" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="auth-divider">Or</div>
                        <Link to="/register" className="btn-secondary btn-lg btn-block">Create Account</Link>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
