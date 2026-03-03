const axios = require('axios');
const pool = require('../config/database');

// Content Generation API (SkillQuest AI Engine hosted on Azure)
const CONTENT_API_URL = process.env.CONTENT_API_URL || 'http://localhost:8001';
const CONTENT_API_KEY = process.env.CONTENT_API_KEY || '';

/**
 * Content Generation Service
 *
 * Bridges the Node.js backend with the externally hosted SkillQuest AI Engine API.
 *
 * Real API Contract (discovered via OpenAPI spec):
 *   Endpoint:  POST /api/generate-lesson
 *   Schema:    UserParameters
 *   Required:  target_topic, proficiency, cognitive_difficulty, historical_gaps, gamification
 *   Auth:      X-API-Key header
 */
class ContentGenerationService {

    /**
     * Maps student DB profile → UserParameters payload for the AI Engine.
     *
     * @param {string} studentId
     * @param {string} targetTopic  - Topic to generate content for
     * @param {string} moduleName   - Human-readable module name
     * @returns {Promise<Object>}   - UserParameters object
     */
    static async buildPayload(studentId, targetTopic, moduleName) {
        const [rows] = await pool.execute(
            `SELECT level, at_score, ct_score, p_score,
                    at_tol_easy, at_tol_med, at_tol_hard,
                    ct_tol_easy, ct_tol_med, ct_tol_hard,
                    p_tol_easy, p_tol_med, p_tol_hard,
                    total_xp
             FROM student WHERE student_ID = ?`,
            [studentId]
        );

        if (rows.length === 0) throw new Error('Student not found');
        const s = rows[0];

        // proficiency: Capitalize for AI model
        const level = (s.level || 'beginner').toLowerCase();
        const proficiency = level.charAt(0).toUpperCase() + level.slice(1);

        // cognitive_difficulty: derive from hard/medium correct answers
        const hardCorrect = (s.at_tol_hard || 0) + (s.ct_tol_hard || 0) + (s.p_tol_hard || 0);
        const medCorrect = (s.at_tol_med || 0) + (s.ct_tol_med || 0) + (s.p_tol_med || 0);
        let cognitive_difficulty;
        if (hardCorrect >= 4) cognitive_difficulty = 'Hard';
        else if (medCorrect >= 4) cognitive_difficulty = 'Medium';
        else cognitive_difficulty = 'Easy';

        // historical_gaps: areas where student scored below threshold
        const gaps = [];
        if ((s.at_score || 0) < 3) gaps.push('Analytical Thinking');
        if ((s.ct_score || 0) < 3) gaps.push('Computational Thinking');
        if ((s.p_score || 0) < 3) gaps.push('Programming');
        const historical_gaps = gaps.length > 0 ? gaps.join(', ') : 'None';

        // gamification: XP-based engagement context hint
        const xp = s.total_xp || 0;
        let gamification;
        if (xp > 500) gamification = 'High XP - use rank comparison and bonus goals';
        else if (xp > 100) gamification = 'Mid XP - use badge injection and multiplier boosts';
        else gamification = 'Low XP - use standard XP rewards and extra goals';

        return {
            target_topic: targetTopic || moduleName,
            proficiency,
            cognitive_difficulty,
            historical_gaps,
            gamification
        };
    }

    /**
     * Calls POST /api/generate-lesson on the SkillQuest AI Engine.
     *
     * @param {string} studentId
     * @param {string} targetTopic
     * @param {string} moduleName
     * @returns {Promise<Object>} Raw AI API response
     */
    static async generateContent(studentId, targetTopic, moduleName) {
        try {
            const payload = await this.buildPayload(studentId, targetTopic, moduleName);

            console.log(`[ContentGen] → POST /api/generate-lesson | topic: "${payload.target_topic}" | level: ${payload.proficiency} | diff: ${payload.cognitive_difficulty}`);

            const response = await axios.post(
                `${CONTENT_API_URL}/api/generate-lesson`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(CONTENT_API_KEY && { 'X-API-Key': CONTENT_API_KEY })
                    },
                    timeout: 60000 // 60s — AI generation can take time
                }
            );

            console.log('[ContentGen] ✅ AI Engine responded successfully');
            return response.data;

        } catch (error) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || error.message;
            console.error(`[ContentGen] ❌ AI Engine Error ${status || 'N/A'}: ${detail}`);
            throw new Error(`Content generation API failed (${status || 'network error'}): ${detail}`);
        }
    }

    /**
     * Generates learning content for a student and saves it into the study_plan table.
     *
     * Flow:
     * 1. Build UserParameters from student DB profile
     * 2. Call POST /api/generate-lesson → get lesson + questions
     * 3. Parse AI response and INSERT rows into study_plan
     *
     * @param {string} studentId
     * @param {number} weekNumber
     * @param {string} moduleName
     * @param {string} targetTopic  - Specific topic (defaults to moduleName)
     * @param {number} stepId       - Step ID base (default: 1)
     * @returns {Promise<Object>}   - { rowsInserted, weekNumber, moduleName, planId, stepsCreated }
     */
    static async generateAndSavePlan(studentId, weekNumber, moduleName, targetTopic = null, stepId = 1) {
        const topic = targetTopic || moduleName;
        const aiResponse = await this.generateContent(studentId, topic, moduleName);

        // Normalise AI response into a steps array
        // Handles: array of steps, { steps: [...] }, or single lesson object
        let steps = [];
        if (Array.isArray(aiResponse)) {
            steps = aiResponse;
        } else if (aiResponse.steps && Array.isArray(aiResponse.steps)) {
            steps = aiResponse.steps;
        } else {
            // Treat the entire response as a single step
            steps = [{
                step_id: stepId,
                learning_content: aiResponse.lesson_content || aiResponse.content || JSON.stringify(aiResponse),
                questions: Array.isArray(aiResponse.questions) ? aiResponse.questions : []
            }];
        }

        // Get next plan_id
        const [planIdResult] = await pool.execute(
            'SELECT MAX(plan_id) as maxPlanId FROM study_plan WHERE student_ID = ?',
            [studentId]
        );
        const planId = (planIdResult[0].maxPlanId || 0) + 1;

        let rowsInserted = 0;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const currentStepId = step.step_id || (stepId + i);
            const learningContent = step.learning_content || step.content || '';
            const questions = Array.isArray(step.questions) ? step.questions : [];
            const status = currentStepId === 1 ? 'IN_PROGRESS' : 'LOCKED';

            if (questions.length === 0) {
                await pool.execute(
                    `INSERT INTO study_plan
                     (plan_id, student_ID, week_number, step_ID, module_name, gen_QID,
                      learning_content, question, options, correct_answer, step_status, attempt_count, start_date)
                     VALUES (?, ?, ?, ?, ?, 1, ?, NULL, NULL, NULL, ?, 0, NOW())`,
                    [planId, studentId, weekNumber, currentStepId, moduleName, learningContent, status]
                );
                rowsInserted++;
            } else {
                for (let qi = 0; qi < questions.length; qi++) {
                    const q = questions[qi];
                    const optionsStr = Array.isArray(q.options)
                        ? JSON.stringify(q.options)
                        : (typeof q.options === 'string' ? q.options : JSON.stringify([]));

                    await pool.execute(
                        `INSERT INTO study_plan
                         (plan_id, student_ID, week_number, step_ID, module_name, gen_QID,
                          learning_content, question, options, correct_answer, step_status, attempt_count, start_date)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                        [planId, studentId, weekNumber, currentStepId, moduleName, qi + 1,
                            learningContent, q.question, optionsStr, q.correct_answer, status]
                    );
                    rowsInserted++;
                }
            }
        }

        console.log(`[ContentGen] ✅ Inserted ${rowsInserted} rows into study_plan (student: ${studentId}, week: ${weekNumber})`);
        return { rowsInserted, weekNumber, moduleName, planId, stepsCreated: steps.length };
    }

    /**
     * Check if a student already has a study plan.
     * @param {string} studentId
     * @returns {Promise<Object>} { hasPlan, totalSteps, totalWeeks }
     */
    static async hasPlan(studentId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(DISTINCT CONCAT(week_number, '-', step_ID)) as totalSteps,
                    COUNT(DISTINCT week_number) as totalWeeks
             FROM study_plan WHERE student_ID = ?`,
            [studentId]
        );
        const totalSteps = Number(rows[0]?.totalSteps || 0);
        return {
            hasPlan: totalSteps > 0,
            totalSteps,
            totalWeeks: Number(rows[0]?.totalWeeks || 0)
        };
    }
}

module.exports = ContentGenerationService;
