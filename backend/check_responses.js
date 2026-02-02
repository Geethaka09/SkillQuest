const pool = require('./config/database');

async function checkResponses() {
    try {
        console.log('🔍 Checking for recorded responses...');
        const [rows] = await pool.execute(
            `SELECT * FROM initial_question_paper 
             WHERE response IS NOT NULL 
             ORDER BY paper_ID DESC 
             LIMIT 5`
        );

        if (rows.length > 0) {
            console.log('✅ Found recorded responses:');
            rows.forEach(r => {
                console.log(`Paper: ${r.paper_ID}, Q: ${r.q_ID}, Resp: "${r.response}"`);
            });
        } else {
            console.log('⚠️ No responses found yet. (Maybe quiz hasn\'t been taken?)');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } process.exit();
}

checkResponses();
