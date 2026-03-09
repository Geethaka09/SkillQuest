require('dotenv').config();
const pool = require('./config/database');

async function fixMissingSteps() {
    try {
        // Get all students and their plans
        const [plans] = await pool.execute(
            `SELECT DISTINCT student_ID, plan_id FROM study_plan`
        );

        for (const plan of plans) {
            const { student_ID: sid, plan_id: pid } = plan;

            // Get existing week 1 steps
            const [existing] = await pool.execute(
                `SELECT DISTINCT step_ID FROM study_plan WHERE student_ID = ? AND plan_id = ? AND week_number = 1 ORDER BY step_ID`,
                [sid, pid]
            );
            const existingIds = existing.map(r => r.step_ID);
            console.log(`${sid} (plan ${pid}) week 1 existing steps: ${existingIds.join(', ')}`);

            // Find missing step IDs (should be 1-5)
            const missing = [1, 2, 3, 4, 5].filter(id => !existingIds.includes(id));
            if (missing.length === 0) {
                console.log(`  ✅ All 5 steps present`);
                continue;
            }

            console.log(`  ❌ Missing steps: ${missing.join(', ')}`);

            // Get a sample row to copy module_name pattern
            const [sample] = await pool.execute(
                `SELECT module_name FROM study_plan WHERE student_ID = ? AND plan_id = ? AND week_number = 1 LIMIT 1`,
                [sid, pid]
            );
            const sampleModule = sample[0]?.module_name || 'General';

            // Insert placeholder rows for missing steps
            for (const stepId of missing) {
                const status = stepId === 1 ? 'IN_PROGRESS' : 'LOCKED';
                await pool.execute(
                    `INSERT INTO study_plan 
                     (plan_id, student_ID, week_number, step_ID, module_name, step_name, 
                      gen_QID, learning_content, question, options, correct_answer, 
                      step_status, attempt_count, start_date) 
                     VALUES (?, ?, 1, ?, ?, CONCAT('Step ', ?), 1, '', '', '[]', '', ?, 0, NOW())`,
                    [pid, sid, stepId, sampleModule, stepId, status]
                );
                console.log(`  ✅ Inserted placeholder for step ${stepId} (status: ${status})`);
            }
        }

        // Verify
        const [verify] = await pool.execute(
            `SELECT student_ID, plan_id, week_number, COUNT(DISTINCT step_ID) as steps 
             FROM study_plan 
             GROUP BY student_ID, plan_id, week_number 
             ORDER BY student_ID, plan_id, week_number`
        );
        console.log('\n=== VERIFICATION ===');
        verify.forEach(r => console.log(`${r.student_ID} plan ${r.plan_id} week ${r.week_number}: ${r.steps} steps`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

fixMissingSteps();
