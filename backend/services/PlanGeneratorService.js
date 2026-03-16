const axios = require('axios');
const pool = require('../config/database');

// RL Personalization API URL (replaces old Plan Generator API)
const RL_PERSONALIZE_API_URL = process.env.RL_PERSONALIZE_API_URL || 'https://amayasanduni-personalization-model.hf.space';

class PlanGeneratorService {
    /**
     * Builds the payload for the RL Personalization API from the student's database record.
     * 
     * New API expects:
     *   current_scores: [float, float, float]  (at_score, ct_score, p_score)
     *   user_level: string                      ("Beginner", "Intermediate", "Advanced")
     *   quiz_score: float                       (0.0–1.0, average quiz accuracy)
     *   engagement: float                       (0.0–1.0, engagement metric)
     */
    static async buildPayload(studentId) {
        // 1. Get student basic info (scores + level)
        const [rows] = await pool.execute(
            `SELECT at_score, ct_score, p_score, level 
             FROM student 
             WHERE student_ID = ?`,
            [studentId]
        );

        if (rows.length === 0) {
            throw new Error('Student not found');
        }

        const s = rows[0];

        // current_scores as floats
        const current_scores = [
            parseFloat(s.at_score) || 0.0,
            parseFloat(s.ct_score) || 0.0,
            parseFloat(s.p_score) || 0.0
        ];

        // 2. Calculate quiz_score (average accuracy across all quiz attempts, 0.0–1.0)
        const [accuracyRows] = await pool.execute(
            `SELECT AVG(sub.accuracy) as quiz_accuracy FROM (
                SELECT week_number, step_ID, attempt_number, 
                       SUM(is_correct) / COUNT(*) as accuracy
                FROM quiz_attempts WHERE student_ID = ?
                GROUP BY week_number, step_ID, attempt_number
            ) sub`,
            [studentId]
        );
        const quiz_score = parseFloat(accuracyRows[0]?.quiz_accuracy) || 0.0;

        // 3. Calculate engagement (modules completed / total modules, 0.0–1.0)
        const [engagementRows] = await pool.execute(
            `SELECT 
                COUNT(CASE WHEN step_status = 'COMPLETED' THEN 1 END) as completed,
                COUNT(*) as total
             FROM study_plan 
             WHERE student_ID = ?`,
            [studentId]
        );
        const completed = engagementRows[0]?.completed || 0;
        const total = engagementRows[0]?.total || 1; // avoid division by zero
        const engagement = Math.min(1.0, completed / total);

        // Capitalize first letter of level
        const user_level = s.level
            ? s.level.charAt(0).toUpperCase() + s.level.slice(1)
            : 'Beginner';

        return {
            current_scores,
            user_level,
            quiz_score: Math.round(quiz_score * 100) / 100,   // round to 2 decimals
            engagement: Math.round(engagement * 100) / 100
        };
    }

    /**
     * Calls the RL Personalization API to generate a weekly plan.
     * 
     * POST /generate-plan
     * Response: { monitor_report: {...}, weekly_plan: [{day, category, topic}, ...] }
     */
    static async generateWeekPlan(studentId) {
        try {
            const payload = await this.buildPayload(studentId);

            console.log(`[PlanGen] Requesting plan for ${studentId} with payload:`, JSON.stringify(payload));

            const response = await axios.post(`${RL_PERSONALIZE_API_URL}/generate-plan`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 min timeout for HF Space cold starts
            });

            console.log('[PlanGen] ✅ Plan generated successfully');

            // Log the monitor report if present
            if (response.data.monitor_report) {
                console.log('[PlanGen] Monitor Report:', JSON.stringify(response.data.monitor_report));
            }

            return response.data;

        } catch (error) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;
            console.error(`[PlanGen] ❌ API Error ${status || 'N/A'}: ${JSON.stringify(detail)}`);
            throw new Error(`Plan generation API failed: ${JSON.stringify(detail)}`);
        }
    }

    /**
     * Saves one week's API response into the study_plan table.
     * Creates 5 rows (one per day) with module_name=category, step_name=topic.
     *
     * New API returns weekly_plan as an ARRAY: [{day: 1, category: "...", topic: "..."}, ...]
     * Old API returned an OBJECT: {"Day 1": {Category: "...", Topic: "..."}, ...}
     *
     * @param {string} studentId
     * @param {number} weekNumber  - Which week (1–4)
     * @param {number} planId      - Shared plan_id for all rows
     * @param {Object} apiResponse - Raw response from generateWeekPlan()
     * @returns {number} Number of rows inserted
     */
    static async saveWeekPlan(studentId, weekNumber, planId, apiResponse) {
        const weeklyPlan = apiResponse.weekly_plan;
        if (!weeklyPlan) {
            throw new Error('API response missing weekly_plan');
        }

        let rowsInserted = 0;

        // New API: weekly_plan is an array of {day, category, topic}
        for (const dayData of weeklyPlan) {
            const stepId = dayData.day || (rowsInserted + 1);
            const moduleName = dayData.category || 'General';
            const stepName = dayData.topic || `Day ${stepId}`;

            // Only Week 1, Day 1 is IN_PROGRESS; everything else is LOCKED
            const stepStatus = (weekNumber === 1 && stepId === 1) ? 'IN_PROGRESS' : 'LOCKED';

            await pool.execute(
                `INSERT INTO study_plan
                 (plan_id, student_ID, week_number, step_ID, module_name, step_name,
                  gen_QID, learning_content, question, options, correct_answer,
                  step_status, attempt_count, start_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, '', '', '[]', '', ?, 0, NOW())`,
                [planId, studentId, weekNumber, stepId, moduleName, stepName, `Q_W${weekNumber}_S${stepId}_0`, stepStatus]
            );
            rowsInserted++;
        }

        console.log(`[PlanGen] ✅ Week ${weekNumber}: inserted ${rowsInserted} rows (planId: ${planId})`);
        return rowsInserted;
    }

    /**
     * Generates a full multi-week study plan by calling the RL Personalization API
     * once per week, and storing each week's result in the study_plan table.
     *
     * @param {string} studentId
     * @param {number} totalWeeks - Number of weeks to generate (default: 4)
     * @returns {Object} { planId, totalWeeks, totalRowsInserted, weeklyPlans }
     */
    static async generateFullPlan(studentId, totalWeeks = 4) {
        // Get next globally unique plan_id
        const [planIdResult] = await pool.execute(
            'SELECT MAX(plan_id) as maxPlanId FROM study_plan'
        );
        const planId = (planIdResult[0].maxPlanId || 0) + 1;

        let totalRowsInserted = 0;
        const weeklyPlans = [];

        for (let week = 1; week <= totalWeeks; week++) {
            console.log(`[PlanGen] Generating week ${week}/${totalWeeks} for student ${studentId}...`);

            const apiResponse = await this.generateWeekPlan(studentId);
            const rowsInserted = await this.saveWeekPlan(studentId, week, planId, apiResponse);

            totalRowsInserted += rowsInserted;
            weeklyPlans.push({
                weekNumber: week,
                rowsInserted,
                plan: apiResponse.weekly_plan,
                monitorReport: apiResponse.monitor_report || null
            });
        }

        console.log(`[PlanGen] ✅ Full plan complete: ${totalWeeks} weeks, ${totalRowsInserted} total rows`);

        // Chain content generation in background (fire-and-forget)
        const ContentGenerationService = require('./ContentGenerationService');
        ContentGenerationService.fillPlanContent(studentId, planId)
            .then(r => console.log(`[PlanGen] ✅ Background content generation done: ${r.stepsFilled} steps, ${r.totalQuestionsGenerated} questions`))
            .catch(e => console.error(`[PlanGen] ❌ Background content generation failed:`, e.message));

        return { planId, totalWeeks, totalRowsInserted, weeklyPlans };
    }
}

module.exports = PlanGeneratorService;
