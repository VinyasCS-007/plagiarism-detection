import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

const UploadForm = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [files, setFiles] = useState<File[]>([]);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const analysisType = 'plagiarism';
    const provider = 'local';
    const aiThreshold = 0.5;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);
        setBatchId(null);

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        try {
            const token = localStorage.getItem('token');

            if (isAdmin) {
                // Admin: full analysis with options
                const options = {
                    provider,
                    ai_threshold: aiThreshold,
                    check_plagiarism: analysisType === 'plagiarism' || analysisType === 'both',
                    check_ai: analysisType === 'ai' || analysisType === 'both',
                };
                formData.append('options', JSON.stringify(options));

                const response = await fetch(`/api/v1/analyze`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || 'Upload failed');
                }

                const data = await response.json();
                setBatchId(data.batch_id);
            } else {
                // Student: upload only (no analysis triggered)
                const response = await fetch(`/api/v1/upload`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || 'Upload failed');
                }

                const data = await response.json();
                setBatchId(data.batch_id);
            }

            setFiles([]);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            setFiles(Array.from(e.dataTransfer.files));
        }
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

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.12 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="page-shell">
            <motion.div className="container fade-in" variants={containerVariants} initial="hidden" animate="show">
                <motion.div className="section-header" variants={itemVariants}>
                    <h1 className="section-title">
                        {isAdmin ? 'Analyze Content' : 'Submit Project Report'}
                    </h1>
                    <p className="section-subtitle">
                        {isAdmin
                            ? 'Upload documents for plagiarism analysis with a cinematic review pipeline.'
                            : 'Submit your project report and track integrity checks in real time.'}
                    </p>
                </motion.div>

                <motion.div className="upload-panel tilt-card glow-card parallax-card" variants={itemVariants} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <form onSubmit={handleSubmit} className="auth-form">
                        {isAdmin ? (
                            <div className="upload-banner">
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>Plagiarism Analysis Enabled</p>
                                    <p className="muted" style={{ fontSize: '13px' }}>
                                        This upload runs plagiarism checks only.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="upload-banner">
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>College Project Submission</p>
                                    <p className="muted" style={{ fontSize: '13px' }}>
                                        Upload your report (PDF, DOCX, TXT). Faculty will review and run checks.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">{isAdmin ? 'Documents' : 'Project Report Files'}</label>
                            <label
                                className={`upload-drop tilt-card glow-card parallax-card ${isDragging ? 'dragging' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onMouseMove={handleParallax}
                                onMouseLeave={handleParallaxLeave}
                            >
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                                    <span className="text-gradient-primary">Select files</span> or drag & drop
                                </h3>
                                <p className="muted" style={{ fontSize: '14px' }}>
                                    Supports PDF, DOCX, TXT{isAdmin ? ', PNG, JPG, ZIP, TAR' : ''}
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    accept={isAdmin ? undefined : '.pdf,.docx,.doc,.txt'}
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        {files.length > 0 && (
                            <motion.div className="fade-in" variants={itemVariants}>
                                <div className="upload-actions">
                                    <p className="muted" style={{ fontSize: '14px', fontWeight: 600 }}>
                                        Selected Files ({files.length})
                                    </p>
                                    <button type="button" onClick={() => setFiles([])} className="btn-ghost">
                                        Clear All
                                    </button>
                                </div>
                                <div className="file-list">
                                    {files.map((file, i) => (
                                        <div key={i} className="file-row">
                                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </span>
                                            <span className="muted" style={{ fontSize: '12px' }}>
                                                {(file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <button type="submit" className="btn-primary btn-lg btn-block" disabled={files.length === 0 || isUploading}>
                            {isUploading ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#0b1120', borderRadius: '50%' }} />
                                    {isAdmin ? 'Processing...' : 'Uploading...'}
                                </span>
                            ) : isAdmin ? 'Start Deep Analysis' : 'Submit Project Report'}
                        </button>
                    </form>

                    {batchId && (
                        <motion.div className="panel" style={{ marginTop: '32px' }} variants={itemVariants}>
                            <p style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--success)', fontWeight: 700 }}>
                                {isAdmin ? 'Upload successful! Analysis in progress.' : 'Project Report Submitted Successfully!'}
                            </p>
                            <p className="muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
                                {isAdmin
                                    ? 'Results will be available on the dashboard shortly.'
                                    : 'Your report has been submitted for review. The faculty will run a plagiarism check.'}
                            </p>
                            <Link to="/dashboard" className="btn-secondary">
                                {isAdmin ? 'Go to Dashboard →' : 'View My Submissions →'}
                            </Link>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div className="panel error" style={{ marginTop: '32px', textAlign: 'center' }} variants={itemVariants}>
                            {error}
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default UploadForm;
