const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    login, register, getMe,
    getAccountInfo, getPersonalBests,
    upload, uploadProfilePic, updateProfile,
    changePassword, changeEmail, deleteAccount, logExit,
    verifyEmail, resendVerification,
    forgotPassword, resetPassword
} = require('../controllers/authController');

/**
 * Auth Routes
 * Base URL: /api/auth
 */

// ==========================================
// PUBLIC ROUTES
// ==========================================

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/log-exit
// @desc    Log when user exits (via beacon)
// @access  Public (No Auth Header)
router.post('/log-exit', logExit);

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
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


// ==========================================
// PRIVATE ROUTES (Require Token)
// ==========================================

// @route   GET /api/auth/me
// @desc    Get current user context
router.get('/me', auth, getMe);

// @route   GET /api/auth/account-info
// @desc    Get profile page info
router.get('/account-info', auth, getAccountInfo);

// @route   GET /api/auth/personal-bests
// @desc    Get high scores / streaks
router.get('/personal-bests', auth, getPersonalBests);

// @route   POST /api/auth/upload-profile-pic
// @desc    Upload profile image (Multipart)
router.post('/upload-profile-pic', auth, upload.single('profilePic'), uploadProfilePic);

// @route   PUT /api/auth/update-profile
// @desc    Update name/bio
router.put('/update-profile', auth, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Update password (bcrypt)
router.put('/change-password', auth, changePassword);

// @route   PUT /api/auth/change-email
// @desc    Update email address
router.put('/change-email', auth, changeEmail);

// @route   DELETE /api/auth/delete-account
// @desc    Hard delete user & data
router.delete('/delete-account', auth, deleteAccount);

module.exports = router;
