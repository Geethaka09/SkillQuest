const fs = require('fs');
const PlanGeneratorService = require('./services/PlanGeneratorService');
const pool = require('./config/database');

async function testContentChaining() {
    try {
        const studentId = 'S0005';

        // Clean up existing test data
        console.log(`[Test] Cleaning existing study_plan rows for ${studentId}...`);
        await pool.execute('DELETE FROM study_plan WHERE student_ID = ?', [studentId]);
        console.log('[Test] ✅ Cleaned\n');

        // Generate 1-week plan (this will also trigger content generation in background)
        console.log('[Test] Generating 1-week plan (content gen will chain automatically)...');
        const result = await PlanGeneratorService.generateFullPlan(studentId, 1);
        console.log(`[Test] ✅ Plan created: planId=${result.planId}, rows=${result.totalRowsInserted}`);

        // Wait for background content generation to finish
        // Week 1 has 5 steps, each takes ~10-30 seconds
        console.log('\n[Test] Waiting for background content generation (this may take a few minutes)...');

        // Poll every 10 seconds to check if content has been filled
        let maxWaitMs = 600000; // 10 minutes max
        let pollIntervalMs = 10000;
        let elapsed = 0;
        let contentReady = false;

        while (elapsed < maxWaitMs) {
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            elapsed += pollIntervalMs;

            const [rows] = await pool.execute(
                `SELECT COUNT(*) as total, 
                        SUM(CASE WHEN learning_content != '' AND learning_content IS NOT NULL THEN 1 ELSE 0 END) as filled
                 FROM study_plan WHERE student_ID = ? AND plan_id = ?`,
                [studentId, result.planId]
            );

            const total = rows[0].total;
            const filled = Number(rows[0].filled);
            console.log(`[Test] Progress: ${filled}/${total} rows have content (${Math.round(elapsed / 1000)}s elapsed)`);

            // Check if at least one step has been filled with questions (total rows > 5 original)
            if (total > 5 && filled > 0) {
                contentReady = true;
                console.log('[Test] ✅ Content generation has started producing results!');

                // Wait a bit more for more steps to complete
                await new Promise(resolve => setTimeout(resolve, 15000));
                break;
            }
        }

        // Final verification
        console.log('\n[Test] === FINAL VERIFICATION ===');
        const [finalRows] = await pool.execute(
            `SELECT week_number, step_ID, step_name, step_status,
                    LENGTH(learning_content) as content_length,
                    question, gen_QID
             FROM study_plan 
             WHERE student_ID = ? AND plan_id = ?
             ORDER BY week_number, step_ID, gen_QID`,
            [studentId, result.planId]
        );

        console.log(`Total rows: ${finalRows.length}`);

        // Group by step
        const steps = {};
        for (const r of finalRows) {
            const key = `W${r.week_number}S${r.step_ID}`;
            if (!steps[key]) {
                steps[key] = { topic: r.step_name, status: r.step_status, questions: 0, hasContent: false };
            }
            steps[key].questions++;
            if (r.content_length > 0) steps[key].hasContent = true;
        }

        console.log('\nStep Summary:');
        for (const [key, info] of Object.entries(steps)) {
            console.log(`  ${key}: "${info.topic}" | ${info.status} | ${info.questions} questions | content: ${info.hasContent ? '✅' : '❌'}`);
        }

        // Save summary
        fs.writeFileSync('content_chain_test.json', JSON.stringify({ steps, totalRows: finalRows.length }, null, 2));
        console.log('\n[Test] Result saved to content_chain_test.json');

        process.exit(0);
    } catch (err) {
        console.error('[Test] ❌ Failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

testContentChaining();
