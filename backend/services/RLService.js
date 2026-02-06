/**
 * RL (Reinforcement Learning) Service
 * Handles communication with the RL API for gamification recommendations
 */
const axios = require('axios');
const pool = require('../config/database');

// RL API Base URL - update this when deploying
const RL_API_URL = process.env.RL_API_URL || 'http://localhost:5001';

class RLService {
    /**
     * Get all parameters needed for RL API from database
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} Parameters for RL API
     */
    static async getStudentMetrics(studentId) {
        // 1. Get student basic info
        const [studentRows] = await pool.execute(
            `SELECT student_ID, level, total_xp, last_login 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );

        if (studentRows.length === 0) {
            throw new Error('Student not found');
        }

        const student = studentRows[0];

        // 2. Active minutes (time since last login)
        const [activeMinutesRows] = await pool.execute(
            `SELECT TIMESTAMPDIFF(MINUTE, last_login, NOW()) as active_minutes 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );
        const activeMinutes = activeMinutesRows[0]?.active_minutes || 0;

        // 3. Quiz accuracy (grouped by attempt)
        const [accuracyRows] = await pool.execute(
            `SELECT AVG(sub.accuracy) as quiz_accuracy FROM (
                SELECT week_number, step_ID, attempt_number, 
                       SUM(is_correct) / COUNT(*) as accuracy
                FROM quiz_attempts WHERE student_ID = ?
                GROUP BY week_number, step_ID, attempt_number
            ) sub`,
            [studentId]
        );
        const quizAccuracy = accuracyRows[0]?.quiz_accuracy || 0;

        // 4. Days since last login
        const [daysRows] = await pool.execute(
            `SELECT DATEDIFF(CURDATE(), DATE(last_login)) as days_since 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );
        const daysSinceLastLogin = daysRows[0]?.days_since || 0;

        // 5. Daily XP (steps completed today × ~80 XP)
        const [dailyXpRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) * 80 as daily_xp 
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND DATE(completed_at) = CURDATE()`,
            [studentId]
        );
        const dailyXp = dailyXpRows[0]?.daily_xp || 0;

        // 6. Modules done today
        const [modulesDoneRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) as modules_done 
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND DATE(completed_at) = CURDATE()`,
            [studentId]
        );
        const modulesDone = modulesDoneRows[0]?.modules_done || 0;

        // 7. Recent points (XP since login)
        const [recentPointsRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) * 80 as recent_points
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND completed_at >= (SELECT last_login FROM student WHERE student_ID = ?)`,
            [studentId, studentId]
        );
        const recentPoints = recentPointsRows[0]?.recent_points || 0;

        // 8. Total badges
        const [badgesRows] = await pool.execute(
            `SELECT COUNT(*) as total_badges FROM student_badges WHERE student_ID = ?`,
            [studentId]
        );
        const totalBadges = badgesRows[0]?.total_badges || 0;

        // 9. Session duration (seconds spent on quizzes since login)
        const [sessionRows] = await pool.execute(
            `SELECT SUM(TIMESTAMPDIFF(SECOND, attempted_at, finished_at)) as session_duration
             FROM quiz_attempts 
             WHERE student_ID = ? 
             AND attempted_at >= (SELECT last_login FROM student WHERE student_ID = ?)`,
            [studentId, studentId]
        );
        const sessionDuration = sessionRows[0]?.session_duration || 0;

        // 10. Quiz score (latest attempts)
        const [quizScoreRows] = await pool.execute(
            `SELECT ROUND(AVG(score) * 100) as quiz_score 
             FROM quiz_attempts 
             WHERE student_ID = ? 
             ORDER BY attempted_at DESC LIMIT 10`,
            [studentId]
        );
        const quizScore = quizScoreRows[0]?.quiz_score || 0;

        // 11. Consecutive completions
        const [consecutiveRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) as consecutive 
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED'`,
            [studentId]
        );
        const consecutiveCompletions = consecutiveRows[0]?.consecutive || 1;

        // Format level (capitalize first letter)
        const level = student.level
            ? student.level.charAt(0).toUpperCase() + student.level.slice(1)
            : 'Beginner';

        return {
            user_id: studentId,
            level,
            active_minutes: Math.max(0, activeMinutes),
            quiz_accuracy: parseFloat(quizAccuracy) || 0,
            days_since_last_login: Math.max(0, daysSinceLastLogin),
            daily_xp: dailyXp,
            modules_done: modulesDone,
            recent_points: recentPoints,
            total_badges: totalBadges,
            session_duration: Math.max(0, sessionDuration),
            quiz_score: quizScore,
            consecutive_completions: consecutiveCompletions
        };
    }

    /**
     * Call RL API to get action recommendation
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} RL API response with recommendation
     */
    static async getRecommendation(studentId) {
        try {
            // Get all metrics
            const metrics = await this.getStudentMetrics(studentId);

            // Call RL API
            const response = await axios.post(`${RL_API_URL}/predict`, metrics, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000 // Increased to 30s for Azure cold start
            });

            // Return the API response directly




            return response.data;
        } catch (error) {
            console.error('RL API Error:', error.message);
            return {
                success: false,
                error: error.message,
                // Default fallback action
                recommendation: {
                    action_code: 'STANDARD_XP',
                    action_name: 'Standard XP',
                    description: 'Award normal XP points'
                }
            };
        }
    }

    /**
     * Send feedback to RL API for training
     * @param {string} studentId - Student ID
     * @param {boolean} userReturned - Whether user came back
     * @returns {Promise<Object>} Feedback response
     */
    static async sendFeedback(studentId, userReturned) {
        try {
            const newUserData = userReturned
                ? await this.getStudentMetrics(studentId)
                : null;

            const response = await axios.post(`${RL_API_URL}/feedback`, {
                user_id: studentId,
                user_returned: userReturned,
                new_user_data: newUserData
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });

            return {
                success: true,
                feedback: response.data
            };
        } catch (error) {
            console.error('RL Feedback Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Select a random unearned badge for a student
     * @param {string} studentId - Student ID
     * @returns {Promise<Object|null>} Badge object or null if no badges available
     */
    static async selectRandomBadge(studentId) {
        try {
            // Get badges the student doesn't have yet
            const [availableBadges] = await pool.execute(`
                SELECT b.* FROM badges b
                WHERE b.badge_ID NOT IN (
                    SELECT badge_ID FROM student_badges WHERE student_ID = ?
                )
                LIMIT 10
            `, [studentId]);

            if (availableBadges.length === 0) {
                console.log('No unearned badges available for student:', studentId);
                return null;
            }

            // Pick a random badge
            const randomBadge = availableBadges[Math.floor(Math.random() * availableBadges.length)];

            // Award badge to student
            await pool.execute(`
                INSERT INTO student_badges (student_ID, badge_ID, awarded_at)
                VALUES (?, ?, NOW())
            `, [studentId, randomBadge.badge_ID]);

            console.log(`Awarded badge ${randomBadge.badge_ID} to student ${studentId}`);
            return randomBadge;
        } catch (error) {
            console.error('Badge selection error:', error.message);
            return null;
        }
    }

    /**
     * Calculate student's rank percentile based on total_xp
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} Rank information {percentile, rank_text}
     */
    static async calculateStudentRank(studentId) {
        try {
            // Get total number of students
            const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM student');
            const totalStudents = totalResult[0].total;

            if (totalStudents === 0) return { percentile: 100, rank_text: 'Top 0%' };

            // Get student's XP
            const [studentData] = await pool.execute(
                'SELECT total_xp FROM student WHERE student_ID = ?',
                [studentId]
            );

            if (studentData.length === 0) return { percentile: 0, rank_text: 'Unranked' };

            const studentXP = studentData[0].total_xp;

            // Count students with less XP
            const [rankResult] = await pool.execute(
                'SELECT COUNT(*) as students_below FROM student WHERE total_xp < ?',
                [studentXP]
            );

            const studentsBelowCount = rankResult[0].students_below;
            const percentile = Math.round((studentsBelowCount / totalStudents) * 100);

            // Convert to "Top X%" format
            const topPercentile = 100 - percentile;
            const rank_text = `Top ${topPercentile}%`;

            return { percentile: topPercentile, rank_text };
        } catch (error) {
            console.error('Rank calculation error:', error.message);
            return { percentile: 50, rank_text: 'Top 50%' }; // Default fallback
        }
    }
}

module.exports = RLService;
