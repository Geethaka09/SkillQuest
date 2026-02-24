const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getStepContent, submitStepQuiz } = require('../controllers/trainingSessionController');

/**
 * Training Session Routes (P14 → P17)
 * Base URL: /api/study-plan
 * 
 * P14: Launch Interactive Training Session
 * P15: Present Content and Provide Feedback
 * P16: Monitor and Record Performance Data
 * P17: Complete and Log Session Data
 */

// @route   GET /api/study-plan/step/:weekNumber/:stepId
// @desc    Get specific learning step content (P14, P15)
// @access  Private
router.get('/step/:weekNumber/:stepId', auth, getStepContent);

// @route   POST /api/study-plan/submit-quiz
// @desc    Submit step quiz & handle progression (P15, P16, P17)
// @access  Private
router.post('/submit-quiz', auth, submitStepQuiz);

module.exports = router;
