/**
 * RL (Reinforcement Learning) Routes
 * Endpoints for RL-based gamification recommendations
 */
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getRecommendation, getMetrics, sendFeedback } = require('../controllers/rlController');

// @route   GET /api/rl/recommend
// @desc    Get RL action recommendation for current user
// @access  Private
router.get('/recommend', auth, getRecommendation);

// @route   GET /api/rl/metrics
// @desc    Get user metrics (for debugging)
// @access  Private
router.get('/metrics', auth, getMetrics);

// @route   POST /api/rl/feedback
// @desc    Send feedback to RL model for training
// @access  Private
router.post('/feedback', auth, sendFeedback);

module.exports = router;
