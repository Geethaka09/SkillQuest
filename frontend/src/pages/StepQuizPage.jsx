import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studyPlanService } from '../services/api';
import Layout from '../components/Layout';
import '../styles/stepQuiz.css';
import RLToast from '../components/RLToast';
// Import Dashboard CSS for badge styles if not present (might need to copy styles or import)
import '../styles/dashboard.css'; // Reusing badge modal styles

const StepQuizPage = () => {
    const { weekNumber, stepId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [stepData, setStepData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [quizStartTime, setQuizStartTime] = useState(null); // Track when quiz started

    // RL State
    const [rlAction, setRlAction] = useState(null);
    const [showBoostToast, setShowBoostToast] = useState(false);

    useEffect(() => {
        fetchStepContent();
    }, [weekNumber, stepId]);

    const fetchStepContent = async () => {
        try {
            setLoading(true);
            // Capture start time when quiz loads
            setQuizStartTime(new Date().toISOString());
            const response = await studyPlanService.getStepContent(weekNumber, stepId);
            if (response.success) {
                setStepData(response);
            } else {
                setError('Failed to load quiz');
            }
        } catch (err) {
            setError('Failed to load quiz. Please try again.');
            console.error('Fetch step error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (genQID, answer) => {
        setAnswers(prev => ({
            ...prev,
            [genQID]: answer
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < stepData.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        // Check all questions answered
        if (Object.keys(answers).length < stepData.questions.length) {
            setError('Please answer all questions before submitting.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const answersArray = stepData.questions.map(q => ({
                genQID: q.genQID,
                response: answers[q.genQID]
            }));

            const response = await studyPlanService.submitQuiz({
                planId: stepData.planId,
                weekNumber: parseInt(weekNumber),
                stepId: parseInt(stepId),
                startTime: quizStartTime, // Pass the quiz start time for session tracking
                answers: answersArray
            });

            setResult(response);

            // Handle RL Recommendation
            if (response.rlRecommendation) {
                const rec = response.rlRecommendation;
                console.log('🔮 Quiz RL Action:', rec);
                setRlAction(rec);

                if (rec.action_code === 'MULTIPLIER_BOOST') {
                    // Show toast
                    setShowBoostToast(true);

                    // Activate persistent boost timer (20 mins)
                    const expiresAt = Date.now() + (20 * 60 * 1000);
                    localStorage.setItem('activeRLBoost', JSON.stringify({
                        action_code: 'MULTIPLIER_BOOST',
                        timestamp: Date.now(),
                        expiresAt: expiresAt
                    }));
                }

                // Cache persistent actions for Dashboard display (Rank, Goals)
                // Exclude BADGE_INJECTION (one-time) and STANDARD_XP
                if (['RANK_COMPARISON', 'EXTRA_GOALS'].includes(rec.action_code)) {
                    localStorage.setItem('cachedRLState', JSON.stringify(rec));
                } else if (rec.action_code !== 'MULTIPLIER_BOOST') {
                    // For Badges/Standard, clear previous cache so we don't show old state
                    localStorage.removeItem('cachedRLState');
                }
            }

        } catch (err) {
            setError('Failed to submit quiz. Please try again.');
            console.error('Submit quiz error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = () => {
        setAnswers({});
        setResult(null);
        setCurrentQuestionIndex(0);
    };

    const handleContinue = () => {
        // Redirect to learning page and auto-resume
        navigate(`/learn/${weekNumber}`, { state: { resume: true } });
    };

    if (loading) {
        return (
            <Layout>
                <div className="quiz-container">
                    <div className="quiz-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading quiz...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error && !stepData) {
        return (
            <Layout>
                <div className="quiz-container">
                    <div className="quiz-error">
                        <p>{error}</p>
                        <button onClick={() => navigate(`/learn/${weekNumber}`)} className="quiz-btn">
                            Back to Module
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // Show result screen
    if (result) {
        return (
            <Layout>
                <div className="quiz-container">
                    <div className={`quiz-result ${result.passed ? 'passed' : 'failed'}`}>
                        <div className="result-icon">
                            {result.passed ? '🎉' : '😞'}
                        </div>
                        <h1>{result.passed ? 'Congratulations!' : 'Not Quite!'}</h1>
                        <p className="result-message">{result.message}</p>
                        <div className="result-stats">
                            <div className="stat">
                                <span className="stat-number">{result.score}</span>
                                <span className="stat-label">Correct</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{result.totalQuestions}</span>
                                <span className="stat-label">Total</span>
                            </div>
                            <div className="stat">
                                <span className="stat-number">{result.attemptNumber}</span>
                                <span className="stat-label">Attempt</span>
                            </div>
                        </div>
                        <div className="result-actions">
                            {result.passed ? (
                                <button className="quiz-btn primary" onClick={() => navigate(`/learn/${weekNumber}`, { state: { resume: true } })}>
                                    Continue Learning →
                                </button>
                            ) : (
                                <>
                                    <button className="quiz-btn primary" onClick={handleRetry}>
                                        Try Again
                                    </button>
                                    <button className="quiz-btn secondary" onClick={() => navigate(`/learn/${weekNumber}`)}>
                                        Review Content
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* RL Toast Notification */}
                <RLToast
                    show={showBoostToast}
                    onClose={() => setShowBoostToast(false)}
                />

                {/* RL Badge Celebration Modal */}
                {
                    rlAction?.action_code === 'BADGE_INJECTION' && rlAction.badge && (
                        <div className="modal-overlay">
                            <div className="badge-modal" onClick={e => e.stopPropagation()}>
                                <div className="badge-shine"></div>
                                {/* Use icon_url or default emoji if image fails */}
                                <span className="badge-emoji">🏅</span>
                                <h2>Badge Unlocked!</h2>
                                <p>You've earned the <strong>{rlAction.badge.name}</strong>!</p>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{rlAction.badge.description}</p>
                                <button
                                    className="claim-btn"
                                    onClick={() => setRlAction(null)}
                                >
                                    Awesome!
                                </button>
                            </div>
                        </div>
                    )
                }
            </Layout >
        );
    }

    const currentQuestion = stepData.questions[currentQuestionIndex];
    let options = [];
    try {
        options = JSON.parse(currentQuestion.options || '[]');
    } catch (e) {
        options = [currentQuestion.options];
    }

    return (
        <Layout>
            <div className="quiz-container">
                {/* Quiz Header */}
                <div className="quiz-header">
                    <button className="back-link" onClick={() => navigate(`/learn/${weekNumber}`)}>
                        ← Back to Learning
                    </button>
                    <div className="quiz-title">
                        <h1>Step {stepId} Quiz</h1>
                        <span className="quiz-badge">{stepData.moduleName}</span>
                    </div>
                    <div className="attempt-badge">
                        Attempt #{(stepData.attemptCount || 0) + 1}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="quiz-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentQuestionIndex + 1) / stepData.questions.length) * 100}%` }}
                        ></div>
                    </div>
                    <span className="progress-text">
                        Question {currentQuestionIndex + 1} of {stepData.questions.length}
                    </span>
                </div>

                {/* Question Card */}
                <div className="question-card">
                    <div className="question-number">Q{currentQuestionIndex + 1}</div>
                    <p className="question-text">{currentQuestion.question}</p>

                    <div className="options-grid">
                        {options.map((option, index) => (
                            <div
                                key={index}
                                className={`option-card ${answers[currentQuestion.genQID] === option ? 'selected' : ''}`}
                                onClick={() => handleAnswerSelect(currentQuestion.genQID, option)}
                            >
                                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                <span className="option-text">{option}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Error Message */}
                {error && <div className="quiz-error-msg">{error}</div>}

                {/* Navigation */}
                <div className="quiz-nav">
                    <button
                        className="quiz-btn secondary"
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                    >
                        ← Previous
                    </button>

                    {currentQuestionIndex === stepData.questions.length - 1 ? (
                        <button
                            className="quiz-btn primary submit"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Quiz ✓'}
                        </button>
                    ) : (
                        <button
                            className="quiz-btn primary"
                            onClick={handleNext}
                        >
                            Next →
                        </button>
                    )}
                </div>

                {/* Question Dots */}
                <div className="question-dots">
                    {stepData.questions.map((q, index) => (
                        <div
                            key={q.genQID}
                            className={`dot ${index === currentQuestionIndex ? 'active' : ''} ${answers[q.genQID] ? 'answered' : ''}`}
                            onClick={() => setCurrentQuestionIndex(index)}
                        >
                            {index + 1}
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default StepQuizPage;
