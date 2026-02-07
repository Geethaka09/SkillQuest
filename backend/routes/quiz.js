const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getInitialQuiz,
    submitAnswer,
    completeQuiz
} = require('../controllers/quizController');

/**
 * Quiz Routes (Initial Assessment)
 * Note: Weekly quizzes are handled by studyPlan routes.
 * This is strictly for the onboarding placement test.
 */

// @route   GET /api/quiz/initial
// @desc    Start/Resume the 50-question placement test
// @access  Private
router.get('/initial', auth, getInitialQuiz);

// @route   POST /api/quiz/answer
// @desc    Save single answer (Auto-save)
// @access  Private
router.post('/answer', auth, submitAnswer);

// @route   POST /api/quiz/complete
// @desc    Finalize placement test & generate study plan
// @access  Private
router.post('/complete', auth, completeQuiz);

module.exports = router;
