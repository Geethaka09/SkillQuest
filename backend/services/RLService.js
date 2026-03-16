/**
 * RL (Reinforcement Learning) Service
 * 
 * Bridges the Node.js backend with the Python RL API.
 * Responsibilities:
 * 1. Data Aggregation: Collects 10+ metrics from SQL to build the Student State Vector.
 * 2. Prediction: Sends state to RL Agent -> Gets optimized Action (e.g., "Badge Injection").
 * 3. Persistence: Saves every interaction_id in the DB for reliable tracking.
 * 4. Feedback Loop: Reports back whether the student engaged with the action to train the model.
 */
const axios = require('axios');
const pool = require('../config/database');

// RL API Base URL - update this when deploying
const RL_API_URL = process.env.RL_API_URL || 'http://localhost:5001';

// Maps action_id numbers to codes the frontend uses
const ACTION_MAP = {
    0: { action_code: 'STANDARD_XP', action_name: 'Standard XP', description: 'Award normal XP points for activity' },
    1: { action_code: 'MULTIPLIER_BOOST', action_name: 'Multiplier Boost', description: 'Apply XP multiplier (2x, 3x) next activity' },
    2: { action_code: 'BADGE_INJECTION', action_name: 'Badge Injection', description: 'Award a surprise badge to boost motivation' },
    3: { action_code: 'RANK_COMPARISON', action_name: 'Rank Comparison', description: "Show 'X points to reach Top N' message" },
    4: { action_code: 'EXTRA_GOALS', action_name: 'Extra Goals', description: 'Set additional achievable micro-goals' }
};

class RLService {
    /**
     * Aggregates all necessary student metrics into a single payload for the RL Agent.
     * 
     * The RL Agent needs a "State Vector" representing the student's current context.
     * This method runs multiple parallel queries to fetch:
     * - Engagement (Active minutes, session duration)
     * - Performance (Quiz accuracy, recent points)
     * - consistency (Days since login, consecutive completions)
     * 
     * @param {string} studentId - The student's unique ID.
     * @returns {Promise<Object>} A JSON object matching the RL API's expected input schema.
     */
    static async getStudentMetrics(studentId) {
        // 1. Get student basic info (Level, XP)
        const [studentRows] = await pool.execute(
            `SELECT student_ID, level, total_xp, last_login 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );

        if (studentRows.length === 0) {
            throw new Error('Student not found');
        }

        const student = studentRows[0];

        // 2. Active minutes (Time elapsed since last login timestamp)
        // Proxy for "Current Session Length" if they are active, or "Time since last seen"
        const [activeMinutesRows] = await pool.execute(
            `SELECT TIMESTAMPDIFF(MINUTE, last_login, NOW()) as active_minutes 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );
        const activeMinutes = activeMinutesRows[0]?.active_minutes || 0;

        // 3. Quiz Accuracy (Average score across all attempts)
        // Good indicator of skill mastery vs struggle
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

        // 4. Recency (Days since last login)
        // Key factor for "Churn Risk" calculation
        const [daysRows] = await pool.execute(
            `SELECT DATEDIFF(CURDATE(), DATE(last_login)) as days_since 
             FROM student WHERE student_ID = ?`,
            [studentId]
        );
        const daysSinceLastLogin = daysRows[0]?.days_since || 0;

        // 5. Daily XP (Points earned today)
        // Indicates "Current Momentum"
        const [dailyXpRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) * 80 as daily_xp 
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND DATE(completed_at) = CURDATE()`,
            [studentId]
        );
        const dailyXp = dailyXpRows[0]?.daily_xp || 0;

        // 6. Modules Done Today
        // Granular volume of work completed
        const [modulesDoneRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) as modules_done 
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND DATE(completed_at) = CURDATE()`,
            [studentId]
        );
        const modulesDone = modulesDoneRows[0]?.modules_done || 0;

        // 7. Recent Points (XP earned since last login)
        // Validates "Session Productivity"
        const [recentPointsRows] = await pool.execute(
            `SELECT COUNT(DISTINCT step_ID) * 80 as recent_points
             FROM study_plan 
             WHERE student_ID = ? AND step_status = 'COMPLETED' 
             AND completed_at >= (SELECT last_login FROM student WHERE student_ID = ?)`,
            [studentId, studentId]
        );
        const recentPoints = recentPointsRows[0]?.recent_points || 0;

        // 8. Total Badges
        // Proxy for "Long term achievement/motivation"
        const [badgesRows] = await pool.execute(
            `SELECT COUNT(*) as total_badges FROM student_badges WHERE student_ID = ?`,
            [studentId]
        );
        const totalBadges = badgesRows[0]?.total_badges || 0;

        // 9. Session Duration (Actual seconds spent in quizzes)
        // Accurate measure of "Time on Task"
        const [sessionRows] = await pool.execute(
            `SELECT SUM(TIMESTAMPDIFF(SECOND, attempted_at, finished_at)) as session_duration
             FROM quiz_attempts 
             WHERE student_ID = ? 
             AND attempted_at >= (SELECT last_login FROM student WHERE student_ID = ?)`,
            [studentId, studentId]
        );
        const sessionDuration = sessionRows[0]?.session_duration || 0;

        // 10. Quiz Score Trend (Avg of last 10 attempts)
        // Detects if performance is improving or degrading
        const [quizScoreRows] = await pool.execute(
            `SELECT ROUND(AVG(score) * 100) as quiz_score 
             FROM quiz_attempts 
             WHERE student_ID = ? 
             ORDER BY attempted_at DESC LIMIT 10`,
            [studentId]
        );
        const quizScore = quizScoreRows[0]?.quiz_score || 0;

        // 11. Consecutive Completions
        // Streak of successful module completions
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

        // Normalize session duration: expected = 600s (10 mins per quiz/module), cap at 1.5
        const expectedTime = 600;
        const durationNorm = Math.min(1.5, Math.max(0, sessionDuration) / expectedTime);

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
            total_badges_count: totalBadges,           // New field required by updated RL API
            session_duration: Math.max(0, sessionDuration),
            duration_norm: durationNorm,               // New field: session_duration normalized 0-1
            quiz_score: quizScore,
            consecutive_completions: consecutiveCompletions,
            consecutive: consecutiveCompletions        // New field required by updated RL API
        };
    }

    // =========================================================================
    // DATABASE PERSISTENCE METHODS (rl_interactions table)
    // =========================================================================

    /**
     * Save an RL interaction to the database for tracking.
     * Called automatically after every successful /predict call.
     * 
     * @param {string} studentId - Student ID
     * @param {string} interactionId - UUID from the RL API response
     * @param {number} actionId - Action number (0-4)
     * @param {string} actionCode - Mapped action code (e.g., 'BADGE_INJECTION')
     * @param {number|null} riskScore - Risk score from RL API
     * @returns {Promise<Object>} The inserted row info
     */
    static async saveInteraction(studentId, interactionId, actionId, actionCode, riskScore = null) {
        try {
            const [result] = await pool.execute(
                `INSERT INTO rl_interactions 
                    (student_ID, interaction_id, action_id, action_code, risk_score, expires_at)
                 VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
                [studentId, interactionId, actionId, actionCode, riskScore]
            );

            console.log(`📝 Saved RL interaction: ${interactionId} for student ${studentId} (action: ${actionCode})`);
            return { id: result.insertId, interaction_id: interactionId };
        } catch (error) {
            console.error('Failed to save RL interaction:', error.message);
            // Non-fatal: don't break the recommendation flow if DB save fails
            return null;
        }
    }

    /**
     * Get the most recent pending (non-engaged, non-expired) interaction for a student.
     * Used when the frontend doesn't send an interaction_id — we look it up ourselves.
     * 
     * @param {string} studentId - Student ID
     * @returns {Promise<Object|null>} The pending interaction or null
     */
    static async getPendingInteraction(studentId) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM rl_interactions 
                 WHERE student_ID = ? 
                   AND engaged IS NULL 
                   AND (expires_at IS NULL OR expires_at > NOW())
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [studentId]
            );

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Failed to get pending interaction:', error.message);
            return null;
        }
    }

    /**
     * Mark an interaction as engaged/ignored and send feedback to the RL API.
     * This is the core of the reward phase.
     * 
     * @param {string} interactionId - The interaction UUID
     * @param {boolean} engaged - Whether the user engaged with the action
     * @returns {Promise<Object>} Result with feedback status
     */
    static async markEngaged(interactionId, engaged) {
        try {
            // 1. Update the interaction record
            await pool.execute(
                `UPDATE rl_interactions 
                 SET engaged = ?, engaged_at = NOW() 
                 WHERE interaction_id = ? AND engaged IS NULL`,
                [engaged ? 1 : 0, interactionId]
            );

            // 2. Send feedback to the RL API
            let feedbackResult = null;
            let feedbackSent = false;

            try {
                const response = await axios.post(`${RL_API_URL}/feedback`, {
                    interaction_id: interactionId,
                    engaged: engaged ? true : false
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });

                feedbackResult = response.data;
                feedbackSent = true;
                console.log(`✅ RL feedback sent for ${interactionId}: engaged=${engaged}`);
            } catch (apiError) {
                console.error(`⚠️ RL feedback API failed for ${interactionId}:`, apiError.message);
                // Feedback failed but we still recorded the engagement — can retry later
            }

            // 3. Mark feedback_sent status in DB
            await pool.execute(
                `UPDATE rl_interactions SET feedback_sent = ? WHERE interaction_id = ?`,
                [feedbackSent ? 1 : 0, interactionId]
            );

            return {
                success: true,
                interaction_id: interactionId,
                engaged,
                feedback_sent: feedbackSent,
                feedback: feedbackResult
            };
        } catch (error) {
            console.error('Failed to mark interaction as engaged:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get interaction history for a student (for analytics/debugging).
     * 
     * @param {string} studentId - Student ID
     * @param {number} limit - Max rows to return
     * @returns {Promise<Array>} List of interactions
     */
    static async getInteractionHistory(studentId, limit = 20) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM rl_interactions 
                 WHERE student_ID = ? 
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [studentId, limit]
            );
            return rows;
        } catch (error) {
            console.error('Failed to get interaction history:', error.message);
            return [];
        }
    }

    // =========================================================================
    // RL API COMMUNICATION METHODS
    // =========================================================================

    /**
     * Call RL API to get action recommendation.
     * The updated API returns only action_id (0-4) + interaction_id.
     * We map action_id → action_code/name here so the frontend keeps working.
     * 
     * ENHANCED: Now auto-saves the interaction to the database after a successful
     * API call, so the feedback loop is backed by the DB, not just localStorage.
     */
    static async getRecommendation(studentId) {
        try {
            const metrics = await this.getStudentMetrics(studentId);

            const response = await axios.post(`${RL_API_URL}/predict`, metrics, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 90000 // Increased from 30s to 90s for Azure cold starts
            });

            const { action_id, interaction_id, risk_score } = response.data;
            const action = ACTION_MAP[action_id] || ACTION_MAP[0];

            // === NEW: Persist the interaction in the database ===
            await this.saveInteraction(
                studentId,
                interaction_id,
                action_id,
                action.action_code,
                risk_score
            );

            return {
                success: true,
                interaction_id,   // Needed by frontend to close the RL loop via /feedback
                risk_score,
                recommendation: action
            };
        } catch (error) {
            console.error('RL API Error:', error.message);
            return {
                success: false,
                error: error.message,
                recommendation: ACTION_MAP[0] // Fallback: Standard XP
            };
        }
    }

    /**
     * Send feedback to RL API for training.
     * 
     * ENHANCED: If interactionId is not provided by the frontend, automatically
     * looks up the most recent pending interaction from the database.
     * Also marks the DB record as feedback_sent to prevent duplicates.
     * 
     * @param {string} studentId - Student ID
     * @param {boolean} engaged - Whether user engaged with the recommendation
     * @param {string|null} interactionId - The interaction_id (optional — auto-looked up from DB)
     * @returns {Promise<Object>} Feedback response
     */
    static async sendFeedback(studentId, engaged, interactionId = null) {
        try {
            // If no interactionId provided, look it up from DB
            if (!interactionId) {
                const pending = await this.getPendingInteraction(studentId);
                if (pending) {
                    interactionId = pending.interaction_id;
                    console.log(`🔍 Auto-resolved interaction_id from DB: ${interactionId}`);
                } else {
                    console.warn(`⚠️ No pending interaction found for student ${studentId}`);
                    return {
                        success: false,
                        error: 'No pending interaction found. The interaction may have expired.'
                    };
                }
            }

            // Use the centralized markEngaged method which handles both DB + API
            return await this.markEngaged(interactionId, engaged);
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
                WHERE b.badge_id NOT IN (
                    SELECT badge_id FROM student_badges WHERE student_ID = ?
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
                INSERT INTO student_badges (student_ID, badge_id, awarded_at)
                VALUES (?, ?, NOW())
            `, [studentId, randomBadge.badge_id]);

            console.log(`Awarded badge ${randomBadge.badge_id} to student ${studentId}`);
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
