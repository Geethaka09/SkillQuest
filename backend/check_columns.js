const pool = require('./config/database');

async function listColumns() {
    try {
        console.log('🔍 Checking student table columns...');
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 'student'
        `);

        console.log('Columns found:', columns.map(c => c.COLUMN_NAME));
    } catch (error) {
        console.error('❌ Error:', error);
    } process.exit();
}

listColumns();
