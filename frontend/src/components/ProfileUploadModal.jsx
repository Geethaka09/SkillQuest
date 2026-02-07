import { useState, useEffect } from 'react';
import { authService } from '../services/api';
import '../styles/profile.css'; // Re-use profile styles or add specific modal styles

/**
 * Profile Upload Modal
 * 
 * Handles Profile Picture updates.
 * Features:
 * - Client-side validation (File type check).
 * - Instant Preview (prop: `previewUrl`) before uploading.
 * - Multipart/form-data upload via `authService`.
 */
const ProfileUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedFile(null);
            setPreviewUrl(null);
            setError('');
        }
    }, [isOpen]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            setSelectedFile(file);
            // Create a local URL for preview
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);
            setError('');

            const formData = new FormData();
            formData.append('profilePic', selectedFile);

            const result = await authService.uploadProfilePic(formData);

            if (result.success) {
                onUploadSuccess(result.profilePic);
                onClose();
            } else {
                setError(result.message || 'Upload failed');
            }
        } catch (err) {
            setError('Failed to upload image. Please try again.');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Update Profile Picture</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="preview-area">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="img-preview" />
                        ) : (
                            <div className="upload-placeholder">
                                <span>Select an image</span>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        id="file-upload"
                        className="file-input"
                    />
                    <label htmlFor="file-upload" className="file-label">
                        Choose Image
                    </label>

                    {error && <p className="error-text">{error}</p>}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={uploading}>Cancel</button>
                    <button
                        className="btn-upload"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileUploadModal;
