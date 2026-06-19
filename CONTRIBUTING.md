# Contributing to KnowledgeDump

First off, thank you for considering contributing to KnowledgeDump! It's people like you that make this tool better for everyone.

## Tech Stack

KnowledgeDump is built using:
- **Frontend**: React, TypeScript, Vite, TailwindCSS (v4)
- **Backend/Desktop Environment**: Tauri (Rust)
- **Editor**: CodeMirror 6
- **Testing**: Playwright (E2E)

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) (C++ build tools on Windows, WebKit dependencies on Linux, etc.)

### Getting Started
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nachiket-Roy/KnowledgeDump.git
   cd KnowledgeDump
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   This will start both the Vite frontend server and the Tauri backend in watch mode.
   ```bash
   npm run tauri dev
   ```
   *(Alternatively, use `npm run dev` for just the frontend, but native OS features like file saving and database access won't work in a standard browser).*

## Project Structure
- `src/`: React frontend code
  - `components/`: UI components (Sidebar, EditorPane, DrawPad, etc.)
  - `lib/`: Utility functions (AI, Search, Vector DB sync)
- `src-tauri/`: Rust backend code and Tauri configurations
  - `src/`: Rust source files for database management, file IO, and IPC commands
  - `capabilities/`: Tauri v2 capability configuration files
- `e2e/`: Playwright end-to-end tests

## Making Changes

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Run tests before committing:**
   If you modify UI logic, ensure the Playwright tests still pass:
   ```bash
   npx playwright test
   ```

3. **Verify the build:**
   Ensure the Rust backend and TypeScript frontend both compile successfully:
   ```bash
   npm run build
   ```

## Pull Request Process

1. Ensure your PR description clearly describes the problem and solution.
2. If your change affects the UI, please include screenshots or GIFs demonstrating the change.
3. Verify that your code passes all linting and test checks.
4. Your PR will be reviewed by maintainers, and we may request some changes before merging.

## Code Style

- We use standard TypeScript/React conventions.
- Use functional components and React Hooks.
- Ensure any new Tauri IPC commands are strongly typed on the frontend and properly handle errors in Rust.

Thanks again for your interest in contributing!
