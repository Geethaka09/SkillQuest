// Quick script to check quiz_bank table structure
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: { rejectUnauthorized: true }
    });

    try {
        // Check quiz_bank table
        console.log('\\n=== QUIZ_BANK TABLE ===');
        const [quizRows] = await pool.execute('DESCRIBE quiz_bank');
        quizRows.forEach(row => {
            console.log(`  - ${row.Field} (${row.Type}) ${row.Key === 'PRI' ? '[PRIMARY KEY]' : ''}`);
        });

        // Get sample questions
        console.log('\\n=== SAMPLE QUESTIONS ===');
        const [questions] = await pool.execute('SELECT * FROM quiz_bank LIMIT 3');
        console.log(JSON.stringify(questions, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTable();
