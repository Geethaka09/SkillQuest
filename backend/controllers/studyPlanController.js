const pool = require('../config/database');
const GamificationService = require('../services/GamificationService');

/**
 * Get student's learning progress from study_plan table
 * Returns statistics, module list with statuses, and current module info
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
            // Week 1 unlocks immediately, Week 2 unlocks after 7 days, Week 3 after 14 days, etc.
            const daysUntilUnlock = (week.week_number - 1) * 7;
            const unlockDate = new Date(planStartDate.getTime() + (daysUntilUnlock * ONE_DAY_MS));
            const daysSincePlanStart = Math.floor((today - planStartDate) / ONE_DAY_MS);
            const isTimeUnlocked = daysSincePlanStart >= daysUntilUnlock;

            // Determine module status
            let status;
            let daysRemaining = null;

            if (isAllCompleted) {
                status = 'COMPLETED';
                completedModules++;
            } else if (hasInProgress) {
                // Has in-progress steps - currently active
                status = 'ACTIVE';

                // Set as current module if not already set
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
                // Time has passed, this week is now unlocked
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
                // Not enough time passed - still locked
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
 * Get learning content for a specific week/module
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
                stepsGrouped[step.step_ID] = {
                    stepId: step.step_ID,
                    status: step.step_status,
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

/**
 * Get content for a specific step (for quiz page)
 */
const getStepContent = async (req, res) => {
    try {
        const studentId = req.user.id;
        const weekNumber = parseInt(req.params.weekNumber);
        const stepId = parseInt(req.params.stepId);

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
                attempt_count
             FROM study_plan 
             WHERE student_ID = ? AND week_number = ? AND step_ID = ?
             ORDER BY gen_QID`,
            [studentId, weekNumber, stepId]
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
            correctAnswer: row.correct_answer
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

    } catch (error) {
        console.error('Get step content error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch step content'
        });
    }
};

/**
 * Submit quiz answers for a step
 * Stores responses in quiz_attempts table
 * Unlocks next step if all correct
 */
const submitStepQuiz = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { planId, weekNumber, stepId, answers } = req.body;
        // answers = [{ genQID, response }]

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
        const now = new Date();

        // Process each answer and insert into quiz_attempts
        for (const answer of answers) {
            const correctAnswer = correctAnswersMap[answer.genQID];
            const isCorrect = answer.response === correctAnswer;

            if (isCorrect) score++;
            else allCorrect = false;

            // Insert into quiz_attempts
            await pool.execute(
                `INSERT INTO quiz_attempts 
                 (plan_id, week_number, step_ID, gen_QID, attempt_number, student_ID, user_response, is_correct, score, attempted_at, finished_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [planId, weekNumber, stepId, answer.genQID, currentAttempt, studentId, answer.response, isCorrect ? 1 : 0, isCorrect ? 1 : 0, now, now]
            );
        }

        // Update attempt_count in study_plan
        await pool.execute(
            `UPDATE study_plan 
             SET attempt_count = ? 
             WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
            [currentAttempt, studentId, weekNumber, stepId]
        );

        if (allCorrect) {
            // Mark current step as COMPLETED with completion timestamp
            await pool.execute(
                `UPDATE study_plan 
                 SET step_status = 'COMPLETED', completed_at = NOW() 
                 WHERE student_ID = ? AND week_number = ? AND step_ID = ?`,
                [studentId, weekNumber, stepId]
            );

            // Unlock next step (set to IN_PROGRESS)
            const nextStepId = stepId + 1;
            await pool.execute(
                `UPDATE study_plan 
                 SET step_status = 'IN_PROGRESS' 
                 WHERE student_ID = ? AND week_number = ? AND step_ID = ? AND step_status = 'LOCKED'`,
                [studentId, weekNumber, nextStepId]
            );

            // Award XP for passing the quiz (50 base + 10 per question)
            const xpEarned = 50 + (answers.length * 10);
            await GamificationService.addXP(studentId, xpEarned);

            // Update streak (this updates last_activity_date)
            await GamificationService.updateStreak(studentId);
        }

        // Check if all steps in this week are now completed
        const [weekSteps] = await pool.execute(
            `SELECT COUNT(*) as total, SUM(CASE WHEN step_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
             FROM study_plan WHERE student_ID = ? AND week_number = ?`,
            [studentId, weekNumber]
        );

        const isWeekComplete = weekSteps[0].total > 0 && weekSteps[0].completed === weekSteps[0].total;

        // If week is complete, record completion time for time-based unlock
        if (isWeekComplete && allCorrect) {
            // Check if next week exists and is locked
            const [nextWeekCheck] = await pool.execute(
                `SELECT COUNT(*) as count FROM study_plan 
                 WHERE student_ID = ? AND week_number = ? AND step_status = 'LOCKED'`,
                [studentId, weekNumber + 1]
            );

            // Note: Next week will only unlock after 1 week has passed (handled in getStudentProgress)
        }

        res.json({
            success: true,
            passed: allCorrect,
            score: score,
            totalQuestions: answers.length,
            attemptNumber: currentAttempt,
            xpEarned: allCorrect ? 50 + (answers.length * 10) : 0,
            isWeekComplete: isWeekComplete && allCorrect,
            message: allCorrect
                ? (isWeekComplete
                    ? 'Congratulations! You completed this week! Return to dashboard to continue.'
                    : 'Congratulations! You passed. Next step unlocked!')
                : 'Some answers were incorrect. Please try again.'
        });

    } catch (error) {
        console.error('Submit step quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quiz'
        });
    }
};

module.exports = { getStudentProgress, getWeekContent, getStepContent, submitStepQuiz };
