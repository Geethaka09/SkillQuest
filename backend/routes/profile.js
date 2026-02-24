const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { classify, getReport } = require('../controllers/profileController');

/**
 * Profile Classification Routes (P10/P11/P12)
 * These endpoints handle student proficiency classification
 * based on initial quiz performance.
 */

// @route   POST /api/profile/classify
// @desc    Classify student level based on quiz scores (P10 → P11)
// @access  Private
router.post('/classify', auth, classify);

// @route   GET /api/profile/report
// @desc    Get student's classification report (P12)
// @access  Private
router.get('/report', auth, getReport);

module.exports = router;
