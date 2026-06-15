# KnowledgeDump

**An AI-Powered Personal Knowledge Base with Semantic Section Search.**

KnowledgeDump is designed for individuals who need to capture information freely — notes, PR comments, research, code snippets, meeting dumps — and retrieve exactly the right section later using natural language queries.

## Core Features
- **Semantic Search**: Find exactly what you are looking for using conceptual searches, not just keyword matches. Returns section-level results with AI-generated descriptions.
- **Auto-tagging**: Extracts 1-4 concept tags from your text automatically in the background as you write.
- **Knowledge Graph**: Visualize connections between your notes natively in a beautiful 2D force-directed graph.
- **Offline First**: All data is stored locally in SQLite. The vector embeddings run entirely on-device (via Transformers.js), and AI functions can transparently fall back to local Ollama if offline.
- **Zero Ongoing Cost**: Designed to operate entirely on free-tier models (Gemini Flash for APIs, local HuggingFace/Ollama models for everything else).

## Getting Started

### 1. Installation
Currently, KnowledgeDump is built from source. Ensure you have Node.js and Rust installed.
```bash
npm install
npm run dev
```

### 2. Initial Setup
On your first launch, the app will welcome you and ask for a **Gemini API Key**. 
1. Get a free Gemini API key from Google AI Studio.
2. Enter it into the Onboarding screen or the Settings gear (⚙️) in the sidebar.

### 3. Fallback to Local AI (Optional)
If you want to run completely offline without Gemini:
1. Install [Ollama](https://ollama.com/).
2. Pull the Llama 3 model: `ollama run llama3`
3. KnowledgeDump will automatically fallback to the local Ollama instance running on port `11434` if it fails to reach Gemini.

## Usage
- **Capture**: Click the `+` icon to dump a new note. Write in plain text or Markdown.
- **Search**: Press `Ctrl+K` to open the semantic search overlay.
- **Graph View**: Press `Ctrl+G` to open the interactive note graph.

---
Built with Tauri, React, SQLite, and LanceDB.
