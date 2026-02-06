/**
 * RL (Reinforcement Learning) Controller
 * Handles API endpoints for RL recommendations
 */
const RLService = require('../services/RLService');

/**
 * Get RL recommendation for current user
 * GET /api/rl/recommend
 */
const getRecommendation = async (req, res) => {
    try {
        const studentId = req.user.id;
        const result = await RLService.getRecommendation(studentId);

        res.json(result);
    } catch (error) {
        console.error('RL Recommendation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendation'
        });
    }
};

/**
 * Get student metrics (for debugging/display)
 * GET /api/rl/metrics
 */
const getMetrics = async (req, res) => {
    try {
        const studentId = req.user.id;
        const metrics = await RLService.getStudentMetrics(studentId);

        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('RL Metrics Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics'
        });
    }
};

/**
 * Send feedback to RL model
 * POST /api/rl/feedback
 */
const sendFeedback = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { userReturned } = req.body;

        const result = await RLService.sendFeedback(studentId, userReturned);

        res.json(result);
    } catch (error) {
        console.error('RL Feedback Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send feedback'
        });
    }
};

module.exports = { getRecommendation, getMetrics, sendFeedback };
