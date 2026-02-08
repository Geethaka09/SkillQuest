const mysql = require('mysql2/promise');
require('dotenv').config();

const testConnection = async () => {
    try {
        const pool = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        const [rows] = await pool.query('SELECT 1 as val');
        console.log('Query result:', rows);

        await pool.end();
    } catch (error) {
        console.error('Connection failed:', error);
    }
};

testConnection();
