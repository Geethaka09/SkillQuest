const axios = require('axios');
const pool = require('../config/database');

// Content Generation API (SkillQuest AI Engine hosted on Azure)
const CONTENT_API_URL = process.env.CONTENT_API_URL || 'http://localhost:8001';

/**
 * Content Generation Service
 *
 * Bridges the Node.js backend with the externally hosted SkillQuest AI Engine API.
 *
 * Real API Contract:
 *   Endpoint:  POST /api/generate-lesson
 *   Schema:    UserParameters
 *   Required:  target_topic, proficiency, cognitive_difficulty (3×3 matrix),
 *              historical_gaps, gamification_level, gamification_streak, gamification_badge
 *   Auth:      None (no API key required)
 *   Response:  { status: 'success', data: { content: '<markdown>', quiz: [{question, correct_answer, distractors}] } }
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
                    p_tol_easy,  p_tol_med,  p_tol_hard,
                    total_xp, current_level, current_streak, weakness
             FROM student WHERE student_ID = ?`,
            [studentId]
        );

        if (rows.length === 0) throw new Error('Student not found');
        const s = rows[0];

        // 1. proficiency: capitalize level string
        const level = (s.level || 'beginner').toLowerCase();
        const proficiency = level.charAt(0).toUpperCase() + level.slice(1);

        // 2. cognitive_difficulty: 3×3 matrix [[AT_easy, AT_med, AT_hard], [CT_...], [P_...]]
        //    Each row = correct answers per difficulty for one domain (from initial quiz)
        const cognitive_difficulty = [
            [s.at_tol_easy || 0, s.at_tol_med || 0, s.at_tol_hard || 0], // Analytical Thinking
            [s.ct_tol_easy || 0, s.ct_tol_med || 0, s.ct_tol_hard || 0], // Computational Thinking
            [s.p_tol_easy || 0, s.p_tol_med || 0, s.p_tol_hard || 0]  // Programming
        ];

        // 3. historical_gaps: use weakness column if set, else derive from quiz scores
        let historical_gaps;
        if (s.weakness && s.weakness.trim() !== '') {
            historical_gaps = s.weakness.trim();
        } else {
            const gaps = [];
            if ((s.at_score || 0) < 3) gaps.push('Analytical Thinking');
            if ((s.ct_score || 0) < 3) gaps.push('Computational Thinking');
            if ((s.p_score || 0) < 3) gaps.push('Programming');
            historical_gaps = gaps.length > 0 ? gaps.join(', ') : 'None';
        }

        // 4. gamification: now 3 separate fields
        //    gamification_level  → student's current XP level (int)
        //    gamification_streak → student's current daily streak (int)
        //    gamification_badge  → text hint for AI based on total XP earned
        const xp = s.total_xp || 0;
        let gamification_badge;
        if (xp > 500) gamification_badge = 'High XP - use rank comparison and bonus goals';
        else if (xp > 100) gamification_badge = 'Mid XP - use badge injection and multiplier boosts';
        else gamification_badge = 'Low XP - use standard XP rewards and extra goals';

        return {
            target_topic: targetTopic || moduleName,
            proficiency,
            cognitive_difficulty,   // [[num,num,num],[num,num,num],[num,num,num]]
            historical_gaps,
            gamification_level: s.current_level || 0,
            gamification_streak: s.current_streak || 0,
            gamification_badge
        };
    }

    /**
     * Parses the raw AI API response into structured learning content and questions.
     *
     * New API format:
     *   { status: 'success', data: { content: '<markdown>', quiz: [{question, correct_answer, distractors}] } }
     *
     * @param {Object} aiResponse - Raw response from generateContent()
     * @returns {{ learningContent: string, questions: Array<{question: string, options: string[], correct_answer: string}> }}
     */
    static parseAIResponse(aiResponse) {
        // 1. Extract learning content from the structured response
        let learningContent = '';
        let quizArray = [];

        if (aiResponse.status === 'success' && aiResponse.data && typeof aiResponse.data === 'object') {
            // New structured format: { status, data: { content, quiz } }
            learningContent = (aiResponse.data.content || '').trim();
            quizArray = Array.isArray(aiResponse.data.quiz) ? aiResponse.data.quiz : [];
        } else if (aiResponse.data && typeof aiResponse.data === 'object') {
            // Without status wrapper but still structured
            learningContent = (aiResponse.data.content || '').trim();
            quizArray = Array.isArray(aiResponse.data.quiz) ? aiResponse.data.quiz : [];
        } else {
            console.error('[ContentGen] Unexpected AI response format:', JSON.stringify(aiResponse).substring(0, 200));
            return { learningContent: '', questions: [] };
        }

        // 2. Map quiz array to the internal question format
        const questions = [];
        for (const q of quizArray) {
            const questionText = (q.question || '').trim();
            const correctAnswer = (q.correct_answer || '').trim();
            const distractors = Array.isArray(q.distractors)
                ? q.distractors.map(d => (d || '').trim()).filter(Boolean)
                : [];

            // Skip invalid questions (missing text, answer, or distractors)
            if (!questionText || !correctAnswer || distractors.length === 0) continue;

            // Shuffle correct answer + distractors into options array
            const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

            questions.push({ question: questionText, options, correct_answer: correctAnswer });
        }

        console.log(`[ContentGen] Parsed ${questions.length} questions from AI response`);
        return { learningContent, questions };
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

            console.log(`[ContentGen] → POST /api/generate-lesson | topic: "${payload.target_topic}" | level: ${payload.proficiency} | xp_level: ${payload.gamification_level} | streak: ${payload.gamification_streak}`);

            const response = await axios.post(
                `${CONTENT_API_URL}/api/generate-lesson`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 300000 // 300s (5 min) — Azure cold start + AI generation
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
     * Generates learning content for a step and saves it into the study_plan table.
     *
     * Flow:
     * 1. Build UserParameters from student DB profile
     * 2. Call POST /api/generate-lesson → { status: 'success', data: { content, quiz } }
     * 3. Parse structured response: lesson content from data.content + questions from data.quiz
     * 4. Store ONLY the generated content & questions (topic name from AI is NOT used)
     *
     * Storage Logic (per API response):
     *   For each parsed question:
     *     INSERT INTO study_plan with:
     *       plan_id         = student's max plan_id + 1
     *       student_ID      = studentId
     *       week_number     = weekNumber (passed in)
     *       step_ID         = stepId (passed in)
     *       module_name     = moduleName (weekly plan name — NOT from AI response)
     *       gen_QID         = question index (1, 2, 3...)
     *       learning_content = parsed lesson content (same for all rows in this step)
     *       question        = question text
     *       options         = JSON.stringify(shuffled [correct + distractors])
     *       correct_answer  = correct answer text
     *       step_status     = 'IN_PROGRESS' if step 1, else 'LOCKED'
     *       attempt_count   = 0
     *       start_date      = NOW()
     *
     * @param {string} studentId
     * @param {number} weekNumber
     * @param {string} moduleName   - Weekly plan name (stored as-is, NOT overridden by AI)
     * @param {string} targetTopic  - Step topic sent to AI for generation (defaults to moduleName)
     * @param {number} stepId       - Step number (default: 1)
     * @returns {Promise<Object>}   - { rowsInserted, weekNumber, moduleName, planId, questionsStored }
     */
    static async generateAndSavePlan(studentId, weekNumber, moduleName, targetTopic = null, stepId = 1) {
        const topic = targetTopic || moduleName;
        const aiResponse = await this.generateContent(studentId, topic, moduleName);

        // Parse AI response into learning content + questions
        const { learningContent, questions } = this.parseAIResponse(aiResponse);

        // --- Get next globally unique plan_id ---
        const [planIdResult] = await pool.execute(
            'SELECT MAX(plan_id) as maxPlanId FROM study_plan'
        );
        const planId = (planIdResult[0].maxPlanId || 0) + 1;

        // step_status: 'IN_PROGRESS' for step 1, 'LOCKED' for all others
        const status = stepId === 1 ? 'IN_PROGRESS' : 'LOCKED';

        let rowsInserted = 0;

        if (questions.length === 0) {
            throw new Error('AI Engine failed to generate any valid questions. Content discarded.');
        } else {
            for (let qi = 0; qi < questions.length; qi++) {
                const q = questions[qi];
                const optionsStr = JSON.stringify(q.options);
                await pool.execute(
                    `INSERT INTO study_plan
                     (plan_id, student_ID, week_number, step_ID, module_name, step_name, gen_QID,
                      learning_content, question, options, correct_answer, step_status, attempt_count, start_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                    [planId, studentId, weekNumber, stepId, moduleName, topic, `Q_W${weekNumber}_S${stepId}_${qi + 1}`,
                        learningContent, q.question, optionsStr, q.correct_answer, status]
                );
                rowsInserted++;
            }
        }

        console.log(`[ContentGen] ✅ Inserted ${rowsInserted} rows into study_plan (student: ${studentId}, week: ${weekNumber}, step: ${stepId}, planId: ${planId})`);
        return { rowsInserted, weekNumber, moduleName, planId, questionsStored: questions.length };
    }

    /**
     * Fills content for a single step that already exists in study_plan.
     * 
     * Flow:
     * 1. Read the existing placeholder row to get step_name (topic) and module_name
     * 2. Call AI Engine to generate lesson + quiz
     * 3. Parse markdown into learning_content and questions
     * 4. DELETE the existing placeholder row(s) for this step
     * 5. INSERT new rows (one per question) with the generated content
     *
     * @param {string} studentId
     * @param {number} weekNumber
     * @param {number} stepId
     * @param {number} planId
     * @returns {Promise<Object>} { weekNumber, stepId, questionsStored }
     */
    static async fillStepContent(studentId, weekNumber, stepId, planId) {
        // 1. Read existing row to get topic and module name
        const [existing] = await pool.execute(
            `SELECT step_name, module_name, step_status 
             FROM study_plan 
             WHERE student_ID = ? AND plan_id = ? AND week_number = ? AND step_ID = ?
             LIMIT 1`,
            [studentId, planId, weekNumber, stepId]
        );

        if (existing.length === 0) {
            throw new Error(`No study_plan row found for week ${weekNumber}, step ${stepId}`);
        }

        const { step_name: topic, module_name: moduleName, step_status: currentStatus } = existing[0];

        console.log(`[ContentGen] Filling content for Week ${weekNumber}, Step ${stepId}: "${topic}"`);

        // 2. Call AI Engine
        const aiResponse = await this.generateContent(studentId, topic, moduleName);

        // 3. Parse AI response into learning content + questions
        const { learningContent, questions } = this.parseAIResponse(aiResponse);

        console.log(`[ContentGen] Parsed ${questions.length} questions for "${topic}"`);

        // 4. Validate we have content before touching existing rows
        let rowsInserted = 0;

        if (questions.length === 0) {
            // DO NOT delete existing rows — preserve them so the step still appears
            throw new Error('AI Engine failed to generate any valid questions. Original rows preserved.');
        }

        // 5. Delete existing placeholder row(s) ONLY after successful parsing
        await pool.execute(
            `DELETE FROM study_plan 
             WHERE student_ID = ? AND plan_id = ? AND week_number = ? AND step_ID = ?`,
            [studentId, planId, weekNumber, stepId]
        );

        // 6. Insert new rows with generated content
        for (let qi = 0; qi < questions.length; qi++) {
            const q = questions[qi];
            const optionsStr = JSON.stringify(q.options);
            await pool.execute(
                `INSERT INTO study_plan
                 (plan_id, student_ID, week_number, step_ID, module_name, step_name, gen_QID,
                   learning_content, question, options, correct_answer, step_status, attempt_count, start_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                [planId, studentId, weekNumber, stepId, moduleName, topic, `Q_W${weekNumber}_S${stepId}_${qi + 1}`,
                    learningContent, q.question, optionsStr, q.correct_answer, currentStatus]
            );
            rowsInserted++;
        }

        console.log(`[ContentGen] ✅ Week ${weekNumber}, Step ${stepId}: ${rowsInserted} rows (${questions.length} questions)`);
        return { weekNumber, stepId, questionsStored: questions.length, rowsInserted };
    }

    /**
     * Fills content for ALL steps in a student's plan.
     * Priority: Week 1 first (user sees it immediately), then remaining weeks.
     * Skips steps that already have content (learning_content is not empty).
     *
     * @param {string} studentId
     * @param {number} planId
     * @returns {Promise<Object>} { stepsFilled, totalQuestionsGenerated }
     */
    static async fillPlanContent(studentId, planId) {
        // Get all distinct steps, ordered by week and step
        const [steps] = await pool.execute(
            `SELECT DISTINCT week_number, step_ID, step_name, learning_content
             FROM study_plan
             WHERE student_ID = ? AND plan_id = ?
             ORDER BY week_number, step_ID`,
            [studentId, planId]
        );

        if (steps.length === 0) {
            console.log('[ContentGen] No steps found to fill content for');
            return { stepsFilled: 0, totalQuestionsGenerated: 0 };
        }

        // Separate Week 1 from the rest for priority ordering
        const week1Steps = steps.filter(s => s.week_number === 1 && (!s.learning_content || s.learning_content === ''));
        const laterSteps = steps.filter(s => s.week_number > 1 && (!s.learning_content || s.learning_content === ''));
        const orderedSteps = [...week1Steps, ...laterSteps];

        console.log(`[ContentGen] Filling content for ${orderedSteps.length} steps (${week1Steps.length} in Week 1, ${laterSteps.length} in later weeks)`);

        let stepsFilled = 0;
        let totalQuestionsGenerated = 0;

        for (const step of orderedSteps) {
            let success = false;
            let attempts = 0;
            const maxAttempts = 3;

            while (!success && attempts < maxAttempts) {
                attempts++;
                try {
                    // Add a 5 second delay between requests to avoid rate limits
                    if (stepsFilled > 0 || attempts > 1) {
                        console.log(`[ContentGen] Waiting 5 seconds before next request...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }

                    const result = await this.fillStepContent(
                        studentId, step.week_number, step.step_ID, planId
                    );
                    stepsFilled++;
                    totalQuestionsGenerated += result.questionsStored;
                    success = true; // Break the while loop
                } catch (err) {
                    console.error(`[ContentGen] ❌ Failed to fill W${step.week_number} S${step.step_ID} (Attempt ${attempts}/${maxAttempts}):`, err.message || err);

                    if (attempts < maxAttempts) {
                        console.log(`[ContentGen] ⚠️ Retrying in 10 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }
        }

        console.log(`[ContentGen] ✅ Content generation complete: ${stepsFilled}/${orderedSteps.length} steps filled, ${totalQuestionsGenerated} total questions`);
        return { stepsFilled, totalQuestionsGenerated };
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

