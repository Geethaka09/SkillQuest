/**
 * Re-trigger content generation for S0001 plan 7
 * This calls fillPlanContent which will iterate all empty steps and generate content
 */
require('dotenv').config();
const ContentGenerationService = require('./services/ContentGenerationService');

const studentId = 'S0001';
const planId = 7;

console.log(`Re-triggering content generation for student ${studentId}, plan ${planId}...`);
console.log('This will take several minutes (AI Engine needs time per step).\n');

ContentGenerationService.fillPlanContent(studentId, planId)
    .then(result => {
        console.log('\n=== DONE ===');
        console.log(`Steps filled: ${result.stepsFilled}`);
        console.log(`Total questions: ${result.totalQuestionsGenerated}`);
        process.exit(0);
    })
    .catch(err => {
        console.error('\n=== FAILED ===');
        console.error('Error:', err.message);
        process.exit(1);
    });
