import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studyPlanService } from '../services/api';
import Layout from '../components/Layout';
import '../styles/learningPage.css';

const LearningPage = () => {
    const { weekNumber } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [weekData, setWeekData] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        fetchWeekContent();
    }, [weekNumber]);

    const fetchWeekContent = async () => {
        try {
            setLoading(true);
            const response = await studyPlanService.getWeekContent(weekNumber);
            if (response.success) {
                setWeekData(response);
                // Find first non-completed step
                const firstActiveIndex = response.steps.findIndex(s => s.status !== 'COMPLETED');
                if (firstActiveIndex >= 0) setCurrentStepIndex(firstActiveIndex);
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
        // Only allow clicking completed or in-progress steps
        if (step.status !== 'LOCKED') {
            setCurrentStepIndex(index);
        }
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

    const currentStep = weekData.steps[currentStepIndex];

    return (
        <Layout>
            <div className="w3-container">
                {/* W3School-style Layout */}
                <div className="w3-layout">
                    {/* Left Sidebar - Step Navigation */}
                    <aside className="w3-sidebar">
                        <div className="sidebar-header">
                            <h3>Week {weekData.weekNumber}</h3>
                            <p>{weekData.moduleName}</p>
                        </div>
                        <nav className="step-nav">
                            {weekData.steps.map((step, index) => (
                                <div
                                    key={step.stepId}
                                    className={`step-nav-item ${index === currentStepIndex ? 'active' : ''} ${step.status.toLowerCase()}`}
                                    onClick={() => handleStepClick(index)}
                                >
                                    <span className="step-icon">
                                        {step.status === 'COMPLETED' && '✓'}
                                        {step.status === 'IN_PROGRESS' && '▶'}
                                        {step.status === 'LOCKED' && '🔒'}
                                    </span>
                                    <span className="step-label">Step {step.stepId}</span>
                                </div>
                            ))}
                        </nav>
                        <button className="w3-btn w3-back" onClick={() => navigate('/dashboard')}>
                            ← Back to Dashboard
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

                        {/* Learning Content Card - W3School Style */}
                        <div className="w3-content-card">
                            <div className="w3-content-header">
                                <span className="w3-green-bar"></span>
                                <h2>📚 Learning Content</h2>
                            </div>
                            <div className="w3-content-body">
                                <div className="w3-tutorial-content">
                                    {currentStep.learningContent}
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
                                    disabled={currentStep.status === 'LOCKED'}
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
