# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
MVP 0 sub-task **D** — Curriculum PDF parsing into JSON matching `CurriculumUnit`.

## Last action that succeeded
- Fetched `prisa.pdf` (middle school portal, 3 pages) and `yod5.pdf` (high school year 10, 44 pages, 2.2 MB) into `data/curriculum/raw/`.
- Set up Python venv at `scripts/parse-curriculum/.venv/` with PyMuPDF 1.27.2.3.
- Wrote `scripts/parse-curriculum/extract_text.py` — uses `get_text("words")` + per-line x-DESC sort to produce logical-order Hebrew. Verified on prisa.pdf: "משרד החינוך" / "המזכירות הפדגוגית" come out correctly.
- Confirmed Google Docs in the portal are publicly fetchable via `/export?format=txt`.

## Key architectural finding
- **`prisa.pdf` (middle school) is a portal, NOT content.** It links to ~35 Google Docs. The 20 links on page 1 form a 4-grade × 5-column table; only 4 of them (תכנית הוראה Hebrew per grade) are relevant for our schema.
- **High school 5-יח"ל PDFs are direct content** (yod5/yodalef5/yodbet5). Fetch + PyMuPDF parse path is clean.
- `FETCH_INSTRUCTIONS.md` description of `prisa.pdf` ("Contains: full topic list + recommended hour allocation") is out of date — needs correction once parsing strategy settles.

## What I was about to do next
**Awaiting user go-ahead** on this plan:
1. Fetch yodalef5.pdf + yodbet5.pdf (year 11, year 12).
2. Extend `extract_text.py` with structured parsing → `CurriculumUnit` JSON for years 10/11/12 of the 5-יח"ל track.
3. Then tackle middle school: match prisa.pdf link rects to table cells to identify the 4 relevant Google Doc URLs, fetch + parse.
4. Update `FETCH_INSTRUCTIONS.md` to reflect the portal/Google Docs reality.
5. Run the eval/smoke tests for the JSON shape.

## Open question / waiting on user
- OK to proceed with high-school-first strategy? Or do you want middle-school parallelized?
- For Google Doc parsing: any concern about Ministry having moved content to public Google Docs (versioning, ownership)? The OUIDs in the URLs suggest individual ownership — Ministry could revoke link access at any point.

## Files touched this session (D so far)
- `scripts/parse-curriculum/extract_text.py` (new)
- `scripts/parse-curriculum/.venv/` (gitignored)
- `data/curriculum/raw/prisa.pdf`, `data/curriculum/raw/prisa.txt`
- `data/curriculum/raw/yod5.pdf`
- `.gitignore` (added scripts/**/.venv/)
