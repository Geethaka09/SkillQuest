const PlanGeneratorService = require('../services/PlanGeneratorService');

/**
 * Plan Generator Controller
 * Connects the backend to the external Plan Generator API.
 */

/**
 * POST /api/plan-generator/generate
 * 
 * Generates a full multi-week study plan for the authenticated student,
 * calling the Plan Generator API once per week and storing results in study_plan.
 * 
 * Request body (optional):
 *   { "weeks": 4 }   — number of weeks to generate (default: 4)
 */
const generatePlan = async (req, res) => {
    try {
        const studentId = req.user.id;
        const totalWeeks = parseInt(req.body.weeks) || 4;

        console.log(`[PlanGenController] Generating ${totalWeeks}-week plan for student ${studentId}`);

        const result = await PlanGeneratorService.generateFullPlan(studentId, totalWeeks);

        return res.status(201).json({
            success: true,
            message: `${totalWeeks}-week study plan generated and saved successfully`,
            data: {
                planId: result.planId,
                totalWeeks: result.totalWeeks,
                totalRowsInserted: result.totalRowsInserted,
                weeklyPlans: result.weeklyPlans
            }
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

