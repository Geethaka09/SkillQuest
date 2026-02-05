require('dotenv').config();
const pool = require('./config/database');

async function checkStreaks() {
    try {
        console.log('Checking streaks with last_login...');
        const [rows] = await pool.execute('SELECT student_ID, name, current_streak, longest_streak, last_login FROM student');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkStreaks();
