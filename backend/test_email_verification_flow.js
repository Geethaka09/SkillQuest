const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';
const TEST_USER = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    firstName: 'Test',
    lastName: 'User',
    userName: `u${Date.now().toString().slice(-8)}` // fit in 15 chars
};

const runTest = async () => {
    let connection;
    try {
        console.log('--- Starting Email Verification Flow Test ---');

        // 1. CONNECT TO DB (To get token later)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: true }
        });

        // 2. REGISTER
        console.log(`\n1. Registering user: ${TEST_EMAIL}`);
        try {
            const res = await axios.post(`${BASE_URL}/register`, TEST_USER);
            console.log('✅ Registration successful:', res.data.message);
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
            console.error('❌ Registration failed. See test_error.log');
            require('fs').writeFileSync('test_error.log', errorMsg);
            process.exit(1);
        }

        // 3. CHECK EMAIL EXISTENCE (Try to register again)
        console.log('\n2. Checking Email Existence (Duplicate Registration)');
        try {
            await axios.post(`${BASE_URL}/register`, TEST_USER);
            console.error('❌ Failed: Should have rejected duplicate email');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Correctly rejected duplicate email');
            } else {
                console.error('❌ Unexpected error for duplicate:', error.message);
            }
        }

        // 4. ATTEMPT LOGIN (Should Fail)
        console.log('\n3. Attempting Login BEFORE Verification');
        try {
            await axios.post(`${BASE_URL}/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            console.error('❌ Failed: Login succeeded but should have failed');
        } catch (error) {
            if (error.response && error.response.status === 401 && error.response.data.message.includes('verify')) {
                console.log('✅ Correctly blocked unverified login');
            } else {
                console.error('❌ Unexpected match for unverified login:', error.response ? error.response.data : error.message);
            }
        }

        // 5. GET VERIFICATION TOKEN FROM DB
        console.log('\n4. Retrieving Verification Token from Database');
        const [rows] = await connection.execute(
            'SELECT verification_token FROM student WHERE email = ?',
            [TEST_EMAIL]
        );
        const token = rows[0].verification_token;
        console.log('✅ Token retrieved:', token);

        // 6. VERIFY EMAIL
        console.log('\n5. Verifying Email');
        try {
            const res = await axios.post(`${BASE_URL}/verify-email`, { token });
            console.log('✅ Verification successful:', res.data.message);
        } catch (error) {
            console.error('❌ Verification failed:', error.response ? error.response.data : error.message);
            process.exit(1);
        }

        // 7. ATTEMPT LOGIN (Should Succeed)
        console.log('\n6. Attempting Login AFTER Verification');
        try {
            const res = await axios.post(`${BASE_URL}/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            console.log('✅ Login successful:', res.data.message);
        } catch (error) {
            console.error('❌ Login failed:', error.response ? error.response.data : error.message);
        }

        // CLEANUP
        console.log('\n--- Cleaning up ---');
        await connection.execute('DELETE FROM student WHERE email = ?', [TEST_EMAIL]);
        console.log('Test user deleted.');

    } catch (error) {
        console.error('Global Test Error:', error);
    } finally {
        if (connection) await connection.end();
    }
};

runTest();
