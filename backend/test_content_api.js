/**
 * Quick connection test for the SkillQuest AI Engine
 * No DB required — just tests the API is reachable and responds correctly.
 * 
 * Run: node test_content_api.js
 */
require('dotenv').config();
const axios = require('axios');

const CONTENT_API_URL = process.env.CONTENT_API_URL || 'http://localhost:8001';
const CONTENT_API_KEY = process.env.CONTENT_API_KEY || '';

const payload = {
    target_topic: "Pattern Recognition",
    proficiency: "Advanced",
    cognitive_difficulty: [[2, 2, 2], [2, 2, 2], [2, 2, 2]],
    historical_gaps: "Programming",
    gamification_level: 1,
    gamification_streak: 4,
    gamification_badge: "Low XP - use standard XP rewards and extra goals"
};

console.log('='.repeat(50));
console.log('SkillQuest AI Engine — Connection Test');
console.log('='.repeat(50));
console.log(`URL:     ${CONTENT_API_URL}/api/generate-lesson`);
console.log(`API Key: ${CONTENT_API_KEY ? CONTENT_API_KEY.substring(0, 10) + '...' : '(none)'}`);
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');
console.log('Sending request...');

axios.post(`${CONTENT_API_URL}/api/generate-lesson`, payload, {
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONTENT_API_KEY
    },
    timeout: 90000
})
    .then(res => {
        console.log('');
        console.log('✅ SUCCESS! HTTP', res.status);
        const fs = require('fs');
        fs.writeFileSync('api_full_response.json', JSON.stringify(res.data, null, 2));
        console.log('Response saved to api_full_response.json');
    })
    .catch(err => {
        const status = err.response?.status;
        const detail = err.response?.data;
        console.log('');
        console.log(`❌ FAILED — HTTP ${status || 'NO RESPONSE'}`);
        console.log('Error:', err.message);
        if (detail) console.log('Detail:', JSON.stringify(detail, null, 2));
    });
