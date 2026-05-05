# CLAUDE.md — Math Teacher AI Assistant

## START HERE — Every Session
1. Read PROGRESS.md AND CHECKPOINT.md, state the current state before writing any code
2. Check that you are on the correct git worktree for the current MVP
3. At the start of a new MVP: re-verify all version numbers (see Versions below)

## CHECKPOINT.md — write often, sessions crash
- CHECKPOINT.md is the live cursor; PROGRESS.md is the milestone log. Different jobs.
- Overwrite CHECKPOINT.md after every non-trivial tool action: file written, dep installed, schema migrated, decision raised. One write per logical step, not per character.
- Each update must answer: what just succeeded, what's next, what's pending from the user.
- When a milestone lands, fold the relevant facts into PROGRESS.md and reset CHECKPOINT.md to empty fields.
- If CHECKPOINT.md and PROGRESS.md disagree on resume, CHECKPOINT.md wins (it's newer).

---

## Project Context
Hebrew-first, RTL web application for an Israeli high school math teacher and university professor.
Primary user: moderate technical comfort, works in Hebrew. No CLI, no install steps.
All UI defaults to `dir="rtl"`. Font must support Hebrew glyphs.
Curriculum basis: תשפ"ו (2025–2026) — this is the primary source, do not use older versions.

---

## Hard Stops — See AGENTS.md
AGENTS.md defines REFUSE conditions, not suggestions. If any condition is triggered,
STOP, state which condition was hit, and list what is missing. Do not proceed.

---

## Versions (re-verify at EVERY MVP start — LTS schedules shift)
| Package      | Required | Notes |
|--------------|----------|-------|
| Node.js      | 24.x     | Active LTS. Node 22 is Maintenance-only. |
| TypeScript   | 6.x      | Released March 2026. Breaking changes from 5.x. |
| React        | 19.x     | Stable since December 2024. |
| PostgreSQL   | 18.x     | Current major as of 2026. |
| Next.js      | 16.x     | Verified 2026-05-05. 16.2 ships with React 19.2 + stable Turbopack. |

**TypeScript migration window:** TS 6.0 is the last JS-based release; TS 7.0 (Go-native) is expected within 3–6 months and turns 6.0 deprecations into hard removals. Plan a 6→7 migration before MVP 3.

---

## Architecture Rules (non-negotiable)
- **Provider interfaces**: Every external service has a TypeScript interface in
  `src/providers/interfaces/`. Hardcoding an API call without its interface = hard stop.
- **Generator / Verifier separation**: Exercise generation and math verification are
  SEPARATE agents. No math exercise reaches the teacher without Wolfram/SymPy verification.
- **Curriculum spine**: All content features reference `src/types/curriculum.ts`.
  The shared data model is the join point between every MVP.
- **RTL first**: All React components default `dir="rtl"`. Never add RTL as an afterthought.
- **No service decisions without asking**: See "Service Decisions" section below.

---

## Testing Standards
- Near-100% coverage on all deterministic (non-AI) code. No exceptions.
- AI outputs: eval framework ONLY — do not use unit tests to assert LLM output quality.
- Evals live in `/evals/`. See `evals/README.md` for the framework contract.
- No MVP may merge to `main` without: (a) test suite passing, (b) eval scores recorded in PROGRESS.md.
- Each worktree: `git worktree add ../mvp-N-branch mvp-N`. Merge only when done.

---

## Workflow
- Plan mode before any non-trivial implementation. Confirm approach before writing code.
- Use specialized subagents for distinct roles (see AGENTS.md).
- Update CHECKPOINT.md continuously during work; update PROGRESS.md at session end (or when a milestone lands).
- Commit messages: `mvp-N: <what>` format.

---

## MVP Sequence
| MVP | Feature                        | Status      | Blocker |
|-----|--------------------------------|-------------|---------|
| 0   | Foundation + scaffold          | 🔴 Not started | — |
| 1   | מערך שיעור generator           | 🔴 Blocked  | Curriculum JSON not parsed |
| 2   | Exercise/exam creator + verify | 🔴 Blocked  | OCR untested; math eval not researched |
| 3   | Question bank (Bagrut archive) | 🔴 Not started | — |
| 4   | Curriculum tracker             | 🔴 Not started | — |
| 5   | Grade tracker                  | 🔴 Not started | — |
| 6   | AI grading (supervised UI)     | 🔴 Not started | — |

---

## Service Decisions — ASK USER, Never Decide Alone
These are open. Raise each one explicitly before implementing:

| # | Decision | When | Options |
|---|----------|------|---------|
| 1 | OCR provider | MVP 0, after testing | MathPix · Google Document AI · Tesseract · Azure |
| 2 | Math verifier | MVP 2 start | Wolfram Alpha API · SymPy-only · both in sequence |
| 3 | Grading infra | MVP 6 start | GradeLab · ExamAI · custom on OCR layer |
| 4 | AI generation | default Claude API | Interface allows swap if costs grow |
| 5 | Geometry validation | MVP 2, when live | GeoGebra API · custom |

---

## Curriculum Sources
- Middle school (חטיבת ביניים): `meyda.education.gov.il/files/Pop/0files/matmatika/Chativat-Beynayim/tashpav/prisa.pdf`
- 5 יח"ל year 10: `.../Mazkirut_Pedagogit/matematika/yod5.pdf`
- 5 יח"ל year 11: `.../Mazkirut_Pedagogit/matematika/yodalef5.pdf`
- 5 יח"ל year 12: `.../Mazkirut_Pedagogit/matematika/yodbet5.pdf`
- Parse all into `data/curriculum/` JSON before MVP 1 starts.
- Note: ministry publishes annual focus docs and emergency focus docs (war, COVID) — check for these.

## Past Bagrut Exam Sources (for question bank seeding, MVP 3)
- יואל גבע: search `yoel-geva` online
- בני גורן: search `benigoren` online

## Teacher's Textbooks
- כיתה ז': "בכיוון הנכון עם ארכימדס" חלק ג' (teacher's preferred — NOT students' standard book; print exercises)
- כיתה ח': מתמטיקה לחטיבת הביניים חלק 2 הוצאת מט"ח (standard) + "בכיוון הנכון" כיתה ח' חלק ב'
