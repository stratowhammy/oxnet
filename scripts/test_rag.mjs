import { queryRAGContext, addContextMaterial } from '../src/lib/rag.js';

async function run() {
    console.log("Testing direct RAG storage...");
    await addContextMaterial('TEST', '123', 'The price of Apples went up because of a drought.');
    await addContextMaterial('TEST', '456', 'Orange juice futures collapsed today due to bumper crops.');

    console.log("Testing RAG retrieval...");
    const hits = await queryRAGContext("Why did apples get more expensive?", 2);

    console.log("\nTop Matches:");
    console.log(JSON.stringify(hits, null, 2));
}

run().catch(console.error);
