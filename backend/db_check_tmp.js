require('dotenv').config();
const pool = require('./config/database');

(async () => {
    try {
        // Check which students have empty content
        const [rows] = await pool.execute(
            `SELECT student_ID, plan_id, 
                    COUNT(*) as total_rows,
                    SUM(CASE WHEN learning_content IS NULL OR learning_content = '' THEN 1 ELSE 0 END) as empty_rows
             FROM study_plan 
             GROUP BY student_ID, plan_id 
             ORDER BY plan_id DESC 
             LIMIT 10`
        );
        
        const fs = require('fs');
        fs.writeFileSync('db_check.txt', JSON.stringify(rows, null, 2), 'utf8');
        console.log('Saved to db_check.txt');
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
