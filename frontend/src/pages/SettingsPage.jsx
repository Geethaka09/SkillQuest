import { useState } from 'react';
import Layout from '../components/Layout';
import { authService } from '../services/api';
import '../styles/settings.css';

const SettingsPage = () => {
    const user = authService.getCurrentUser();
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [challengeReminders, setChallengeReminders] = useState(true);
    const [saved, setSaved] = useState(false);
    const [activeView, setActiveView] = useState('main'); // 'main' or 'change-password'

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        // Simulate saving preferences
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

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
                            {/* Email Section */}
                            <div className="settings-section">
                                <label className="section-label">Email</label>
                                <div className="email-display">
                                    {user?.email || 'alexanderson@gmail.com'}
                                </div>
                            </div>

                            {/* Notifications Section */}
                            <div className="notifications-section">
                                <div className="notifications-header">
                                    <div className="notifications-icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="notifications-text">
                                        <h3>Notifications</h3>
                                        <p>Control how SkillQuest communicates with you.</p>
                                    </div>
                                </div>

                                {/* Toggle Options */}
                                <div className="toggle-options">
                                    <div className="toggle-item">
                                        <div className="toggle-info">
                                            <h4>Email Notifications</h4>
                                            <p>Receive updates, challenge reminders via email.</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={emailNotifications}
                                                onChange={(e) => setEmailNotifications(e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-item">
                                        <div className="toggle-info">
                                            <h4>Challenge Reminders</h4>
                                            <p>Receive alerts for upcoming and ongoing challenges.</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={challengeReminders}
                                                onChange={(e) => setChallengeReminders(e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Tile for Change Password */}
                            <div className="settings-section navigation-tile" onClick={() => setActiveView('change-password')}>
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

                            {/* Save Button */}
                            <div className="save-section">
                                <button className="save-btn" onClick={handleSave}>
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {saved ? 'Saved!' : 'Save Changes'}
                                </button>
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
