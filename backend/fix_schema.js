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

        // Add current_streak if missing
        if (!columnNames.includes('current_streak')) {
            console.log('➕ Adding current_streak column...');
            await pool.execute("ALTER TABLE student ADD COLUMN current_streak INT DEFAULT 0");
            console.log('✅ Added current_streak');
        } else {
            console.log('✅ current_streak already exists');
        }

        // Add total_xp if missing (required for gamification)
        if (!columnNames.includes('total_xp')) {
            console.log('➕ Adding total_xp column...');
            await pool.execute("ALTER TABLE student ADD COLUMN total_xp INT DEFAULT 0");
            console.log('✅ Added total_xp');
        } else {
            console.log('✅ total_xp already exists');
        }

        // Add current_level if missing (required for gamification)
        if (!columnNames.includes('current_level')) {
            console.log('➕ Adding current_level column...');
            await pool.execute("ALTER TABLE student ADD COLUMN current_level INT DEFAULT 0");
            console.log('✅ Added current_level');
        } else {
            console.log('✅ current_level already exists');
        }

        // Add last_login if missing (required for login tracking)
        if (!columnNames.includes('last_login')) {
            console.log('➕ Adding last_login column...');
            await pool.execute("ALTER TABLE student ADD COLUMN last_login DATETIME DEFAULT NULL");
            console.log('✅ Added last_login');
        } else {
            console.log('✅ last_login already exists');
        }

        // Add closed_at if missing (required for exit tracking)
        if (!columnNames.includes('closed_at')) {
            console.log('➕ Adding closed_at column...');
            await pool.execute("ALTER TABLE student ADD COLUMN closed_at DATETIME DEFAULT NULL");
            console.log('✅ Added closed_at');
        } else {
            console.log('✅ closed_at already exists');
        }

        // Add created_at if missing (required for account info)
        if (!columnNames.includes('created_at')) {
            console.log('➕ Adding created_at column...');
            await pool.execute("ALTER TABLE student ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
            console.log('✅ Added created_at');
        } else {
            console.log('✅ created_at already exists');
        }

        // Add longest_streak if missing (required for personal bests)
        if (!columnNames.includes('longest_streak')) {
            console.log('➕ Adding longest_streak column...');
            await pool.execute("ALTER TABLE student ADD COLUMN longest_streak INT DEFAULT 0");
            console.log('✅ Added longest_streak');
        } else {
            console.log('✅ longest_streak already exists');
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

