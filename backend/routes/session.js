const express = require('express');
const router = express.Router();
const { logExit } = require('../controllers/sessionController');

/**
 * Session Management Routes (P19, P20)
 * Base URL: /api/auth
 * 
 * P19: Terminate Session — logs exit timestamp when user closes browser/tab
 * P20: Handle Session Expiration — handled by JWT expiry + frontend auth middleware
 */

// @route   POST /api/auth/log-exit
// @desc    Log when user exits (via beacon) — P19
// @access  Public (No Auth Header — sendBeacon cannot set headers)
router.post('/log-exit', logExit);

module.exports = router;
