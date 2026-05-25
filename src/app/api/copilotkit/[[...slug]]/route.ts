import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from '@copilotkit/runtime/v2';
import { A2AAgent } from '@ag-ui/a2a';
import { A2AClient } from '@a2a-js/sdk/client';
import { handle } from 'hono/vercel';

const a2aClient = new A2AClient(
    (process.env.AGENT_URL || 'http://localhost:8000').replace(/\/$/, ''),
    '.well-known/agent-card.json',
);

const runtime = new CopilotRuntime({
    agents: {
        study_buddy_agent: new A2AAgent({
            a2aClient,
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
