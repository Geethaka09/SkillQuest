const express = require('express');
const router = express.Router();
const { getWeeklyEngagement, getDailyXP } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// Get weekly engagement data for chart
router.get('/weekly-engagement', auth, getWeeklyEngagement);
// Get daily XP velocity for chart
router.get('/xp-velocity', auth, getDailyXP);

module.exports = router;
