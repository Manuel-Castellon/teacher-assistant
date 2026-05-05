# PROGRESS.md — Math Teacher AI Assistant
## Read this first. Every session. State current state before writing any code.

---

## Last Completed
2026-05-05 — MVP 0 sub-task D (high-school 5-יח"ל curriculum): years 10/11/12 PDFs fetched, parsed, committed as `CurriculumUnit` JSON (8+6+4 topics, 150h each, 450h total). Validator (`scripts/parse-curriculum/validate.ts`) type-checks the JSON shape and asserts the hour totals.

## Currently Broken
Nothing.

## Blocked On
| Blocker | Blocks | Action Required |
|---------|--------|-----------------|
| Curriculum JSON not parsed | MVP 1 start | Fetch Ministry PDFs → parse → `data/curriculum/` |
| OCR stack untested | MVP 2 start | Get real Hebrew math exam scans; test MathPix + Google Doc AI + Tesseract; present results to user for provider decision |
| Math eval framework not defined | MVP 2 start | Research SymPy integration + LLM math eval frameworks; propose rubric; get user sign-off |

## Next Session Starts With
1. Read PROGRESS.md + CHECKPOINT.md, state current state
2. Verify `next dev` boots and RTL layout renders Hebrew correctly (visual check pending)
3. MVP 0: wire Hebrew font (Noto Sans Hebrew or Rubik) into `src/app/layout.tsx`
4. MVP 0: set up PostgreSQL 18 schema from `src/types/` data models
5. MVP 0: implement auth (Cognito + Google OAuth) via provider interface
6. MVP 0: parse Ministry curriculum PDFs → `data/curriculum/` JSON (unblocks MVP 1)
7. MVP 0: write tests for all deterministic code; record coverage
8. MVP 0 complete → open MVP 1 worktree: `git worktree add ../mvp-1 mvp-1`

## Done so far in MVP 0
- ✅ Git repo initialized (`main` branch)
- ✅ Versions verified: Node 24 (Active LTS), TS 6.0.3, React 19.2.5, Next.js 16.2, PostgreSQL 18.3
- ✅ Dependencies installed (548 packages, 2 moderate audit warnings, non-blocking)
- ✅ Scaffold type-checks under TS 6.0.3
- ✅ Hebrew-aware PDF extractor (`scripts/parse-curriculum/extract_text.py`, PyMuPDF 1.27, `get_text("words")` + per-line x-DESC sort)
- ✅ Raw curriculum PDFs committed: `prisa.pdf` (middle-school portal), `yod5/yodalef5/yodbet5.pdf` (5-יח"ל years 10/11/12)
- ✅ High-school 5-יח"ל JSON: years 10/11/12 in `data/curriculum/high-school-5units-yearNN.json`, 450h total, validator passes

## MVP Status
| MVP | Status | Test Coverage | Eval Score | Completed |
|-----|--------|--------------|------------|-----------|
| 0   | 🟡 In progress | pending | — | — |
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
| 2026-05-05 | git init; deps installed; versions verified (Node 24 / TS 6.0.3 / React 19.2.5 / Next 16.2 / PG 18.3); type-check passes; CHECKPOINT.md workflow added | — |
| 2026-05-05 | MVP 0 sub-task D high-school: PyMuPDF extractor; 4 raw PDFs committed; years 10/11/12 JSON parsed (450h total); validator passes; auth provider decision raised (#6) | Cognito default in PROGRESS.md conflicts with linking constraint, see Service Decision #6 |
