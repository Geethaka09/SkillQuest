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
// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getMe);

// @route   POST /api/auth/upload-profile-pic
// @desc    Upload profile picture
// @access  Private
const { upload, uploadProfilePic, updateProfile } = require('../controllers/authController');
router.post('/upload-profile-pic', auth, upload.single('profilePic'), uploadProfilePic);

// @route   PUT /api/auth/update-profile
// @desc    Update profile details (name)
// @access  Private
router.put('/update-profile', auth, updateProfile);

module.exports = router;
