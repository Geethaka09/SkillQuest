/**
 * Fix placeholder step names for steps that were re-inserted.
 * Calls the Plan Generator API to get real topic names for steps 1 and 3.
 */
require('dotenv').config();
const pool = require('./config/database');
const PlanGeneratorService = require('./services/PlanGeneratorService');

async function fixStepNames() {
    try {
        // Get all students with generic step names
        const [genericSteps] = await pool.execute(
            `SELECT DISTINCT student_ID, plan_id, week_number, step_ID, step_name
             FROM study_plan 
             WHERE step_name LIKE 'Step %' AND LENGTH(step_name) <= 6
             ORDER BY student_ID, week_number, step_ID`
        );

        if (genericSteps.length === 0) {
            console.log('No generic step names found. All good!');
            process.exit(0);
        }

        console.log(`Found ${genericSteps.length} steps with generic names:`);
        genericSteps.forEach(s => console.log(`  ${s.student_ID} w${s.week_number} s${s.step_ID}: "${s.step_name}"`));

        // Group by student
        const byStudent = {};
        genericSteps.forEach(s => {
            if (!byStudent[s.student_ID]) byStudent[s.student_ID] = [];
            byStudent[s.student_ID].push(s);
        });

        for (const [studentId, steps] of Object.entries(byStudent)) {
            console.log(`\nFixing student ${studentId}...`);

            // Call Plan Generator API to get a week plan with real topics
            try {
                const apiResponse = await PlanGeneratorService.generateWeekPlan(studentId);
                const weeklyPlan = apiResponse.weekly_plan;

                if (!weeklyPlan) {
                    console.log(`  ❌ API returned no weekly_plan`);
                    continue;
                }

                // Map Day N -> topic
                const dayTopics = {};
                for (const [dayKey, dayData] of Object.entries(weeklyPlan)) {
                    const dayMatch = dayKey.match(/(\d+)/);
                    const dayNum = dayMatch ? parseInt(dayMatch[1]) : null;
                    if (dayNum) {
                        dayTopics[dayNum] = {
                            category: dayData.Category || 'General',
                            topic: dayData.Topic || dayKey
                        };
                    }
                }

                console.log('  API topics:', JSON.stringify(dayTopics, null, 2));

                // Update each generic step with the real topic from the API
                for (const step of steps) {
                    const apiTopic = dayTopics[step.step_ID];
                    if (apiTopic) {
                        await pool.execute(
                            `UPDATE study_plan 
                             SET step_name = ?, module_name = ?
                             WHERE student_ID = ? AND plan_id = ? AND week_number = ? AND step_ID = ?`,
                            [apiTopic.topic, apiTopic.category, step.student_ID, step.plan_id, step.week_number, step.step_ID]
                        );
                        console.log(`  ✅ Step ${step.step_ID}: "${step.step_name}" → "${apiTopic.topic}" (${apiTopic.category})`);
                    } else {
                        console.log(`  ⚠️ No API topic for step ${step.step_ID}`);
                    }
                }
            } catch (apiErr) {
                console.error(`  ❌ API error for ${studentId}: ${apiErr.message}`);
            }
        }

        // Verify
        console.log('\n=== VERIFICATION ===');
        const [verify] = await pool.execute(
            `SELECT student_ID, week_number, step_ID, step_name, module_name
             FROM study_plan 
             WHERE student_ID IN (${Object.keys(byStudent).map(() => '?').join(',')})
               AND week_number = 1
             GROUP BY student_ID, week_number, step_ID, step_name, module_name
             ORDER BY student_ID, step_ID`,
            Object.keys(byStudent)
        );
        verify.forEach(r => console.log(`  ${r.student_ID} w${r.week_number} s${r.step_ID}: "${r.step_name}" [${r.module_name}]`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

fixStepNames();
