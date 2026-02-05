const pool = require('./backend/config/database');

async function checkStreaks() {
    try {
        const [rows] = await pool.execute('SELECT student_ID, name, current_streak, longest_streak FROM student');
        console.log('Student Streaks:');
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkStreaks();
