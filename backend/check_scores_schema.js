const pool = require('./config/database');

async function checkSchema() {
    try {
        const [rows] = await pool.execute("SHOW COLUMNS FROM student");
        const columns = rows.map(r => r.Field);
        console.log('Columns in student table:', columns);

        const needed = ['at_score', 'ct_score', 'p_score'];
        const missing = needed.filter(c => !columns.includes(c));

        if (missing.length > 0) {
            console.log('❌ Missing columns:', missing);
        } else {
            console.log('✅ All score columns present');
        }
    } catch (e) {
        console.error(e);
    } process.exit();
}

checkSchema();
