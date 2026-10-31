# RepoGuide Implementation Plan (Final Addendum)

An AI-powered code tutor that takes any public GitHub repository URL, builds an interactive architecture map, delivers a spoken and visual guided tour with strict line-level citations, answers questions with a citation enforcement validator and abstention threshold, and creates contribution plans.

## Addendum Inclusions

1. **Audio & TTS**: Pre-rendered narration uses server-side TTS / Web Audio synthesis cached by repo URL + SHA + stop. Browser speech synthesis is the live fallback only and is never cached.
2. **Parsing**: Symbol chunking for Python and JS/TS (with regex/structural parsing fallback) carrying path and line ranges. Fallback to fixed-size chunks for unparsed languages.
3. **Index & Vector Store**: Embedding model with in-memory index persisted to disk per repo + SHA, including import graph neighbors.
4. **Ingestion Security**: Accept only valid `github.com` repo URLs, enforce strict size caps while streaming tarballs, and reject path traversal/symlinks upon extraction.
5. **Secrets & Rate Limits**: API keys stay strictly on the server (`server.ts`). Per-repo token budget and per-IP rate limit.
6. **Abstention**: Strict rule: if no retrieved chunk scores above the relevance threshold (e.g. similarity < 0.35), return `"I could not find this in the repo"`.
7. **Verification / Smoke Test**: 10 hand-written questions across 3 test repos (at least 3 unanswerable to test abstention). Automated line-range existence check + LLM judge for claim support.
8. **Tour Generation & Ranking**: Rank files by import-graph in-degree and entry-point proximity before generating 5-8 tour stops.
9. **First Milestone**: Build a single small repo end-to-end (ingest, one cited answer) before expanding Phase 1.

## Build Phases & Milestones
- **Milestone 1**: Single small repo end-to-end (tarball fetch, security checks, symbol parsing, basic in-memory index, and 1 cited answer).
- **Phase 1**: Full ingestion, repo map, file ranking, import graph, and disk-persisted cache per repo + SHA.
- **Phase 2**: Cited Q&A with strict citation validator, LLM judge, and abstention threshold.
- **Phase 3**: Guided Tour engine, rank-based stops, pre-rendered audio caching, and SpeechProvider (Web Speech + Push-to-talk interruption).
- **Phase 4**: Contribution Planner (GitHub issue to plan card).
