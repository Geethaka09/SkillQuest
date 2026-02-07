const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getDashboardStats,
    addXP,
    getDailyGoals,
    getUserBadges
} = require('../controllers/gamificationController');

/**
 * Gamification Routes
 * Base URL: /api/gamification
 */

// @route   GET /api/gamification/dashboard
// @desc    Get main dashboard stats (Level, Streak, Progress)
// @access  Private
router.get('/dashboard', auth, getDashboardStats);

// @route   GET /api/gamification/daily-goals
// @desc    Get today's 3 assigned goals
// @access  Private
router.get('/daily-goals', auth, getDailyGoals);

// @route   GET /api/gamification/badges
// @desc    Get all earned badges
// @access  Private
router.get('/badges', auth, getUserBadges);

// @route   POST /api/gamification/add-xp
// @desc    Manually award XP (e.g., from external events)
// @access  Private
router.post('/add-xp', auth, addXP);

module.exports = router;
