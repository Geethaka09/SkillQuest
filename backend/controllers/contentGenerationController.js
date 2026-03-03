const ContentGenerationService = require('../services/ContentGenerationService');

/**
 * Content Generation Controller
 *
 * Functional Requirements:
 *   P13 — Generate and Present Training Plan: Uses the AI Content Generation API (SkillQuest AI Engine)
 *         to produce personalized learning content (reading material + quiz questions)
 *         and store it in the study_plan table.
 *
 * API Endpoint for AI Engine: POST /api/generate-lesson
 * Required fields: target_topic, proficiency, cognitive_difficulty, historical_gaps, gamification
 */

/**
 * POST /api/content/generate-plan
 *
 * Triggers AI content generation for the authenticated student.
 *
 * Request body:
 * {
 *   "week_number": 1,           (required)
 *   "module_name": "Python Basics",  (required)
 *   "target_topic": "Variables and Data Types",  (optional - sent to AI as target_topic)
 *   "step_id": 1               (optional, which step to save under, default: 1)
 * }
 */
const generatePlan = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { week_number, module_name, target_topic, step_id } = req.body;

        if (!week_number || !module_name) {
            return res.status(400).json({
                success: false,
                message: 'week_number and module_name are required'
            });
        }

        const weekNumber = parseInt(week_number);
        const stepId = parseInt(step_id) || 1;

        console.log(`[ContentGen] Generating plan for student ${studentId}, week ${weekNumber}, module: ${module_name}`);

        const result = await ContentGenerationService.generateAndSavePlan(
            studentId,
            weekNumber,
            module_name,
            target_topic || null,
            stepId
        );

        return res.status(201).json({
            success: true,
            message: `Study plan generated successfully for Week ${weekNumber}`,
            data: {
                planId: result.planId,
                weekNumber: result.weekNumber,
                moduleName: result.moduleName,
                stepsCreated: result.stepsCreated,
                rowsInserted: result.rowsInserted
            }
        });

    } catch (error) {
        console.error('[ContentGen] Generate plan error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate study plan'
        });
    }
};

/**
 * GET /api/content/status
 *
 * Returns whether the authenticated student already has a study plan.
 */
const getPlanStatus = async (req, res) => {
    try {
        const studentId = req.user.id;

        const status = await ContentGenerationService.hasPlan(studentId);

        return res.json({
            success: true,
            studentId,
            ...status
        });

    } catch (error) {
        console.error('[ContentGen] Status check error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to check plan status'
        });
    }
};

module.exports = { generatePlan, getPlanStatus };
