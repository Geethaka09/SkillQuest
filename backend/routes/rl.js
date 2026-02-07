const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getRecommendation,
    getMetrics,
    sendFeedback
} = require('../controllers/rlController');

/**
 * RL Routes (Reinforcement Learning)
 * Base URL: /api/rl
 */

// @route   GET /api/rl/recommend
// @desc    Get personalized action (e.g., Badge Injection)
// @access  Private
router.get('/recommend', auth, getRecommendation);

// @route   GET /api/rl/metrics
// @desc    Debug: View current student state vector
// @access  Private
router.get('/metrics', auth, getMetrics);

// @route   POST /api/rl/feedback
// @desc    Report user engagement (+1/-0.1 reward)
// @access  Private
router.post('/feedback', auth, sendFeedback);

module.exports = router;
