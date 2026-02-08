const mysql = require('mysql2/promise');
require('dotenv').config();

const checkColumns = async () => {
    try {
        const pool = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: true }
        });

        console.log('Connected to database.');

        const [rows] = await pool.query('DESCRIBE student');
        console.log('Columns in student table:');
        rows.forEach(row => {
            console.log(`${row.Field} (${row.Type})`);
        });

        await pool.end();
    } catch (error) {
        console.error('Check failed:', error);
    }
};

checkColumns();
