require('dotenv').config();
const axios = require('axios');
const ContentGenerationService = require('./services/ContentGenerationService');
const pool = require('./config/database');

const STUDENT_ID = 'S0001';
const CAPI = process.env.CONTENT_API_URL;

const PLAN_TOPICS = [
    { week: 1, domain: 'Programming', topic: 'Variables & Data Types' },
    { week: 2, domain: 'Analytical Thinking', topic: 'Pattern Recognition' },
    { week: 3, domain: 'Computational Thinking', topic: 'Algorithm Design' },
    { week: 4, domain: 'Mixed', topic: 'Combine Programming + Analytical + Computational exercises' }
];

async function warmupAzure() {
    console.log('☁️  Warming up Azure AI Engine (this may take 2-4 minutes on cold start)...');
    try {
        // Just hit the docs endpoint to wake Azure up — no AI generation needed
        await axios.get(CAPI + '/docs', { timeout: 300000 });
        console.log('✅ Azure is awake!');
    } catch (e) {
        console.log('⚠️  Warmup ping failed:', e.message, '— continuing anyway');
    }
    // Give it a moment to fully initialize
    await new Promise(r => setTimeout(r, 5000));
}

async function generateDummyData() {
    console.log(`Starting dummy data generation for student ${STUDENT_ID}...`);
    console.log(`API URL: ${CAPI}`);
    console.log(`Timeout: 300s (5 min) per request\n`);

    try {
        // 0. Wake up Azure first
        await warmupAzure();

        // 1. Delete existing study plan data for this student
        console.log(`\nClearing existing study plan data for ${STUDENT_ID}...`);
        const [delResult] = await pool.execute('DELETE FROM study_plan WHERE student_ID = ?', [STUDENT_ID]);
        console.log(`Deleted ${delResult.affectedRows} old rows.\n`);

        // 2. Generate new data sequentially
        let successCount = 0;
        for (const item of PLAN_TOPICS) {
            const moduleName = `${item.domain}: ${item.topic}`;
            console.log(`--- Week ${item.week}: ${moduleName} ---`);

            let success = false;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`  Attempt ${attempt}/2 — calling AI Engine...`);
                    const start = Date.now();
                    const result = await ContentGenerationService.generateAndSavePlan(
                        STUDENT_ID, item.week, moduleName, item.topic, 1
                    );
                    const elapsed = Math.round((Date.now() - start) / 1000);
                    console.log(`  ✅ Done in ${elapsed}s — ${result.rowsInserted} rows inserted (planId: ${result.planId})`);
                    success = true;
                    successCount++;
                    break;
                } catch (err) {
                    console.error(`  ❌ Attempt ${attempt} failed (${err.message})`);
                    if (attempt < 2) {
                        console.log('  Waiting 15s before retry...');
                        await new Promise(r => setTimeout(r, 15000));
                    }
                }
            }
            if (!success) console.log(`  ⚠️ Skipped Week ${item.week}\n`);
            else {
                // Short pause between successful calls
                await new Promise(r => setTimeout(r, 3000));
                console.log('');
            }
        }

        // 3. Show summary
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Generated ${successCount}/${PLAN_TOPICS.length} weeks successfully`);
        const [rows] = await pool.execute(
            `SELECT week_number, module_name, COUNT(*) as questions 
             FROM study_plan WHERE student_ID = ? 
             GROUP BY week_number, module_name ORDER BY week_number`,
            [STUDENT_ID]
        );
        if (rows.length > 0) {
            console.log('\nStudy Plan in DB:');
            console.table(rows);
        } else {
            console.log('\n⚠️ No rows in study_plan — all calls may have failed.');
        }
    } catch (e) {
        console.error('Fatal Error:', e.message);
    } finally {
        process.exit(0);
    }
}

generateDummyData();
