const PlanGeneratorService = require('../services/PlanGeneratorService');

/**
 * Plan Generator Controller
 * Connects the backend to the external Plan Generator API.
 */

/**
 * POST /api/plan-generator/generate
 * 
 * Fetches the student's scores, status, and level, and sends them 
 * to the Plan Generator API. Returns the generated plan.
 */
const generatePlan = async (req, res) => {
    try {
        const studentId = req.user.id;
        console.log(`[PlanGenController] Initiating plan generation for student ${studentId}`);

        const generatedPlan = await PlanGeneratorService.generateWeekPlan(studentId);

        return res.status(200).json({
            success: true,
            message: 'Plan generated successfully',
            data: generatedPlan
        });

    } catch (error) {
        console.error('[PlanGenController] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate plan'
        });
    }
};

module.exports = { generatePlan };
