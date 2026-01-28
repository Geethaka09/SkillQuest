import { useState } from 'react';
import Layout from '../components/Layout';
import { authService } from '../services/api';
import '../styles/settings.css';

const SettingsPage = () => {
    const user = authService.getCurrentUser();
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [challengeReminders, setChallengeReminders] = useState(true);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        // Simulate saving
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <Layout>
            <div className="settings-page">
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
            </div>
        </Layout>
    );
};

export default SettingsPage;
