const express = require('express');
const router = express.Router();
const { getWeeklyEngagement } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// Get weekly engagement data for chart
router.get('/weekly-engagement', auth, getWeeklyEngagement);

module.exports = router;
