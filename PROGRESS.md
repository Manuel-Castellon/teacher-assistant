# PROGRESS.md — Math Teacher AI Assistant
## Read this first. Every session. State current state before writing any code.

---

## Last Completed
Project scaffold initialized (2026-04-29). No feature code written yet.

## Currently Broken
Nothing — no code exists yet.

## Blocked On
| Blocker | Blocks | Action Required |
|---------|--------|-----------------|
| Curriculum JSON not parsed | MVP 1 start | Fetch Ministry PDFs → parse → `data/curriculum/` |
| OCR stack untested | MVP 2 start | Get real Hebrew math exam scans; test MathPix + Google Doc AI + Tesseract; present results to user for provider decision |
| Math eval framework not defined | MVP 2 start | Research SymPy integration + LLM math eval frameworks; propose rubric; get user sign-off |

## Next Session Starts With
1. Read this file, state current state aloud
2. Re-verify Node 24 / TypeScript 6 / React 19 / PostgreSQL 18 / Next.js — confirm still current LTS
3. MVP 0: initialise repo, install deps, configure TypeScript 6
4. MVP 0: scaffold RTL Next.js shell (Hebrew font, `dir="rtl"` root layout)
5. MVP 0: set up PostgreSQL 18 schema from `src/types/` data models
6. MVP 0: implement auth (Cognito + Google OAuth) via provider interface
7. MVP 0: parse Ministry curriculum PDFs → `data/curriculum/` JSON (unblocks MVP 1)
8. MVP 0: write tests for all deterministic code; record coverage
9. MVP 0 complete → open MVP 1 worktree: `git worktree add ../mvp-1 mvp-1`

## MVP Status
| MVP | Status | Test Coverage | Eval Score | Completed |
|-----|--------|--------------|------------|-----------|
| 0   | 🔴 Not started | — | — | — |
| 1   | 🔴 Blocked | — | — | — |
| 2   | 🔴 Blocked | — | — | — |
| 3   | 🔴 Not started | — | — | — |
| 4   | 🔴 Not started | — | — | — |
| 5   | 🔴 Not started | — | — | — |
| 6   | 🔴 Not started | — | — | — |

## Session Log
| Date | Work Done | Blockers Hit |
|------|-----------|--------------|
| 2026-04-29 | Scaffold initialized | — |
