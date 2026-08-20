# KnowledgeDump

**An AI-Powered Personal Knowledge Base with Semantic Section Search.**

KnowledgeDump is designed for individuals who need to capture information freely — notes, PR comments, research, code snippets, meeting dumps — and retrieve exactly the right section later using natural language queries.

## Core Features
- **Semantic Search**: Find exactly what you are looking for using conceptual searches, not just keyword matches. Returns section-level results with AI-generated descriptions. Semantic search embeddings are computed on-device using Transformers.js (`all-MiniLM-L6-v2`).
- **Auto-tagging**: Extracts 1-4 concept tags from your text automatically in the background as you write using local open-source AI models.
- **Knowledge Graph**: Visualize connections between your notes natively in a beautiful 2D force-directed graph with tag filtering.
- **Offline First**: All data is stored locally in SQLite and LanceDB. Vector embeddings run entirely on-device (via Transformers.js), and AI functions run locally by default via Ollama, LM Studio, LocalAI, or Jan.
- **Zero Ongoing Cost**: Local operation requires no cloud API keys or subscriptions; custom endpoints may process data remotely.

## Getting Started

### 1. Installation
Currently, KnowledgeDump is built from source. Ensure you have Node.js and Rust installed.
```bash
npm install
npm run dev
```

### 2. Local AI Setup
KnowledgeDump connects automatically to your local open-source AI provider.
1. Install [Ollama](https://ollama.com/) (or start LM Studio, LocalAI, or Jan).
2. Pull a local model, for example: `ollama run llama3.2`
3. Launch KnowledgeDump — the app will auto-detect your running local AI provider and connect seamlessly.
4. You can also configure custom host endpoints in the **Settings** menu.

## Usage
- **Capture**: Click the `+` icon to dump a new note. Write in plain text or Markdown.
- **Search**: Press `Ctrl+K` to open the semantic search overlay.
- **Graph View**: Press `Ctrl+G` to open the interactive note graph.

---
Built with Tauri, React, SQLite, and LanceDB.
