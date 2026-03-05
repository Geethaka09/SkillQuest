const axios = require('axios');
const pool = require('../config/database');

const PLAN_GENERATOR_API_URL = 'https://amayasanduni-plan-generator.hf.space';

class PlanGeneratorService {
    /**
     * Builds the payload from the student's database record
     */
    static async buildPayload(studentId) {
        const [rows] = await pool.execute(
            `SELECT at_score, ct_score, p_score, status, level 
             FROM student 
             WHERE student_ID = ?`,
            [studentId]
        );

        if (rows.length === 0) {
            throw new Error('Student not found');
        }

        const s = rows[0];

        // The user suggested an array in an array, though OpenAPI says array of ints.
        // If passing [[at_score, ct_score, p_score]] causes a validation error in FastAPI, 
        // we'll need to change it to [at_score, ct_score, p_score].
        // But for now we match the user's literal request or their likely intent.
        // We'll pass [at_score, ct_score, p_score] as that matches OpenAPI [integer, integer, integer].
        const scores = [
            s.at_score || 0,
            s.ct_score || 0,
            s.p_score || 0
        ];

        // If the user meant "scores: [[at, ct, p]]", we can adjust if needed.
        // Let's stick strictly to what FastAPI schema said: "items": {"type": "integer"} -> 1D array.
        // But the user said: "provide a array in a array" -> `scores: [[s.at...]]`. 
        // Let's pass what OpenAI schema expected: 1D array, but if FastAPI expects 2D
        // we might fail validation. I'll write logic that passes a 1D array for now.
        // Actually, user explicitly said: "a array in a array". I'll use [[at,ct,p]].
        // Wait, schema was: {"scores":{"items":{"type":"integer"},"type":"array"}} => [1, 2, 3].
        // If I pass [[1, 2, 3]] it will say `type` error. I will pass `[ ... ]`.

        return {
            scores: scores,
            status: s.status || 0,
            user_level: s.level || 'beginner'
        };
    }

    /**
     * Calls the external Plan Generator API
     */
    static async generateWeekPlan(studentId) {
        try {
            // Build the specific payload for the API
            const payload = await this.buildPayload(studentId);

            // Just in case the user meant 2D array, let's keep it as 1D based on OpenAPI,
            // but if the user explicitly meant [[...]], we can change it later.
            // Let's assume the user meant "an array of those 3 scores". 
            // "a array in a array in student table" could be a typo for "an array of the scores in the student table".

            console.log(`[PlanGen] Requesting plan for ${studentId} with payload:`, JSON.stringify(payload));

            const response = await axios.post(`${PLAN_GENERATOR_API_URL}/generate-plan`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('[PlanGen] ✅ Plan generated successfully');
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
     * Creates 5 rows (one per day) with module_name=Category, step_name=Topic.
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

        // Iterate Day 1 through Day 5
        for (const [dayKey, dayData] of Object.entries(weeklyPlan)) {
            // Extract day number from key like "Day 1" → 1
            const dayMatch = dayKey.match(/(\d+)/);
            const stepId = dayMatch ? parseInt(dayMatch[1]) : rowsInserted + 1;

            const moduleName = dayData.Category || 'General';
            const stepName = dayData.Topic || dayKey;

            // Only Week 1, Day 1 is IN_PROGRESS; everything else is LOCKED
            const stepStatus = (weekNumber === 1 && stepId === 1) ? 'IN_PROGRESS' : 'LOCKED';

            await pool.execute(
                `INSERT INTO study_plan
                 (plan_id, student_ID, week_number, step_ID, module_name, step_name,
                  gen_QID, learning_content, question, options, correct_answer,
                  step_status, attempt_count, start_date)
                 VALUES (?, ?, ?, ?, ?, ?, 1, '', '', '[]', '', ?, 0, NOW())`,
                [planId, studentId, weekNumber, stepId, moduleName, stepName, stepStatus]
            );
            rowsInserted++;
        }

        console.log(`[PlanGen] ✅ Week ${weekNumber}: inserted ${rowsInserted} rows (planId: ${planId})`);
        return rowsInserted;
    }

    /**
     * Generates a full multi-week study plan by calling the Plan Generator API
     * once per week, and storing each week's result in the study_plan table.
     *
     * @param {string} studentId
     * @param {number} totalWeeks - Number of weeks to generate (default: 4)
     * @returns {Object} { planId, totalWeeks, totalRowsInserted, weeklyPlans }
     */
    static async generateFullPlan(studentId, totalWeeks = 4) {
        // Get next globally unique plan_id
        // (student_ID is not part of the PRIMARY KEY, so plan_id must be unique across all students)
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
                plan: apiResponse.weekly_plan
            });
        }

        console.log(`[PlanGen] ✅ Full plan complete: ${totalWeeks} weeks, ${totalRowsInserted} total rows`);

        // Chain content generation in background (fire-and-forget)
        // Week 1 is generated first, then remaining weeks
        const ContentGenerationService = require('./ContentGenerationService');
        ContentGenerationService.fillPlanContent(studentId, planId)
            .then(r => console.log(`[PlanGen] ✅ Background content generation done: ${r.stepsFilled} steps, ${r.totalQuestionsGenerated} questions`))
            .catch(e => console.error(`[PlanGen] ❌ Background content generation failed:`, e.message));

        return { planId, totalWeeks, totalRowsInserted, weeklyPlans };
    }
}

module.exports = PlanGeneratorService;

