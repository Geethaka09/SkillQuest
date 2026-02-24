import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, quizService, profileService } from '../services/api';
import Layout from '../components/Layout';
import '../styles/initialQuiz.css';

/**
 * Initial Quiz Page (Placement Test)
 * 
 * The first meaningful interaction for a new user.
 * Purpose: Assets specific knowledge gaps to tailor the generated study plan.
 * Flow:
 * 1. Fetch questions from backend.
 * 2. Collect user answers.
 * 3. Submit full payload to `quizService`.
 * 4. P10: Forward results to Profile Classifier via `profileService.classify()`.
 * 5. P12: Display the profile classification report.
 */
const InitialQuizPage = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [paperId, setPaperId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [answers, setAnswers] = useState([]); // Store all answers
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [score, setScore] = useState(0);

    const [quizResults, setQuizResults] = useState(null);
    const [profileReport, setProfileReport] = useState(null);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await quizService.getInitialQuiz();
            if (response.success) {
                setQuestions(response.questions);
                setPaperId(response.paperId);

                // Restore previous answers from backend (response field)
                const restoredAnswers = response.questions.map(q => ({
                    questionId: q.id,
                    response: q.savedResponse || null
                }));
                setAnswers(restoredAnswers);

                // Resume from the first unanswered question
                const firstUnanswered = restoredAnswers.findIndex(a => !a.response);
                if (firstUnanswered !== -1) {
                    setCurrentQuestion(firstUnanswered);
                } else {
                    // All questions answered — go to last question so user can submit
                    setCurrentQuestion(response.questions.length - 1);
                }
            } else {
                setError('Failed to load quiz questions');
            }
        } catch (err) {
            setError('Failed to load quiz. Please try again.');
            console.error('Fetch questions error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (option) => {
        setSelectedAnswer(option);
    };

    const handleSubmitAnswer = async () => {
        if (!selectedAnswer) return;

        const currentQ = questions[currentQuestion];

        // Store the answer locally
        const updatedAnswers = [...answers];
        updatedAnswers[currentQuestion] = {
            questionId: currentQ.id,
            response: selectedAnswer
        };
        setAnswers(updatedAnswers);

        // Save answer to backend in background (fire-and-forget for instant UI)
        quizService.submitAnswer({
            paperId: paperId,
            questionId: currentQ.id,
            response: selectedAnswer
        }).catch(err => console.error('Failed to save answer:', err));

        // Check if answer is correct for score tracking (optimistic, but backend overrides)
        if (selectedAnswer === currentQ.correctAnswer) {
            setScore(prev => prev + 1);
        }

        // Move to next question or complete quiz
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedAnswer(null);
        } else {
            // Quiz completed - submit all answers
            await completeQuiz(updatedAnswers);
        }
    };

    const completeQuiz = async (finalAnswers) => {
        try {
            setSubmitting(true);
            const response = await quizService.completeQuiz({
                paperId: paperId,
                answers: finalAnswers,
                score: score,
                totalQuestions: questions.length
            });

            if (response.success) {
                // Update user in localStorage with new status
                localStorage.setItem('user', JSON.stringify(response.user));

                // Show results
                setQuizResults(response.results);

                // P10: Forward results to Profile Classifier (separate service)
                try {
                    const classifyResponse = await profileService.classify();
                    if (classifyResponse.success) {
                        setProfileReport(classifyResponse.classification);
                    }
                } catch (classifyErr) {
                    console.error('Profile classification error:', classifyErr);
                    // Non-blocking — quiz still completes even if classification fails
                }
            } else {
                setError('Failed to complete quiz. Please try again.');
            }
        } catch (err) {
            setError('Failed to complete quiz. Please try again.');
            console.error('Complete quiz error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // P12: Profile Classification Report Screen
    if (quizResults) {
        const levelColors = {
            beginner: '#ef4444',
            intermediate: '#f59e0b',
            advanced: '#22c55e'
        };
        const levelEmoji = {
            beginner: '🌱',
            intermediate: '📚',
            advanced: '🚀'
        };
        const currentLevel = profileReport?.level || 'beginner';
        const totalQuestions = questions.length;

        return (
            <Layout>
                <div className="quiz-container">
                    <div className="quiz-card results-card">
                        <div className="results-header">
                            <h2>Quiz Completed!</h2>
                            <p>Your Profile Classification Report</p>
                        </div>

                        {/* Level Badge */}
                        {profileReport && (
                            <div className="profile-level-badge" style={{ backgroundColor: levelColors[currentLevel] + '20', border: `2px solid ${levelColors[currentLevel]}` }}>
                                <span className="level-emoji">{levelEmoji[currentLevel]}</span>
                                <span className="level-text" style={{ color: levelColors[currentLevel] }}>
                                    {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
                                </span>
                            </div>
                        )}

                        {/* Overall Score */}
                        <div className="score-circle-outer">
                            <div className="score-circle-inner">
                                <span className="score-value">{quizResults.total_score}</span>
                                <span className="score-label">out of {totalQuestions}</span>
                            </div>
                        </div>

                        {/* Weighted Score from Profile Classifier */}
                        {profileReport && (
                            <p className="weighted-score-text">
                                Weighted Score: <strong>{profileReport.weightedPercent}%</strong>
                            </p>
                        )}

                        {/* Per-Category Breakdown */}
                        {profileReport && (
                            <div className="category-breakdown">
                                <h3>Score Breakdown</h3>
                                {[
                                    { name: 'Analytical Thinking', score: profileReport.scores.at_score, color: '#6366f1' },
                                    { name: 'Computational Thinking', score: profileReport.scores.ct_score, color: '#06b6d4' },
                                    { name: 'Programming', score: profileReport.scores.p_score, color: '#8b5cf6' },
                                ].map((cat) => (
                                    <div key={cat.name} className="category-row">
                                        <div className="category-info">
                                            <span className="category-name">{cat.name}</span>
                                            <span className="category-score">{cat.score}</span>
                                        </div>
                                        <div className="category-bar-bg">
                                            <div
                                                className="category-bar-fill"
                                                style={{
                                                    width: `${totalQuestions > 0 ? (cat.score / Math.ceil(totalQuestions / 3)) * 100 : 0}%`,
                                                    backgroundColor: cat.color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            className="submit-answer-btn"
                            onClick={() => navigate('/dashboard')}
                            style={{ marginTop: '20px', padding: '16px 48px', fontSize: '1.1rem' }}
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <div className="quiz-container">
                    <div className="quiz-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading quiz questions...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error && questions.length === 0) {
        return (
            <Layout>
                <div className="quiz-container">
                    <div className="quiz-error">
                        <p>{error}</p>
                        <button onClick={fetchQuestions} className="retry-btn">
                            Try Again
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const currentQ = questions[currentQuestion];

    return (
        <Layout>
            <div className="quiz-container">
                <div className="quiz-progress-bar">
                    <div
                        className="quiz-progress-fill"
                        style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="quiz-card">
                    <h2 className="question-counter">
                        Question {currentQuestion + 1} of {questions.length}
                    </h2>

                    <p className="question-text">{currentQ?.question}</p>

                    <div className="options-list">
                        {currentQ?.options?.map((option, index) => (
                            <div
                                key={index}
                                className={`option-item ${selectedAnswer === option ? 'selected' : ''}`}
                                onClick={() => handleAnswerSelect(option)}
                            >
                                {option}
                            </div>
                        ))}
                    </div>

                    <div className="quiz-actions">
                        <button
                            className="submit-answer-btn"
                            onClick={handleSubmitAnswer}
                            disabled={!selectedAnswer || submitting}
                        >
                            {submitting ? 'Submitting...' :
                                currentQuestion < questions.length - 1 ? 'Next' : 'Submit Answer'}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default InitialQuizPage;
