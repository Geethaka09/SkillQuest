const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);


// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getMe);

// @route   GET /api/auth/account-info
// @desc    Get account information
// @access  Private
const { getAccountInfo } = require('../controllers/authController');
router.get('/account-info', auth, getAccountInfo);

// @route   GET /api/auth/personal-bests
// @desc    Get personal best records
// @access  Private
const { getPersonalBests } = require('../controllers/authController');
router.get('/personal-bests', auth, getPersonalBests);

// @route   POST /api/auth/upload-profile-pic
// @desc    Upload profile picture
// @access  Private
const { upload, uploadProfilePic, updateProfile } = require('../controllers/authController');
router.post('/upload-profile-pic', auth, upload.single('profilePic'), uploadProfilePic);

// @route   PUT /api/auth/update-profile
// @desc    Update profile details (name)
// @access  Private
router.put('/update-profile', auth, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
const { changePassword, changeEmail, deleteAccount, logExit } = require('../controllers/authController');
router.put('/change-password', auth, changePassword);

// @route   PUT /api/auth/change-email
// @desc    Change email
// @access  Private
router.put('/change-email', auth, changeEmail);

// @route   DELETE /api/auth/delete-account
// @desc    Delete user account and all related data
// @access  Private
router.delete('/delete-account', auth, deleteAccount);

// @route   POST /api/auth/log-exit
// @desc    Log when user exits/closes browser (via sendBeacon)
// @access  Public (sendBeacon cannot send auth headers)
router.post('/log-exit', logExit);

module.exports = router;
