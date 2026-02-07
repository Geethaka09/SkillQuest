const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getStudentProgress,
    getWeekContent,
    getStepContent,
    submitStepQuiz
} = require('../controllers/studyPlanController');

/**
 * Study Plan Routes
 * Core learning flow routes.
 * Base URL: /api/study-plan
 */

// @route   GET /api/study-plan/progress
// @desc    Get dashboard learning map & stats
// @access  Private
router.get('/progress', auth, getStudentProgress);

// @route   GET /api/study-plan/week/:weekNumber
// @desc    Get all steps for a specific week
// @access  Private
router.get('/week/:weekNumber', auth, getWeekContent);

// @route   GET /api/study-plan/step/:weekNumber/:stepId
// @desc    Get specific learning step content
// @access  Private
router.get('/step/:weekNumber/:stepId', auth, getStepContent);

// @route   POST /api/study-plan/submit-quiz
// @desc    Submit step quiz & handle progression
// @access  Private
router.post('/submit-quiz', auth, submitStepQuiz);

module.exports = router;
