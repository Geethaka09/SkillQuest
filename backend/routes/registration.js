const express = require('express');
const router = express.Router();
const { register } = require('../controllers/registrationController');

/**
 * Registration Routes (P1 → P5)
 * Base URL: /api/auth
 */

// @route   POST /api/auth/register
// @desc    Register new user (P1: Submit form, P2: Validate, P3: Check email, P4: Create account, P5: Send confirmation)
// @access  Public
router.post('/register', register);

module.exports = router;
