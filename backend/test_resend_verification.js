const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/auth';
const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: true }
};

const TEST_USER = {
    email: `resend_test_${Date.now()}@example.com`,
    password: 'Password123!',
    firstName: 'Resend',
    lastName: 'Test',
    userName: `resend_${Date.now().toString().slice(-6)}`
};

async function runTest() {
    let connection;
    try {
        console.log('--- Resend Verification Test ---');
        connection = await mysql.createConnection(DB_CONFIG);

        // 1. Register User
        console.log('1. Registering user...');
        await axios.post(`${API_URL}/register`, TEST_USER);
        console.log('   User registered.');

        // 2. Get Initial Token
        const [rows1] = await connection.execute(
            'SELECT verification_token, verification_token_expires FROM student WHERE email = ?',
            [TEST_USER.email]
        );
        const initialToken = rows1[0].verification_token;
        const initialExpiry = new Date(rows1[0].verification_token_expires);
        console.log('   Initial Token:', initialToken.substring(0, 10) + '...');

        // Wait a second to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. Request Resend
        console.log('2. Requesting resend verification...');
        const resendResponse = await axios.post(`${API_URL}/resend-verification`, {
            email: TEST_USER.email
        });
        console.log('   Response:', resendResponse.data.message);

        // 4. Get New Token
        const [rows2] = await connection.execute(
            'SELECT verification_token, verification_token_expires FROM student WHERE email = ?',
            [TEST_USER.email]
        );
        const newToken = rows2[0].verification_token;
        const newExpiry = new Date(rows2[0].verification_token_expires);
        console.log('   New Token:', newToken.substring(0, 10) + '...');

        // 5. Verify Changes
        if (initialToken === newToken) {
            throw new Error('Token did not change!');
        }
        if (newExpiry <= initialExpiry) {
            throw new Error('Expiry did not update!');
        }
        console.log('✅ PASS: Token and expiry updated successfully.');

        // Cleanup
        await connection.execute('DELETE FROM student WHERE email = ?', [TEST_USER.email]);
        console.log('Cleanup done.');

    } catch (error) {
        console.error('❌ FAIL:', error.message);
        if (error.response) {
            console.error('   Server Response:', error.response.data);
        }
    } finally {
        if (connection) await connection.end();
    }
}

runTest();
