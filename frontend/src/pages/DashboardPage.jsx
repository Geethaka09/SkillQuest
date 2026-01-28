import Layout from '../components/Layout';
import { authService } from '../services/api';
import '../styles/dashboard.css';

const DashboardPage = () => {
    const user = authService.getCurrentUser();

    const modules = [
        { id: 1, title: 'Introduction to Reinforcement Learning', status: 'completed' },
        { id: 2, title: 'Basic Programming Concepts', status: 'completed' },
        { id: 3, title: 'Object-Oriented Programming', status: 'active' },
        { id: 4, title: 'Data Structures & Algorithms', status: 'locked' },
        { id: 5, title: 'System Design Patterns', status: 'locked' },
    ];

    const todayGoals = [
        { id: 1, text: 'Complete any 3 learning items', progress: '0/3' },
        { id: 2, text: 'Complete a graded assessment', progress: null },
        { id: 3, text: 'Progress toward your weekly streak', progress: null },
    ];

    return (
        <Layout>
            <div className="dashboard">
                {/* Welcome Header */}
                <div className="welcome-header">
                    <div className="welcome-avatar">
                        <img
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                            alt="User avatar"
                        />
                    </div>
                    <div className="welcome-text">
                        <h1>Welcome back, {user?.name || 'Learner'}!</h1>
                        <p>Continue your journey to mastery.</p>
                    </div>
                </div>

                {/* Stats Cards Row */}
                <div className="stats-row">
                    {/* Current Stage Card */}
                    <div className="stat-card current-stage">
                        <div className="card-header">
                            <h3>Current Stage</h3>
                            <span className="badge blue">65% to Expert</span>
                        </div>
                        <p className="level-label">LEVEL 4 INTERMEDIATE</p>
                        <div className="progress-bars">
                            <div className="progress-bar-group">
                                <div className="bar bar-1"></div>
                                <div className="bar bar-2 current">
                                    <span className="bar-label">CURRENT</span>
                                </div>
                                <div className="bar bar-3"></div>
                            </div>
                        </div>
                    </div>

                    {/* Modules Completed Card */}
                    <div className="stat-card modules-completed">
                        <div className="card-header">
                            <h3>Modules Completed</h3>
                            <span className="badge orange">⏱ 12 Days Left</span>
                        </div>
                        <p className="level-label">ACTIVE LEARNING JOURNEY</p>
                        <div className="modules-progress">
                            <div className="circular-progress">
                                <span className="progress-number">12</span>
                                <svg className="progress-check" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                                    <path d="M8 12L11 15L16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="modules-label">OUT OF 45 MODULES</p>
                        </div>
                        <div className="goal-progress">
                            <div className="goal-header">
                                <span>GOAL PROGRESS</span>
                                <span className="days-remaining">12 DAYS REMAINING</span>
                            </div>
                            <div className="goal-bar">
                                <div className="goal-fill" style={{ width: '26%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Module Section */}
                <div className="current-module-card">
                    <div className="module-badge">CURRENT MODULE</div>
                    <div className="module-content">
                        <div className="module-info">
                            <h2>Object-Oriented Programming</h2>
                            <p>Module 3</p>
                        </div>
                        <div className="module-action">
                            <div className="lesson-info">
                                <h4>Classes and Objects</h4>
                                <span className="assessments">📄 2 Assessments left</span>
                            </div>
                            <button className="resume-btn">Resume</button>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="bottom-section">
                    {/* Learning Path */}
                    <div className="learning-path">
                        <div className="path-header">
                            <h3>Your Learning Path</h3>
                            <a href="#" className="view-syllabus">View Full Syllabus →</a>
                        </div>
                        <div className="modules-list">
                            {modules.map((module) => (
                                <div key={module.id} className={`module-item ${module.status}`}>
                                    <div className="module-icon">
                                        {module.status === 'completed' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#22c55e" />
                                                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                        {module.status === 'active' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                                                <path d="M10 8L16 12L10 16V8Z" fill="white" />
                                            </svg>
                                        )}
                                        {module.status === 'locked' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#e2e8f0" />
                                                <rect x="8" y="10" width="8" height="6" rx="1" stroke="#94a3b8" strokeWidth="1.5" />
                                                <path d="M10 10V8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8V10" stroke="#94a3b8" strokeWidth="1.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="module-details">
                                        <h4>Module {module.id}: {module.title}</h4>
                                        <span className="module-status">
                                            {module.status === 'completed' && 'COMPLETED'}
                                            {module.status === 'active' && 'ACTIVE'}
                                            {module.status === 'locked' && 'LOCKED'}
                                        </span>
                                    </div>
                                    <svg className="module-arrow" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Today's Goals */}
                    <div className="todays-goals">
                        <h3>Today's goals</h3>
                        <div className="goals-list">
                            {todayGoals.map((goal) => (
                                <div key={goal.id} className="goal-item">
                                    <svg className="goal-star" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="goal-text">
                                        {goal.text}
                                        {goal.progress && <span className="goal-progress-text"> • {goal.progress}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DashboardPage;
