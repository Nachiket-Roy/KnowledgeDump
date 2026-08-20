# KnowledgeDump Roadmap & Future Plans

Welcome to the future of KnowledgeDump! This document outlines our planned features, architectural changes, and areas where we're actively seeking community contributions.

Please comment on the corresponding GitHub Issue before starting work to get assigned!

---
## 🔴 Advanced / Core Architecture & Future Scope 
These are deep backend, AI pipeline, search retrieval, and graph clustering architecture milestones.

### 1. Benchmarking & Performance Measurement Suite
- [ ] **Synthetic Corpus Benchmark Suite**: Create benchmark generators for Small (100 notes), Medium (1,000 notes), and Large (10,000 notes) note libraries with fixed query-relevance test sets.
- [ ] **Latency & Resource Target Verification**: Measure p50, p95, and p99 query latency (target: p95 < 200ms) and system memory RSS (target: < 400MB) using `performance.now()` and process tracking.
- [ ] **Search Relevance Metrics**: Implement automated quality measurements including Recall@10, Mean Reciprocal Rank (MRR), and nDCG@10.

### 2. Hybrid Search Engine (BM25 + Vector Search + RRF)
- [ ] **SQLite FTS5 Full-Text Search**: Implement native Rust-based SQLite FTS5 for BM25 keyword search, replacing the legacy frontend Lunr index.
- [ ] **Reciprocal Rank Fusion (RRF)**: Combine top candidate results from LanceDB vector search and SQLite FTS5 keyword search using Reciprocal Rank Fusion ($k=60$) with chunk ID deduplication.
- [ ] **Hybrid Search Test Suite**: Add automated tests for RRF rank ordering, deduplication, and relevance verification across test queries.

### 3. Zero-Cost AI Pipeline Circuit Breaker
- [ ] **Stateful Circuit Breaker**: Replace simple request-based fallbacks with a stateful Circuit Breaker pattern (Closed $\rightarrow$ Open $\rightarrow$ Half-Open) tracking consecutive Gemini failure thresholds.
- [ ] **Ollama Failover & Recovery**: Instantly route AI requests to local Ollama (`http://127.0.0.1:11434`) when the circuit opens, with automated Gemini health probing after a cooldown period.
- [ ] **Configurable Settings & Model Alignment**: Align documentation and codebase model naming (e.g., `llama3.2`) and allow configurable Ollama host/model options in `SettingsView`.

### 4. Advanced Knowledge Graph & Leiden Community Detection
- [ ] **Weighted Similarity Edges**: Generate note-to-note edges using a combination of shared concept tags and semantic vector similarity thresholding.
- [ ] **Leiden Community Detection**: Implement Leiden graph community detection to detect note clusters and assign visual color styling to graph communities.
- [ ] **Interactive Community Filtering**: Allow users to highlight, filter, and inspect specific graph communities inside `GraphView.tsx`.

### 5. On-Device Embedding Lifecycle & Migration
- [ ] **Vector Model & Version Tracking**: Store embedding model versions (`all-MiniLM-L6-v2`, 384-dim) and chunking parameters alongside stored vectors.
- [ ] **Auto-Reindexing Pipeline**: Support seamless vector re-indexing when the embedding model or chunking strategy upgrades.
- [ ] **Indexing & Model Download UI**: Provide real-time progress indicators and failure state notifications during initial Transformers.js model loading and vector creation.

### 6. Cloud Syncing & Storage
- [ ] **Encrypted Cloud Sync**: Optional end-to-end encrypted sync for local SQLite database and LanceDB vectors to user-provided storage (AWS S3, Google Drive).

---

## How to Propose a New Feature
Have an idea that isn't on this list? We'd love to hear it!
1. Open a **Feature Request** issue on GitHub.
2. Provide a clear use-case and propose how it fits into the current UI.
3. Wait for maintainer approval before submitting a Pull Request.
