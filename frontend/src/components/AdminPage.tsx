import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const AdminPage = () => {
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            
            // Fetch stats
            const statsResponse = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }
            
            // Fetch users
            const usersResponse = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setUsers(usersData);
            }
            
        } catch (err) {
            setError('Failed to load admin data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                }),
            });
            
            if (response.ok) {
                alert('User created successfully');
                setNewUserEmail('');
                setNewUserPassword('');
                setShowCreateForm(false);
                fetchData(); // Refresh data
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.detail || 'Failed to create user'}`);
            }
        } catch (err) {
            alert('Failed to create user');
            console.error(err);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: newRole,
                }),
            });
            
            if (response.ok) {
                alert('User role updated successfully');
                fetchData(); // Refresh data
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.detail || 'Failed to update role'}`);
            }
        } catch (err) {
            alert('Failed to update user role');
            console.error(err);
        }
    };

    const handleDeactivateUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`Are you sure you want to deactivate user ${userEmail}?`)) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (response.ok) {
                alert('User deactivated successfully');
                fetchData(); // Refresh data
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.detail || 'Failed to deactivate user'}`);
            }
        } catch (err) {
            alert('Failed to deactivate user');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="page-shell">
                <div className="container" style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading admin data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <motion.div
                className="container fade-in"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <motion.div className="section-header" style={{ textAlign: 'left' }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="section-title">Admin Dashboard</h1>
                    <p className="section-subtitle" style={{ margin: 0 }}>System administration panel</p>
                </motion.div>

                {error && (
                    <motion.div className="panel error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        {error}
                    </motion.div>
                )}

                {stats && (
                    <motion.div
                        className="stat-grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, staggerChildren: 0.12 }}
                    >
                        {[
                            { label: 'Total Users', value: stats.total_users },
                            { label: 'Active Users', value: stats.active_users },
                            { label: 'Admins', value: stats.admins },
                            { label: 'Regular Users', value: stats.regular_users }
                        ].map((stat) => (
                            <motion.div
                                key={stat.label}
                                className="stat-tile tilt-card glow-card parallax-card"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
                                onMouseMove={handleParallax}
                                onMouseLeave={handleParallaxLeave}
                            >
                                <div className="stat-label">{stat.label}</div>
                                <div className="stat-number">{stat.value}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                <motion.div className="panel glow-card parallax-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onMouseMove={handleParallax} onMouseLeave={handleParallaxLeave}>
                    <div className="panel-header">
                        <h2 className="display-font" style={{ fontSize: '24px' }}>User Management</h2>
                        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
                            {showCreateForm ? 'Cancel' : 'Add User'}
                        </button>
                    </div>

                    {showCreateForm && (
                        <motion.div className="panel" style={{ marginBottom: '24px' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Create New User</h3>
                            <form onSubmit={handleCreateUser} className="auth-form">
                                <div className="input-group">
                                    <label className="input-label">Email</label>
                                    <input
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        required
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Password</label>
                                    <input
                                        type="password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <button type="submit" className="btn-primary">
                                    Create User
                                </button>
                            </form>
                        </motion.div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            >
                                                <option value="user">User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleDeactivateUser(user.id, user.email)}
                                                className="btn-ghost"
                                                style={{ color: 'var(--error)' }}
                                            >
                                                Deactivate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AdminPage;
