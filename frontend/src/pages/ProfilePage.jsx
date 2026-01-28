import Layout from '../components/Layout';
import { authService } from '../services/api';
import '../styles/profile.css';

const ProfilePage = () => {
    const user = authService.getCurrentUser();

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
                            <div className="profile-avatar">
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                                    alt="Profile avatar"
                                />
                            </div>
                        </div>
                        <div className="profile-details">
                            <h1>{user?.name || 'Yasindu Jay'}</h1>
                            <p className="bio">Computer Science undergraduate passionate about AI and Frontend Development. Learning React to build amazing web apps.</p>
                            <p className="join-date">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                JOINED SEPTEMBER 2024
                            </p>
                        </div>
                        <button className="edit-profile-btn">Edit Profile</button>
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
                        <div className="contact-card">
                            <h3>Contact Details</h3>
                            <div className="contact-item">
                                <span className="contact-label">EMAIL</span>
                                <span className="contact-value">{user?.email || 'yasindu.jay@university.edu'}</span>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="summary-card">
                            <h3>Summary</h3>
                            <button className="summary-btn modules">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.5 2H20V22H6.5A2.5 2.5 0 014 19.5V4.5A2.5 2.5 0 016.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Modules
                            </button>
                            <button className="summary-btn quizzes">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15848 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="12" cy="17" r="1" fill="currentColor" />
                                </svg>
                                Quizzes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ProfilePage;
