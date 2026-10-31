# RepoGuide

An AI-powered code tutor that guides users through unfamiliar codebases with strict line-level citations, execution grounding, and issue contribution planning.

## What is Real
- **Ingestion & Tarball/Tree Parsing**: Implemented in `/server.ts` (fetches real repository tree and files from GitHub API, pins commit SHA, filters lockfiles and node_modules).
- **Symbol Chunking & Hybrid Retrieval**: Implemented in `/server.ts` (chunks code by function/class with path and line ranges, embeds with Gemini `text-embedding-004`, and performs hybrid vector/keyword search).
- **Citation Enforcement & Validator**: Implemented in `/server.ts` (deterministic code verifying that every cited file and line range exists inside the repository).
- **Guided Tour & Server-Side TTS**: Implemented in `/server.ts` & `/src/components/TourPlayer.tsx` (generates dependency-ordered tour stops, validates symbol names, and caches server-side audio).
- **Contribution Planner**: Implemented in `/server.ts` (fetches GitHub issues via API, performs hybrid retrieval, and generates validated citation-backed plan cards).
- **Voice Interruption & SpeechProvider**: Implemented in `/src/App.tsx` & `/src/components/VoiceRing.tsx` (Web Speech API speech recognition with push-to-talk narration pausing).
- **Repo Constellation Map View**: Implemented in `/src/components/RepoConstellation.tsx` (d3-force network graph of real imported files).
