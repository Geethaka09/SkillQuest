require('dotenv').config();
const pool = require('./config/database');

async function verify() {
    const [rows] = await pool.execute(
        `SELECT student_ID, step_ID, step_name 
         FROM study_plan 
         WHERE week_number = 1 
         GROUP BY student_ID, step_ID, step_name 
         ORDER BY student_ID, step_ID`
    );
    rows.forEach(r => console.log(r.student_ID + ' s' + r.step_ID + ' = ' + r.step_name));
    process.exit(0);
}
verify();
