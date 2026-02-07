const RLService = require('../services/RLService');

/**
 * RL (Reinforcement Learning) Controller
 * Exposes endpoints for the frontend to interact with the Python RL Agent.
 */

/**
 * Get RL Recommendation
 * 
 * Flow:
 * 1. User completes an action (Quiz, login...).
 * 2. Frontend calls this endpoint.
 * 3. Backend aggregates state vector (Engagement, Performance...).
 * 4. Sends state to Python API -> Gets Action (e.g., "Badge Injection").
 * 5. Returns action to frontend.
 * 
 * @route GET /api/rl/recommend
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
 * Get Student Metrics (Debug)
 * 
 * Returns the raw state vector that would be sent to the RL Agent.
 * Useful for debugging why the agent is making certain decisions.
 * 
 * @route GET /api/rl/metrics
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
 * Send Feedback
 * 
 * Closes the RL loop.
 * - Called when the user *accepts* or *ignores* a recommendation.
 * - Sends { reward: +1 } or { reward: -0.1 } to the Python API.
 * 
 * @route POST /api/rl/feedback
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
