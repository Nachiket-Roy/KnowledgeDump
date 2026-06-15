# KnowledgeDump Deployment & Packaging Guide

This guide covers how to build and package the KnowledgeDump application for various operating systems using Tauri.

## Prerequisites
Before you begin, ensure you have the required build tools installed for your target OS:
- **Windows**: Visual Studio C++ Build Tools
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

Ensure you also have Node.js and Rust installed.

## Building the App

To generate an installer for your current operating system, run:

```bash
npm install
npm run tauri build
```

This will compile the Rust backend, bundle the React frontend, and generate an installer.

### Output Locations
- **Windows (.msi / .exe)**: `src-tauri/target/release/bundle/msi/` or `nsis/`
- **macOS (.dmg / .app)**: `src-tauri/target/release/bundle/dmg/`
- **Linux (.deb / .AppImage)**: `src-tauri/target/release/bundle/deb/`

## Cross-Platform Compilation
Tauri does not officially support compiling for macOS from a Windows machine, or vice-versa, out of the box. The easiest way to generate builds for all platforms is using GitHub Actions.

We have included a CI workflow in `.github/workflows/ci.yml` that already caches the cargo dependencies. You can extend it to upload the compiled binaries as GitHub Releases.
