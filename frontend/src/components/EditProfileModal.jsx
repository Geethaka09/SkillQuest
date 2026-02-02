import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import '../styles/profile.css';

const EditProfileModal = ({ isOpen, onClose, currentUser, onUpdateSuccess }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && currentUser) {
            setName(currentUser.name || '');
            setError('');
        }
    }, [isOpen, currentUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const result = await authService.updateProfile({ name });

            if (result.success) {
                onUpdateSuccess(name);
                onClose();
            } else {
                setError(result.message || 'Update failed');
            }
        } catch (err) {
            setError('Failed to update profile. Please try again.');
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
                    <h3>Edit Profile</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body" style={{ alignItems: 'stretch' }}>
                    <div className="modal-form-group" style={{ marginBottom: '0' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                            placeholder="Enter your name"
                        />
                    </div>

                    {error && <p className="error-text" style={{ marginTop: '10px' }}>{error}</p>}

                    <div className="modal-footer" style={{ marginTop: '24px' }}>
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-upload" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;
