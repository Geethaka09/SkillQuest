const GamificationService = require('../services/GamificationService');

/**
 * Get dashboard gamification stats
 * 
 * Flow:
 * 1. Update streak (silent background check-in)
 * 2. Fetch fresh user data with calculated payload
 * 3. Return dashboard payload to frontend
 * 
 * @route GET /api/gamification/dashboard
 * @access Private
 */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Step 1: Silent background streak check-in
        // This updates the streak based on last activity date
        await GamificationService.updateStreak(userId);

        // Step 2 & 3: Get fresh dashboard payload with all calculated values
        const dashboardData = await GamificationService.getDashboardPayload(userId);

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);

        if (error.message === 'User not found') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            message: `Server error: ${error.message}`
        });
    }
};

/**
 * Add XP to user (for use by other parts of the system)
 * 
 * @route POST /api/gamification/add-xp
 * @access Private
 */
const addXP = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive XP amount'
            });
        }

        // Add XP and get result
        const result = await GamificationService.addXP(userId, amount);

        // Also update streak since this is an activity
        await GamificationService.updateStreak(userId);

        res.json({
            success: true,
            message: result.leveledUp
                ? `Level Up! You've reached level ${result.newLevel}!`
                : `+${amount} XP earned!`,
            data: result
        });
    } catch (error) {
        console.error('Add XP error:', error);

        if (error.message === 'User not found') {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

/**
 * Get daily goals progress
 * 
 * @route GET /api/gamification/daily-goals
 * @access Private
 */
const getDailyGoals = async (req, res) => {
    try {
        const userId = req.user.id;
        const goalsData = await GamificationService.getDailyGoals(userId);

        res.json({
            success: true,
            data: goalsData
        });
    } catch (error) {
        console.error('Get daily goals error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

module.exports = { getDashboardStats, addXP, getDailyGoals };
