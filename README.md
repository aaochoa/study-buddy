# Study Buddy — AI Interview Prep & Study Guide Generator

Study Buddy is a full-stack AI research assistant that takes a topic from the user, performs deep web research via Google Search, synthesises the findings into a structured Markdown study guide, and streams the progress back to the browser in real time.

---

## ✨ Features

- **🔍 Deep Web Research** — Concurrent Google ADK research agents search the web in parallel for authoritative sources, engineering blogs, official docs, and curated technical content.
- **✍️ AI-Edited Study Guide** — An `editor` agent synthesises the raw parallel research into a structured Markdown guide covering core architecture, categorised interview Q&A, common pitfalls, and hands-on coding challenges.
- **📡 Real-time Streaming** — Research progress streams to the UI over the A2A protocol. The sidebar and progress panel update live as each phase completes.
- **📊 Animated Progress Tracker** — A 3-step visual tracker (Researching → Editing → Complete) with glassmorphic UI, animated spinners, and a live preview of collected research.
- **📖 Report Viewer** — Rendered Markdown preview with a raw Markdown toggle, one-click copy, and `.md` file download.
- **🤖 Chat Sidebar** — CopilotKit sidebar with pre-built topic suggestions for quick research sessions.
- **🛡️ Pre-commit Hooks** — Husky + lint-staged enforce Prettier formatting on every commit.

---

## 🏗️ Architecture

```
Browser (Next.js 16 / React 19)
  └── CopilotKit v2 Provider  ──────────────────────────────┐
        └── CopilotSidebar (chat UI)                        │
        └── ResearchProgress (state → phase → UI)           │
              ├── ResearchProgressPanel (step tracker)       │
              └── ResearchResult (report viewer)             │
                                                             │ HTTP (Hono/Vercel)
src/app/api/copilotkit/[[...slug]]/route.ts ◄───────────────┘
  └── CopilotRuntime (v2)
        └── A2AAgent (@ag-ui/a2a)
              └── A2AClient → http://localhost:8000
                                   │
                            agent/main.ts  (Node / tsx watch)
                              └── SequentialAgent: search_assistant
                                    ├── ParallelAgent: researcher
                                    │     ├── LlmAgent: architecture_researcher
                                    │     ├── LlmAgent: questions_researcher
                                    │     ├── LlmAgent: pitfalls_researcher
                                    │     └── LlmAgent: challenges_researcher
                                    └── LlmAgent: editor
                                          outputKey: report_result
                                          afterCallback: writes .md to research/
```

### State → UI Phase Mapping

| Agent state              | UI phase                                     |
| ------------------------ | -------------------------------------------- |
| `agent.isRunning` only   | `researching` — spinner on step 1            |
| parallel results present | `editing` — step 1 done, spinner on step 2   |
| `report_result` present  | `done` — all steps done, report viewer shown |
| nothing                  | `idle` — component returns `null`            |

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                |
| --------------- | ------------------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router, Turbopack), React 19, TailwindCSS v4              |
| AI UI bridge    | CopilotKit v2 (`@copilotkit/react-core/v2`)                               |
| Backend runtime | CopilotKit Runtime v2 (`@copilotkit/runtime/v2`) via Hono + `hono/vercel` |
| Agent framework | Google ADK (`@google/adk` v1) — TypeScript                                |
| Agent protocol  | A2A (Agent-to-Agent) via `@a2a-js/sdk` + `@ag-ui/a2a`                     |
| Package manager | pnpm (workspaces)                                                         |

---

## 📁 Project Structure

```
study-buddy/
├── agent/                        # ADK agent server (separate Node process)
│   ├── main.ts                   # SequentialAgent definition + A2A server startup
│   ├── utils/
│   │   ├── prompts.ts            # System prompts for researcher & editor agents
│   │   └── file-definition.ts   # Generates .md filename from prompt + date
│   ├── .env                      # Agent secrets (gitignored — never commit)
│   └── package.json
│
├── research/                     # Generated markdown study guides (gitignored)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout — mounts <CopilotKit> provider
│   │   ├── page.tsx              # Main page — sidebar + hero + ResearchProgress
│   │   ├── globals.css           # Tailwind base styles
│   │   └── api/copilotkit/[[...slug]]/route.ts   # CopilotKit API bridge
│   │
│   ├── components/
│   │   ├── ResearchProgress.tsx         # Orchestrator: reads agent state → phase
│   │   ├── ResearchProgressPanel.tsx    # Animated 3-step progress tracker
│   │   ├── ResearchStepItem.tsx         # Single timeline step rendering
│   │   ├── ResearchResult.tsx           # Markdown report viewer + download
│   │   └── *.module.css                 # CSS Modules (one per component)
│   │
│   └── lib/
│       └── types.ts              # AgentState, ResearchPhase types
│
├── fixtures/                     # Test fixture data
├── scripts/                      # Dev helper shell scripts
├── AGENTS.md                     # AI agent coding rules (read before editing)
├── package.json                  # Root workspace deps
└── pnpm-workspace.yaml
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `18+`
- **pnpm** — install with `npm install -g pnpm` if you don't have it
- **OpenRouter API Key** — get one at [OpenRouter](https://openrouter.ai/)

### 1 — Clone & install

```bash
git clone <repo-url>
cd study-buddy
pnpm install        # installs root deps + runs postinstall for agent/
```

### 2 — Configure environment variables

**`agent/.env`** (agent process):

```env
RESEARCH_MODEL=gemini-openrouter/free,google/gemini-2.5-flash,openai/gpt-4o-mini,deepseek/deepseek-chat
QA_MODEL=qwen/qwen3-coder:free
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_URL=https://openrouter.ai
PORT=8000
```

> [!NOTE]
>
> - **Research Agent (`RESEARCH_MODEL`)**: The first model in this list must start with `gemini-` (such as `gemini-openrouter/free` or `google/gemini-2.5-flash`) because the parallel research agents require the `GOOGLE_SEARCH` tool, which is only supported by Google Gemini models in the ADK framework.
> - **Q&A Agent (`QA_MODEL`)**: Since the Q&A agent does not use any tools, it has no model limitations. You can use any free or specialized model from OpenRouter (e.g. `qwen/qwen3-coder:free` or `google/gemma-4-31b-it:free`) for fast and free chat.

**`.env.local`** (Next.js process, at repo root):

```env
AGENT_URL=http://localhost:8000
COPILOTKIT_TELEMETRY_DISABLED=true   # optional
```

### 3 — Run the dev stack

```bash
pnpm dev   # or: pn dev
```

This starts both processes concurrently:

| Process       | URL                                            |
| ------------- | ---------------------------------------------- |
| Next.js UI    | [http://localhost:3000](http://localhost:3000) |
| ADK A2A Agent | [http://localhost:8000](http://localhost:8000) |

The agent reloads automatically on file changes via `tsx watch`.

---

## 💻 Available Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `pn dev`          | Start UI + agent concurrently     |
| `pn dev:ui`       | Start Next.js UI only             |
| `pn dev:agent`    | Start ADK agent only              |
| `pn dev:debug`    | Full stack with `LOG_LEVEL=debug` |
| `pn build`        | Production Next.js build          |
| `pn format`       | Prettier format all files         |
| `pn format:check` | Check formatting (CI)             |
| `pn test`         | Run Jest unit tests               |

---

## 🎨 UI Components

### `ResearchProgress`

Invisible orchestrator component. Reads `useAgent({ agentId: 'study_buddy_agent' })` and renders nothing when the agent is idle. Automatically appears the moment a research session starts.

### `ResearchProgressPanel`

Glassmorphic step tracker card that maps the timeline steps via individual `<ResearchStepItem />` subcomponents:

- Gradient circle indicators (pending / active spinner / done ✓)
- Connecting lines that fill as steps complete
- Live preview of combined parallel research text while the editor is running
- Active Google Search details during the research phase

### `ResearchResult`

Full-featured report viewer with:

- Rendered Markdown view (custom parser — no external markdown dependency)
- Raw Markdown toggle for copy-paste into other tools
- Copy to clipboard + `.md` file download
- Word & character count

---

## 🔍 How a Research Session Works

1. User types a topic in the **CopilotKit sidebar** (e.g. _"Research React Server Components"_)
2. The `researcher` parallel agents concurrently perform Google searches, aggregating raw data into domain-specific outputs
3. The `editor` agent reads these outputs and produces a structured Markdown guide stored in `report_result`
4. The agent also writes a local `.md` file to the root `research/` directory (filename auto-generated from the topic + date)
5. The `ResearchProgress` component detects state changes and transitions through the phases automatically

---

## 📈 Code Quality

- **Husky pre-commit hook** runs `pnpm format:check` on staged files via lint-staged
- **TypeScript strict mode** — no `any`, no suppressed errors in application code
- **CSS Modules** — all component styles are scoped; no ad-hoc Tailwind utilities inside component files
- **Named exports only** — no default exports from component files
