const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getRecommendation,
    getMetrics,
    sendFeedback,
    trackEngagement,
    getInteractionHistory
} = require('../controllers/rlController');

/**
 * RL Routes (Reinforcement Learning)
 * Base URL: /api/rl
 */

// @route   GET /api/rl/recommend
// @desc    Get personalized action (e.g., Badge Injection). Auto-saves interaction to DB.
// @access  Private
router.get('/recommend', auth, getRecommendation);

// @route   GET /api/rl/metrics
// @desc    Debug: View current student state vector
// @access  Private
router.get('/metrics', auth, getMetrics);

// @route   GET /api/rl/interactions
// @desc    View RL interaction history for debugging/analytics
// @access  Private
router.get('/interactions', auth, getInteractionHistory);

// @route   POST /api/rl/feedback
// @desc    Report user engagement — auto-resolves interaction_id from DB if not provided
// @access  Private
router.post('/feedback', auth, sendFeedback);

// @route   POST /api/rl/engage
// @desc    Track engagement: frontend calls this when user interacts with an RL action
// @access  Private
router.post('/engage', auth, trackEngagement);

module.exports = router;
