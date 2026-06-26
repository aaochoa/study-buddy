import { LlmAgent, SequentialAgent } from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { problemsCreatorInstruction, solutionsCreatorInstruction } from '../utils/prompts';
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

const problemsAgent = new LlmAgent({
    name: 'study_buddy_problems_creator',
    description:
        'Generates 3 well-explained programming challenges (1 easy, 1 medium, 1 hard) without solutions.',
    model: modelInstance,
    instruction: problemsCreatorInstruction,
    outputKey: 'problems_result',
    generateContentConfig: {
        maxOutputTokens: 6000,
        temperature: 0.3,
    },
});

const solutionsAgent = new LlmAgent({
    name: 'study_buddy_solutions_creator',
    description:
        'Generates functional solutions and code explanations for each of the generated problems.',
    model: modelInstance,
    instruction: solutionsCreatorInstruction,
    outputKey: 'code_challenges',
    generateContentConfig: {
        maxOutputTokens: 8000,
        temperature: 0.2,
    },
});

const challengesAgent = new SequentialAgent({
    name: 'study_buddy_challenges',
    description: 'Generates 3 algorithmic coding challenges and their solutions sequentially.',
    subAgents: [problemsAgent, solutionsAgent],
});

export default challengesAgent;
