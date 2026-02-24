const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getStudentProgress, getWeekContent } = require('../controllers/trainingPlanController');

/**
 * Training Plan Routes (P13)
 * Base URL: /api/study-plan
 * 
 * P13: Generate and Present Training Plan
 */

// @route   GET /api/study-plan/progress
// @desc    Get dashboard learning map & stats (P13)
// @access  Private
router.get('/progress', auth, getStudentProgress);

// @route   GET /api/study-plan/week/:weekNumber
// @desc    Get all steps for a specific week (P13)
// @access  Private
router.get('/week/:weekNumber', auth, getWeekContent);

module.exports = router;
