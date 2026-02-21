/**
 * SkillQuest API Endpoint Tester
 * Tests all API endpoints and reports their status.
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:5000';
const JWT_SECRET = 'skillquest_jwt_secret_key_2026_secure';

// Create a test JWT token with a fake user id
const testToken = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: '1h' });

const results = [];

function request(method, path, body = null, useAuth = false) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        };
        if (useAuth) {
            options.headers['Authorization'] = `Bearer ${testToken}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data.substring(0, 200);
                }
                resolve({ status: res.statusCode, body: parsed });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 'ERROR', body: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'TIMEOUT', body: 'Request timed out' });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function statusIcon(code) {
    if (code === 'ERROR' || code === 'TIMEOUT') return '❌';
    if (code >= 200 && code < 300) return '✅';
    if (code === 401) return '🔒'; // Auth required - expected for protected routes without valid user
    if (code === 400) return '⚠️';  // Bad request - endpoint works but needs proper data
    if (code === 404) return '🔍'; // Not found
    if (code >= 500) return '💥'; // Server error
    return '⚠️';
}

function resultLabel(code, isProtected) {
    if (code === 'ERROR' || code === 'TIMEOUT') return 'FAIL';
    if (code >= 200 && code < 300) return 'OK';
    if (code === 401 && !isProtected) return 'UNAUTH';
    if (code === 401 && isProtected) return 'NEEDS REAL USER'; // Token valid but user id=1 may not exist
    if (code === 400) return 'ROUTE WORKS (needs data)';
    if (code === 404) return 'NOT FOUND';
    if (code >= 500) return 'SERVER ERROR';
    return `HTTP ${code}`;
}

async function testEndpoint(method, path, description, isProtected, body = null) {
    const res = await request(method, path, body, isProtected);
    const icon = statusIcon(res.status);
    const label = resultLabel(res.status, isProtected);
    
    let message = '';
    if (typeof res.body === 'object' && res.body !== null) {
        message = res.body.message || res.body.error || JSON.stringify(res.body).substring(0, 100);
    } else {
        message = String(res.body).substring(0, 100);
    }

    results.push({ method, path, description, status: res.status, icon, label, message, isProtected });
}

async function runAllTests() {
    console.log('='.repeat(80));
    console.log('  SkillQuest API Endpoint Test Report');
    console.log('  ' + new Date().toLocaleString());
    console.log('='.repeat(80));
    console.log('');

    // ── Health ──
    await testEndpoint('GET', '/api/health', 'Health check', false);

    // ── Auth (Public) ──
    await testEndpoint('POST', '/api/auth/login', 'Login', false, { email: 'test@test.com', password: 'test' });
    await testEndpoint('POST', '/api/auth/register', 'Register (no data)', false, {});
    await testEndpoint('POST', '/api/auth/log-exit', 'Log exit', false, '1');
    await testEndpoint('POST', '/api/auth/verify-email', 'Verify email', false, { token: 'test' });
    await testEndpoint('POST', '/api/auth/resend-verification', 'Resend verification', false, { email: 'test@test.com' });
    await testEndpoint('POST', '/api/auth/forgot-password', 'Forgot password', false, { email: 'test@test.com' });
    await testEndpoint('POST', '/api/auth/reset-password/faketoken', 'Reset password', false, { password: 'test123' });

    // ── Auth (Protected) ──
    await testEndpoint('GET', '/api/auth/me', 'Get current user', true);
    await testEndpoint('GET', '/api/auth/account-info', 'Account info', true);
    await testEndpoint('GET', '/api/auth/personal-bests', 'Personal bests', true);
    await testEndpoint('PUT', '/api/auth/update-profile', 'Update profile', true, { name: 'Test' });
    await testEndpoint('PUT', '/api/auth/change-password', 'Change password', true, { currentPassword: 'old', newPassword: 'new' });
    await testEndpoint('PUT', '/api/auth/change-email', 'Change email', true, { newEmail: 'x@x.com' });

    // ── Quiz (Protected) ──
    await testEndpoint('GET', '/api/quiz/initial', 'Get initial quiz', true);
    await testEndpoint('POST', '/api/quiz/answer', 'Submit answer', true, { questionId: 1, answer: 'A' });
    await testEndpoint('POST', '/api/quiz/complete', 'Complete quiz', true, {});

    // ── Gamification (Protected) ──
    await testEndpoint('GET', '/api/gamification/dashboard', 'Dashboard stats', true);
    await testEndpoint('GET', '/api/gamification/daily-goals', 'Daily goals', true);
    await testEndpoint('GET', '/api/gamification/badges', 'Badges', true);
    await testEndpoint('POST', '/api/gamification/add-xp', 'Add XP', true, { xp: 10 });

    // ── Study Plan (Protected) ──
    await testEndpoint('GET', '/api/study-plan/progress', 'Student progress', true);
    await testEndpoint('GET', '/api/study-plan/week/1', 'Week 1 content', true);
    await testEndpoint('GET', '/api/study-plan/step/1/1', 'Step 1/1 content', true);
    await testEndpoint('POST', '/api/study-plan/submit-quiz', 'Submit step quiz', true, { weekNumber: 1, stepId: 1, answers: [] });

    // ── Analytics (Protected) ──
    await testEndpoint('GET', '/api/analytics/weekly-engagement', 'Weekly engagement', true);
    await testEndpoint('GET', '/api/analytics/xp-velocity', 'XP velocity', true);

    // ── RL (Protected) ──
    await testEndpoint('GET', '/api/rl/recommend', 'RL recommendation', true);
    await testEndpoint('GET', '/api/rl/metrics', 'RL metrics', true);
    await testEndpoint('POST', '/api/rl/feedback', 'RL feedback', true, { recommendation_id: 'test', user_returned: 1 });

    // ── Print Results ──
    console.log('');
    console.log('─'.repeat(80));
    console.log('  PUBLIC ENDPOINTS');
    console.log('─'.repeat(80));
    results.filter(r => !r.isProtected).forEach(r => {
        console.log(`  ${r.icon} ${r.method.padEnd(6)} ${r.path.padEnd(45)} ${String(r.status).padEnd(5)} ${r.label}`);
        if (r.message) console.log(`       └─ ${r.message}`);
    });

    console.log('');
    console.log('─'.repeat(80));
    console.log('  PROTECTED ENDPOINTS (using JWT for user id=1)');
    console.log('─'.repeat(80));
    results.filter(r => r.isProtected).forEach(r => {
        console.log(`  ${r.icon} ${r.method.padEnd(6)} ${r.path.padEnd(45)} ${String(r.status).padEnd(5)} ${r.label}`);
        if (r.message) console.log(`       └─ ${r.message}`);
    });

    // ── Summary ──
    const total = results.length;
    const ok = results.filter(r => r.status >= 200 && r.status < 300).length;
    const authIssues = results.filter(r => r.status === 401).length;
    const serverErrors = results.filter(r => r.status >= 500).length;
    const badReq = results.filter(r => r.status === 400).length;
    const failures = results.filter(r => r.status === 'ERROR' || r.status === 'TIMEOUT').length;

    console.log('');
    console.log('═'.repeat(80));
    console.log('  SUMMARY');
    console.log('═'.repeat(80));
    console.log(`  Total endpoints tested: ${total}`);
    console.log(`  ✅ Success (2xx):       ${ok}`);
    console.log(`  ⚠️  Bad Request (400):   ${badReq} (route works, needs valid data)`);
    console.log(`  🔒 Auth issues (401):   ${authIssues} (user id=1 may not exist in DB)`);
    console.log(`  💥 Server errors (5xx): ${serverErrors}`);
    console.log(`  ❌ Connection failures:  ${failures}`);
    console.log('═'.repeat(80));

    if (serverErrors > 0) {
        console.log('');
        console.log('⚠️  ENDPOINTS WITH SERVER ERRORS:');
        results.filter(r => r.status >= 500).forEach(r => {
            console.log(`  💥 ${r.method} ${r.path}`);
            console.log(`     └─ ${r.message}`);
        });
    }
}

runAllTests().catch(console.error);
