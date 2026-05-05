# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
MVP 0 sub-task **D** continued: middle-school curriculum (חטיבת ביניים, grades 7/8/9) parsing.

## Last action that succeeded
- Committed years 10/11/12 of the 5-יח"ל high-school JSON + `validate.ts` (commit `68fb813`).
- Validator confirms 8+6+4 topics, 150h per year, 450h total, type-checks against `CurriculumUnit`.
- High-school side of sub-task D is done.

## Key architectural finding (still relevant)
- **`prisa.pdf` (middle school) is a portal, NOT content.** Page 1 has a 4-grade × 5-column table linking to ~20 Google Docs. Only 4 (תכנית הוראה, one per grade 7/8/9 + maybe a combined one) are relevant for our schema.
- Google Docs in the portal are publicly fetchable via `/export?format=txt`.
- `FETCH_INSTRUCTIONS.md` description of `prisa.pdf` ("full topic list + recommended hour allocation") is wrong, needs correction.

## What I'm about to do next
Proposed plan for middle school, awaiting user OK before coding:
1. Extract link rectangles from `prisa.pdf` page 1 (PyMuPDF `page.get_links()`), match each rect's center to a table cell by row (grade) and column (תכנית הוראה).
2. Fetch the 3-4 relevant Google Docs as plain text via `/export?format=txt`.
3. Parse each into `CurriculumUnit` JSON: `data/curriculum/middle-school-grade7.json`, `-grade8.json`, `-grade9.json`.
4. Extend `validate.ts` to include the new files.
5. Update `data/curriculum/raw/FETCH_INSTRUCTIONS.md` to reflect the portal/Google Docs reality.

## Open question / waiting on user
- Plan above OK? In particular: do you want me to commit the fetched Google Doc plain-text alongside the JSON (Ministry could revoke link access at any time, the local copy is the receipt, mirrors the choice we made for PDFs).
- Service Decision #6 (auth provider) still open, but doesn't block this work.

## Files touched this session (D so far)
- `scripts/parse-curriculum/extract_text.py` (extractor)
- `scripts/parse-curriculum/validate.ts` (validator)
- `scripts/parse-curriculum/.venv/` (gitignored)
- `data/curriculum/raw/{prisa,yod5,yodalef5,yodbet5}.pdf` + `.txt`
- `data/curriculum/high-school-5units-year{10,11,12}.json`
- `.gitignore` (added `scripts/**/.venv/`)
- `CLAUDE.md`, `MEMORY.md` (Service Decision #6 added)
- `PROGRESS.md` (high-school milestone folded in)
