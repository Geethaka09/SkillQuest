
import { useState } from 'react';
import Layout from '../components/Layout';
import { authService } from '../services/api';
import '../styles/settings.css';

const SettingsPage = () => {
    const [activeView, setActiveView] = useState('main'); // 'main' or 'change-password'

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            const result = await authService.changePassword({
                currentPassword,
                newPassword
            });

            if (result.success) {
                setPasswordSuccess('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordError(result.message || 'Failed to update password');
            }
        } catch (error) {
            setPasswordError(error.response?.data?.message || 'Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="settings-page">
                {activeView === 'main' ? (
                    <>
                        <h1>Account Settings</h1>

                        <div className="settings-card">
                            {/* Navigation Tile for Change Password */}
                            <div className="settings-section navigation-tile" onClick={() => setActiveView('change-password')} style={{ marginBottom: 0 }}>
                                <div className="nav-tile-content">
                                    <div className="nav-icon password-icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                                            <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <div className="nav-text">
                                        <h3>Change Password</h3>
                                        <p>Update your password and secure your account.</p>
                                    </div>
                                    <div className="nav-arrow">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="settings-header-nav">
                            <button className="back-btn" onClick={() => setActiveView('main')}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Back
                            </button>
                            <h1>Change Password</h1>
                        </div>

                        <div className="settings-card">
                            <div className="password-form" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                {passwordError && <p className="error-message">{passwordError}</p>}
                                {passwordSuccess && <p className="success-message">{passwordSuccess}</p>}

                                <button
                                    className="change-password-btn"
                                    onClick={handleChangePassword}
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default SettingsPage;
