const pool = require('./config/database');

async function debugQuiz() {
    try {
        console.log('🔍 Checking correct answers...');
        const [rows] = await pool.execute(
            `SELECT q_ID, correct_answer, option_text 
             FROM quiz_bank 
             ORDER BY RAND()
             LIMIT 5`
        );

        rows.forEach(q => {
            console.log(`[Q${q.q_ID}] Correct Answer: "${q.correct_answer}"`);
            // console.log(`         from Options: "${q.option_text}"`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } process.exit();
}

debugQuiz();
