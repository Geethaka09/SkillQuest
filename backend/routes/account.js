const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getAccountInfo, getPersonalBests,
    upload, uploadProfilePic, updateProfile,
    changePassword, changeEmail, deleteAccount
} = require('../controllers/accountController');

/**
 * Account Management Routes
 * Base URL: /api/auth
 * 
 * Handles profile settings, password/email changes, and account deletion.
 */

// @route   GET /api/auth/account-info
// @desc    Get profile page info
// @access  Private
router.get('/account-info', auth, getAccountInfo);

// @route   GET /api/auth/personal-bests
// @desc    Get high scores / streaks
// @access  Private
router.get('/personal-bests', auth, getPersonalBests);

// @route   POST /api/auth/upload-profile-pic
// @desc    Upload profile image (Multipart)
// @access  Private
router.post('/upload-profile-pic', auth, upload.single('profilePic'), uploadProfilePic);

// @route   PUT /api/auth/update-profile
// @desc    Update name/bio
// @access  Private
router.put('/update-profile', auth, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Update password (bcrypt)
// @access  Private
router.put('/change-password', auth, changePassword);

// @route   PUT /api/auth/change-email
// @desc    Update email address
// @access  Private
router.put('/change-email', auth, changeEmail);

// @route   DELETE /api/auth/delete-account
// @desc    Hard delete user & data
// @access  Private
router.delete('/delete-account', auth, deleteAccount);

module.exports = router;
