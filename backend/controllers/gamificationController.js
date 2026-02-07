const GamificationService = require('../services/GamificationService');

/**
 * Gamification Controller
 * Handles user interactions with the gamification system (Dashboard, XP, Badges).
 */

/**
 * Get Dashboard Gamification Stats
 * 
 * This is the "Heartbeat" of the gamification system. 
 * Expected to be called every time the user lands on the dashboard.
 * 
 * Workflow:
 * 1. "Silent Check-in": Updates user streak internally (checks if they missed a day).
 * 2. Fetches fresh payload: Level, XP, Progress Bar, Streak, and Badges.
 * 3. Returns everything needed to render the gamification widgets.
 * 
 * @route GET /api/gamification/dashboard
 */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Step 1: Silent background streak check-in
        // This ensures the streak is accurate even if they didn't do a quiz yet
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
 * Add XP to User
 * 
 * Generic endpoint to award XP for arbitrary actions.
 * - Used effectively for "Manual" rewards or external triggers.
 * - Checks for Level Up: If XP crosses threshold, returns `leveledUp: true`.
 * 
 * @route POST /api/gamification/add-xp
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
 * Get Daily Goals
 * Fetches the 3 daily tasks assigned to the user.
 * 
 * @route GET /api/gamification/daily-goals
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

/**
 * Get User Badges
 * Returns list of earned badges for the Profile page.
 * 
 * @route GET /api/gamification/badges
 */
const getUserBadges = async (req, res) => {
    try {
        const userId = req.user.id;
        const badges = await GamificationService.getUserBadges(userId);

        res.json({
            success: true,
            data: badges
        });
    } catch (error) {
        console.error('Get user badges error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

module.exports = { getDashboardStats, addXP, getDailyGoals, getUserBadges };
