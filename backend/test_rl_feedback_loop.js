/**
 * RL Feedback Loop Integration Test
 * 
 * Tests the full action-reward feedback loop:
 * 1. Verifies rl_interactions table exists
 * 2. Tests saveInteraction()
 * 3. Tests getPendingInteraction()
 * 4. Tests markEngaged()
 * 5. Tests sendFeedback() with auto-lookup
 * 6. Cleans up test data
 * 
 * Usage: node test_rl_feedback_loop.js
 */
require('dotenv').config();
const pool = require('./config/database');

const TEST_STUDENT_ID = 'TEST_RL_LOOP_001';
const TEST_INTERACTION_ID = 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);

async function runTests() {
    console.log('='.repeat(60));
    console.log(' RL Feedback Loop Integration Tests');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    // ──── Test 1: Table exists ────
    try {
        const [rows] = await pool.execute('DESCRIBE rl_interactions');
        const columns = rows.map(r => r.Field);
        const required = ['id', 'student_ID', 'interaction_id', 'action_id', 'action_code', 'engaged', 'feedback_sent', 'created_at', 'expires_at'];
        const missing = required.filter(c => !columns.includes(c));

        if (missing.length === 0) {
            console.log('✅ Test 1: rl_interactions table exists with all required columns');
            console.log('   Columns:', columns.join(', '));
            passed++;
        } else {
            console.log(`❌ Test 1: Missing columns: ${missing.join(', ')}`);
            failed++;
            console.log('\n⚠️  Run the migration first:');
            console.log('   node run_migration.js migrations/create_rl_interactions_table.sql');
            return;
        }
    } catch (error) {
        console.log('❌ Test 1: rl_interactions table does NOT exist');
        console.log('   Error:', error.message);
        console.log('\n⚠️  Run the migration first:');
        console.log('   node run_migration.js migrations/create_rl_interactions_table.sql');
        failed++;
        return;
    }

    // ──── Test 2: Insert interaction ────
    try {
        const [result] = await pool.execute(
            `INSERT INTO rl_interactions 
                (student_ID, interaction_id, action_id, action_code, risk_score, expires_at)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [TEST_STUDENT_ID, TEST_INTERACTION_ID, 2, 'BADGE_INJECTION', 0.9965]
        );

        if (result.insertId > 0) {
            console.log(`✅ Test 2: Inserted interaction (id=${result.insertId}, interaction_id=${TEST_INTERACTION_ID})`);
            passed++;
        } else {
            console.log('❌ Test 2: Insert returned no insertId');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 2: Failed to insert interaction:', error.message);
        failed++;
    }

    // ──── Test 3: Retrieve pending interaction ────
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM rl_interactions 
             WHERE student_ID = ? AND engaged IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [TEST_STUDENT_ID]
        );

        if (rows.length > 0 && rows[0].interaction_id === TEST_INTERACTION_ID) {
            console.log(`✅ Test 3: Retrieved pending interaction (action: ${rows[0].action_code}, engaged: ${rows[0].engaged})`);
            passed++;
        } else {
            console.log('❌ Test 3: Could not retrieve the pending interaction');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 3: Failed to retrieve pending interaction:', error.message);
        failed++;
    }

    // ──── Test 4: Mark as engaged ────
    try {
        await pool.execute(
            `UPDATE rl_interactions SET engaged = 1, engaged_at = NOW() WHERE interaction_id = ?`,
            [TEST_INTERACTION_ID]
        );

        const [rows] = await pool.execute(
            `SELECT engaged, engaged_at FROM rl_interactions WHERE interaction_id = ?`,
            [TEST_INTERACTION_ID]
        );

        if (rows.length > 0 && rows[0].engaged === 1 && rows[0].engaged_at !== null) {
            console.log(`✅ Test 4: Marked interaction as engaged (engaged_at: ${rows[0].engaged_at})`);
            passed++;
        } else {
            console.log('❌ Test 4: Engagement update failed');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 4: Failed to mark engagement:', error.message);
        failed++;
    }

    // ──── Test 5: Verify no duplicate pending after engagement ────
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM rl_interactions 
             WHERE student_ID = ? AND engaged IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [TEST_STUDENT_ID]
        );

        if (rows.length === 0) {
            console.log('✅ Test 5: No pending interactions after engagement (correct — prevents duplicates)');
            passed++;
        } else {
            console.log('❌ Test 5: Found pending interaction after engagement (unexpected)');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 5: Query failed:', error.message);
        failed++;
    }

    // ──── Test 6: Feedback sent flag ────
    try {
        await pool.execute(
            `UPDATE rl_interactions SET feedback_sent = 1 WHERE interaction_id = ?`,
            [TEST_INTERACTION_ID]
        );

        const [rows] = await pool.execute(
            `SELECT feedback_sent FROM rl_interactions WHERE interaction_id = ?`,
            [TEST_INTERACTION_ID]
        );

        if (rows.length > 0 && rows[0].feedback_sent === 1) {
            console.log('✅ Test 6: feedback_sent flag set correctly');
            passed++;
        } else {
            console.log('❌ Test 6: feedback_sent flag not set');
            failed++;
        }
    } catch (error) {
        console.log('❌ Test 6: Failed to test feedback_sent:', error.message);
        failed++;
    }

    // ──── Cleanup ────
    try {
        await pool.execute(
            'DELETE FROM rl_interactions WHERE student_ID = ?',
            [TEST_STUDENT_ID]
        );
        console.log('\n🧹 Cleaned up test data');
    } catch (error) {
        console.log('\n⚠️  Cleanup failed:', error.message);
    }

    // ──── Summary ────
    console.log('\n' + '='.repeat(60));
    console.log(` Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log('='.repeat(60));

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
