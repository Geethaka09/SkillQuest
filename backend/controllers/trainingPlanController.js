const pool = require('../config/database');

/**
 * Training Plan Controller
 * 
 * Functional Requirements:
 *   P13 — Generate and Present Training Plan: The Plan Generator creates a personalized
 *         learning path based on the student's profile. This controller retrieves and
 *         presents the plan data (weekly modules, completion status, time-gating).
 */

/**
 * Get Student Progress (P13)
 * 
 * Aggregates study plan data to render the dashboard or learning roadmap.
 * 
 * Logic:
 * 1. Groups modules by week.
 * 2. Calculates completion status (LOCKED, ACTIVE, COMPLETED).
 * 3. Handles Time-Gating: Weeks unlock sequentially (Week 1 = Day 0, Week 2 = Day 7, etc.).
 * 
 * @returns {Object} { totalModules, completedModules, percentComplete, currentModule, modules[] }
 */
const getStudentProgress = async (req, res) => {
    try {
        const studentId = req.user.id;

        // 1. Get aggregated stats per week (count DISTINCT step_IDs, not rows)
        const [weekStats] = await pool.execute(
            `SELECT 
                week_number,
                module_name,
                COUNT(DISTINCT step_ID) as total_steps,
                COUNT(DISTINCT CASE WHEN step_status = 'COMPLETED' THEN step_ID END) as completed_steps,
                COUNT(DISTINCT CASE WHEN step_status = 'IN_PROGRESS' THEN step_ID END) as in_progress_steps
             FROM study_plan 
             WHERE student_ID = ?
             GROUP BY week_number, module_name
             ORDER BY week_number`,
            [studentId]
        );

        if (weekStats.length === 0) {
            return res.json({
                success: true,
                totalModules: 0,
                completedModules: 0,
                percentComplete: 0,
                currentModule: null,
                modules: []
            });
        }

        // 2. Get the study plan start date (when plan was created)
        const [startDateResult] = await pool.execute(
            `SELECT MIN(start_date) as plan_start_date
             FROM study_plan 
             WHERE student_ID = ?`,
            [studentId]
        );

        const planStartDate = startDateResult[0]?.plan_start_date
            ? new Date(startDateResult[0].plan_start_date)
            : new Date();

        const today = new Date();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        // 3. Process modules and determine statuses
        let modules = [];
        let completedModules = 0;
        let currentModule = null;

        for (let i = 0; i < weekStats.length; i++) {
            const week = weekStats[i];
            const isAllCompleted = week.completed_steps === week.total_steps;
            const hasInProgress = week.in_progress_steps > 0;
            const stepsRemaining = week.total_steps - week.completed_steps;

            // Calculate when this week should unlock based on start_date
            const daysUntilUnlock = (week.week_number - 1) * 7;
            const startTimestamp = planStartDate.getTime();
            const validStart = isNaN(startTimestamp) ? Date.now() : startTimestamp;

            const unlockDate = new Date(validStart + (daysUntilUnlock * ONE_DAY_MS));
            const daysSincePlanStart = Math.floor((today - new Date(validStart)) / ONE_DAY_MS);
            const isTimeUnlocked = daysSincePlanStart >= daysUntilUnlock;

            // Determine module status
            let status;
            let daysRemaining = null;

            if (isAllCompleted) {
                status = 'COMPLETED';
                completedModules++;
            } else if (hasInProgress) {
                status = 'ACTIVE';

                if (!currentModule) {
                    currentModule = {
                        weekNumber: week.week_number,
                        name: week.module_name,
                        totalSteps: week.total_steps,
                        completedSteps: week.completed_steps,
                        stepsRemaining: stepsRemaining
                    };
                }
            } else if (isTimeUnlocked) {
                status = 'ACTIVE';

                if (!currentModule) {
                    currentModule = {
                        weekNumber: week.week_number,
                        name: week.module_name,
                        totalSteps: week.total_steps,
                        completedSteps: week.completed_steps,
                        stepsRemaining: stepsRemaining
                    };
                }
            } else {
                status = 'LOCKED';
                daysRemaining = daysUntilUnlock - daysSincePlanStart;
            }

            modules.push({
                weekNumber: week.week_number,
                name: week.module_name,
                status: status,
                totalSteps: week.total_steps,
                completedSteps: week.completed_steps,
                stepsRemaining: stepsRemaining,
                daysRemaining: daysRemaining
            });
        }

        const totalModules = weekStats.length;
        const percentComplete = totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0;

        res.json({
            success: true,
            totalModules,
            completedModules,
            percentComplete,
            currentModule,
            modules
        });

    } catch (error) {
        console.error('Get student progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress data'
        });
    }
};

/**
 * Get Week Content (P13 — Present Training Plan)
 * 
 * Fetches all learning steps (quizzes, readings) for a specific week.
 * Groups steps by step_ID and returns their status and questions.
 * 
 * @param {number} weekNumber
 */
const getWeekContent = async (req, res) => {
    try {
        const studentId = req.user.id;
        const weekNumber = parseInt(req.params.weekNumber);

        // Get all steps for this week with learning content
        const [steps] = await pool.execute(
            `SELECT 
                step_ID,
                module_name,
                gen_QID,
                learning_content,
                question,
                options,
                correct_answer,
                step_status,
                attempt_count
             FROM study_plan 
             WHERE student_ID = ? AND week_number = ?
             ORDER BY step_ID, gen_QID`,
            [studentId, weekNumber]
        );

        if (steps.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No content found for this week'
            });
        }

        // Group by step_ID for better organization
        const stepsGrouped = {};
        steps.forEach(step => {
            if (!stepsGrouped[step.step_ID]) {
                let status = step.step_status;
                if (step.step_ID === 1 && status === 'LOCKED') {
                    status = 'IN_PROGRESS';
                }

                stepsGrouped[step.step_ID] = {
                    stepId: step.step_ID,
                    status: status,
                    learningContent: step.learning_content,
                    questions: []
                };
            }
            stepsGrouped[step.step_ID].questions.push({
                genQID: step.gen_QID,
                question: step.question,
                options: step.options,
                correctAnswer: step.correct_answer,
                attemptCount: step.attempt_count
            });
        });

        res.json({
            success: true,
            weekNumber: weekNumber,
            moduleName: steps[0].module_name,
            steps: Object.values(stepsGrouped)
        });

    } catch (error) {
        console.error('Get week content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch week content'
        });
    }
};

module.exports = { getStudentProgress, getWeekContent };
