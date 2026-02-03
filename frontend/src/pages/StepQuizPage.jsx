import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studyPlanService } from '../services/api';
import Layout from '../components/Layout';
import '../styles/stepQuiz.css';

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
        // Navigate to next step if available, otherwise go to dashboard
        console.log('handleContinue called, result:', result);
        if (result?.nextStepId) {
            navigate(`/quiz/${weekNumber}/${result.nextStepId}`);
        } else if (result?.isWeekComplete) {
            navigate('/dashboard');
        } else {
            // If no nextStepId but week not complete, try next step
            const nextStep = parseInt(stepId) + 1;
            navigate(`/quiz/${weekNumber}/${nextStep}`);
        }
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
                                result.isWeekComplete ? (
                                    <button className="quiz-btn primary" onClick={() => navigate('/dashboard')}>
                                        Continue to Dashboard →
                                    </button>
                                ) : (
                                    <button className="quiz-btn primary" onClick={() => {
                                        console.log('Continue Learning clicked');
                                        console.log('result.nextStepId:', result?.nextStepId);

                                        if (result?.nextStepId) {
                                            // Navigate to next step
                                            window.location.href = `/quiz/${weekNumber}/${result.nextStepId}`;
                                        } else {
                                            // No next step available, go to dashboard
                                            window.location.href = '/dashboard';
                                        }
                                    }}>
                                        Continue Learning →
                                    </button>
                                )
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
            </Layout>
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
