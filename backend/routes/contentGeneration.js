const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { generatePlan, getPlanStatus, regenerateStep } = require('../controllers/contentGenerationController');

/**
 * Content Generation Routes (P13)
 * Base URL: /api/content
 *
 * These routes allow the backend to trigger AI content generation
 * for a student's personalized study plan.
 */

// @route   POST /api/content/generate-plan
// @desc    Generate learning content + questions for a student via AI API (P13)
// @access  Private
// @body    { week_number, module_name, step_count? }
router.post('/generate-plan', auth, generatePlan);

// @route   GET /api/content/status
// @desc    Check if the student already has a study plan
// @access  Private
router.get('/status', auth, getPlanStatus);

// @route   POST /api/content/regenerate-step
// @desc    Regenerate learning content and quiz for a specific step
// @access  Private
// @body    { week_number, step_id, plan_id }
router.post('/regenerate-step', auth, regenerateStep);

module.exports = router;
