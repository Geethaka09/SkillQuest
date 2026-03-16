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
 * 5. Auto-saves interaction_id to database for reliable tracking.
 * 6. Returns action to frontend.
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
        if (error.message === 'Student not found') {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
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
 * - Uses DB to auto-resolve interaction_id if not provided by frontend.
 * - Sends { interaction_id, engaged } to the Python API.
 * - Marks the DB record as feedback_sent to prevent duplicates.
 * 
 * @route POST /api/rl/feedback
 */
const sendFeedback = async (req, res) => {
    try {
        const studentId = req.user.id;
        // Frontend sends: { engaged: true/false, interactionId: "<optional>" }
        const { engaged, interactionId } = req.body;

        if (typeof engaged !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: engaged (boolean)'
            });
        }

        const result = await RLService.sendFeedback(studentId, engaged, interactionId);

        res.json(result);
    } catch (error) {
        console.error('RL Feedback Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send feedback'
        });
    }
};

/**
 * Track User Engagement
 * 
 * New endpoint for the frontend to report that a user interacted with
 * an RL-served action (e.g., clicked "Claim Reward" on a badge injection,
 * started a lesson during a multiplier boost, etc.).
 * 
 * This is the primary way to close the feedback loop:
 * 1. Looks up the most recent pending interaction for this student from the DB.
 * 2. Marks it as engaged.
 * 3. Sends the feedback payload to the RL model.
 * 
 * @route POST /api/rl/engage
 * @body { actionCode: string (optional), interactionId: string (optional) }
 */
const trackEngagement = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { actionCode, interactionId } = req.body;

        let resolvedInteractionId = interactionId || null;

        // If no interactionId provided, look it up from the DB
        if (!resolvedInteractionId) {
            const pending = await RLService.getPendingInteraction(studentId);
            if (!pending) {
                return res.status(404).json({
                    success: false,
                    error: 'No pending RL interaction found for this user. It may have expired.'
                });
            }
            resolvedInteractionId = pending.interaction_id;
        }

        // Mark as engaged and send feedback to RL API
        const result = await RLService.markEngaged(resolvedInteractionId, true);

        res.json({
            success: result.success,
            message: result.success ? 'Engagement tracked and feedback sent to RL model' : 'Failed to track engagement',
            data: {
                interaction_id: resolvedInteractionId,
                feedback_sent: result.feedback_sent || false
            }
        });
    } catch (error) {
        console.error('RL Engagement Tracking Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track engagement'
        });
    }
};

/**
 * Get Interaction History
 * 
 * Returns the RL interaction history for the authenticated student.
 * Useful for debugging and analytics.
 * 
 * @route GET /api/rl/interactions
 */
const getInteractionHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const interactions = await RLService.getInteractionHistory(studentId, limit);

        res.json({
            success: true,
            count: interactions.length,
            data: interactions
        });
    } catch (error) {
        console.error('RL Interaction History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get interaction history'
        });
    }
};

module.exports = { getRecommendation, getMetrics, sendFeedback, trackEngagement, getInteractionHistory };
