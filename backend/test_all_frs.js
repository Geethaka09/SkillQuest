/**
 * FR Verification — writes results as JSON
 */
const axios = require('axios');
const fs = require('fs');

const BASE = 'http://localhost:5000/api';
const results = [];

async function hit(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const cfg = { method, url: `${BASE}${path}`, headers, validateStatus: () => true };
        if (body) cfg.data = body;
        const r = await axios(cfg);
        return { status: r.status, ok: r.status < 500, data: typeof r.data === 'object' ? r.data : {} };
    } catch (e) {
        return { status: 0, ok: false, error: e.message };
    }
}

async function run() {
    // Login first
    const loginRes = await hit('POST', '/auth/login', { email: 'geethaka@gmail.com', password: 'gee12345' });
    const T = loginRes.data?.token || null;
    results.push({ fr: 'FR1', ep: 'POST /auth/login', ...loginRes, hasToken: !!T });

    // FR1
    const tests = [
        ['FR1', 'GET', '/health', null, null],
        ['FR1', 'POST', '/auth/register', { email: '', password: '' }, null],
        ['FR1', 'POST', '/auth/verify-email', { token: 'x' }, null],
        ['FR1', 'POST', '/auth/verify-email-change', { token: 'x' }, null],
        ['FR1', 'POST', '/auth/resend-verification', { email: 'x@x.com' }, null],
        ['FR1', 'POST', '/auth/forgot-password', { email: 'x@x.com' }, null],
        ['FR1', 'POST', '/auth/reset-password/fake', { password: 'x' }, null],
        ['FR1', 'GET', '/auth/me', null, T],
        ['FR1', 'GET', '/auth/account-info', null, T],
        ['FR1', 'GET', '/auth/personal-bests', null, T],
        ['FR1', 'POST', '/auth/log-exit', 'test', null],
        // FR2
        ['FR2', 'GET', '/quiz/initial', null, T],
        ['FR2', 'POST', '/quiz/answer', {}, T],
        ['FR2', 'POST', '/quiz/complete', {}, T],
        ['FR2', 'POST', '/profile/classify', null, T],
        ['FR2', 'GET', '/profile/report', null, T],
        // FR3
        ['FR3', 'GET', '/study-plan/progress', null, T],
        ['FR3', 'GET', '/study-plan/week/1', null, T],
        ['FR3', 'GET', '/study-plan/step/1/1', null, T],
        ['FR3', 'POST', '/study-plan/submit-quiz', {}, T],
        // FR4
        ['FR4', 'GET', '/analytics/weekly-engagement', null, T],
        ['FR4', 'GET', '/analytics/xp-velocity', null, T],
        // Gamification
        ['GAMIFY', 'GET', '/gamification/dashboard', null, T],
        ['GAMIFY', 'GET', '/gamification/daily-goals', null, T],
        ['GAMIFY', 'GET', '/gamification/badges', null, T],
        // RL
        ['RL', 'GET', '/rl/recommend', null, T],
        ['RL', 'GET', '/rl/metrics', null, T],
        ['RL', 'POST', '/rl/feedback', { userReturned: true }, T],
    ];

    for (const [fr, method, path, body, token] of tests) {
        const r = await hit(method, path, body, token);
        results.push({ fr, ep: `${method} ${path}`, status: r.status, ok: r.ok, error: r.error || null });
    }

    fs.writeFileSync('fr_results.json', JSON.stringify(results, null, 2), 'utf8');

    // Also print summary
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    console.log(JSON.stringify({ total: results.length, passed, failed, failures: results.filter(r => !r.ok) }));
}

run();
