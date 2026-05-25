import { LlmAgent, GOOGLE_SEARCH, SequentialAgent, Context, toA2a } from '@google/adk';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { reportAgentInstruction, researchAgentInstruction } from './utils/prompts';
import { getFilename } from './utils/file-definition';
dotenv.config();

const reportAgentCallback = async (callbackContext: Context) => {
    const report = callbackContext.state.get<string>('report_result') || '';
    const filename = getFilename(callbackContext);

    // Write the file locally
    fs.writeFileSync(filename, report, 'utf-8');

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

const researchAgent = new LlmAgent({
    name: 'researcher',
    description: 'Researches a topic on the web.',
    model: process.env.GOOGLE_GENAI_MODEL,
    instruction: researchAgentInstruction,
    tools: [GOOGLE_SEARCH],
    outputKey: 'search_result',
});

const reportAgent = new LlmAgent({
    name: 'editor',
    description:
        'Cleans up research results by removing redundancies and formatting the final report.',
    model: process.env.GOOGLE_GENAI_MODEL,
    instruction: reportAgentInstruction(researchAgent?.outputKey || ''),
    outputKey: 'report_result',
    afterAgentCallback: reportAgentCallback,
});

const rootAgent = new SequentialAgent({
    name: 'search_assistant',
    description:
        'An assistant that can search the web and create a report and return the final result as a well structured document to feed notebooklm to start the learning session.',
    subAgents: [researchAgent, reportAgent],
});

const port = process.env.PORT || 8000;
toA2a(rootAgent).then((app) => {
    app.listen(port, () => {
        console.log(`Agent server listening on port ${port}`);
    });
});

export default rootAgent;
