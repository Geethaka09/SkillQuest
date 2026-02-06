require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkBadges() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('=== BADGES TABLE ===');
    const [cols] = await conn.query('DESCRIBE badges');
    cols.forEach(c => console.log(`${c.Field} (${c.Type})`));

    console.log('\n=== SAMPLE BADGES ===');
    const [badges] = await conn.query('SELECT * FROM badges LIMIT 5');
    console.log(JSON.stringify(badges, null, 2));

    console.log('\n=== STUDENT_BADGES TABLE ===');
    const [sbCols] = await conn.query('DESCRIBE student_badges');
    sbCols.forEach(c => console.log(`${c.Field} (${c.Type})`));

    await conn.end();
}

checkBadges().catch(console.error);
