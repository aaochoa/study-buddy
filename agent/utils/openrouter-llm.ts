import { BaseLlm, LlmRequest, LlmResponse, GOOGLE_SEARCH, LLMRegistry } from '@google/adk';
import { logger } from './logger';

function redactOrTruncate(value: any): any {
    if (typeof value === 'string') {
        return value.length > 100 ? value.substring(0, 100) + '... [truncated]' : value;
    }
    if (value && typeof value === 'object') {
        const result: any = Array.isArray(value) ? [] : {};
        for (const [key, val] of Object.entries(value)) {
            if (['content', 'text', 'arguments', 'args'].includes(key)) {
                result[key] =
                    typeof val === 'string'
                        ? val.length > 100
                            ? val.substring(0, 100) + '... [truncated]'
                            : val
                        : '[redacted/truncated object]';
            } else {
                result[key] = redactOrTruncate(val);
            }
        }
        return result;
    }
    return value;
}

// Override the processLlmRequest of GOOGLE_SEARCH to prevent it from throwing for non-Gemini models
const originalProcessLlmRequest = GOOGLE_SEARCH.processLlmRequest;
GOOGLE_SEARCH.processLlmRequest = async function (params) {
    const { llmRequest } = params;
    if (!llmRequest || !llmRequest.model) {
        return;
    }

    const openRouterModelRegex = /^(gemini-)?([a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+.*)$/;
    if (openRouterModelRegex.test(llmRequest.model)) {
        // For OpenRouter models, initialize config/tools and add placeholder to prevent crashes
        llmRequest.config = llmRequest.config || {};
        llmRequest.config.tools = llmRequest.config.tools || [];

        const hasSearch = llmRequest.config.tools.some(
            (t: any) => t.googleSearch || t.googleSearchRetrieval,
        );
        if (!hasSearch) {
            llmRequest.config.tools.push({
                googleSearch: {},
            });
        }
        return;
    }

    return originalProcessLlmRequest.call(this, params);
};

export class OpenRouterLlm extends BaseLlm {
    // Matches model IDs that have a slash (e.g. google/gemini-2.5-flash) or openrouter/ prefixed ones, and allows gemini- prefix to bypass adk checks
    static supportedModels = [/^(gemini-)?([a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+.*)$/];

    constructor(params: { model: string }) {
        super({ model: params.model });
    }

    // Abstract method implementation. Live WebSocket is not supported by OpenRouter.
    async connect(llmRequest: LlmRequest): Promise<any> {
        throw new Error('WebSocket connection (connect) is not supported for OpenRouterLlm');
    }

    async *generateContentAsync(
        llmRequest: LlmRequest,
        stream: boolean = false,
        abortSignal?: AbortSignal,
    ): AsyncGenerator<LlmResponse, void> {
        const { url, headers, body } = this.buildRequestPayload(llmRequest, stream);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        if (stream) {
            yield* this.handleStreamResponse(response);
        } else {
            yield* this.handleSingleResponse(response);
        }
    }

    private mapMessages(contents: LlmRequest['contents'], systemInstruction?: any): any[] {
        const messages: any[] = [];

        // 1. Add System Instruction
        if (systemInstruction) {
            messages.push({
                role: 'system',
                content: systemInstruction,
            });
        }

        // 2. Map Gemini contents to OpenAI-style messages
        for (const content of contents) {
            // Map role: 'model' -> 'assistant', 'user' -> 'user'
            const role = content.role === 'model' ? 'assistant' : 'user';

            let text = '';
            const toolCalls: any[] = [];

            for (const part of content.parts || []) {
                if (part.text) {
                    text += part.text;
                } else if (part.functionCall) {
                    // Map Gemini functionCall to OpenAI tool_calls
                    toolCalls.push({
                        id:
                            part.functionCall.id ||
                            `call_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'function',
                        function: {
                            name: part.functionCall.name,
                            arguments: JSON.stringify(part.functionCall.args),
                        },
                    });
                } else if (part.functionResponse) {
                    // Map Gemini functionResponse to OpenAI tool role message
                    messages.push({
                        role: 'tool',
                        tool_call_id: part.functionResponse.id,
                        name: part.functionResponse.name,
                        content: JSON.stringify(part.functionResponse.response),
                    });
                }
            }

            // Add user/assistant message if it contains text or tool calls
            if (text || toolCalls.length > 0) {
                const msg: any = { role };
                if (text) {
                    msg.content = text;
                }
                if (toolCalls.length > 0) {
                    msg.tool_calls = toolCalls;
                }
                messages.push(msg);
            }
        }

        return messages;
    }

    private mapTools(tools?: any[]): any[] {
        const mappedTools: any[] = [];
        if (tools) {
            for (const t of tools) {
                const anyTool = t as any;
                if (anyTool.functionDeclarations) {
                    for (const decl of anyTool.functionDeclarations) {
                        mappedTools.push({
                            type: 'function',
                            function: {
                                name: decl.name,
                                description: decl.description || '',
                                parameters: decl.parameters || { type: 'object', properties: {} },
                            },
                        });
                    }
                } else if (anyTool.googleSearch || anyTool.googleSearchRetrieval) {
                    // Map Gemini googleSearch/googleSearchRetrieval to OpenRouter's web_search tool
                    mappedTools.push({
                        type: 'openrouter:web_search',
                    });
                }
            }
        }
        return mappedTools;
    }

    private mapResponseFormat(responseMimeType?: string): any {
        if (responseMimeType === 'application/json') {
            return { type: 'json_object' };
        }
        return undefined;
    }

    private buildRequestPayload(
        llmRequest: LlmRequest,
        stream: boolean,
    ): { url: string; headers: Record<string, string>; body: any } {
        const messages = this.mapMessages(
            llmRequest.contents,
            llmRequest.config?.systemInstruction,
        );
        const tools = this.mapTools(llmRequest.config?.tools);
        const responseFormat = this.mapResponseFormat(llmRequest.config?.responseMimeType);

        const openrouterUrl = (process.env.OPENROUTER_URL || 'https://openrouter.ai').replace(
            /\/$/,
            '',
        );
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY environment variable is not set');
        }

        const cleanModel = this.model.startsWith('gemini-') ? this.model.substring(7) : this.model;

        const requestBody: any = {
            model: cleanModel,
            messages,
            stream,
        };

        if (tools.length > 0) {
            requestBody.tools = tools;
        }

        if (responseFormat) {
            requestBody.response_format = responseFormat;
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/aaochoa/study-buddy',
            'X-Title': 'Study Buddy AI',
        };

        return { url: `${openrouterUrl}/api/v1/chat/completions`, headers, body: requestBody };
    }

    private async *handleStreamResponse(response: Response): AsyncGenerator<LlmResponse, void> {
        if (!response.body) {
            throw new Error('Response body is empty');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulatedText = '';

        const accumulatedToolCalls: Record<
            number,
            {
                id?: string;
                name?: string;
                arguments: string;
            }
        > = {};

        let finishReason: string | undefined = undefined;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.slice(6);
                    if (dataStr === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        const choice = parsed.choices?.[0];
                        if (!choice) continue;

                        if (choice.finish_reason) {
                            finishReason =
                                choice.finish_reason === 'stop' ? 'STOP' : choice.finish_reason;
                        }

                        const delta = choice.delta;
                        if (!delta) continue;

                        const parts: any[] = [];

                        if (delta.content) {
                            accumulatedText += delta.content;
                            parts.push({ text: delta.content });
                        }

                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const index = tc.index;
                                if (accumulatedToolCalls[index] === undefined) {
                                    accumulatedToolCalls[index] = { arguments: '' };
                                }
                                const acc = accumulatedToolCalls[index];
                                if (tc.id) acc.id = tc.id;
                                if (tc.function?.name) acc.name = tc.function.name;
                                if (tc.function?.arguments) acc.arguments += tc.function.arguments;
                            }
                        }

                        if (parts.length > 0) {
                            yield {
                                content: {
                                    role: 'model',
                                    parts,
                                },
                                partial: true,
                            };
                        }
                    } catch (e) {
                        // Ignore partial JSON parsing errors
                    }
                }
            }
        }

        // Yield any accumulated tool calls once stream ends
        const finalParts: any[] = [];
        for (const index of Object.keys(accumulatedToolCalls)
            .map(Number)
            .sort((a, b) => a - b)) {
            const acc = accumulatedToolCalls[index];
            if (acc.name) {
                let args = {};
                try {
                    args = JSON.parse(acc.arguments);
                } catch (e) {
                    logger.error(
                        { arguments: redactOrTruncate(acc.arguments), err: e },
                        'Failed to parse accumulated tool call arguments',
                    );
                }
                finalParts.push({
                    functionCall: {
                        name: acc.name,
                        args,
                        id: acc.id,
                    },
                });
            }
        }

        // Always yield a final non-partial event containing the full accumulated text or tools
        yield {
            content: {
                role: 'model',
                parts: finalParts.length > 0 ? finalParts : [{ text: accumulatedText }],
            },
            finishReason: (finishReason || 'STOP') as any,
            partial: false,
        };
    }

    private async *handleSingleResponse(response: Response): AsyncGenerator<LlmResponse, void> {
        const data = await response.json();
        const choice = data.choices?.[0];
        const message = choice?.message;

        if (!message) {
            logger.error(
                { responseData: redactOrTruncate(data) },
                'OpenRouter full response on failure',
            );
            throw new Error('No message returned from OpenRouter');
        }

        const parts: any[] = [];

        if (message.content) {
            parts.push({ text: message.content });
        }

        if (message.tool_calls) {
            for (const tc of message.tool_calls) {
                if (tc.type === 'function') {
                    let args = {};
                    try {
                        args = JSON.parse(tc.function.arguments);
                    } catch (e) {
                        logger.error(
                            { arguments: redactOrTruncate(tc.function.arguments), err: e },
                            'Failed to parse function arguments',
                        );
                    }
                    parts.push({
                        functionCall: {
                            name: tc.function.name,
                            args,
                            id: tc.id,
                        },
                    });
                }
            }
        }

        yield {
            content: {
                role: 'model',
                parts,
            },
            finishReason: (choice.finish_reason === 'stop' ? 'STOP' : choice.finish_reason) as any,
            partial: false,
        };
    }
}

// Register the custom OpenRouter LLM provider once globally
LLMRegistry.register(OpenRouterLlm);
