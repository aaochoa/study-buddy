import { LlmAgent, Context } from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { qaAgentInstruction } from '../utils/prompts';
import { OpenRouterLlm } from '../utils/openrouter-llm';
import { logger } from '../utils/logger';

dotenv.config();

/**
 * Resolves the appropriate model name to use for the QA agent
 * based on environment variables, defaulting to 'gemini-2.0-flash'.
 *
 * @returns The resolved model name.
 */
const getModel = () => {
    if (process.env.QA_MODEL) {
        return process.env.QA_MODEL.trim();
    }
    if (process.env.RESEARCH_MODEL) {
        const models = process.env.RESEARCH_MODEL.split(',');
        return models[0].trim();
    }
    return process.env.GOOGLE_GENAI_MODEL || 'gemini-2.0-flash';
};

const modelName = getModel();
const modelInstance = new OpenRouterLlm({ model: modelName });

/**
 * Scans the research directory and reads the content of the most
 * recently modified markdown file to be used as context for the QA session.
 *
 * @returns The contents of the latest guide markdown file, or an empty string.
 */
const getLatestGuideContent = (): string => {
    const researchDir = path.join(__dirname, '..', 'research');
    if (!fs.existsSync(researchDir)) return '';

    try {
        const files = fs.readdirSync(researchDir);
        const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));
        if (mdFiles.length === 0) return '';

        // Sort by mtime descending (newest first)
        const sorted = mdFiles
            .map((f) => {
                const p = path.join(researchDir, f);
                return {
                    name: f,
                    time: fs.statSync(p).mtime.getTime(),
                    path: p,
                };
            })
            .sort((a, b) => b.time - a.time);

        return fs.readFileSync(sorted[0].path, 'utf-8');
    } catch (err) {
        logger.error({ err }, 'Failed to read latest guide file');
        return '';
    }
};

/**
 * Callback triggered before model invocation to enforce a maximum LLM call limit (10)
 * per session to prevent runaway loops.
 *
 * @param params - Context containing invocation history and cost manager.
 * @returns A fallback response object if the limit is reached, or undefined.
 */
const limitLlmCallsCallback = async ({ context }: { context: Context }) => {
    const calls = (context.invocationContext as any).invocationCostManager?.numberOfLlmCalls || 0;
    if (calls >= 10) {
        return {
            content: {
                role: 'model',
                parts: [{ text: 'Conversation limit reached for this session.' }],
            },
        } as any;
    }
    return undefined;
};

const qaAgent = new LlmAgent({
    name: 'study_buddy_qa',
    description: 'QA assistant that answers questions based on the latest researched study guide.',
    model: modelInstance,
    instruction: async () => {
        const latestGuide = getLatestGuideContent();
        let instruction = qaAgentInstruction;
        if (latestGuide) {
            instruction += `\n\nHere is the content of the current study guide you must answer questions about:\n\n=== STUDY GUIDE START ===\n${latestGuide}\n=== STUDY GUIDE END ===`;
        } else {
            instruction += `\n\nIMPORTANT: Currently, no study guide has been generated yet. Please politely ask the user to research a topic first in the sidebar.`;
        }
        return instruction;
    },
    beforeModelCallback: limitLlmCallsCallback,
    generateContentConfig: {
        maxOutputTokens: 2000,
        temperature: 0.3,
    },
});

export default qaAgent;
