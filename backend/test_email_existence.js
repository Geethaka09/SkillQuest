const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = `duplicate_test_${Date.now()}@example.com`;
const TEST_USER = {
    email: TEST_EMAIL,
    password: 'password123',
    firstName: 'Duplicate',
    lastName: 'Tester',
    userName: `dup_${Date.now().toString().slice(-8)}`
};

const runTest = async () => {
    let connection;
    try {
        console.log('--- Testing Email Existence Check ---');

        // 1. First Registration (Should Succeed)
        console.log(`\n1. Registering new email: ${TEST_EMAIL}`);
        try {
            await axios.post(`${BASE_URL}/register`, TEST_USER);
            console.log('✅ First registration successful.');
        } catch (error) {
            console.error('❌ First registration failed (Unexpected):', error.response ? error.response.data : error.message);
            process.exit(1);
        }

        // 2. Second Registration (Should Fail)
        console.log('\n2. Attempting to register with SAME email...');
        try {
            await axios.post(`${BASE_URL}/register`, TEST_USER);
            console.error('❌ Failed: Server ALLOWED duplicate email!');
        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.message === 'Email already registered') {
                console.log('✅ SUCCESS: Server correctly rejected duplicate email.');
                console.log(`   Response: "${error.response.data.message}"`);
            } else {
                console.error('❌ Unexpected error:', error.response ? error.response.data : error.message);
            }
        }

        // Cleanup
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: true }
        });
        await connection.execute('DELETE FROM student WHERE email = ?', [TEST_EMAIL]);
        console.log('\nCleanup complete.');

    } catch (error) {
        console.error('Test Error:', error);
    } finally {
        if (connection) await connection.end();
    }
};

runTest();
