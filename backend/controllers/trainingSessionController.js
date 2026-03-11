const pool = require('../config/database');
const GamificationService = require('../services/GamificationService');
const RLService = require('../services/RLService');

/**
 * Training Session Controller
 * 
 * Functional Requirements:
 *   P14 — Launch Interactive Training Session: System starts session, presents modules and quizzes.
 *   P15 — Present Content and Provide Feedback: Delivers content and provides immediate feedback.
 *   P16 — Monitor and Record Performance Data: RL Model records actions and time taken.
 *   P17 — Complete and Log Session Data: Updates profile, marks module as completed.
 */

/**
 * Get Step Content (P14, P15)
 * 
 * Fetches a single step's content (learning material + questions).
 * 
 * P14: Launches the training session for the given step.
 * P15: Returns content for presentation and feedback.
 * P16: If recId (Recommendation ID) is present, sends RL feedback asynchronously.
 */
const getStepContent = async (req, res) => {
    try {
        const studentId = req.user.id;
        const weekNumber = parseInt(req.params.weekNumber);
        const stepId = parseInt(req.params.stepId);
        const recommendationId = req.query.recId || null;

        // Get step data including questions
        const [rows] = await pool.execute(
            `SELECT 
                plan_id,
                step_ID,
                module_name,
                gen_QID,
                learning_content,
                question,
                options,
                correct_answer,
                step_status,
                attempt_count,
                user_response
             FROM study_plan 
             WHERE student_ID = ? 
             AND week_number = ? 
             AND step_ID = ?
             AND plan_id = (SELECT MAX(plan_id) FROM study_plan WHERE student_ID = ?)
             ORDER BY gen_QID`,
            [studentId, weekNumber, stepId, studentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Step not found'
            });
        }

        // Format response
        const questions = rows.map(row => ({
            genQID: row.gen_QID,
            question: row.question,
            options: row.options,
            correctAnswer: row.correct_answer,
            savedResponse: row.user_response || null
        }));

        res.json({
            success: true,
            planId: rows[0].plan_id,
            weekNumber: weekNumber,
            stepId: stepId,
            moduleName: rows[0].module_name,
            learningContent: rows[0].learning_content,
            stepStatus: rows[0].step_status,
            attemptCount: rows[0].attempt_count,
            questions: questions
        });

        // ─── P16: Monitor and Record Performance Data ───
        // Trigger RL Feedback (User Returned = true)
        // Fire-and-forget: we don't await this to avoid slowing down content load
        if (recommendationId) {
            RLService.sendFeedback(studentId, true, recommendationId)
                .then(res => {
                    if (res.success) console.log(`✅ RL FEEDBACK SENT for student ${studentId} (RecID: ${recommendationId})`);
                })
                .catch(err => console.error('⚠️ RL Feedback Error:', err.message));
        } else {
            console.log(`ℹ️ No active recommendation to feedback for student ${studentId}`);
        }

    } catch (error) {
        console.error('Get step content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch step content'
        });
    }
};

/**
 * Submit Step Quiz (P15, P16, P17)
 * 
 * Handles quiz submission, grading, and progression.
 * 
 * Flow:
 *   P15: Grades submission and provides immediate feedback (passed/failed, score).
 *   P16: Records all answers in quiz_attempts table with timestamps for RL analysis.
 *   P17: If passed — marks step COMPLETED, unlocks next step, awards XP, updates streak,
 *        calls RL API for personalized After-Action Report (Badge, Rank, etc.).
 */
const submitStepQuiz = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { planId, weekNumber, stepId, startTime, answers } = req.body;
        console.log('Quiz submission payload:', req.body); // Debug log
        console.log('Using FIXED controller with start_date column'); // PROOF OF UPDATE CHECK

        if (!planId) {
            console.error('Missing planId in submission');
            return res.status(400).json({
                success: false,
                message: 'Missing planId in submission'
            });
        }

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No answers provided'
            });
        }

        // Get correct answers from study_plan
        const [questions] = await pool.execute(
            `SELECT gen_QID, correct_answer, attempt_count 
             FROM study_plan 
             WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
            [studentId, weekNumber, stepId]
        );

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Step not found'
            });
        }

        // Get current attempt number (max attempt for this step + 1)
        const [attemptRows] = await pool.execute(
            `SELECT MAX(attempt_number) as maxAttempt 
             FROM quiz_attempts 
             WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
            [studentId, weekNumber, stepId]
        );
        const currentAttempt = (attemptRows[0].maxAttempt || 0) + 1;

        // Create a map for correct answers
        const correctAnswersMap = {};
        questions.forEach(q => {
            correctAnswersMap[q.gen_QID] = q.correct_answer;
        });

        let allCorrect = true;
        let score = 0;

        // Generate synchronized timestamps for all attempts
        const finishTime = new Date();
        const finishedAt = finishTime.toISOString().slice(0, 19).replace('T', ' ');

        let attemptedAt;
        if (startTime) {
            attemptedAt = new Date(startTime).toISOString().slice(0, 19).replace('T', ' ');
        } else {
            attemptedAt = finishedAt;
        }

        // ─── P16: Record Performance Data ───
        // Process each answer and insert into quiz_attempts
        for (const answer of answers) {
            const correctAnswer = correctAnswersMap[answer.genQID];
            const isCorrect = answer.response === correctAnswer;

            if (isCorrect) score++;
            else allCorrect = false;

            await pool.execute(
                `INSERT INTO quiz_attempts 
                 (plan_id, week_number, step_ID, gen_QID, attempt_number, student_ID, user_response, is_correct, score, attempted_at, finished_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [planId, weekNumber, stepId, answer.genQID, currentAttempt, studentId, answer.response, isCorrect ? 1 : 0, isCorrect ? 1 : 0, attemptedAt, finishedAt]
            );
        }

        // Update attempt_count in study_plan
        await pool.execute(
            `UPDATE study_plan 
             SET attempt_count = ? 
             WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
            [currentAttempt, studentId, weekNumber, stepId]
        );

        // ─── P15: Provide Feedback — Calculate Pass/Fail ───
        const totalQuestions = questions.length;
        const percentage = totalQuestions > 0 ? (score / totalQuestions) : 0;
        const passed = percentage >= 0.6;

        // ─── P17: Complete and Log Session Data ───
        if (passed) {
            // Mark current step as COMPLETED
            await pool.execute(
                `UPDATE study_plan 
                 SET step_status = 'COMPLETED', 
                     start_date = ?, 
                     completed_at = NOW() 
                 WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
                [attemptedAt, studentId, weekNumber, stepId]
            );

            // Unlock next step (set to IN_PROGRESS)
            const nextStepId = stepId + 1;
            await pool.execute(
                `UPDATE study_plan 
                 SET step_status = 'IN_PROGRESS' 
                 WHERE student_ID = ? AND week_number = ? AND step_ID = ? AND step_status = 'LOCKED'`,
                [studentId, weekNumber, nextStepId]
            );

            // Award XP for passing the quiz (50 base + 10 per correct answer)
            const xpEarned = 50 + (score * 10);
            await GamificationService.addXP(studentId, xpEarned);

            // Update streak (this updates last_activity_date)
            await GamificationService.updateStreak(studentId);
        }

        // Check if all steps in this week are now completed
        const [weekSteps] = await pool.execute(
            `SELECT 
                COUNT(DISTINCT step_ID) as total,
                COUNT(DISTINCT CASE WHEN step_status = 'COMPLETED' THEN step_ID END) as completed
             FROM study_plan WHERE student_ID = ? AND week_number = ?`,
            [studentId, weekNumber]
        );

        const isWeekComplete = weekSteps[0].total > 0 && weekSteps[0].completed === weekSteps[0].total;

        // If week is complete, check for next week
        if (isWeekComplete && passed) {
            const [nextWeekCheck] = await pool.execute(
                `SELECT COUNT(*) as count FROM study_plan 
                 WHERE student_ID = ? AND week_number = ? AND step_status = 'LOCKED'`,
                [studentId, weekNumber + 1]
            );
        }

        // Check if next step exists for navigation
        let nextStepExists = false;
        const nextStepId = stepId + 1;
        if (passed && !isWeekComplete) {
            const [nextStepCheck] = await pool.execute(
                `SELECT COUNT(*) as count FROM study_plan 
                 WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
                [studentId, weekNumber, nextStepId]
            );
            nextStepExists = nextStepCheck[0].count > 0;
        }

        // ─── P16/P17: RL After-Action Report ───
        let rlRecommendation = null;
        if (passed) {
            try {
                const rlResponse = await RLService.getRecommendation(studentId);

                if (rlResponse.success && rlResponse.recommendation) {
                    const actionCode = rlResponse.recommendation.action_code;

                    if (actionCode === 'BADGE_INJECTION') {
                        const badge = await RLService.selectRandomBadge(studentId);
                        if (badge) {
                            rlRecommendation = {
                                action_code: 'BADGE_INJECTION',
                                badge: {
                                    badge_ID: badge.badge_ID,
                                    name: badge.name,
                                    description: badge.description,
                                    icon_url: badge.icon_url
                                }
                            };
                        }
                    }
                    else if (actionCode === 'RANK_COMPARISON') {
                        const rankInfo = await RLService.calculateStudentRank(studentId);
                        rlRecommendation = {
                            action_code: 'RANK_COMPARISON',
                            rank_percentile: rankInfo.percentile,
                            rank_text: rankInfo.rank_text
                        };
                    }
                    else {
                        rlRecommendation = {
                            action_code: actionCode,
                            action_name: rlResponse.recommendation.action_name,
                            description: rlResponse.recommendation.description
                        };
                    }
                }
            } catch (error) {
                console.error('❌ RL trigger error:', error);
            }
        } else {
            console.log('⚠️ Skipping RL: Quiz not passed');
        }

        res.json({
            success: true,
            passed: passed,
            score: score,
            totalQuestions: totalQuestions,
            attemptNumber: currentAttempt,
            xpEarned: passed ? 50 + (score * 10) : 0,
            isWeekComplete: isWeekComplete && passed,
            nextStepId: nextStepExists ? nextStepId : null,
            weekNumber: weekNumber,
            rlRecommendation: rlRecommendation,
            message: passed
                ? (isWeekComplete
                    ? 'Congratulations! You completed this week! Return to dashboard to continue.'
                    : 'Congratulations! You passed. Next step unlocked!')
                : 'You need 60% to pass. Please try again.'
        });

    } catch (error) {
        console.error('Submit step quiz error details:', error);
        res.status(500).json({
            success: false,
            message: `Failed to submit quiz: ${error.message}`
        });
    }
};

/**
 * Save Step Response (Auto-save on Next/Prev/Select)
 * 
 * Saves or updates the student's selected answer for a single question
 * in the study_plan table. This is a fire-and-forget call from the frontend.
 */
const saveStepResponse = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { planId, weekNumber, stepId, genQID, response } = req.body;

        if (!planId || !genQID || !response) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: planId, genQID, response'
            });
        }

        await pool.execute(
            `UPDATE study_plan 
             SET user_response = ? 
             WHERE plan_id = ? AND student_ID = ? AND week_number = ? AND step_ID = ? AND gen_QID = ?`,
            [response, planId, studentId, weekNumber, stepId, genQID]
        );

        res.json({
            success: true,
            message: 'Response saved'
        });
    } catch (error) {
        console.error('Save step response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save response'
        });
    }
};

module.exports = { getStepContent, submitStepQuiz, saveStepResponse };
