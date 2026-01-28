// Script to explore quiz_bank structure
const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');

async function exploreQuizBank() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: { rejectUnauthorized: true }
    });

    try {
        const output = [];

        // Get table structure
        const [cols] = await pool.execute('SHOW COLUMNS FROM quiz_bank');
        output.push('COLUMNS:');
        cols.forEach(c => output.push(`  ${c.Field} (${c.Type})`));

        // Get sample row
        const [sample] = await pool.execute('SELECT * FROM quiz_bank LIMIT 1');
        output.push('\nSAMPLE ROW:');
        output.push(JSON.stringify(sample[0], null, 2));

        // Get distinct categories
        const [cats] = await pool.execute('SELECT DISTINCT category FROM quiz_bank');
        output.push('\nCATEGORIES:');
        cats.forEach(c => output.push(`  ${c.category}`));

        // Get distinct difficulties
        const [diffs] = await pool.execute('SELECT DISTINCT difficulty_rate FROM quiz_bank');
        output.push('\nDIFFICULTIES:');
        diffs.forEach(d => output.push(`  ${d.difficulty_rate}`));

        // Count by category and difficulty
        const [counts] = await pool.execute(`
            SELECT category, difficulty_rate, COUNT(*) as count 
            FROM quiz_bank 
            GROUP BY category, difficulty_rate 
            ORDER BY category, difficulty_rate
        `);
        output.push('\nCOUNTS BY CATEGORY & DIFFICULTY:');
        counts.forEach(c => output.push(`  ${c.category} | ${c.difficulty_rate} | ${c.count}`));

        // Write to file
        fs.writeFileSync('quiz_info.txt', output.join('\n'));
        console.log('Output written to quiz_info.txt');

    } catch (error) {
        console.error('Error:', error.message);
        fs.writeFileSync('quiz_info.txt', 'Error: ' + error.message);
    } finally {
        await pool.end();
    }
}

exploreQuizBank();
