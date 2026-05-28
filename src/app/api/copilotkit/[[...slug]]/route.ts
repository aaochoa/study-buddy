import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from '@copilotkit/runtime/v2';
import { A2AAgent, A2AAgentConfig } from '@ag-ui/a2a';
import { A2AClient } from '@a2a-js/sdk/client';
import { handle } from 'hono/vercel';
import { BaseEvent, EventType } from '@ag-ui/client';
import { Observable, Subscriber } from 'rxjs';

class TextMessageA2AAgent extends A2AAgent {
    constructor(config: A2AAgentConfig) {
        super(config);
    }

    override clone() {
        return new TextMessageA2AAgent({
            a2aClient: (this as unknown as { a2aClient: A2AClient }).a2aClient,
            debug: this.debug,
        } as A2AAgentConfig);
    }

    override run(input: any): Observable<BaseEvent> {
        return new Observable<BaseEvent>((subscriber: Subscriber<BaseEvent>) => {
            const super$ = super.run(input);
            const subscription = super$.subscribe({
                next: (event) => {
                    const rawEvent = event.event || event.rawEvent;
                    if (
                        event.type === EventType.RAW &&
                        rawEvent?.kind === 'artifact-update' &&
                        rawEvent?.append !== false
                    ) {
                        const artifactParts = rawEvent.artifact?.parts || [];
                        const textParts = artifactParts.filter((p: any) => p.kind === 'text');

                        if (textParts.length > 0) {
                            const deltaText = textParts.map((p: any) => p.text || '').join('');
                            if (deltaText) {
                                const messageId = rawEvent.artifact.artifactId || 'default-msg';
                                subscriber.next({
                                    type: EventType.TEXT_MESSAGE_CHUNK,
                                    messageId,
                                    role: 'assistant',
                                    delta: deltaText,
                                    timestamp: Date.now(),
                                } as any);
                            }
                        }
                    }
                    subscriber.next(event);
                },
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete(),
            });
            return () => subscription.unsubscribe();
        });
    }
}

const a2aClient = new A2AClient(
    (process.env.AGENT_URL || 'http://localhost:8000').replace(/\/$/, ''),
    '.well-known/agent-card.json',
);

const qaA2aClient = new A2AClient(
    (process.env.QA_AGENT_URL || 'http://localhost:8001').replace(/\/$/, ''),
    '.well-known/agent-card.json',
);

const runtime = new CopilotRuntime({
    agents: {
        study_buddy_agent: new A2AAgent({
            a2aClient,
        }),
        study_buddy_qa: new TextMessageA2AAgent({
            a2aClient: qaA2aClient,
        }),
    },
    runner: new InMemoryAgentRunner(),
});

const singleRouteApp = createCopilotEndpoint({
    runtime,
    basePath: '/api/copilotkit',
    mode: 'single-route',
});

const multiRouteApp = createCopilotEndpoint({
    runtime,
    basePath: '/api/copilotkit',
    mode: 'multi-route',
});

const singleRouteHandler = handle(singleRouteApp);
const multiRouteHandler = handle(multiRouteApp);

export const GET = async (req: Request) => {
    return multiRouteHandler(req);
};

export const POST = async (req: Request) => {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, '');
    if (path === '/api/copilotkit') {
        return singleRouteHandler(req);
    }
    return multiRouteHandler(req);
};
