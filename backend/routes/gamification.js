const express = require('express');
const router = express.Router();
const { getDashboardStats, addXP, getDailyGoals } = require('../controllers/gamificationController');
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

module.exports = router;
