import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { studyPlanService } from '../services/api';
import Layout from '../components/Layout';
import '../styles/learningPage.css';
import ReactMarkdown from 'react-markdown';

const LearningPage = () => {
    const { weekNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [weekData, setWeekData] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(null);
    const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'learning'
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        fetchWeekContent();
    }, [weekNumber]);

    const fetchWeekContent = async () => {
        try {
            setLoading(true);
            const response = await studyPlanService.getWeekContent(weekNumber);
            if (response.success) {
                setWeekData(response);

                // Auto-open if coming from quiz (resume: true)
                if (location.state?.resume) {
                    // Find first non-completed step or first step
                    const activeIndex = response.steps.findIndex(s => s.status !== 'COMPLETED') !== -1
                        ? response.steps.findIndex(s => s.status !== 'COMPLETED')
                        : 0;

                    setCurrentStepIndex(activeIndex);
                    setViewMode('learning');

                    // Clear state
                    window.history.replaceState({}, document.title);
                }
            } else {
                setError('Failed to load content');
            }
        } catch (err) {
            setError('Failed to load learning content. Please try again.');
            console.error('Fetch content error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStepClick = (index) => {
        const step = weekData.steps[index];
        // First step is always accessible, others need to be unlocked
        const isAccessible = index === 0 || step.status !== 'LOCKED';
        if (isAccessible) {
            setCurrentStepIndex(index);
            if (viewMode === 'overview') {
                // Trigger animation
                setIsAnimating(true);
                setTimeout(() => {
                    setViewMode('learning');
                    setIsAnimating(false);
                }, 400); // Match CSS animation duration
            }
        }
    };

    const handleBackToOverview = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setViewMode('overview');
            setCurrentStepIndex(null);
            setIsAnimating(false);
        }, 300);
    };

    const handleTryQuiz = () => {
        const currentStep = weekData.steps[currentStepIndex];
        navigate(`/quiz/${weekNumber}/${currentStep.stepId}`);
    };

    if (loading) {
        return (
            <Layout>
                <div className="w3-container">
                    <div className="w3-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading learning content...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !weekData) {
        return (
            <Layout>
                <div className="w3-container">
                    <div className="w3-error">
                        <p>{error || 'Content not found'}</p>
                        <button onClick={() => navigate('/dashboard')} className="w3-btn w3-back">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const currentStep = currentStepIndex !== null ? weekData.steps[currentStepIndex] : null;

    // ================== OVERVIEW MODE ==================
    if (viewMode === 'overview') {
        return (
            <Layout>
                <div className={`w3-container overview-container ${isAnimating ? 'animating-out' : ''}`}>
                    <div className="overview-header">
                        <button className="back-btn" onClick={() => navigate('/dashboard')}>
                            ← Back to Dashboard
                        </button>
                        <div className="overview-title">
                            <span className="week-badge">Week {weekData.weekNumber}</span>
                            <h1>{weekData.moduleName}</h1>
                            <p className="overview-subtitle">Select a step to begin learning</p>
                        </div>
                    </div>

                    <div className="steps-overview">
                        {weekData.steps.map((step, index) => {
                            // First step is always accessible
                            const isLocked = index !== 0 && step.status === 'LOCKED';
                            const displayStatus = index === 0 && step.status === 'LOCKED' ? 'IN_PROGRESS' : step.status;

                            return (
                                <div
                                    key={step.stepId}
                                    className={`step-card ${displayStatus.toLowerCase()} ${isLocked ? 'locked' : ''}`}
                                    onClick={() => handleStepClick(index)}
                                >
                                    <div className="step-card-number">
                                        {displayStatus === 'COMPLETED' && <span className="check-icon">✓</span>}
                                        {isLocked && <span className="lock-icon">🔒</span>}
                                        {(displayStatus === 'IN_PROGRESS' || (index === 0 && !isLocked && displayStatus !== 'COMPLETED')) && <span className="step-num">{step.stepId}</span>}
                                    </div>
                                    <div className="step-card-content">
                                        <h3>Step {step.stepId}</h3>
                                        <p className="step-status-text">
                                            {displayStatus === 'COMPLETED' && 'Completed'}
                                            {displayStatus === 'IN_PROGRESS' && 'Continue learning'}
                                            {isLocked && 'Complete previous step to unlock'}
                                        </p>
                                    </div>
                                    {!isLocked && (
                                        <div className="step-card-arrow">→</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Layout>
        );
    }

    // ================== LEARNING MODE ==================
    return (
        <Layout>
            <div className={`w3-container learning-container ${isAnimating ? 'animating-in' : 'active'}`}>
                <div className="w3-layout">
                    {/* Left Sidebar - Step Navigation */}
                    <aside className="w3-sidebar">
                        <div className="sidebar-header">
                            <h3>Week {weekData.weekNumber}</h3>
                            <p>{weekData.moduleName}</p>
                        </div>
                        <nav className="step-nav">
                            {weekData.steps.map((step, index) => {
                                // First step is always accessible
                                const isLocked = index !== 0 && step.status === 'LOCKED';
                                const displayStatus = index === 0 && step.status === 'LOCKED' ? 'IN_PROGRESS' : step.status;

                                return (
                                    <div
                                        key={step.stepId}
                                        className={`step-nav-item ${index === currentStepIndex ? 'active' : ''} ${displayStatus.toLowerCase()}`}
                                        onClick={() => handleStepClick(index)}
                                    >
                                        <span className="step-icon">
                                            {displayStatus === 'COMPLETED' && '✓'}
                                            {displayStatus === 'IN_PROGRESS' && '▶'}
                                            {isLocked && '🔒'}
                                        </span>
                                        <span className="step-label">Step {step.stepId}</span>
                                    </div>
                                );
                            })}
                        </nav>
                        <button className="w3-btn w3-back" onClick={handleBackToOverview}>
                            ← Back to Steps
                        </button>
                    </aside>

                    {/* Main Content Area */}
                    <main className="w3-main">
                        {/* Module Header */}
                        <div className="w3-header">
                            <span className="w3-badge">STEP {currentStep.stepId}</span>
                            <h1>{weekData.moduleName}</h1>
                            <div className="attempt-info">
                                {currentStep.status === 'COMPLETED' && (
                                    <span className="status-badge completed">✓ Completed</span>
                                )}
                                {currentStep.status === 'IN_PROGRESS' && (
                                    <span className="status-badge in-progress">📖 In Progress</span>
                                )}
                            </div>
                        </div>

                        {/* Learning Content Card */}
                        <div className="w3-content-card">
                            <div className="w3-content-body">
                                <div className="w3-tutorial-content">
                                    <ReactMarkdown>{currentStep.learningContent}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Try Quiz Section */}
                        <div className="w3-quiz-section">
                            <div className="w3-quiz-card">
                                <div className="quiz-icon">🎯</div>
                                <div className="quiz-info">
                                    <h3>Ready to Test Your Knowledge?</h3>
                                    <p>Complete the quiz to unlock the next step. You have {currentStep.questions?.length || 0} questions.</p>
                                </div>
                                <button
                                    className="w3-btn w3-quiz-btn"
                                    onClick={handleTryQuiz}
                                    disabled={currentStepIndex !== 0 && currentStep.status === 'LOCKED'}
                                >
                                    Try Quiz →
                                </button>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="w3-nav-buttons">
                            <button
                                className="w3-btn w3-prev"
                                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentStepIndex === 0}
                            >
                                ❮ Previous Step
                            </button>
                            <button
                                className="w3-btn w3-next"
                                onClick={() => setCurrentStepIndex(prev => Math.min(weekData.steps.length - 1, prev + 1))}
                                disabled={currentStepIndex === weekData.steps.length - 1 || weekData.steps[currentStepIndex + 1]?.status === 'LOCKED'}
                            >
                                Next Step ❯
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </Layout>
    );
};

export default LearningPage;
