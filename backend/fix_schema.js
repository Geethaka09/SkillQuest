const pool = require('./config/database');

async function fixSchema() {
    try {
        console.log('🔗 Connecting to database...');

        // Check current columns
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' AND TABLE_NAME = 'student'
        `);

        const columnNames = columns.map(c => c.COLUMN_NAME);
        console.log('Existing columns:', columnNames);

        // Add last_activity_date if missing
        if (!columnNames.includes('last_activity_date')) {
            console.log('➕ Adding last_activity_date column...');
            await pool.execute("ALTER TABLE student ADD COLUMN last_activity_date DATE");
            console.log('✅ Added last_activity_date');
        } else {
            console.log('✅ last_activity_date already exists');
        }

        // Add current_streak if missing
        if (!columnNames.includes('current_streak')) {
            console.log('➕ Adding current_streak column...');
            await pool.execute("ALTER TABLE student ADD COLUMN current_streak INT DEFAULT 0");
            console.log('✅ Added current_streak');
        } else {
            console.log('✅ current_streak already exists');
        }

        console.log('🎉 Schema fix completed successfully!');
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
    } finally {
        // Force exit
        process.exit();
    }
}

fixSchema();
