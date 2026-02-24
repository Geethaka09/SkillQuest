const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { login, getMe } = require('../controllers/loginController');

/**
 * Login Routes (P6 → P8)
 * Base URL: /api/auth
 */

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (P6: Submit, P7: Validate, P8: Session + Redirect)
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current user context (P8: Session verification)
// @access  Private
router.get('/me', auth, getMe);

module.exports = router;
