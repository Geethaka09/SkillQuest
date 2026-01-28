const express = require('express');
const router = express.Router();
const { getInitialQuiz, submitAnswer, completeQuiz } = require('../controllers/quizController');
const auth = require('../middleware/auth');

// @route   GET /api/quiz/initial
// @desc    Get initial quiz questions (50 questions) and create paper record
// @access  Private
router.get('/initial', auth, getInitialQuiz);

// @route   POST /api/quiz/answer
// @desc    Submit answer for a question
// @access  Private
router.post('/answer', auth, submitAnswer);

// @route   POST /api/quiz/complete
// @desc    Complete quiz, save all answers, and update user status
// @access  Private
router.post('/complete', auth, completeQuiz);

module.exports = router;
