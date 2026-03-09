const fs = require('fs');
const path = require('path');
const pool = require('./config/database');
const ContentGenerationService = require('./services/ContentGenerationService');

async function seedData() {
    try {
        const studentId = 'S0005'; // Our test student
        const weekNumber = 1;

        // 1. Get the current active plan ID for this student
        const [planRows] = await pool.execute(
            'SELECT MAX(plan_id) as maxPlanId FROM study_plan WHERE student_ID = ?',
            [studentId]
        );
        const planId = planRows[0].maxPlanId;

        if (!planId) {
            console.error('❌ No plan found for student ' + studentId);
            process.exit(1);
        }

        console.log(`✅ Proceeding to inject data for Student ${studentId}, Plan ${planId}`);

        // 2. Load the sample API response (has 15 questions)
        const apiResponse = JSON.parse(fs.readFileSync(path.join(__dirname, 'api_full_response.json'), 'utf8'));

        // 3. Parse it using the fixed parser to get valid data
        const { learningContent, questions } = ContentGenerationService.parseAIResponse(apiResponse);

        // We will use all 15 questions for both steps
        const step1Questions = questions;
        const step2Questions = questions;

        // 4. Delete existing rows for Step 1 and Step 2
        await pool.execute(
            'DELETE FROM study_plan WHERE student_ID = ? AND plan_id = ? AND week_number = ? AND step_ID IN (1, 2)',
            [studentId, planId, weekNumber]
        );
        console.log('✅ Deleted existing placeholders/data for Steps 1 and 2');

        // 5. Helper function to insert questions
        async function insertStep(stepId, stepName, stepStatus, questionsArray) {
            let inserted = 0;
            for (let qi = 0; qi < questionsArray.length; qi++) {
                const q = questionsArray[qi];
                const optionsStr = JSON.stringify(q.options);
                const qid = `Q_W${weekNumber}_S${stepId}_${qi + 1}`;

                await pool.execute(
                    `INSERT INTO study_plan
                     (plan_id, student_ID, week_number, step_ID, module_name, step_name, gen_QID,
                      learning_content, question, options, correct_answer, step_status, attempt_count, start_date)
                     VALUES (?, ?, ?, ?, 'Analytical Thinking', ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                    [planId, studentId, weekNumber, stepId, stepName, qid,
                        learningContent.substring(0, 800) + '... (Mock Content for Step ' + stepId + ')', // modified to show distinct
                        q.question, optionsStr, q.correct_answer, stepStatus]
                );
                inserted++;
            }
            console.log(`✅ Inserted ${inserted} questions for Step ${stepId} ("${stepName}")`);
        }

        // 6. Insert Step 1 (IN_PROGRESS)
        await insertStep(1, 'Pattern Recognition', 'IN_PROGRESS', step1Questions);

        // 7. Insert Step 2 (LOCKED)
        await insertStep(2, 'Problem Decomposition', 'LOCKED', step2Questions);

        console.log('🎉 Successfully seeded demo data!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
