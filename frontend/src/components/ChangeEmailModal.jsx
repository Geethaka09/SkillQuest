import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import '../styles/profile.css';

const ChangeEmailModal = ({ isOpen, onClose, currentEmail, onUpdateSuccess }) => {
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewEmail('');
            setError('');
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
                onUpdateSuccess(newEmail);
                onClose();
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
                            {loading ? 'Updating...' : 'Update Email'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangeEmailModal;
