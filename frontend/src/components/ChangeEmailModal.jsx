import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import '../styles/profile.css';

/**
 * Change Email Modal
 * 
 * Allows users to request an email change.
 * A verification link is sent to the new email address.
 * The email is only updated after the user clicks the link.
 */
const ChangeEmailModal = ({ isOpen, onClose, currentEmail, onUpdateSuccess }) => {
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setNewEmail('');
            setError('');
            setSuccessMessage('');
        }
    }, [isOpen]);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newEmail.trim()) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(newEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        if (newEmail === currentEmail) {
            setError('New email must be different from current email');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const result = await authService.changeEmail({ newEmail });

            if (result.success) {
                setSuccessMessage(result.message || 'A verification link has been sent to your new email address.');
            } else {
                setError(result.message || 'Update failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update email. Please try again.');
            console.error('Update error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Change Email</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {successMessage ? (
                    <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '30px 20px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '16px'
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <p style={{
                            fontSize: '1rem', color: '#334155', lineHeight: '1.6',
                            fontFamily: "'Inter', sans-serif", marginBottom: '8px'
                        }}>
                            {successMessage}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            The link will expire in 10 minutes.
                        </p>
                        <div className="modal-footer" style={{ marginTop: '24px' }}>
                            <button type="button" className="btn-upload" onClick={onClose}>
                                Got it
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-body" style={{ alignItems: 'stretch' }}>
                        <div className="modal-form-group" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>
                                Current Email
                            </label>
                            <div style={{
                                padding: '14px 16px',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                color: '#64748b',
                                fontFamily: "'Inter', sans-serif"
                            }}>
                                {currentEmail}
                            </div>
                        </div>

                        <div className="modal-form-group" style={{ marginBottom: '0' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>
                                New Email
                            </label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="form-input"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    color: '#000000',
                                    fontFamily: "'Inter', sans-serif"
                                }}
                                placeholder="Enter new email address"
                            />
                        </div>

                        {error && <p className="error-text" style={{ marginTop: '10px' }}>{error}</p>}

                        <div className="modal-footer" style={{ marginTop: '24px' }}>
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-upload" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Verification'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ChangeEmailModal;

