import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

interface Metrics {
    num_batches: number;
    num_documents: number;
}

interface Submission {
    batch_id: string;
    total_docs: number;
    status: string;
    status_label: string;
}

interface AdminBatch {
    batch_id: string;
    student_email: string;
    student_name: string;
    total_docs: number;
    status: string;
    analysis_type: string;
}

const AnimatedNumber = ({ value }: { value: number }) => {
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, latest => Math.round(latest * 10) / 10);
    const [display, setDisplay] = useState('0');

    useEffect(() => {
        const controls = animate(motionValue, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
        const unsubscribe = rounded.on('change', (v) => setDisplay(v.toString()));
        return () => {
            controls.stop();
            unsubscribe();
        };
    }, [value, motionValue, rounded]);

    return <motion.span>{display}</motion.span>;
};

const DashboardPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [adminBatches, setAdminBatches] = useState<AdminBatch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [analyzingBatchId, setAnalyzingBatchId] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        const fetchMetrics = async () => {
            try {
                const response = await fetch('/api/users/me/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setMetrics(data.data);
            } catch (e: any) {
                setError(e.message);
            }
        };

        const fetchSubmissions = async () => {
            try {
                const response = await fetch('/api/v1/my-submissions', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch submissions');
                const data = await response.json();
                setSubmissions(data.data);
            } catch (e: any) {
                setError(e.message);
            }
        };

        const fetchAdminBatches = async () => {
            try {
                const response = await fetch('/api/v1/admin/batches', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch batches');
                const data = await response.json();
                setAdminBatches(data.data);
            } catch (e: any) {
                setError(e.message);
            }
        };

        fetchMetrics();
        if (isAdmin) {
            fetchAdminBatches();
        } else {
            fetchSubmissions();
        }
    }, [isAdmin]);

    const handleRunCheck = async (batchId: string) => {
        setAnalyzingBatchId(batchId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/analyze-batch/${batchId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: '{"provider": "local", "check_plagiarism": true, "check_ai": false}',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to start analysis');
            }
            alert('Plagiarism check started! Refresh dashboard to see updated status.');
            // Refresh batches
            const refreshResponse = await fetch('/api/v1/admin/batches', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setAdminBatches(data.data);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setAnalyzingBatchId(null);
        }
    };

    const getStatusBadge = (status: string, label?: string) => {
        const map: Record<string, string> = {
            submitted: 'submitted',
            queued: 'queued',
            completed: 'completed',
            failed: 'failed',
            pending: 'pending',
            processing: 'queued',
        };
        const key = map[status] || 'pending';
        return (
            <span className={`status-badge status-${key}`}>
                {label || status}
            </span>
        );
    };

    const avg = metrics ? (metrics.num_documents / metrics.num_batches || 0) : 0;
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

    return (
        <div className="dashboard-shell">
            <motion.div className="container fade-in" variants={containerVariants} initial="hidden" animate="show">
                <motion.section className="dashboard-hero glass glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div>
                        <div className="pill">
                            <span className="dot"></span>
                            {isAdmin ? 'Faculty Command' : 'Student Console'}
                        </div>
                        <h1 className="dashboard-title">
                            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
                        </h1>
                        <p className="dashboard-subtitle">
                            {isAdmin
                                ? 'Monitor every submission and orchestrate integrity checks across your cohorts.'
                                : 'Track your submissions and review integrity status in real time.'}
                        </p>
                        <div className="hero-actions">
                            <Link to="/upload" className="btn-primary">
                                {isAdmin ? 'Upload & Analyze' : 'Upload Report'}
                            </Link>
                            <Link to="/dashboard" className="btn-ghost">
                                Refresh Overview
                            </Link>
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <div className="panel-title">Live Summary</div>
                        <div className="panel-grid">
                            <div className="panel-metric">
                                <span className="metric-label">{isAdmin ? 'Total Submissions' : 'My Submissions'}</span>
                                <span className="metric-value"><AnimatedNumber value={metrics?.num_batches || 0} /></span>
                            </div>
                            <div className="panel-metric">
                                <span className="metric-label">Documents Uploaded</span>
                                <span className="metric-value"><AnimatedNumber value={metrics?.num_documents || 0} /></span>
                            </div>
                            <div className="panel-metric">
                                <span className="metric-label">Avg. per Batch</span>
                                <span className="metric-value"><AnimatedNumber value={avg} /></span>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {error && (
                    <motion.div className="panel error" variants={itemVariants}>
                        <strong>Heads up:</strong> {error}
                    </motion.div>
                )}

                <motion.div className="stat-grid" variants={itemVariants}>
                    {[
                        { label: isAdmin ? 'Total Submissions' : 'My Submissions', value: metrics?.num_batches || 0 },
                        { label: 'Documents Uploaded', value: metrics?.num_documents || 0 },
                        { label: 'Avg. per Batch', value: avg }
                    ].map((stat) => (
                        <motion.div
                            key={stat.label}
                            className="stat-tile tilt-card glow-card parallax-card"
                            variants={itemVariants}
                            whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
                            onMouseMove={handleParallax}
                            onMouseLeave={handleParallaxLeave}
                        >
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-number"><AnimatedNumber value={Number(stat.value)} /></div>
                        </motion.div>
                    ))}
                </motion.div>

                {isAdmin && (
                    <motion.div className="panel glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                        <div className="panel-header">
                            <h2 className="display-font" style={{ fontSize: '24px' }}>Student Submissions</h2>
                            <Link to="/upload" className="btn-primary">+ Upload & Analyze</Link>
                        </div>

                        {adminBatches.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Docs</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminBatches.map(batch => (
                                            <tr key={batch.batch_id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{batch.student_name}</div>
                                                    <div className="muted" style={{ fontSize: '12px' }}>{batch.student_email}</div>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{batch.total_docs}</td>
                                                <td>{getStatusBadge(batch.status)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {(batch.status === 'submitted' || batch.status === 'pending') && (
                                                            <button
                                                                onClick={() => handleRunCheck(batch.batch_id)}
                                                                disabled={analyzingBatchId === batch.batch_id}
                                                                className="btn-primary"
                                                                style={{ padding: '8px 16px', fontSize: '12px' }}
                                                            >
                                                                {analyzingBatchId === batch.batch_id ? 'Starting...' : 'Run Check'}
                                                            </button>
                                                        )}
                                                        {batch.status === 'completed' && (
                                                            <Link
                                                                to={`/batch/${batch.batch_id}`}
                                                                className="btn-secondary"
                                                                style={{ padding: '8px 16px', fontSize: '12px' }}
                                                            >
                                                                View Report
                                                            </Link>
                                                        )}
                                                        {batch.status === 'queued' && (
                                                            <span className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>
                                                                Processing...
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="muted" style={{ textAlign: 'center', padding: '40px' }}>
                                No student submissions yet.
                            </p>
                        )}
                    </motion.div>
                )}

                {!isAdmin && (
                    <motion.div className="panel glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                        <div className="panel-header">
                            <h2 className="display-font" style={{ fontSize: '24px' }}>My Submissions</h2>
                            <Link to="/upload" className="btn-primary">+ Upload Report</Link>
                        </div>

                        {submissions.length > 0 ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {submissions.map(sub => (
                                    <div key={sub.batch_id} className="submission-card card-hover">
                                        <div>
                                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                Submission #{sub.batch_id.substring(0, 8)}...
                                            </p>
                                            <p className="muted" style={{ fontSize: '13px' }}>
                                                {sub.total_docs} document{sub.total_docs !== 1 ? 's' : ''} uploaded
                                            </p>
                                        </div>
                                        {getStatusBadge(sub.status, sub.status_label)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No submissions yet</p>
                                <p className="muted" style={{ marginBottom: '24px' }}>Upload your first project report to get started.</p>
                                <Link to="/upload" className="btn-primary btn-lg">
                                    Upload Report
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}

                <motion.div className="action-grid" variants={itemVariants}>
                    <Link to="/upload" className="action-card card-hover tilt-card glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                        <div className="action-icon">UP</div>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                                {isAdmin ? 'Upload & Analyze' : 'Upload Project Report'}
                            </h3>
                            <p className="muted" style={{ fontSize: '14px' }}>
                                {isAdmin ? 'Upload docs for plagiarism analysis' : 'Submit your project report for review'}
                            </p>
                        </div>
                    </Link>
                    <Link to="/" className="action-card card-hover tilt-card glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                        <div className="action-icon">OS</div>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                                Integrity Overview
                            </h3>
                            <p className="muted" style={{ fontSize: '14px' }}>
                                See how the integrity suite fits into your academic workflow.
                            </p>
                        </div>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default DashboardPage;
