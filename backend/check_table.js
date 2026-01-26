// Quick script to check student table structure
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
        const [rows] = await pool.execute('DESCRIBE student');
        console.log('Student table columns:');
        rows.forEach(row => {
            console.log(`  - ${row.Field} (${row.Type}) ${row.Key === 'PRI' ? '[PRIMARY KEY]' : ''}`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTable();
