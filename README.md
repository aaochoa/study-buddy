# Study Buddy — AI Interview Prep & Study Guide Generator

Study Buddy is a full-stack AI research assistant that takes a topic from the user, performs deep web research via Google Search, synthesises the findings into a structured Markdown study guide, and streams the progress back to the browser in real time.

---

## ✨ Features

- **🔍 Deep Web Research** — Concurrent Google ADK research agents search the web in parallel for authoritative sources, engineering blogs, official docs, and curated technical content.
- **✍️ AI-Edited Study Guide** — An `editor` agent synthesises the raw parallel research into a structured Markdown guide covering core architecture, categorised interview Q&A, common pitfalls, and hands-on coding challenges.
- **📡 Real-time Streaming** — Research progress streams to the UI over the A2A protocol. The sidebar and progress panel update live as each phase completes.
- **📊 Animated Progress Tracker** — A 3-step visual tracker (Researching → Editing → Complete) with glassmorphic UI, animated spinners, and a live preview of collected research.
- **📖 Report Viewer** — Rendered Markdown preview with a raw Markdown toggle, one-click copy, dismiss button, and `.md` file download.
- **💬 Q&A Chat Mode** — A second AI agent answers follow-up questions about the generated study guide, with a dedicated mode switcher and contextual sidebar suggestions.
- **💻 Coding Arena** — Interactive practice environment with multi-language support (Python, Ruby, C++, JavaScript, TypeScript), a sandbox execution engine, and test case validation.
- **📚 Saved Guides** — Browse, search, and reload previously generated study guides from a persistent history sidebar.
- **🌙 Dark/Light Theme** — System-preference detection with manual toggle and localStorage persistence.
- **🤖 Chat Sidebar** — CopilotKit sidebar with pre-built topic suggestions for quick research sessions.
- **🛡️ Pre-commit Hooks** — Husky + lint-staged enforce Prettier formatting on every commit.

---

## 🏗️ Architecture

```
Browser (Next.js 16 / React 19)
  └── CopilotKit v2 Provider  ──────────────────────────────┐
        └── CopilotSidebar (chat UI)                        │
        └── Navbar (Research / Code Arena tabs)              │
        └── ResearchProgress (state → phase → UI)           │
        └── SavedGuides (history sidebar)                   │
        └── CodingArena (code editor + sandbox)             │
              └── /api/execute (sandbox runner)              │
                                                             │ HTTP (Hono/Vercel)
src/app/api/copilotkit/[[...slug]]/route.ts ◄───────────────┘
  └── CopilotRuntime (v2)
        ├── A2AAgent: study_buddy_agent (@ag-ui/a2a)
        │     └── A2AClient → http://localhost:8000/search
        │                          │
        │                   agent/main.ts  (Node / tsx watch)
        │                     ├── SequentialAgent: search_assistant (Unified Server)
        │                     │     ├── ParallelAgent: researcher
        │                     │     │     ├── LlmAgent: architecture_researcher
        │                     │     │     ├── LlmAgent: questions_researcher
        │                     │     │     ├── LlmAgent: pitfalls_researcher
        │                     │     │     └── LlmAgent: challenges_researcher
        │                     │     └── LlmAgent: editor
        │                     │           outputKey: report_result
        │                     │           afterCallback: writes .md to research/
        │                     │
        │                     ├── LlmAgent: study_buddy_challenges (/challenges)
        │                     │
        │                     └── LlmAgent: study_buddy_qa (/qa)
        │
        ├── TextMessageA2AAgent: study_buddy_qa (@ag-ui/a2a)
        │     └── A2AClient → http://localhost:8000/qa
        │
        └── TextMessageA2AAgent: study_buddy_challenges (@ag-ui/a2a)
              └── A2AClient → http://localhost:8000/challenges
```

### State → UI Phase Mapping

| Agent state              | UI phase                                     |
| ------------------------ | -------------------------------------------- |
| `agent.isRunning` only   | `researching` — spinner on step 1            |
| parallel results present | `editing` — step 1 done, spinner on step 2   |
| `report_result` present  | `done` — all steps done, report viewer shown |
| nothing                  | `idle` — component returns `null`            |

### Agent Mode Switching

| Agent ID                 | Mode       | Purpose                                               |
| ------------------------ | ---------- | ----------------------------------------------------- |
| `study_buddy_agent`      | Research   | Generates study guides via web research               |
| `study_buddy_qa`         | Q&A        | Answers follow-up questions about guides              |
| `study_buddy_challenges` | Challenges | Generates coding challenges based on generated guides |

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                |
| --------------- | ------------------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router, Turbopack), React 19, TailwindCSS v4              |
| AI UI bridge    | CopilotKit v2 (`@copilotkit/react-core/v2`)                               |
| Backend runtime | CopilotKit Runtime v2 (`@copilotkit/runtime/v2`) via Hono + `hono/vercel` |
| Agent framework | Google ADK (`@google/adk` v1) — TypeScript                                |
| Agent protocol  | A2A (Agent-to-Agent) via `@a2a-js/sdk` + `@ag-ui/a2a`                     |
| Code execution  | Subprocess sandbox (Python, Ruby, C++, JS, TS) with 4s timeout            |
| LLM provider    | OpenRouter API (custom ADK adapter)                                       |
| Database & Auth | Supabase (PostgreSQL with Row Level Security)                             |
| Package manager | pnpm (workspaces)                                                         |

---

## 📁 Project Structure

```
study-buddy/
├── agent/                        # ADK agent server (separate Node process)
│   ├── main.ts                   # SequentialAgent definition + A2A server startup
│   ├── utils/
│   │   ├── prompts.ts            # System prompts for researcher, editor & Q&A agents
│   │   ├── file-definition.ts    # Generates .md filename from prompt + date
│   │   └── openrouter-llm.ts     # Custom OpenRouter LLM adapter for ADK
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
│   │   └── api/
│   │       ├── copilotkit/[[...slug]]/route.ts   # CopilotKit API bridge
│   │       ├── execute/route.ts                  # Code sandbox execution endpoint
│   │       └── guides/
│   │           ├── route.ts                      # List saved guides
│   │           └── [filename]/route.ts           # Serve individual guide content
│   │
│   ├── components/
│   │   ├── ResearchProgress.tsx          # Orchestrator: reads agent state → phase
│   │   ├── ResearchProgressPanel.tsx     # Animated 3-step progress tracker
│   │   ├── ResearchStepItem.tsx          # Single timeline step rendering
│   │   ├── ResearchResult.tsx            # Markdown report viewer + download
│   │   ├── CodingArena.tsx               # Code editor + sandbox terminal
│   │   ├── CopilotWrapper.tsx            # Theme provider + dynamic agent switching
│   │   ├── Navbar.tsx                    # Top nav with Research/Code tabs + theme toggle
│   │   ├── SavedGuides.tsx               # History sidebar for past study guides
│   │   └── *.module.css                  # CSS Modules (one per component)
│   │
│   ├── fixtures/
│   │   └── problems.json                 # Coding Arena problem definitions
│   │
│   └── lib/
│       └── types.ts              # AgentState, ResearchPhase types
│
├── Dockerfile                    # Multi-stage production build
├── docker-compose.test.yml       # Integration test stack
├── entrypoint.sh                 # Production entrypoint
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
CHALLENGES_MODEL=qwen/qwen3-coder:free # optional fallback
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_URL=https://openrouter.ai
PORT=8000
```

> [!NOTE]
>
> - **Research Agent (`RESEARCH_MODEL`)**: The first model in this list must start with `gemini-` (such as `gemini-openrouter/free` or `google/gemini-2.5-flash`) because the parallel research agents require the `GOOGLE_SEARCH` tool, which is only supported by Google Gemini models in the ADK framework.
> - **Q&A Agent (`QA_MODEL`)**: Since the Q&A agent does not use any tools, it has no model limitations. You can use any free or specialized model from OpenRouter (e.g. `qwen/qwen3-coder:free` or `google/gemma-4-31b-it:free`) for fast and free chat.
> - **Challenges Agent (`CHALLENGES_MODEL`)**: Used by the coding challenges generator. If not specified, falls back to the first research model.

**`.env.local`** (Next.js process, at repo root):

```env
AGENT_URL=http://localhost:8000/search
QA_AGENT_URL=http://localhost:8000/qa
CHALLENGES_AGENT_URL=http://localhost:8000/challenges

# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

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

## 🐳 Docker

### Production

```bash
docker compose up --build
```

### Integration Tests

```bash
docker compose -f docker-compose.test.yml up --build
```

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
- Close/dismiss button to hide the viewer

### `CodingArena`

Interactive coding practice environment with:

- Problem selector with difficulty badges (Easy / Medium / Hard)
- Multi-language support: Python, Ruby, C++, JavaScript, TypeScript
- Code editor with Tab-key indentation
- Sandbox terminal with color-coded output (success, error, warning)
- In-memory code cache across tab/problem/language switches
- Test case validation via the `/api/execute` endpoint

### `SavedGuides`

History sidebar listing previously generated study guides:

- Scrollable list with title, date, and file size
- Click to load any saved guide
- Refresh button to rescan the `research/` directory
- Active-item highlighting

### `CopilotWrapper`

Root provider component that handles:

- Dynamic agent switching (`study_buddy_agent` ↔ `study_buddy_qa`) based on active mode
- Dark/light theme with system-preference detection and localStorage persistence
- `<CopilotKit>` provider mounting with agent configuration

### `Navbar`

Top navigation bar with:

- Brand logo ("Study Buddy")
- Research / Code Arena tab switcher
- Dark/light theme toggle button (sun/moon icon)

---

## 🔍 How a Research Session Works

1. User types a topic in the **CopilotKit sidebar** (e.g. _"Research React Server Components"_)
2. The `researcher` parallel agents concurrently perform Google searches, aggregating raw data into domain-specific outputs
3. The `editor` agent reads these outputs and produces a structured Markdown guide stored in `report_result`
4. The agent also writes a local `.md` file to the root `research/` directory (filename auto-generated from the topic + date)
5. The `ResearchProgress` component detects state changes and transitions through the phases automatically
6. After research completes, switch to **Q&A Mode** to ask follow-up questions about the generated guide
7. Use the **Code Arena** tab to practice coding problems related to the studied topic

---

## 📈 Code Quality

- **Husky pre-commit hook** runs `pnpm format:check` on staged files via lint-staged
- **TypeScript strict mode** — no `any`, no suppressed errors in application code
- **CSS Modules** — all component styles are scoped; no ad-hoc Tailwind utilities inside component files
- **Named exports only** — no default exports from component files
- **Docker support** — multi-stage production build with sandboxed code execution
- **Per-agent LLM call limiting** — each researcher agent capped at 2 LLM calls for cost control
