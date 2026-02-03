
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { authService } from '../services/api';
import ChangeEmailModal from '../components/ChangeEmailModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import '../styles/settings.css';

const SettingsPage = () => {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('main'); // 'main' or 'change-password'
    const [user, setUser] = useState(authService.getCurrentUser());
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

    const handleEmailUpdateSuccess = (newEmail) => {
        setUser(prev => ({ ...prev, email: newEmail }));
        window.dispatchEvent(new Event('userUpdated'));
    };

    const handleDeleteAccount = async () => {
        const result = await authService.deleteAccount();
        if (result.success) {
            authService.logout();
            navigate('/login');
        } else {
            throw new Error(result.message || 'Failed to delete account');
        }
    };

    return (
        <Layout>
            <div className="settings-page">
                {activeView === 'main' ? (
                    <>
                        <h1>Account Settings</h1>

                        <div className="settings-card">
                            {/* Navigation Tile for Change Email */}
                            <div className="settings-section navigation-tile" onClick={() => setIsEmailModalOpen(true)} style={{ marginBottom: '16px' }}>
                                <div className="nav-tile-content">
                                    <div className="nav-icon email-icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="nav-text">
                                        <h3>Change Email</h3>
                                        <p>Update your email address.</p>
                                    </div>
                                    <div className="nav-arrow">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

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

                            {/* Navigation Tile for Delete Account */}
                            <div className="settings-section navigation-tile delete-tile" onClick={() => setIsDeleteModalOpen(true)} style={{ marginTop: '32px', marginBottom: 0 }}>
                                <div className="nav-tile-content" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                                    <div className="nav-icon delete-icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="nav-text">
                                        <h3 style={{ color: '#dc2626' }}>Delete Account</h3>
                                        <p style={{ color: '#7f1d1d' }}>Permanently delete your account and all data.</p>
                                    </div>
                                    <div className="nav-arrow" style={{ color: '#dc2626' }}>
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

            <ChangeEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                currentEmail={user?.email}
                onUpdateSuccess={handleEmailUpdateSuccess}
            />

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirmDelete={handleDeleteAccount}
            />
        </Layout>
    );
};

export default SettingsPage;

