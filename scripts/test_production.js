const { runProductionCycle } = require('../src/productionWorker.js');

async function test() {
    console.log('--- MANUALLY TRIGGERING PRODUCTION CYCLE ---');
    await runProductionCycle();
    console.log('--- CYCLE COMPLETE ---');
}

test().catch(e => console.error(e)).finally(() => process.exit());
