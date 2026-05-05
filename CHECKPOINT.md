# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
MVP 0 sub-task **D done**. Pick next sub-task from the MVP 0 list (auth, schema, font wiring, tests, etc.) at session start.

## Last action that succeeded
- Middle-school grades 7/8/9/9-reduced parsed → JSON, validator passes (commit pending: this same checkpoint update).
- See PROGRESS.md "Done so far in MVP 0" for the cumulative list.

## What I'm about to do next
**Awaiting user direction** on which MVP 0 sub-task to pick up next. Open candidates:
- **A**: Hebrew font wiring in `src/app/layout.tsx` (Noto Sans Hebrew or Rubik). Small.
- **B**: Verify `next dev` boots and renders RTL Hebrew correctly (visual smoke test).
- **C**: Service Decision #6 (auth provider) — needs a call before any auth code lands. PROGRESS.md still defaults to Cognito; CLAUDE.md flags the linking-failure problem.
- **E**: PostgreSQL 18 schema from `src/types/` data models.
- **F**: Test scaffolding for deterministic code (eval framework already exists for AI outputs).

Stretch / cleanup (not strictly MVP 0 sub-tasks):
- Middle-school: English topic slugs + per-topic learning objectives (currently positional IDs + empty `learningObjectives`).
- High-school: full per-chapter תכנים lists from PDF pages 4–35 (currently spine only).

## Open question / waiting on user
- Which sub-task next?
- Service Decision #6 is the only thing that genuinely BLOCKS (any auth wiring would be wasted work if Cognito gets swapped).

## Files touched this session
- `scripts/parse-curriculum/extract_text.py` (high-school PDF text dump)
- `scripts/parse-curriculum/dump_links.py` (PDF link rects)
- `scripts/parse-curriculum/parse_spread.py` (Google Doc spread → topic rows)
- `scripts/parse-curriculum/build_middle_school_json.py` (parser + envelope → JSON)
- `scripts/parse-curriculum/validate.ts` (covers high-school + middle-school JSONs)
- `data/curriculum/raw/{prisa,yod5,yodalef5,yodbet5}.pdf` + `.txt`
- `data/curriculum/raw/middle-school/{grade7,grade8,grade9,grade9-reduced}-spread.txt`
- `data/curriculum/high-school-5units-year{10,11,12}.json`
- `data/curriculum/middle-school-{grade7,grade8,grade9,grade9-reduced}.json`
- `data/curriculum/FETCH_INSTRUCTIONS.md` (corrected portal/Doc reality)
- `.gitignore` (`scripts/**/.venv/`, `scripts/**/__pycache__/`)
- `CLAUDE.md`, `MEMORY.md` (Service Decision #6 added)
- `PROGRESS.md` (D milestones folded in)
