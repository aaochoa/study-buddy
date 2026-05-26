import {
    LlmAgent,
    GOOGLE_SEARCH,
    SequentialAgent,
    ParallelAgent,
    Context,
    toA2a,
    LLMRegistry,
} from '@google/adk';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import {
    reportAgentInstruction,
    architectureResearcherInstruction,
    questionsResearcherInstruction,
    pitfallsResearcherInstruction,
    challengesResearcherInstruction,
} from './utils/prompts';
import { getFilename } from './utils/file-definition';
import { OpenRouterLlm } from './utils/openrouter-llm';
dotenv.config();

// Register the custom OpenRouter LLM provider
LLMRegistry.register(OpenRouterLlm);

const getModel = () => {
    if (process.env.RESEARCH_MODEL) {
        const models = process.env.RESEARCH_MODEL.split(',');
        return models[0].trim();
    }
    return process.env.GOOGLE_GENAI_MODEL || 'gemini-2.0-flash';
};

const modelName = getModel();
const modelInstance = new OpenRouterLlm({ model: modelName });

const reportAgentCallback = async (callbackContext: Context) => {
    let report = callbackContext.state.get<string>('report_result') || '';

    // If report is empty, try to retrieve it from session events
    if (!report) {
        const events = callbackContext.invocationContext?.session?.events || [];
        for (let i = events.length - 1; i >= 0; i--) {
            const ev = events[i];
            if (ev.author === callbackContext.agentName && ev.content?.parts) {
                const text = ev.content.parts
                    .map((part: any) => (part.text ? part.text : ''))
                    .join('');
                if (text) {
                    report = text;
                    break;
                }
            }
        }
    }

    const filename = getFilename(callbackContext);

    // Write the file locally under research folder
    const researchDir = path.join(__dirname, '..', 'research');
    if (!fs.existsSync(researchDir)) {
        fs.mkdirSync(researchDir, { recursive: true });
    }
    const fullPath = path.join(researchDir, filename);
    fs.writeFileSync(fullPath, report, 'utf-8');

    // Create the base64 download link
    const base64Content = Buffer.from(report).toString('base64');
    const dataUri = `data:application/octet-stream;base64,${base64Content}`;
    const downloadLink = `[Click here to download ${filename}](${dataUri})`;

    // Return the report content with the download link appended
    return {
        role: 'model',
        parts: [{ text: `${report}\n\n${downloadLink}` }],
    };
};

const limitLlmCallsCallback = async ({ context }: { context: Context }) => {
    const calls = (context.invocationContext as any).invocationCostManager?.numberOfLlmCalls || 0;
    if (calls >= 2) {
        return {
            content: {
                role: 'model',
                parts: [{ text: 'Research limit reached.' }],
            },
        } as any;
    }
    return undefined;
};

const architectureAgent = new LlmAgent({
    name: 'architecture_researcher',
    description: 'Researches core architecture and internals.',
    model: modelInstance,
    instruction: architectureResearcherInstruction,
    tools: [GOOGLE_SEARCH],
    outputKey: 'architecture_result',
    beforeModelCallback: limitLlmCallsCallback,
    generateContentConfig: {
        maxOutputTokens: 2500,
        temperature: 0.2,
    },
});

const questionsAgent = new LlmAgent({
    name: 'questions_researcher',
    description: 'Researches common interview questions.',
    model: modelInstance,
    instruction: questionsResearcherInstruction,
    tools: [GOOGLE_SEARCH],
    outputKey: 'questions_result',
    beforeModelCallback: limitLlmCallsCallback,
    generateContentConfig: {
        maxOutputTokens: 2500,
        temperature: 0.2,
    },
});

const pitfallsAgent = new LlmAgent({
    name: 'pitfalls_researcher',
    description: 'Researches pitfalls, gotchas, and anti-patterns.',
    model: modelInstance,
    instruction: pitfallsResearcherInstruction,
    tools: [GOOGLE_SEARCH],
    outputKey: 'pitfalls_result',
    beforeModelCallback: limitLlmCallsCallback,
    generateContentConfig: {
        maxOutputTokens: 2500,
        temperature: 0.2,
    },
});

const challengesAgent = new LlmAgent({
    name: 'challenges_researcher',
    description: 'Researches coding challenges and design scenarios.',
    model: modelInstance,
    instruction: challengesResearcherInstruction,
    tools: [GOOGLE_SEARCH],
    outputKey: 'challenges_result',
    beforeModelCallback: limitLlmCallsCallback,
    generateContentConfig: {
        maxOutputTokens: 2500,
        temperature: 0.2,
    },
});

const researchAgent = new ParallelAgent({
    name: 'researcher',
    description: 'Performs parallel research across multiple domains.',
    subAgents: [architectureAgent, questionsAgent, pitfallsAgent, challengesAgent],
});

const reportAgent = new LlmAgent({
    name: 'editor',
    description:
        'Cleans up research results by removing redundancies and formatting the final report.',
    model: modelInstance,
    instruction: reportAgentInstruction(
        architectureAgent.outputKey || '',
        questionsAgent.outputKey || '',
        pitfallsAgent.outputKey || '',
        challengesAgent.outputKey || '',
    ),
    outputKey: 'report_result',
    afterAgentCallback: reportAgentCallback,
});

const rootAgent = new SequentialAgent({
    name: 'search_assistant',
    description:
        'An assistant that can search the web and create a report and return the final result as a well structured document to start the learning session.',
    subAgents: [researchAgent, reportAgent],
});

const port = process.env.PORT || 8000;
toA2a(rootAgent).then((app) => {
    app.listen(port, () => {
        console.log(`Agent server listening on port ${port}`);
    });
});

export default rootAgent;
