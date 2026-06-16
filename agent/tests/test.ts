import assert from 'assert';
import { OpenRouterLlm } from '../utils/openrouter-llm';
import { logger } from '../utils/logger';

// Setup dummy environment variables for test
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.OPENROUTER_URL = 'https://openrouter.ai';

/**
 * Runs the unit tests for OpenRouterLlm, validating model regex patterns,
 * mapping message histories, functions, search tool conversion, and responses.
 */
async function runTests() {
    logger.info('Running OpenRouterLlm unit tests...');

    // Test 1: Supported models regex
    assert.ok(OpenRouterLlm.supportedModels[0].test('google/gemini-2.5-flash'));
    assert.ok(OpenRouterLlm.supportedModels[0].test('deepseek/deepseek-chat'));
    assert.ok(OpenRouterLlm.supportedModels[0].test('openai/gpt-4o-mini'));
    assert.ok(!OpenRouterLlm.supportedModels[0].test('gemini-2.0-flash')); // Should not match without slash
    logger.info('✓ Model regex tests passed');

    // Test 2: generateContentAsync mappings (System instruction, user text, and tools)
    const llm = new OpenRouterLlm({ model: 'google/gemini-2.5-flash' });

    const mockLlmRequest: any = {
        contents: [
            {
                role: 'user',
                parts: [{ text: 'Hello, AI!' }],
            },
        ],
        config: {
            systemInstruction: 'You are a helpful study assistant.',
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: 'google_search',
                            description: 'Search the web',
                            parameters: {
                                type: 'object',
                                properties: {
                                    query: { type: 'string' },
                                },
                                required: ['query'],
                            },
                        },
                    ],
                },
            ],
            responseMimeType: 'application/json',
        },
    };

    let capturedBody: any = null;
    let capturedHeaders: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        capturedBody = JSON.parse(options?.body as string);
        capturedHeaders = options?.headers;

        return {
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: '{"result": "Success"}',
                            tool_calls: [
                                {
                                    id: 'call_123',
                                    type: 'function',
                                    function: {
                                        name: 'google_search',
                                        arguments: '{"query": "React"}',
                                    },
                                },
                            ],
                        },
                        finish_reason: 'stop',
                    },
                ],
            }),
        } as any;
    };

    try {
        const generator = llm.generateContentAsync(mockLlmRequest, false);
        const result = await generator.next();

        assert.ok(!result.done);
        assert.deepStrictEqual(result.value.content, {
            role: 'model',
            parts: [
                { text: '{"result": "Success"}' },
                {
                    functionCall: {
                        name: 'google_search',
                        args: { query: 'React' },
                        id: 'call_123',
                    },
                },
            ],
        });

        // Check request structure mapped to OpenAI/OpenRouter
        assert.strictEqual(capturedBody.model, 'google/gemini-2.5-flash');
        assert.strictEqual(capturedBody.stream, false);
        assert.deepStrictEqual(capturedBody.messages, [
            { role: 'system', content: 'You are a helpful study assistant.' },
            { role: 'user', content: 'Hello, AI!' },
        ]);
        assert.deepStrictEqual(capturedBody.tools, [
            {
                type: 'function',
                function: {
                    name: 'google_search',
                    description: 'Search the web',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: { type: 'string' },
                        },
                        required: ['query'],
                    },
                },
            },
        ]);
        assert.deepStrictEqual(capturedBody.response_format, { type: 'json_object' });
        assert.strictEqual(capturedHeaders['Authorization'], 'Bearer test-api-key');

        logger.info('✓ Mapping and non-streaming generateContentAsync tests passed');
    } finally {
        globalThis.fetch = originalFetch;
    }

    // Test 3: Tool response message mapping
    const mockToolResponseRequest: any = {
        contents: [
            {
                role: 'user',
                parts: [{ text: 'Hello, AI!' }],
            },
            {
                role: 'model',
                parts: [
                    {
                        functionCall: {
                            name: 'google_search',
                            args: { query: 'React' },
                            id: 'call_123',
                        },
                    },
                ],
            },
            {
                role: 'user',
                parts: [
                    {
                        functionResponse: {
                            name: 'google_search',
                            response: { result: 'React is a library' },
                            id: 'call_123',
                        },
                    },
                ],
            },
        ],
    };

    globalThis.fetch = async (url, options) => {
        capturedBody = JSON.parse(options?.body as string);
        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'I see.' }, finish_reason: 'stop' }],
            }),
        } as any;
    };

    try {
        const generator = llm.generateContentAsync(mockToolResponseRequest, false);
        await generator.next();

        // Check mapped messages for tool responses
        assert.deepStrictEqual(capturedBody.messages, [
            { role: 'user', content: 'Hello, AI!' },
            {
                role: 'assistant',
                tool_calls: [
                    {
                        id: 'call_123',
                        type: 'function',
                        function: {
                            name: 'google_search',
                            arguments: '{"query":"React"}',
                        },
                    },
                ],
            },
            {
                role: 'tool',
                tool_call_id: 'call_123',
                name: 'google_search',
                content: '{"result":"React is a library"}',
            },
        ]);

        logger.info('✓ Tool call history and tool response mappings passed');
    } finally {
        globalThis.fetch = originalFetch;
    }

    logger.info('All tests completed successfully!');
}

runTests().catch((err) => {
    logger.error({ err }, 'Test suite failed');
    process.exit(1);
});
