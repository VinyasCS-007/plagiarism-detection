import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingPage = () => {
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
        <motion.div className="page" variants={containerVariants} initial="hidden" animate="show">
            <motion.section className="hero" variants={itemVariants}>
                <div className="hero-bg">
                    <span className="orb one"></span>
                    <span className="orb two"></span>
                    <span className="orb three"></span>
                    <div className="grid-overlay"></div>
                </div>

                <div className="container hero-inner">
                    <div>
                        <div className="pill">
                            <span className="dot"></span>
                            Integrity OS
                        </div>

                        <h1 className="hero-title">
                            A cinematic layer of
                            <span className="text-gradient"> academic integrity</span>
                        </h1>

                        <p className="hero-subtitle">
                            Detect plagiarism, AI-generated text, and suspicious similarities with a workflow that feels as polished as the platforms students already love.
                        </p>

                        <div className="hero-actions">
                            <Link to="/register" className="btn-primary btn-lg">Launch Integrity Suite</Link>
                            <Link to="/login" className="btn-ghost btn-lg">View Live Dashboard</Link>
                        </div>

                        <div className="hero-stats">
                            <div className="stat-card glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                                <div className="stat-value">98.7%</div>
                                <div className="stat-label">Similarity precision</div>
                            </div>
                            <div className="stat-card glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                                <div className="stat-value">2.4s</div>
                                <div className="stat-label">Average report build</div>
                            </div>
                            <div className="stat-card glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                                <div className="stat-value">24/7</div>
                                <div className="stat-label">Realtime monitoring</div>
                            </div>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="screen">
                            <div className="screen-header">
                                <span className="screen-dot"></span>
                                <span className="screen-dot active"></span>
                                <span className="screen-dot"></span>
                            </div>

                            <div className="screen-body">
                                <div className="scanbar"></div>
                                <div className="screen-row">
                                    <span className="chip">Batch 24 · Systems Lab</span>
                                    <span className="chip">AI + Plagiarism</span>
                                    <span className="chip">Risk: Low</span>
                                </div>

                                <div className="metric-grid">
                                    <div className="metric-card">
                                        <div className="metric-title">Top Similarity</div>
                                        <div className="metric-value">12.4%</div>
                                        <div className="progress"><span style={{ width: '62%' }}></span></div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-title">AI Confidence</div>
                                        <div className="metric-value">4.1%</div>
                                        <div className="progress"><span style={{ width: '28%' }}></span></div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-title">Docs Processed</div>
                                        <div className="metric-value">38 / 40</div>
                                        <div className="progress"><span style={{ width: '90%' }}></span></div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-title">Flagged Matches</div>
                                        <div className="metric-value">3</div>
                                        <div className="progress"><span style={{ width: '18%' }}></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            <motion.section className="section" variants={itemVariants}>
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Designed for high-stakes integrity</h2>
                        <p className="section-subtitle">A modern experience for students, faculty, and academic operations teams.</p>
                    </div>

                    <div className="feature-grid">
                        {[
                            { title: 'Contextual Similarity', text: 'Sentence-level matching that highlights meaningful overlap, not just shared keywords.', icon: '01' },
                            { title: 'AI Detection Signals', text: 'Multi-model scoring with transparent thresholds and confidence trails.', icon: '02' },
                            { title: 'Cinematic Reporting', text: 'Export-ready PDF reports with visual match maps and auditable logs.', icon: '03' }
                        ].map((feature) => (
                            <div key={feature.title} className="feature-card card-hover glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                                <div className="feature-icon">{feature.icon}</div>
                                <div className="feature-title">{feature.title}</div>
                                <div className="feature-text">{feature.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            <motion.section className="section" variants={itemVariants}>
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Workflow built for real classrooms</h2>
                        <p className="section-subtitle">Role-based flows that keep everything fast, organized, and secure.</p>
                    </div>

                    <div className="workflow-grid">
                        <div className="workflow-card card-hover glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                            <div className="workflow-badge">Student Portal</div>
                            <div className="workflow-title">Submit with confidence</div>
                            <p className="feature-text">Upload PDF, DOCX, or TXT files and track the status as the system checks your work.</p>
                            <ul className="workflow-list">
                                <li><span className="text-gradient">✓</span> Secure uploads with automatic hashing</li>
                                <li><span className="text-gradient">✓</span> Live status updates per submission</li>
                                <li><span className="text-gradient">✓</span> Maintain formatting and structure</li>
                            </ul>
                        </div>

                        <div className="workflow-card card-hover glow-card parallax-card" onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                            <div className="workflow-badge" style={{ background: 'rgba(34, 211, 238, 0.18)', color: 'var(--accent)' }}>Faculty Console</div>
                            <div className="workflow-title">Review at a glance</div>
                            <p className="feature-text">Surface high-risk matches and drill into the exact passages that need attention.</p>
                            <ul className="workflow-list">
                                <li><span className="text-gradient">✓</span> Cross-batch similarity detection</li>
                                <li><span className="text-gradient">✓</span> AI + plagiarism blending in one report</li>
                                <li><span className="text-gradient">✓</span> Shareable PDFs for academic records</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </motion.section>

            <motion.section className="section" variants={itemVariants}>
                <div className="container">
                    <div className="cta">
                        <h3>Make integrity feel premium</h3>
                        <p>Replace stale dashboards with a polished, cinematic UI your faculty and students will actually enjoy using.</p>
                        <div className="hero-actions" style={{ justifyContent: 'center' }}>
                            <Link to="/register" className="btn-primary btn-lg">Start Your Pilot</Link>
                            <Link to="/login" className="btn-ghost btn-lg">Explore Reports</Link>
                        </div>
                        <div className="logo-row">
                            {['FastAPI', 'PyTorch', 'Sentence-BERT', 'PostgreSQL', 'Redis', 'React'].map(tech => (
                                <span key={tech}>{tech}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.section>
        </motion.div>
    );
};

export default LandingPage;
