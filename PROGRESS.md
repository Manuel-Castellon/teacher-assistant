# PROGRESS.md — Math Teacher AI Assistant
## Read this first. Every session. State current state before writing any code.

---

## Last Completed
2026-05-05 — MVP 0 sub-task **D complete**: high-school 5-יח"ל years 10/11/12 + middle-school grades 7/8/9/9-reduced parsed to `CurriculumUnit` JSON. Validator type-checks all 7 files; high-school totals hard-asserted at 450h, middle-school totals printed (gap from free / חזרות weeks documented per-grade in `_note`). Pivot for middle school: prisa.pdf is a portal, only the פריסת הוראה Hebrew Google Docs are publicly fetchable, so we use those (richer than תכנית הוראה anyway: per-month topic breakdown + hours).

## Currently Broken
Nothing.

## Blocked On
| Blocker | Blocks | Action Required |
|---------|--------|-----------------|
| ~~Curriculum JSON not parsed~~ | MVP 1 start | ✅ Done 2026-05-05 (high school + middle school both parsed; middle-school hour gap documented per-grade) |
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
- ✅ Middle-school JSON: grades 7/8/9 + 9-reduced in `data/curriculum/middle-school-gradeN.json`, parsed from publicly-fetchable פריסת הוראה Google Docs (raw `.txt` exports committed under `raw/middle-school/` as receipt). Heuristic parser at `scripts/parse-curriculum/parse_spread.py`; per-grade hour gap (rows vs monthly budget) documented in each file's `_note`. English topic slugs + per-topic learning objectives are TODO.
- ✅ `FETCH_INSTRUCTIONS.md` corrected: prisa.pdf is a portal (not content); documents the Doc-ID lookup procedure.

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
| 2026-05-05 | MVP 0 sub-task D middle-school: prisa.pdf revealed as portal; 4 פריסת הוראה Google Docs identified by link-rect-to-cell mapping + fetched as txt (committed); heuristic parser written; 4 grade JSONs generated; FETCH_INSTRUCTIONS.md corrected; D done | Middle-school topic-hours don't match monthly budgets (free / חזרות weeks); shipped with `_note` documenting gap |
