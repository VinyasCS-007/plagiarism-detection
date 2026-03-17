import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
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

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) throw new Error('Registration failed');
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (success) {
        return (
            <div className="auth-shell">
                <motion.div className="container" style={{ display: 'grid', placeItems: 'center' }} variants={containerVariants} initial="hidden" animate="show">
                    <motion.div className="auth-card glass" style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }} variants={itemVariants}>
                        <div className="auth-chip" style={{ margin: '0 auto 16px' }}>Success</div>
                        <h2 className="display-font" style={{ fontSize: '32px', marginBottom: '12px' }}>Account Created</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                            You can now sign in and start monitoring submissions.
                        </p>
                        <div className="auth-success" style={{ marginBottom: '24px' }}>
                            Your access is ready. Launch the dashboard to see your first batch.
                        </div>
                        <Link to="/login" className="btn-primary btn-lg" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                            Go to Login
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="auth-shell">
            <motion.div className="container auth-grid" variants={containerVariants} initial="hidden" animate="show">
                <motion.div className="auth-panel glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div className="pill">
                        <span className="dot"></span>
                        New Account
                    </div>
                    <h1 className="auth-hero">Build a modern integrity workspace</h1>
                    <p className="auth-copy">
                        Spin up a polished portal for your class. Upload, analyze, and export reports with zero friction.
                    </p>
                    <ul className="auth-list">
                        <li><span className="text-gradient">✓</span> Instant access to submissions and report exports</li>
                        <li><span className="text-gradient">✓</span> Smart queueing for plagiarism and AI checks</li>
                        <li><span className="text-gradient">✓</span> Secure audit trails for every analysis</li>
                    </ul>
                    <div className="auth-footer">Already a member? <Link to="/login">Sign in here</Link></div>
                </motion.div>

                <motion.div className="auth-card glass glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div className="auth-header">
                        <div className="auth-chip">Create Account</div>
                        <h2 className="display-font" style={{ fontSize: '28px' }}>Launch your integrity suite</h2>
                        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
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

                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary btn-lg btn-block">
                            Create Account
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
