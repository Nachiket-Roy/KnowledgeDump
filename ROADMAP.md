# KnowledgeDump Roadmap & Future Plans

Welcome to the future of KnowledgeDump! This document outlines our planned features, architectural changes, and areas where we're actively seeking community contributions.

Please comment on the corresponding GitHub Issue before starting work to get assigned!

---

## 🟢 Good First Issues (Beginner Friendly)
These are UI-focused or straightforward tasks perfect for first-time contributors.

- [ ] **Onboarding UI Overhaul**: The initial Gemini API key popup is a bit intrusive. Redesign it into a non-blocking banner or integrate it directly into the Settings menu with a smoother empty-state prompt.
- [ ] **Gemini Integration Testing**: Add automated tests to ensure the Gemini AI prompts and logic are fully working and gracefully degrade when offline.
- [ ] **GitHub Pages Landing Page**: Create a simple HTML/CSS landing page for the project to showcase features (Semantic Search, Knowledge Graph, DrawPad) and provide a professional download page.
- [ ] **Custom Themes**: Add a theme switcher (e.g., Light Mode, Sepia, Dracula) using TailwindCSS variables.
- [ ] **Font Selection**: Allow users to change the editor font (e.g., Fira Code, Inter, Roboto).
- [ ] **Word Count & Reading Time**: Add a small status bar at the bottom of the editor showing the current word count and estimated reading time.
- [ ] **Export to Markdown**: We currently support `.doc` and `.pdf`. Add a simple "Export to `.md`" button to download the raw markdown file.

## 🟡 Intermediate Features (React / Tauri / TypeScript)
These require a bit more understanding of the codebase or Tauri's native APIs.

- [ ] **Folder/Tag Filtering**: Enhance the sidebar to group notes by folders or tags (currently tags are extracted via AI, but not used for filtering).
- [ ] **Canvas Enhancements**: 
  - Add an Eraser tool to the `DrawPad`.
  - Add text-box insertion capabilities to the canvas.
  - Implement an Undo/Redo stack for canvas strokes.
- [ ] **Image Uploads via File System**: Currently, the image button just inserts `![Image](url)`. Implement a Tauri file picker (`plugin-dialog`) that copies a local image to the app's local app-data folder and embeds the local path.

## 🔴 Advanced / Core Architecture (Rust / SQLite / VectorDB)
These are deep backend features requiring knowledge of Rust, LanceDB, or SQLite.

- [ ] **Full-Text Search Migration**: Migrate from the basic frontend `lunr.js` search to a native Rust-based SQLite FTS5 (Full-Text Search) implementation for better performance on large note libraries.
- [ ] **Cloud Syncing**: Implement an optional end-to-end encrypted cloud sync feature (e.g., syncing the local SQLite DB to AWS S3 or Google Drive).
- [ ] **AI Model Options**: Currently, AI tagging/titling uses predefined models. Allow users to configure their own Ollama host URL or OpenAI API keys in the `SettingsView`.

---

## How to Propose a New Feature
Have an idea that isn't on this list? We'd love to hear it!
1. Open a **Feature Request** issue on GitHub.
2. Provide a clear use-case and propose how it fits into the current UI.
3. Wait for maintainer approval before submitting a Pull Request.
