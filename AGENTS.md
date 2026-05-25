# AGENTS.md — Study Buddy

Project-level instructions for AI coding agents (OpenAI Codex, Gemini CLI, Claude, etc.).
Read this file in full before making any changes to the codebase.

---

## Project Overview

**Study Buddy** is a full-stack AI research assistant that takes a topic from the user, performs
deep web research via Google Search, synthesises the findings into a structured Markdown study guide,
and streams the progress/result back to the browser in real time.

### Key Technologies

| Layer           | Technology                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router, Turbopack), React 19, TailwindCSS v4                     |
| AI UI bridge    | CopilotKit v2 (`@copilotkit/react-core/v2`)                                      |
| Backend runtime | CopilotKit Runtime v2 (`@copilotkit/runtime/v2`) served via Hono + `hono/vercel` |
| Agent framework | Google ADK (`@google/adk`) — TypeScript                                          |
| Agent protocol  | A2A (Agent-to-Agent) via `@a2a-js/sdk` + `@ag-ui/a2a`                            |
| Package manager | **pnpm** (use `pnpm` / `pn`, never `npm` or `yarn` to add packages)              |

---

## Repository Structure

```
study-buddy/
├── agent/                        # ADK agent server (separate Node process)
│   ├── main.ts                   # Entry point — defines and starts the A2A server
│   ├── utils/
│   │   ├── prompts.ts            # System prompts for researcher & editor agents
│   │   └── file-definition.ts   # Generates output .md filename from user prompt + date
│   ├── package.json              # Agent-specific deps (@google/adk, dotenv, tsx …)
│   ├── .env                      # Agent secrets — NEVER commit (gitignored)
│   └── node_modules/             # Agent's own node_modules (gitignored)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout — mounts <CopilotKit> provider
│   │   ├── page.tsx              # Main page — CopilotSidebar + MainContent + ResearchProgress
│   │   ├── globals.css           # Global styles (Tailwind base)
│   │   └── api/
│   │       └── copilotkit/
│   │           └── [[...slug]]/
│   │               └── route.ts  # CopilotKit API bridge (single-route + multi-route Hono handlers)
│   │
│   ├── components/
│   │   ├── ResearchProgress.tsx         # Orchestrator: reads agent state → decides phase
│   │   ├── ResearchProgress.module.css
│   │   ├── ResearchProgressPanel.tsx    # Animated 3-step tracker (Researching → Editing → Done)
│   │   ├── ResearchProgressPanel.module.css
│   │   ├── ResearchResult.tsx           # Markdown report viewer (rendered + raw toggle, download)
│   │   └── ResearchResult.module.css
│   │
│   └── lib/
│       └── types.ts              # AgentState, ResearchPhase types
│
├── public/                       # Static assets
├── fixtures/                     # Test fixture data
├── scripts/                      # Dev helper scripts (run-agent.sh etc.)
├── package.json                  # Root workspace deps
├── pnpm-workspace.yaml           # pnpm workspace config
└── next.config.ts                # Next.js config
```

---

## Agent Architecture

The backend is a **SequentialAgent** running two sub-agents:

```
search_assistant (SequentialAgent)
  ├── researcher (LlmAgent)   — uses GOOGLE_SEARCH tool, writes to state key: search_result
  └── editor    (LlmAgent)   — reads search_result, writes to state key: report_result
                               afterAgentCallback: writes .md file to agent/ directory
```

The A2A server is started by `agent/main.ts` and listens on `PORT` (default `8000`).  
The frontend connects via `AGENT_URL` env var (default `http://localhost:8000`).

### CopilotKit Bridge (`route.ts`)

The Next.js API route creates two Hono apps:

- **single-route** — handles `POST /api/copilotkit` (initial handshake)
- **multi-route** — handles `GET /api/copilotkit` and sub-path POSTs (streaming, threads)

Both use `A2AAgent` (from `@ag-ui/a2a`) wrapping an `A2AClient` pointed at the agent server.
The agent card is discovered via `.well-known/agent-card.json` (not `.well-known/agent.json`).

### Agent State → UI

The frontend reads state using `useAgent({ agentId: 'study_buddy_agent' })`.  
The `ResearchProgress` component derives phase from state:

```
report_result present  → 'done'
search_result present  → 'editing'
agent.isRunning        → 'researching'
otherwise              → 'idle'  (component returns null)
```

---

## Dev Commands

```bash
pn dev           # Start both UI (Next.js) and agent (tsx watch) concurrently
pn dev:ui        # UI only
pn dev:agent     # Agent only
pn build         # Production Next.js build
pn format        # Prettier format all files
pn format:check  # Check formatting (used in CI)
```

The agent is re-started automatically by `tsx watch` on file changes.

---

## Environment Variables

### `agent/.env` (agent process)

```
GOOGLE_GENAI_API_KEY=<your Gemini API key>
GOOGLE_GENAI_MODEL=gemini-2.0-flash
PORT=8000
```

### Root `.env.local` (Next.js process)

```
AGENT_URL=http://localhost:8000
COPILOTKIT_TELEMETRY_DISABLED=true   # optional
```

---

## Coding Conventions

### General

- **TypeScript everywhere** — no `any`, no `// @ts-ignore` unless absolutely necessary with a comment explaining why.
- **Named exports** for all components (no default export from component files).
- **CSS Modules** (`.module.css`) for all component styles — no inline styles, no ad-hoc Tailwind utilities inside component files (Tailwind is only used in `page.tsx` layout classes).
- `'use client'` directive at the top of every file that uses React hooks or browser APIs.

### Components

- Place new UI components in `src/components/`.
- Each component gets its own `.tsx` + `.module.css` pair.
- Keep components focused — if a component grows beyond ~150 lines, split it.

### Agent (`agent/`)

- Agent prompts live in `agent/utils/prompts.ts` — keep them there, never inline in `main.ts`.
- State keys written by agents (e.g. `outputKey`) **must** match the field names in `AgentState` in `src/lib/types.ts`.
- The editor agent's `afterAgentCallback` writes output `.md` files to the `agent/` directory — these are gitignored.

### API Route (`route.ts`)

- The agent name registered in `CopilotRuntime.agents` (`study_buddy_agent`) **must** match the `agent` prop on `<CopilotKit>` in `layout.tsx` and the `agentId` passed to `useAgent()`.
- `typescript.ignoreBuildErrors: true` is set in `next.config.ts` because of an upstream type mismatch in `@copilotkit/runtime` — do **not** use this as an excuse to introduce new type errors.

---

## Testing

```bash
pn test           # Jest (root)
cd agent && pn test  # Agent-specific tests
```

Test files go in the same directory as the file under test, named `*.test.ts` / `*.test.tsx`.  
Fixture data lives in `fixtures/`.

---

## What NOT to Do

- Do **not** install packages with `npm` or `yarn` — always use `pnpm` / `pn`.
- Do **not** commit `agent/.env` or any file containing API keys.
- Do **not** commit generated `.md` report files from `agent/`.
- Do **not** add `proverbs` or `weather` component references — those were removed from the template.
- Do **not** use `agent.running` — the correct property is `agent.isRunning` (AbstractAgent API).
- Do **not** use regex with the `s` flag unless `tsconfig.json` targets ES2018+.
- Do **not** use `HttpAgent` from `@ag-ui/client` to connect to this agent — the backend uses the A2A protocol, which requires `A2AAgent` from `@ag-ui/a2a`.
