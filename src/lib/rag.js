import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '../../data/rag_store.json');

// Ensure data directory exists
const dataDir = path.dirname(STORE_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load Store into memory
let store = [];
function loadStore() {
    if (fs.existsSync(STORE_PATH)) {
        try {
            store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        } catch (e) {
            console.error("Failed to parse RAG store JSON", e);
            store = [];
        }
    }
}
loadStore();

function saveStore() {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// Determine Embedding Endpoint safely based on existing LLM_URL
function getEmbeddingsUrl() {
    let baseUrl = process.env.LLM_URL || 'http://127.0.0.1:1234/v1/chat/completions';
    if (baseUrl.endsWith('/chat/completions')) {
        return baseUrl.replace('/chat/completions', '/embeddings');
    }
    if (!baseUrl.endsWith('/embeddings')) {
        try {
            const urlObj = new URL(baseUrl);
            return `${urlObj.origin}/v1/embeddings`;
        } catch (e) {
            return 'http://127.0.0.1:1234/v1/embeddings';
        }
    }
    return baseUrl;
}

const LLM_EMBEDDING_MODEL = process.env.LLM_EMBEDDING_MODEL || 'text-embedding-nomic-embed-text-v1.5';

/**
 * Hits the local LLM endpoint to generate a vector array for the provided text.
 */
async function getEmbedding(text) {
    const endpoint = getEmbeddingsUrl();
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: text,
                model: LLM_EMBEDDING_MODEL
            })
        });

        if (!response.ok) {
            throw new Error(`Embedding request failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0].embedding; // Expecting an array of floats
        }
        throw new Error("No embedding returned.");
    } catch (e) {
        console.error("Embedding generation failed:", e.message, "\nMake sure your local LLM server is running an embedding model.");
        return null;
    }
}

/**
 * Calculates the cosine similarity between two vector arrays.
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves relevant contextual material from the local RAG store based on textual similarity.
 * @param {string} queryText - The search query (e.g. "What happened with Quantum Innovations recently?")
 * @param {number} maxResults - Maximum number of chunks to return (default: 5)
 * @param {string} filterType - Optional: Filter by specific type (e.g. "ASSET_DESCRIPTION", "NEWS_STORY")
 * @returns Array of sorted contextual hits.
 */
export async function queryRAGContext(queryText, maxResults = 5, filterType = null) {
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return []; // Fallback gracefully if embedding fails

    let candidates = store;
    if (filterType) {
        candidates = candidates.filter(item => item.type === filterType);
    }

    if (candidates.length === 0) return [];

    const results = candidates.map(item => {
        return {
            ...item,
            score: cosineSimilarity(queryEmbedding, item.embedding)
        };
    });

    // Sort descending by highest relevance
    results.sort((a, b) => b.score - a.score);

    // Omit the massive vector arrays from the returned answer to save bridge memory
    return results.slice(0, maxResults).map(({ type, referenceId, text, score, updatedAt }) => ({
        type, referenceId, text, score, updatedAt
    }));
}

/**
 * Adds new context material to the RAG store. Generates its embedding and saves to disk.
 * @param {string} type - A categorization tag (e.g. "ASSET_DESCRIPTION", "NEWS_STORY")
 * @param {string} referenceId - A unique ID for the material (like asset symbol or explicit DB ID)
 * @param {string} text - The raw text payload to store and index
 * @returns boolean indication of success
 */
export async function addContextMaterial(type, referenceId, text) {
    const embedding = await getEmbedding(text);
    if (!embedding) return false;

    // Check if this referenceId already exists to avoid dupes, update it if so
    const existingIndex = store.findIndex(item => item.referenceId === referenceId && item.type === type);

    const record = {
        type,
        referenceId,
        text,
        embedding,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        store[existingIndex] = record;
    } else {
        store.push(record);
    }

    saveStore();
    return true;
}

export function getRagStoreStats() {
    return {
        totalIndexedItems: store.length
    };
}

/**
 * Irreversibly purges the entire RAG memory index from local storage.
 */
export function clearRagStore() {
    store = [];
    saveStore();
}
