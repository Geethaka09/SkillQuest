const fs = require('fs');
const PlanGeneratorService = require('./services/PlanGeneratorService');

async function testService() {
    try {
        console.log("Testing PlanGeneratorService for S0001...");
        const result = await PlanGeneratorService.generateWeekPlan('S0001');
        console.log("✅ Plan generated successfully");
        fs.writeFileSync('plan_gen_test_result.json', JSON.stringify(result, null, 2));
        console.log("Result saved to plan_gen_test_result.json");
    } catch (err) {
        console.error("❌ Test failed:");
        console.error(err);
    }
}

testService();
