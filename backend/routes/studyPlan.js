const express = require('express');
const router = express.Router();
const { getStudentProgress, getWeekContent, getStepContent, submitStepQuiz } = require('../controllers/studyPlanController');
const auth = require('../middleware/auth');

// @route   GET /api/study-plan/progress
// @desc    Get student's learning progress and module statuses
// @access  Private
router.get('/progress', auth, getStudentProgress);

// @route   GET /api/study-plan/week/:weekNumber
// @desc    Get learning content for a specific week
// @access  Private
router.get('/week/:weekNumber', auth, getWeekContent);

// @route   GET /api/study-plan/step/:weekNumber/:stepId
// @desc    Get content for a specific step
// @access  Private
router.get('/step/:weekNumber/:stepId', auth, getStepContent);

// @route   POST /api/study-plan/submit-quiz
// @desc    Submit quiz answers for a step
// @access  Private
router.post('/submit-quiz', auth, submitStepQuiz);

module.exports = router;
