const express = require('express');
const router = express.Router();
const { getWeeklyEngagement, getDailyXP } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

/**
 * Analytics Routes
 * Base URL: /api/analytics
 */

// @route   GET /api/analytics/weekly-engagement
// @desc    Get hours spent per day for charts
// @access  Private
router.get('/weekly-engagement', auth, getWeeklyEngagement);

// @route   GET /api/analytics/xp-velocity
// @desc    Get daily XP earnings for velocity chart
// @access  Private
router.get('/xp-velocity', auth, getDailyXP);

module.exports = router;
