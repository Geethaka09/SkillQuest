const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generatePlan } = require('../controllers/planGeneratorController');

/**
 * Plan Generator Routes
 * Base URL: /api/plan-generator
 */

// @route   POST /api/plan-generator/generate
// @desc    Generate a learning plan from external API
// @access  Private
router.post('/generate', auth, generatePlan);

module.exports = router;
