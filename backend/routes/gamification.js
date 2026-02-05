const express = require('express');
const router = express.Router();
const { getDashboardStats, addXP, getDailyGoals, getUserBadges } = require('../controllers/gamificationController');
const auth = require('../middleware/auth');

// @route   GET /api/gamification/dashboard
// @desc    Get gamification dashboard stats (XP level, streak, progress)
// @access  Private
router.get('/dashboard', auth, getDashboardStats);

// @route   GET /api/gamification/daily-goals
// @desc    Get today's goals progress
// @access  Private
router.get('/daily-goals', auth, getDailyGoals);

// @route   POST /api/gamification/add-xp
// @desc    Add XP to user (for system use)
// @access  Private
router.post('/add-xp', auth, addXP);

// @route   GET /api/gamification/badges
// @desc    Get user's earned badges
// @access  Private
router.get('/badges', auth, getUserBadges);

module.exports = router;
