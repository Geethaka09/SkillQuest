// Debug script for RL Feedback API
require('dotenv').config();
const axios = require('axios');

const RL_API_URL = process.env.RL_API_URL || 'http://localhost:5001';

async function testFeedback() {
    console.log(`Testing Feedback Endpoint: ${RL_API_URL}/feedback`);

    // Payload 1: Standard (Boolean)
    const payload1 = {
        user_id: "test_student_001",
        user_returned: true,
        new_user_data: {
            level: "Beginner",
            active_minutes: 5,
            quiz_accuracy: 0.9,
            // ... minimal metrics
        }
    };

    console.log('\n--- Attempt 1: Boolean user_returned ---');
    try {
        const res = await axios.post(`${RL_API_URL}/feedback`, payload1);
        console.log('✅ Success:', res.data);
    } catch (err) {
        console.log('❌ Failed:', err.response ? err.response.data : err.message);
        console.log('   Status:', err.response ? err.response.status : 'N/A');
    }

    // Payload 2: Integer (1/0)
    const payload2 = { ...payload1, user_returned: 1 };

    console.log('\n--- Attempt 2: Integer user_returned ---');
    try {
        const res = await axios.post(`${RL_API_URL}/feedback`, payload2);
        console.log('✅ Success:', res.data);
    } catch (err) {
        console.log('❌ Failed:', err.response ? err.response.data : err.message);
    }
}

testFeedback();
