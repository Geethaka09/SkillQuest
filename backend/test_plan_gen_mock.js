/**
 * Mock test for PlanGeneratorService - Tests the full 4-week plan generation flow
 * WITHOUT needing the HF Space to be running.
 * 
 * This spins up a local mock FastAPI-like server that returns the same response
 * format as the RL Personalization API, then runs generateFullPlan against it.
 * 
 * Usage: node test_plan_gen_mock.js
 */
require('dotenv').config();
const http = require('http');
const pool = require('./config/database');

// ============================================================
// 1. Mock RL Personalization API Server
// ============================================================
const MOCK_PORT = 9999;

const mockHandler = (req, res) => {
    if (req.method === 'POST' && req.url === '/generate-plan') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const input = JSON.parse(body);
            console.log('\n[MockAPI] Received request:', JSON.stringify(input, null, 2));

            // Simulate the RL Personalization API response
            const categories = ['Programming', 'Analytical Thinking', 'Computational Thinking', 'Mixed'];
            const topicsByCategory = {
                'Programming': ['Variables and Data Types', 'Loops', 'Functions', 'Arrays', 'Data Structures', 'Algorithms'],
                'Analytical Thinking': ['Pattern Recognition', 'Problem Decomposition', 'Logical Chains', 'Scenario Analysis'],
                'Computational Thinking': ['Flowcharts', 'Pseudocode', 'Abstraction', 'Algorithm Design'],
                'Mixed': ['Logic Challenges', 'System Design', 'Debugging', 'Real-world Problems']
            };

            const weekly_plan = [];
            const usedTopics = new Set();

            for (let day = 1; day <= 5; day++) {
                const category = categories[(day - 1) % categories.length];
                const available = topicsByCategory[category].filter(t => !usedTopics.has(t));
                const topic = available.length > 0
                    ? available[Math.floor(Math.random() * available.length)]
                    : topicsByCategory[category][0];
                usedTopics.add(topic);

                weekly_plan.push({ day, category, topic });
            }

            // Determine status based on input
            let status = 'Steady';
            if (input.quiz_score > 0.75 && input.engagement > 0.6) status = 'Promote';
            else if (input.quiz_score < 0.4) status = 'Demote';

            const response = {
                monitor_report: {
                    status,
                    reward_score: input.quiz_score * 0.5 + input.engagement * 0.5,
                    user_level: input.user_level
                },
                weekly_plan
            };

            console.log('[MockAPI] Sending response:', JSON.stringify(response, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'SkillQuest AI Mock is online' }));
    }
};

// ============================================================
// 2. Run the test
// ============================================================
async function runTest() {
    // Start mock server
    const server = http.createServer(mockHandler);
    server.listen(MOCK_PORT, () => {
        console.log(`[Test] ✅ Mock API running on http://localhost:${MOCK_PORT}`);
    });

    // Override the env var to point to mock server
    process.env.RL_PERSONALIZE_API_URL = `http://localhost:${MOCK_PORT}`;

    // Clear require cache to pick up new env var
    delete require.cache[require.resolve('./services/PlanGeneratorService')];
    const PlanGeneratorService = require('./services/PlanGeneratorService');

    const studentId = 'S0005'; // Test student

    try {
        // Step 1: Check student exists
        console.log(`\n[Test] Checking student ${studentId}...`);
        const [student] = await pool.execute(
            'SELECT student_ID, at_score, ct_score, p_score, level FROM student WHERE student_ID = ?',
            [studentId]
        );
        if (student.length === 0) {
            console.error(`[Test] ❌ Student ${studentId} not found in database!`);
            server.close();
            process.exit(1);
        }
        console.log(`[Test] Student found:`, JSON.stringify(student[0]));

        // Step 2: Test buildPayload
        console.log('\n[Test] === Testing buildPayload() ===');
        const payload = await PlanGeneratorService.buildPayload(studentId);
        console.log('[Test] Payload:', JSON.stringify(payload, null, 2));

        // Validate payload shape
        const errors = [];
        if (!Array.isArray(payload.current_scores) || payload.current_scores.length !== 3) {
            errors.push('current_scores must be an array of 3 floats');
        }
        if (typeof payload.user_level !== 'string') {
            errors.push('user_level must be a string');
        }
        if (typeof payload.quiz_score !== 'number' || payload.quiz_score < 0 || payload.quiz_score > 1) {
            errors.push(`quiz_score must be a float 0-1, got: ${payload.quiz_score}`);
        }
        if (typeof payload.engagement !== 'number' || payload.engagement < 0 || payload.engagement > 1) {
            errors.push(`engagement must be a float 0-1, got: ${payload.engagement}`);
        }

        if (errors.length > 0) {
            console.error('[Test] ❌ Payload validation errors:', errors);
        } else {
            console.log('[Test] ✅ Payload shape is valid!');
        }

        // Step 3: Clean up existing test data
        console.log('\n[Test] === Cleaning existing study_plan rows ===');
        await pool.execute('DELETE FROM study_plan WHERE student_ID = ?', [studentId]);
        console.log('[Test] ✅ Cleaned');

        // Step 4: Generate full 4-week plan
        console.log('\n[Test] === Generating 4-week plan ===');
        const result = await PlanGeneratorService.generateFullPlan(studentId, 4);

        console.log('\n[Test] === RESULTS ===');
        console.log(`Plan ID: ${result.planId}`);
        console.log(`Total Weeks: ${result.totalWeeks}`);
        console.log(`Total Rows Inserted: ${result.totalRowsInserted}`);

        // Step 5: Verify database rows
        console.log('\n[Test] === DATABASE VERIFICATION ===');
        const [dbRows] = await pool.execute(
            `SELECT week_number, step_ID, module_name, step_name, step_status
             FROM study_plan 
             WHERE student_ID = ? AND plan_id = ?
             ORDER BY week_number, step_ID`,
            [studentId, result.planId]
        );

        console.log(`Total database rows: ${dbRows.length}`);
        console.log(`Expected: 20 (4 weeks × 5 days)\n`);

        for (const row of dbRows) {
            console.log(`  W${row.week_number} S${row.step_ID}: [${row.module_name}] "${row.step_name}" (${row.step_status})`);
        }

        // Step 6: Verify week coverage
        const weekCounts = {};
        dbRows.forEach(r => {
            weekCounts[r.week_number] = (weekCounts[r.week_number] || 0) + 1;
        });

        console.log('\n[Test] Week coverage:', weekCounts);

        let allGood = true;
        for (let w = 1; w <= 4; w++) {
            if (weekCounts[w] !== 5) {
                console.error(`[Test] ❌ Week ${w}: expected 5 rows, got ${weekCounts[w] || 0}`);
                allGood = false;
            }
        }

        // Verify Week 1 Day 1 is IN_PROGRESS, rest are LOCKED
        const w1s1 = dbRows.find(r => r.week_number === 1 && r.step_ID === 1);
        if (w1s1?.step_status !== 'IN_PROGRESS') {
            console.error(`[Test] ❌ Week 1, Step 1 should be IN_PROGRESS, got: ${w1s1?.step_status}`);
            allGood = false;
        }

        const lockedRows = dbRows.filter(r => !(r.week_number === 1 && r.step_ID === 1));
        const allLocked = lockedRows.every(r => r.step_status === 'LOCKED');
        if (!allLocked) {
            console.error('[Test] ❌ Not all non-first steps are LOCKED');
            allGood = false;
        }

        // Step 7: Check monitor reports
        console.log('\n[Test] === MONITOR REPORTS ===');
        result.weeklyPlans.forEach(wp => {
            console.log(`  Week ${wp.weekNumber}: ${JSON.stringify(wp.monitorReport)}`);
        });

        if (allGood && dbRows.length === 20) {
            console.log('\n[Test] ✅✅✅ ALL TESTS PASSED! 4-week plan generation works correctly! ✅✅✅');
        } else {
            console.log('\n[Test] ❌ Some tests failed. Check the output above.');
        }

        // Clean up test data
        await pool.execute('DELETE FROM study_plan WHERE student_ID = ? AND plan_id = ?', [studentId, result.planId]);
        console.log('[Test] Cleaned up test data.');

    } catch (err) {
        console.error('[Test] ❌ Failed:', err.message);
        console.error(err.stack);
    } finally {
        server.close();
        process.exit(0);
    }
}

runTest();
