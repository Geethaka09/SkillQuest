const pool = require('../config/database');

/**
 * GamificationService
 * Core service for managing the gamification loop: XP, Levels, and Streaks.
 * 
 * Architecture Note:
 * This service encapsulates all "write" logic for the gamification system.
 * Controllers should simpler call these methods rather than writing SQL directly.
 * 
 * Key Mechanics:
 * 1. Progression: Quadratic leveling curve (Level = floor(sqrt(totalXP/100))).
 * 2. Retention: Daily streak system with server-side validation.
 * 3. Rewards: Badges and immediate XP feedback.
 */
class GamificationService {
    /**
     * Calculates the current level based on total XP.
     * Formula: Level = floor(sqrt(TotalXP / 100))
     * 
     * Why Quadratic?
     * It makes early levels easy to reach (fast dopamine hits), while higher levels
     * require exponentially more effort, maintaining long-term challenge.
     * 
     * Landmarks:
     * - 100 XP -> Level 1
     * - 400 XP -> Level 2
     * - 2500 XP -> Level 5
     * - 10000 XP -> Level 10
     * 
     * @param {number} totalXP - Total experience points gathered by the user.
     * @returns {number} The calculated level (integer).
     */
    static calculateLevel(totalXP) {
        if (totalXP < 0) return 0;
        return Math.floor(Math.sqrt(totalXP / 100));
    }

    /**
     * Inverse of calculateLevel. Returns the minimum XP needed to reach a specific level.
     * Used to calculate progress bars (e.g., "450/900 XP to next level").
     * 
     * @param {number} level - The target level.
     * @returns {number} The total XP required to reach that level.
     */
    static calculateXPForLevel(level) {
        if (level < 0) return 0;
        return level * level * 100;
    }

    /**
     * Map numerical levels to cool rank titles.
     * Used for UI display to give users a sense of identity.
     * 
     * @param {number} level - Current user level.
     * @returns {string} The rank title (e.g., "RISING STAR").
     */
    static getLevelTitle(level) {
        if (level >= 50) return 'LEGENDARY MASTER';
        if (level >= 40) return 'GRANDMASTER';
        if (level >= 30) return 'MASTER';
        if (level >= 25) return 'EXPERT';
        if (level >= 20) return 'ELITE EXPLORER';
        if (level >= 15) return 'SKILLED LEARNER';
        if (level >= 10) return 'RISING STAR';
        if (level >= 5) return 'APPRENTICE';
        if (level >= 2) return 'NOVICE';
        return 'BEGINNER';
    }

    /**
     * Utility: Calculates days between two timestamps.
     * Uses UTC to prevent streak bugs caused by timezone shifts (e.g., travel).
     * 
     * @returns {number} Absolute difference in days.
     */
    static daysDifference(date1, date2) {
        const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return Math.floor(Math.abs(utc1 - utc2) / (1000 * 60 * 60 * 24));
    }

    /**
     * Updates the user's daily streak.
     * 
     * CRITICAL LOGIC:
     * 1. Comparison is done against the SERVER time (UTC), never the client time.
     * 2. Idempotency: Calling this multiple times in one day has no side effects.
     * 
     * State Transitions:
     * - Last Login = Yesterday -> Streak++ (Maintained!)
     * - Last Login = Today     -> No Change (Already handled)
     * - Last Login < Yesterday -> Streak = 1 (Reset :()
     * 
     * @param {string} userId - The student's ID.
     * @returns {Promise<{streak: number, updated: boolean}>} The new streak value.
     */
    static async updateStreak(userId) {
        // Generate today's date on SERVER - never trust client
        const today = new Date();

        // Fetch current streak and last activity date from database
        const [rows] = await pool.execute(
            'SELECT current_streak, last_login FROM student WHERE student_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        const { current_streak, last_login } = rows[0];
        let newStreak = current_streak || 0;
        let updated = false;

        if (!last_login) {
            // First activity ever - start streak at 1
            newStreak = 1;
            updated = true;
        } else {
            const lastDate = new Date(last_login);
            const daysDiff = this.daysDifference(today, lastDate);

            if (daysDiff === 0) {
                // Same day - do nothing, keep current streak
                updated = false;
            } else if (daysDiff === 1) {
                // Consecutive day - increment streak
                newStreak = (current_streak || 0) + 1;
                updated = true;
            } else {
                // More than 1 day gap - reset streak to 1
                newStreak = 1;
                updated = true;
            }
        }

        // Update database if streak changed
        if (updated) {
            // Also update longest_streak if new streak is a record
            await pool.execute(
                `UPDATE student 
                 SET current_streak = ?, 
                     last_login = ?,
                     longest_streak = GREATEST(COALESCE(longest_streak, 0), ?)
                 WHERE student_ID = ?`,
                [newStreak, today.toISOString().split('T')[0], newStreak, userId]
            );
        }

        return {
            streak: newStreak,
            updated
        };
    }

    /**
     * Get complete dashboard payload for gamification stats
     * 
     * @param {string} userId - Student ID
     * @returns {Promise<Object>} Dashboard payload with all gamification data
     */
    static async getDashboardPayload(userId) {
        // Fetch fresh user data from database
        const [rows] = await pool.execute(
            'SELECT total_xp, current_level, current_streak, longest_streak, last_login, level FROM student WHERE student_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        let { total_xp, current_streak, longest_streak, last_login, level } = rows[0];
        const totalXP = total_xp || 0;

        // SANITY CHECK (Option C): If last_login is stale but streak is high, reset it
        // This catches test data or corrupted streaks
        if (last_login && current_streak > 0) {
            const today = new Date();
            const lastDate = new Date(last_login);
            const daysDiff = this.daysDifference(today, lastDate);

            if (daysDiff > 1) {
                // Streak is stale - should have been reset but wasn't
                // Auto-correct: reset to 0 and update DB
                current_streak = 0;
                await pool.execute(
                    'UPDATE student SET current_streak = 0 WHERE student_ID = ?',
                    [userId]
                );
                console.log(`⚠️ Auto-reset stale streak for user ${userId}`);
            }
        }

        // Calculate current level using quadratic formula
        const currentLevel = this.calculateLevel(totalXP);

        // Calculate XP thresholds
        const currentLevelXP = this.calculateXPForLevel(currentLevel);
        const nextLevelXP = this.calculateXPForLevel(currentLevel + 1);

        // Calculate progress percentage within current level (0-100)
        const xpIntoCurrentLevel = totalXP - currentLevelXP;
        const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
        const progressPercentage = xpNeededForNextLevel > 0
            ? Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpNeededForNextLevel) * 100))
            : 0;

        // Get level title
        const levelTitle = this.getLevelTitle(currentLevel);

        return {
            currentLevel,
            currentXP: totalXP,
            currentLevelXP,      // XP at start of current level
            nextLevelXP,         // XP needed for next level
            xpToNextLevel: nextLevelXP - totalXP, // Remaining XP to level up
            progressPercentage: parseFloat(progressPercentage.toFixed(2)),
            currentStreak: current_streak || 0,
            longestStreak: longest_streak || 0,
            levelTitle,
            stage: level || 'beginner'
        };
    }

    /**
     * Add XP to user and update level if necessary
     * 
     * @param {string} userId - Student ID
     * @param {number} xpAmount - Amount of XP to add
     * @returns {Promise<Object>} Updated gamification data with level up info
     */
    static async addXP(userId, xpAmount) {
        // Get current XP
        const [rows] = await pool.execute(
            'SELECT total_xp, current_level FROM student WHERE student_ID = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found');
        }

        const oldXP = rows[0].total_xp || 0;
        const oldLevel = this.calculateLevel(oldXP);

        const newXP = oldXP + xpAmount;
        const newLevel = this.calculateLevel(newXP);

        // Update database
        await pool.execute(
            'UPDATE student SET total_xp = ?, current_level = ? WHERE student_ID = ?',
            [newXP, newLevel, userId]
        );

        const leveledUp = newLevel > oldLevel;

        return {
            previousXP: oldXP,
            newXP,
            xpGained: xpAmount,
            previousLevel: oldLevel,
            newLevel,
            leveledUp,
            levelTitle: this.getLevelTitle(newLevel)
        };
    }

    /**
     * Get today's goals progress
     * Tracks: steps completed today, quizzes passed today, streak progress
     * 
     * @param {string} userId - Student ID
     * @returns {Promise<Object>} Daily goals data
     */
    static async getDailyGoals(userId) {
        const today = new Date().toISOString().split('T')[0];

        // Get steps completed today (from quiz_attempts)
        const [stepsToday] = await pool.execute(
            `SELECT COUNT(DISTINCT CONCAT(week_number, '-', step_ID)) as completed_steps
             FROM quiz_attempts 
             WHERE student_ID = ? 
             AND DATE(finished_at) = ?
             AND is_correct = 1`,
            [userId, today]
        );

        // Get quizzes passed today on FIRST attempt (Sharpshooter)
        const [sharpshooterToday] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) as perfect_quizzes
             FROM study_plan 
             WHERE student_ID = ? 
             AND step_status = 'COMPLETED'
             AND attempt_count = 1
             AND DATE(completed_at) = ?`,
            [userId, today]
        );

        // Get streak info
        const [streakData] = await pool.execute(
            `SELECT current_streak, last_login FROM student WHERE student_ID = ?`,
            [userId]
        );

        const lastActivity = streakData[0]?.last_login;
        const lastActivityDate = lastActivity ? new Date(lastActivity).toISOString().split('T')[0] : null;
        const streakUpdatedToday = lastActivityDate === today;

        const stepsCompleted = stepsToday[0]?.completed_steps || 0;
        const perfectQuizzes = sharpshooterToday[0]?.perfect_quizzes || 0;

        // Calculate goals
        const goals = [
            {
                id: 1,
                text: 'Complete today\'s learning item',
                progress: stepsCompleted > 0 ? 'COMPLETED!' : 'PROGRESS: 0/1',
                xp: '+100 XP',
                completed: stepsCompleted >= 1
            },
            {
                id: 2,
                text: 'Sharpshooter: Ace a quiz on first try',
                progress: perfectQuizzes > 0 ? 'COMPLETED!' : null,
                xp: '+500 XP',
                completed: perfectQuizzes > 0
            },
            {
                id: 3,
                text: 'Progress toward your weekly streak',
                progress: streakUpdatedToday ? 'STREAK MAINTAINED!' : null,
                xp: '+50 XP',
                completed: streakUpdatedToday
            }
        ];

        const completedGoals = goals.filter(g => g.completed).length;

        return {
            goals,
            completedGoals,
            totalGoals: 3,
            stepsCompletedToday: stepsCompleted,
            quizzesPassedToday: perfectQuizzes,
            streakMaintained: streakUpdatedToday
        };
    }

    /**
     * Get user earned badges
     * 
     * @param {string} userId - Student ID
     * @returns {Promise<Array>} List of earned badges
     */
    static async getUserBadges(userId) {
        // Fetch badges from student_badges table
        // Assumes table has relevant badge info or we select all
        // We'll select everything to be safe and adaptable
        const [rows] = await pool.execute(
            'SELECT * FROM student_badges WHERE student_ID = ? ORDER BY awarded_at DESC',
            [userId]
        );

        return rows;
    }
}

module.exports = GamificationService;
