import { LlmAgent } from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { challengesCreatorInstruction } from '../utils/prompts';
import { OpenRouterLlm } from '../utils/openrouter-llm';

dotenv.config();

const getModel = () => {
    if (process.env.CHALLENGES_MODEL) {
        return process.env.CHALLENGES_MODEL.trim();
    }
    if (process.env.RESEARCH_MODEL) {
        const models = process.env.RESEARCH_MODEL.split(',');
        return models[0].trim();
    }
    return process.env.GOOGLE_GENAI_MODEL || 'gemini-2.0-flash';
};

const modelName = getModel();
const modelInstance = new OpenRouterLlm({ model: modelName });

const challengesAgent = new LlmAgent({
    name: 'study_buddy_challenges',
    description: 'Generates 3 well-explained programming challenges (1 easy, 1 medium, 1 hard).',
    model: modelInstance,
    instruction: challengesCreatorInstruction,
    // We intentionally omit outputKey so the agent always generates a fresh response
    // instead of short-circuiting when the state is already populated.
    generateContentConfig: {
        maxOutputTokens: 8000,
        temperature: 0.3,
        // responseMimeType: 'application/json',
    },
});

export default challengesAgent;
