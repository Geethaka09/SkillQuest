const express = require('express');
const router = express.Router();
const {
    verifyEmail, resendVerification,
    forgotPassword, resetPassword,
    verifyEmailChange
} = require('../controllers/emailController');

/**
 * Email Verification & Password Reset Routes (P5 Supporting)
 * Base URL: /api/auth
 */

// @route   POST /api/auth/verify-email
// @desc    Verify user email (P5: Account Activation)
// @access  Public
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/verify-email-change
// @desc    Verify new email after email change request
// @access  Public
router.post('/verify-email-change', verifyEmailChange);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email (P5: Retry Activation)
// @access  Public
router.post('/resend-verification', resendVerification);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', resetPassword);

module.exports = router;

