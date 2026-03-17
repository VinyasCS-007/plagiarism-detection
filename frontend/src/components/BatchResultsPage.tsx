import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

interface PlagiarismMatch {
    similar_document: string;
    similarity: number;
    matches: Array<{
        source_chunk: string;
        target_chunk: string;
        score: number;
    }>;
}

interface DocumentResult {
    document_id: string;
    filename: string;
    status: string;
    plagiarism_analysis: PlagiarismMatch[];
}

const BatchResultsPage = () => {
    const { batchId } = useParams();
    const [results, setResults] = useState<DocumentResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/v1/batches/${batchId}/results`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) throw new Error('Failed to fetch results');
                const data = await response.json();
                setResults(data.data);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (batchId) {
            fetchResults();
        }
    }, [batchId]);

    const getSimilarityColor = (score: number) => {
        if (score >= 0.7) return 'var(--error, #ef4444)';
        if (score >= 0.4) return 'var(--warning, #f59e0b)';
        return 'var(--success, #10b981)';
    };

    const handleDownload = async (format: 'pdf' | 'csv') => {
        if (!batchId) return;
        setIsDownloading(true);
        setDownloadError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/batches/${batchId}/report?format=${format}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to download report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `batch_${batchId}_report.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            setDownloadError(e.message || 'Download failed');
        } finally {
            setIsDownloading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
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
        <div className="page-shell">
            <motion.div className="container fade-in" style={{ maxWidth: '1000px' }} variants={containerVariants} initial="hidden" animate="show">
                <motion.div className="report-header" variants={itemVariants}>
                    <div>
                        <h1 className="section-title">Plagiarism Report</h1>
                        <div className="report-meta">
                            <Link to="/dashboard" className="btn-ghost nav-chip">← Dashboard</Link>
                            <span>Batch ID:</span>
                            <span style={{ fontFamily: 'monospace' }}>{batchId}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => handleDownload('csv')}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Preparing...' : 'Download CSV'}
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => handleDownload('pdf')}
                            disabled={isDownloading}
                        >
                            {isDownloading ? 'Preparing...' : 'Download PDF'}
                        </button>
                    </div>
                </motion.div>

                {downloadError && (
                    <motion.div className="panel error" variants={itemVariants}>
                        {downloadError}
                    </motion.div>
                )}

                {isLoading && (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Loading results...</p>
                    </div>
                )}

                {error && (
                    <motion.div className="panel error" style={{ textAlign: 'center' }} variants={itemVariants}>
                        {error}
                    </motion.div>
                )}

                {!isLoading && !error && results.length === 0 && (
                    <motion.div className="panel" style={{ textAlign: 'center' }} variants={itemVariants}>
                        <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No results found for this batch.</p>
                        <p className="muted" style={{ fontSize: '14px' }}>The analysis may still be processing, or no documents were uploaded.</p>
                    </motion.div>
                )}

                <motion.div style={{ display: 'grid', gap: '32px' }} variants={itemVariants}>
                {results.map((doc) => {
                    const maxPlagiarism = doc.plagiarism_analysis.length > 0
                        ? Math.max(...doc.plagiarism_analysis.map(p => p.similarity))
                        : 0;

                    return (
                        <motion.div
                            key={doc.document_id}
                            className="report-card tilt-card glow-card parallax-card"
                            variants={itemVariants}
                            whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
                            onMouseMove={handleParallax}
                            onMouseLeave={handleParallaxLeave}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '22px', fontWeight: 700 }}>{doc.filename}</h3>
                                    <div className="report-meta">
                                        <span>Status:</span>
                                        <span className={`status-badge ${doc.status === 'completed' ? 'status-completed' : 'status-queued'}`}>
                                            {doc.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="report-score">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Max Similarity</span>
                                    <span style={{ fontWeight: 700, color: getSimilarityColor(maxPlagiarism) }}>
                                        {(maxPlagiarism * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="score-bar">
                                    <div style={{
                                        width: `${maxPlagiarism * 100}%`,
                                        height: '100%',
                                        background: getSimilarityColor(maxPlagiarism),
                                        transition: 'width 1s ease'
                                    }} />
                                </div>
                                <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                                    {doc.plagiarism_analysis.length} similar document{doc.plagiarism_analysis.length !== 1 ? 's' : ''} found
                                </p>
                            </div>

                            {doc.plagiarism_analysis.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setExpandedDoc(expandedDoc === doc.document_id ? null : doc.document_id)}
                                        className="btn-secondary btn-block"
                                        style={{ justifyContent: 'space-between' }}
                                    >
                                        <span>View Detailed Matches ({doc.plagiarism_analysis.length})</span>
                                        <span>{expandedDoc === doc.document_id ? '▲' : '▼'}</span>
                                    </button>

                                    {expandedDoc === doc.document_id && (
                                        <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
                                            {doc.plagiarism_analysis.map((match, idx) => (
                                                <div key={idx} className="match-card">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontWeight: 600, color: getSimilarityColor(match.similarity) }}>
                                                            Match: {match.similar_document}
                                                        </span>
                                                        <span style={{
                                                            fontWeight: 700,
                                                            padding: '4px 10px',
                                                            borderRadius: '100px',
                                                            fontSize: '13px',
                                                            background: `${getSimilarityColor(match.similarity)}20`,
                                                            color: getSimilarityColor(match.similarity)
                                                        }}>
                                                            {(match.similarity * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    {match.matches && match.matches.length > 0 ? (
                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                            {match.matches.map((chunk, cIdx) => (
                                                                <div key={cIdx} className="match-chunk">
                                                                    <div style={{ color: 'var(--error)', marginBottom: '6px' }}>
                                                                        <strong>Source:</strong> "{chunk.source_chunk.substring(0, 150)}{chunk.source_chunk.length > 150 ? '...' : ''}"
                                                                    </div>
                                                                    <div className="muted">
                                                                        <strong>Matches:</strong> "{chunk.target_chunk.substring(0, 150)}{chunk.target_chunk.length > 150 ? '...' : ''}"
                                                                    </div>
                                                                    <div className="muted" style={{ marginTop: '4px', fontSize: '11px' }}>
                                                                        Chunk similarity: {(chunk.score * 100).toFixed(1)}%
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="muted" style={{ fontSize: '13px' }}>
                                                            High semantic similarity detected across this document.
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default BatchResultsPage;
