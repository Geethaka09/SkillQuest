import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CountUpAnimation from '../components/CountUpAnimation';
import { authService, gamificationService, studyPlanService } from '../services/api';
import '../styles/dashboard.css';

const DashboardPage = () => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    // Gamification state
    const [xpData, setXpData] = useState({
        levelTitle: 'LOADING...',
        currentLevel: 0,
        currentXP: 0,
        nextLevelXP: 100,
        progressPercentage: 0,
        currentStreak: 0,
        stage: 'beginner'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [previousXP, setPreviousXP] = useState(0);

    // Study Plan Progress state
    const [progressData, setProgressData] = useState({
        totalModules: 0,
        completedModules: 0,
        percentComplete: 0,
        currentModule: null,
        modules: []
    });
    const [progressLoading, setProgressLoading] = useState(true);

    // Daily Goals state
    const [goalsData, setGoalsData] = useState({
        goals: [
            { id: 1, text: 'Complete today\'s learning item', progress: 'PROGRESS: 0/1', xp: '+100 XP', completed: false },
            { id: 2, text: 'Complete a graded assessment', progress: null, xp: '+300 XP', completed: false },
            { id: 3, text: 'Progress toward your weekly streak', progress: null, xp: '+50 XP', completed: false },
        ],
        completedGoals: 0
    });

    // Fetch gamification data on mount
    useEffect(() => {
        const fetchGamificationData = async () => {
            try {
                const response = await gamificationService.getDashboardStats();
                if (response.success) {
                    setPreviousXP(xpData.currentXP);
                    setXpData(response.data);
                }
            } catch (err) {
                console.error('Failed to fetch gamification data:', err);
                const msg = err.response?.data?.message || 'Failed to load XP data';
                setError(msg);
                setXpData(prev => ({ ...prev, levelTitle: 'ERROR' }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchGamificationData();
    }, []);

    // Fetch study plan progress data
    useEffect(() => {
        const fetchProgressData = async () => {
            try {
                const response = await studyPlanService.getProgress();
                if (response.success) {
                    setProgressData(response);
                }
            } catch (error) {
                console.error('Failed to fetch progress data:', error);
            } finally {
                setProgressLoading(false);
            }
        };

        fetchProgressData();
    }, []);

    // Fetch daily goals
    useEffect(() => {
        const fetchGoalsData = async () => {
            try {
                const response = await gamificationService.getDailyGoals();
                if (response.success) {
                    setGoalsData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch goals data:', error);
            }
        };

        fetchGoalsData();
    }, []);

    // Calculate total steps for modules card
    const totalSteps = progressData.modules.reduce((acc, m) => acc + m.totalSteps, 0);
    const completedSteps = progressData.modules.reduce((acc, m) => acc + m.completedSteps, 0);

    return (
        <Layout>
            <div className="dashboard">
                {/* Welcome Header */}
                <div className="welcome-header">
                    <div className="welcome-avatar">
                        <img
                            src={user?.profilePic ? `http://localhost:5000${user.profilePic}` : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"}
                            alt="User avatar"
                        />
                    </div>
                    <div className="welcome-text">
                        <h1>Welcome back, {user?.name || 'Learner'}!</h1>
                        <p>Continue your journey to mastery.</p>
                    </div>
                </div>

                {/* Stats Cards Row */}
                <div className="stats-row three-cards">
                    {/* Current Stage Card */}
                    <div className="stat-card current-stage">
                        <div className="card-header">
                            <h3>Current Stage</h3>
                            <span className="badge blue" title={`Debug: "${xpData.stage}"`}>
                                {xpData.stage?.toUpperCase() || 'BEGINNER'}
                            </span>
                        </div>
                        <div className="progress-bars">
                            <div className="progress-bar-group">
                                {/* Bar 1 - Beginner */}
                                <div className={`bar bar-1 ${(xpData.stage?.trim().toLowerCase() === 'beginner') ? 'current' : 'completed'
                                    }`}>
                                    {xpData.stage?.trim().toLowerCase() === 'beginner' && <span className="bar-label">CURRENT</span>}
                                </div>
                                {/* Bar 2 - Intermediate */}
                                <div className={`bar bar-2 ${(xpData.stage?.trim().toLowerCase() === 'intermediate') ? 'current' :
                                    (['expert', 'advanced'].includes(xpData.stage?.trim().toLowerCase())) ? 'completed' : 'locked'
                                    }`}>
                                    {xpData.stage?.trim().toLowerCase() === 'intermediate' && <span className="bar-label">CURRENT</span>}
                                </div>
                                {/* Bar 3 - Expert/Advanced */}
                                <div className={`bar bar-3 ${(['expert', 'advanced'].includes(xpData.stage?.trim().toLowerCase())) ? 'current' : 'locked'
                                    }`}>
                                    {(['expert', 'advanced'].includes(xpData.stage?.trim().toLowerCase())) && <span className="bar-label">CURRENT</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* XP Level Card */}
                    <div className="stat-card xp-level">
                        <div className="card-header">
                            <h3>XP Level</h3>
                            <div className="streak-badge">
                                <span className="streak-fire">🔥</span>
                                <span className="streak-count">{xpData.currentStreak}</span>
                            </div>
                        </div>
                        <p className="level-label" style={{ color: error ? '#ef4444' : undefined, fontSize: error ? '0.8rem' : undefined }}>
                            {error ? `⚠️ ${error}` : xpData.levelTitle}
                        </p>
                        <div className="xp-display">
                            <div className="mastery-points">
                                <CountUpAnimation
                                    from={previousXP > 0 ? Math.floor(previousXP / 100) : 0}
                                    to={xpData.currentLevel}
                                    duration={1200}
                                    className="mastery-number"
                                />
                                <span className="mastery-trophy">🏅</span>
                            </div>
                            <p className="mastery-label">LEVEL</p>
                        </div>
                        <div className="xp-progress">
                            <div className="xp-progress-header">
                                <span>PROGRESS TO LVL {xpData.currentLevel + 1}</span>
                                <span className="xp-count">
                                    <CountUpAnimation
                                        from={previousXP}
                                        to={xpData.currentXP}
                                        duration={1500}
                                    /> / {xpData.nextLevelXP} XP
                                </span>
                            </div>
                            <div className="xp-bar">
                                <div
                                    className="xp-fill"
                                    style={{
                                        width: `${xpData.progressPercentage}%`,
                                        transition: 'width 1.5s ease-out'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Modules Card - Real Data */}
                    <div className="stat-card modules-completed">
                        <div className="card-header">
                            <h3>Modules</h3>
                            <span className="badge orange">📚 {progressData.totalModules} Weeks</span>
                        </div>
                        <p className="level-label">LEARNING JOURNEY</p>
                        <div className="modules-progress">
                            <div className="circular-progress">
                                <span className="progress-number">
                                    {progressLoading ? '...' : progressData.completedModules}
                                </span>
                                <svg className="progress-check" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                                    <path d="M8 12L11 15L16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <p className="modules-label">
                                OUT OF {progressData.totalModules} MODULES
                            </p>
                        </div>
                        <div className="goal-progress">
                            <div className="goal-header">
                                <span>COMPLETION</span>
                                <span className="days-remaining">{progressData.percentComplete}% DONE</span>
                            </div>
                            <div className="goal-bar">
                                <div className="goal-fill" style={{ width: `${progressData.percentComplete}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Module Section - Real Data */}
                <div className="current-module-card">
                    <div className="module-badge">CURRENT MODULE</div>
                    <div className="module-content">
                        <div className="module-info">
                            <h2>{progressData.currentModule?.name || 'All caught up!'}</h2>
                            <p>Week {progressData.currentModule?.weekNumber || '-'}</p>
                        </div>
                        <div className="module-action">
                            <div className="lesson-info">
                                {progressData.currentModule ? (
                                    <>
                                        <h4>{progressData.currentModule.completedSteps}/{progressData.currentModule.totalSteps} Steps Complete</h4>
                                        <span className="assessments">
                                            📄 {progressData.currentModule.stepsRemaining} Steps remaining
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {/* Find next locked week with days remaining */}
                                        {(() => {
                                            const nextLockedWeek = progressData.modules.find(m => m.status === 'LOCKED' && m.daysRemaining);
                                            if (nextLockedWeek) {
                                                return (
                                                    <>
                                                        <h4>Next module unlocks in {nextLockedWeek.daysRemaining} day{nextLockedWeek.daysRemaining > 1 ? 's' : ''}</h4>
                                                        <span className="assessments">⏰ Check back soon!</span>
                                                    </>
                                                );
                                            }
                                            return (
                                                <>
                                                    <h4>All modules completed!</h4>
                                                    <span className="assessments">🎉 Great job!</span>
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                            <button
                                className="resume-btn"
                                onClick={() => progressData.currentModule && navigate(`/learn/${progressData.currentModule.weekNumber}`)}
                                disabled={!progressData.currentModule}
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="bottom-section">
                    {/* Learning Path - Real Data */}
                    <div className="learning-path">
                        <div className="path-header">
                            <h3>Your Learning Path</h3>

                        </div>
                        <div className="modules-list">
                            {progressData.modules.map((module) => (
                                <div
                                    key={module.weekNumber}
                                    className={`module-item ${module.status.toLowerCase()}`}
                                    onClick={() => module.status !== 'LOCKED' && navigate(`/learn/${module.weekNumber}`)}
                                    style={{ cursor: module.status !== 'LOCKED' ? 'pointer' : 'not-allowed' }}
                                >
                                    <div className="module-icon">
                                        {module.status === 'COMPLETED' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#22c55e" />
                                                <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                        {module.status === 'ACTIVE' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                                                <path d="M10 8L16 12L10 16V8Z" fill="white" />
                                            </svg>
                                        )}
                                        {module.status === 'LOCKED' && (
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#e2e8f0" />
                                                <rect x="8" y="10" width="8" height="6" rx="1" stroke="#94a3b8" strokeWidth="1.5" />
                                                <path d="M10 10V8C10 6.89543 10.8954 6 12 6C13.1046 6 14 6.89543 14 8V10" stroke="#94a3b8" strokeWidth="1.5" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="module-details">
                                        <h4>Week {module.weekNumber}: {module.name}</h4>
                                        <span className="module-status">
                                            {module.status === 'LOCKED' && module.daysRemaining
                                                ? `Unlocks in ${module.daysRemaining} day${module.daysRemaining > 1 ? 's' : ''}`
                                                : `${module.status} • ${module.completedSteps}/${module.totalSteps} steps`
                                            }
                                        </span>
                                    </div>
                                    <svg className="module-arrow" viewBox="0 0 24 24" fill="none">
                                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            ))}
                            {progressData.modules.length === 0 && !progressLoading && (
                                <div className="no-modules">
                                    <p>No study plan available yet. Complete your initial assessment to get started!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today's Goals */}
                    <div className="todays-goals">
                        <div className="goals-header">
                            <h3>Today's goals</h3>
                            <span className="goals-bolt">⚡</span>
                        </div>
                        <div className="goals-list">
                            {goalsData.goals.map((goal) => (
                                <div key={goal.id} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                                    <svg className="goal-star" viewBox="0 0 24 24" fill={goal.completed ? "#fbbf24" : "none"}>
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="goal-content">
                                        <span className="goal-text">{goal.text}</span>
                                        {goal.progress && <span className="goal-progress-text">{goal.progress}</span>}
                                        <span className="goal-xp">{goal.xp}</span>
                                    </div>
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
