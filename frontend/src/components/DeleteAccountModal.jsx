import { useState } from 'react';
import '../styles/profile.css';

const DeleteAccountModal = ({ isOpen, onClose, onConfirmDelete }) => {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') {
            setError('Please type DELETE to confirm');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await onConfirmDelete();
        } catch (err) {
            setError(err.message || 'Failed to delete account');
            setLoading(false);
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
                    <h3 style={{ color: '#dc2626' }}>Delete Account</h3>
                    <button className="close-btn" onClick={handleClose}>&times;</button>
                </div>

                <div className="modal-body" style={{ alignItems: 'stretch' }}>
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                style={{ width: '24px', height: '24px', flexShrink: 0, color: '#dc2626' }}
                            >
                                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>
                                <p style={{
                                    fontWeight: '600',
                                    color: '#dc2626',
                                    margin: '0 0 8px 0',
                                    fontSize: '0.95rem'
                                }}>
                                    This action cannot be undone
                                </p>
                                <p style={{
                                    color: '#7f1d1d',
                                    margin: '0',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.5'
                                }}>
                                    This will permanently delete your account and all associated data including your progress, quiz attempts, and study plan records.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="modal-form-group" style={{ marginBottom: '0' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '500',
                            color: '#475569',
                            fontSize: '0.9rem'
                        }}>
                            Type <span style={{ fontWeight: '700', color: '#dc2626' }}>DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
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
                            placeholder="Type DELETE here"
                        />
                    </div>

                    {error && (
                        <p style={{
                            color: '#dc2626',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            margin: '16px 0 0 0'
                        }}>
                            {error}
                        </p>
                    )}

                    <div className="modal-footer" style={{ marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading || confirmText !== 'DELETE'}
                            style={{
                                padding: '12px 24px',
                                background: confirmText === 'DELETE' ? '#dc2626' : '#fca5a5',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                fontWeight: '600',
                                cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Deleting...' : 'Delete My Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
