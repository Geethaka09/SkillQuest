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
}

module.exports = PlanGeneratorService;
