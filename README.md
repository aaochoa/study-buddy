# Study Buddy: AI Interview Prep & Study Assistant

Study Buddy is a premium, interactive study guide generator and audio assistant built using **Next.js**, Google's **Agent Development Kit (ADK)**, and **CopilotKit**.

It allows users to research any topic to generate a comprehensive Interview Study Guide, download source files optimized for NotebookLM, and listen to the guide via a fully custom, multilingual text-to-speech player.

---

## ✨ Key Features

- **🧠 ADK Research Agent**: Conducts multi-step online searches, synthesizes facts, formats reports, and outputs high-fidelity study materials.
- **🎙️ Multilingual Audio Reader**: A custom-built, client-side browser speech synthesizer featuring:
    - **Smart Language Detection**: Automatically analyzes the generated content to detect the language (English, Spanish, French, German, Portuguese, etc.) and sets the appropriate voice engine.
    - **Visualizer**: High-fidelity soundwave micro-animations that pulse in sync with the audio state.
    - **Voice & Speed Adjuster**: Allows users to select preferred OS-installed voices and adjust the playback speed (0.5x - 2.0x).
    - **Markdown Cleaner**: Custom parser that strips Markdown formatting symbols and skips raw code blocks for a clean, natural reading experience.
- **📥 NotebookLM Export**: Direct download of `notebooklm_source.md`, structured specifically to feed into NotebookLM sources.
- **🎨 Glassmorphic Dark UI**: Modern dark theme dashboard utilizing fluid layouts, micro-animations, and visual status cards that track the agent's research progress in real time.
- **🛡️ Quality Assurance**: Pre-commit Git hooks powered by **Husky** that automatically run ESLint and Prettier formatting checks prior to commit execution.

---

## 🛠️ Project Structure

The project has a modular, focused layout keeping components reusable and small:

```text
├── .husky/                 # Husky git commit hook configurations
├── agent/                  # Python ADK search and writing agent
├── src/
│   ├── app/
│   │   ├── globals.css     # Global styles and custom keyframe animations
│   │   ├── layout.tsx      # Main application layout
│   │   └── page.tsx        # Dashboard page containing the CopilotKit client
│   ├── components/
│   │   ├── audio-reader/   # Modular Audio Player Component
│   │   │   ├── index.tsx            # Main state orchestrator & text cleanser
│   │   │   ├── audio-controls.tsx   # Play, Pause, and Stop buttons
│   │   │   ├── audio-visualizer.tsx # Soundwave indicator & state labels
│   │   │   ├── speed-selector.tsx   # Playback speed dropdown
│   │   │   └── voice-selector.tsx   # System voice and locale dropdown
│   │   ├── dashboard-header.tsx     # App title bar and download links
│   │   ├── markdown-viewer.tsx      # High-performance Markdown renderer
│   │   ├── status-card.tsx          # Real-time progress tracker card
│   │   ├── search-loader.tsx        # Search phase loader and agent step logger
│   │   ├── welcome-state.tsx        # Idle initial welcome UI
│   │   └── error-state.tsx          # Graceful error screens
│   └── lib/
│       └── types.ts        # Shared TypeScript interface definitions
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `18.0.0+`
- **Python**: `3.12+`
- **Google AI Studio Key**: Required for the Gemini model powering the ADK agent (Get a key at [Google AI Studio](https://aistudio.google.com/)).

### Installation

1. Clone this repository and navigate to the project directory:

    ```bash
    cd study-buddy
    ```

2. Install dependencies for both Next.js and the Python agent:

    ```bash
    npm install
    ```

    > **Note:** The `postinstall` script runs automatically to initialize a Python virtual environment (`.venv`) and install agent requirements.

3. Export your Google API Key:

    ```bash
    export GOOGLE_API_KEY="your-gemini-api-key"
    ```

### Running the Application

Start the local Next.js client and ADK agent server concurrently:

```bash
npm run dev
```

- **Next.js App**: [http://localhost:3000](http://localhost:3000)
- **ADK Agent API**: [http://localhost:8000](http://localhost:8000)

---

## 💻 Available Scripts

- `dev` – Runs the UI and ADK Agent concurrently.
- `dev:debug` – Runs the dev stack with detailed debug levels.
- `dev:ui` – Starts only the Next.js development server.
- `dev:agent` – Starts only the Python agent FastAPI backend.
- `build` – Compiles Next.js for production.
- `lint` – Runs ESLint across the codebase.
- `format` – Re-formats all files using Prettier.

---

## 📈 Quality & Code Style Checks

This project enforces strict code styling and linting on every commit:

- **Husky pre-commit hook** runs `npm run lint` on staged files.
- If there are syntax errors, missing accessibility headers (`jsx-a11y`), or format issues, the commit is blocked until addressed.
