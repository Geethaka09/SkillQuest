import { useState } from 'react';
import Layout from '../components/Layout';
import { authService } from '../services/api';
import ProfileUploadModal from '../components/ProfileUploadModal';
import EditProfileModal from '../components/EditProfileModal';
import '../styles/profile.css';

const ProfilePage = () => {
    const [user, setUser] = useState(authService.getCurrentUser());
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

    const handleUploadSuccess = (newProfilePic) => {
        // Update local state to show new image immediately
        setUser(prev => ({ ...prev, profilePic: newProfilePic }));

        // Also fire an event so other components (like Navbar) can update if they listen
        window.dispatchEvent(new Event('userUpdated'));
    };

    const handleUpdateProfileSuccess = (newName) => {
        setUser(prev => ({ ...prev, name: newName }));
        window.dispatchEvent(new Event('userUpdated'));
    };

    const badges = [
        { id: 1, name: 'Pointers King', icon: '🏆' },
        { id: 2, name: 'Array Master', icon: '🏆' },
        { id: 3, name: 'OOP', icon: '🏆' },
        { id: 4, name: 'Data Structures', icon: '🏆' },
        { id: 5, name: 'God of Functions', icon: '🏆' },
        { id: 6, name: 'Concepts', icon: '🏆' },
    ];

    return (
        <Layout>
            <div className="profile-page">
                {/* Profile Header with Gradient */}
                <div className="profile-header">
                    <div className="header-gradient"></div>
                    <div className="profile-info">
                        <div className="avatar-section">
                            <div className="profile-avatar" onClick={() => setIsUploadModalOpen(true)} style={{ cursor: 'pointer', position: 'relative' }}>
                                <img
                                    src={user?.profilePic ? `http://localhost:5000${user.profilePic}` : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"}
                                    alt="Profile avatar"
                                />
                                <div className="avatar-overlay">
                                    <span>Change</span>
                                </div>
                            </div>
                        </div>
                        <div className="profile-details">
                            <h1>{user?.name || 'Yasindu Jay'}</h1>
                            <p className="bio">Computer Science undergraduate passionate about AI and Frontend Development. Learning React to build amazing web apps.</p>
                            <p className="join-date">


                            </p>
                        </div>
                        <button className="edit-profile-btn" onClick={() => setIsEditProfileModalOpen(true)}>Edit Profile</button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="profile-content">
                    {/* Left Column - Badges */}
                    <div className="badges-section">
                        <h2>Badges Earned</h2>
                        <div className="badges-grid">
                            {badges.map((badge) => (
                                <div key={badge.id} className="badge-item">
                                    <div className="badge-icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                                            <path d="M8 14L6 22L12 19L18 22L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span className="badge-name">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Contact & Summary */}
                    <div className="sidebar">
                        {/* Contact Details */}


                        {/* Summary */}

                    </div>
                </div>
            </div>

            <ProfileUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
            />

            <EditProfileModal
                isOpen={isEditProfileModalOpen}
                onClose={() => setIsEditProfileModalOpen(false)}
                currentUser={user}
                onUpdateSuccess={handleUpdateProfileSuccess}
            />
        </Layout>
    );
};

export default ProfilePage;
