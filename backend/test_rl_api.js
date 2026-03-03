// TEMPORARY DEBUG SCRIPT - Check RL API response format
require('dotenv').config();
const axios = require('axios');

const RL_API_URL = process.env.RL_API_URL;

async function testRLAPI() {
    const sessionDuration = 300;
    const testMetrics = {
        user_id: "test123",
        level: "Beginner",
        active_minutes: 10,
        quiz_accuracy: 0.8,
        days_since_last_login: 1,
        daily_xp: 100,
        modules_done: 2,
        recent_points: 100,
        total_badges: 0,
        total_badges_count: 0,              // Required by updated API
        session_duration: sessionDuration,
        duration_norm: sessionDuration / 3600, // Required: normalized 0-1
        quiz_score: 80,
        consecutive_completions: 2,
        consecutive: 2                      // Required by updated API
    };

    try {
        const response = await axios.post(`${RL_API_URL}/predict`, testMetrics, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        console.log('RL API RESPONSE:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

testRLAPI();
