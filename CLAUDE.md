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
- **Docx RTL**: Every logical line (especially mixed Hebrew+math) must be its own paragraph
  (blank-line separated in markdown). Post-process docx with `<w:bidi/>` injection.
  Geometry diagrams: vertex labels + angle markers only, no side lengths (students fill those in).
- **No service decisions without asking**: See "Service Decisions" section below.

---

## Resource Map — scripts, data, assets

Before creating any new module, check this map. Duplicating existing infrastructure is a hard stop.
Operational sign-off details live in `docs/lesson-plan-signoff.md`; do not keep
adding one-off tool reminders here when a package script or focused doc can own them.

### CLI Scripts (`scripts/`)
| Script | Purpose | Used by |
|--------|---------|---------|
| `export-markdown.mjs` | Markdown → DOCX (pandoc + bidi) + PDF (Chrome headless or lualatex fallback). RTL CSS baked in. | `src/exam/exportDocx.ts`, `src/exam/exportPdf.ts` (server module equivalents); also run standalone for `data/` artifacts |
| `export-rubric.mjs` | Re-exports `export-markdown.mjs` (rubric markdown uses same pipeline) | Manual CLI for rubric artifacts |
| `generate-exam.ts` | End-to-end exam generation to `output/` | Manual CLI (`npx ts-node scripts/generate-exam.ts`) |
| `generate-diagram.py` | Programmatic SVG geometry diagrams | Manual CLI; referenced from CLAUDE.md service decisions |
| `verify-math.py` | SymPy math verification | `src/providers/impl/SympyMathVerifier.ts` |
| `parse-curriculum/*.py` | Parse ministry PDF → JSON curriculum files | One-time pipeline; produced `data/curriculum/*.json` |

### Server Modules (reusable from `src/`)
| Module | Purpose | Notes |
|--------|---------|-------|
| `src/exam/exportDocx.ts` | `markdownToDocx()` — same logic as `export-markdown.mjs` docx path | Used by `/api/exam/export` route |
| `src/exam/exportPdf.ts` | `markdownToPdf()` — same logic as `export-markdown.mjs` Chrome PDF path | Used by `/api/exam/export` route (format=pdf) |
| `src/exam/backends.ts` | AI completion backends (Gemini variants, Anthropic, Claude CLI, Codex CLI) with fallback chain and named factory | Shared by ExamGenerator + LessonPlanGenerator |

### Data (`data/`)
| Directory | Contents | Consumers |
|-----------|----------|-----------|
| `data/curriculum/` | Parsed curriculum JSON per grade (7-12) | `src/lessonPlan/curriculumContext.ts`, `src/exam/curriculumContext.ts` |
| `data/curriculum/raw/` | Source PDFs + extracted text from ministry | `scripts/parse-curriculum/`; not imported at runtime |
| `data/lesson-plans/examples/` | 6 hand-validated lesson plan JSONs (teacher's real lessons) | Eval reference; informed `src/types/lessonPlan.ts` design |
| `data/lesson-plans/generated/` | AI-generated plans with .json/.md/.docx/.pdf + worksheets | Artifact tests (`generatedArtifacts.test.ts`); teacher review samples |
| `data/lesson-plans/TEMPLATE.json` | Empty lesson plan scaffold | Reference for prompt engineering |
| `data/exam-examples/` | Real exam JSON + source PDF | Eval cases reference |
| `data/exam-rubrics/` | Rubric JSON + markdown + exported docx/pdf | MVP 6 groundwork; rubric renderer tests |
| `data/resources/` | Copyrighted textbook PDFs (gitignored) | Local reference only |

### Assets (`assets/`)
| File | Purpose |
|------|---------|
| `assets/reference-rtl.docx` | Pandoc reference doc for RTL DOCX styling. Used by `exportDocx.ts` and `export-markdown.mjs` |

### Teacher Source Material (`from_wife/`)
| Contents | Purpose |
|----------|---------|
| 10 real lesson plan .docx files (grades 7, 8, 11) | Ground truth for lesson plan structure, style, phase timing |
| 2 worksheet PDFs | Ground truth for worksheet formatting |
| 1 exam .docx | Ground truth for exam structure |
| 1 integral strategies PDF | Bagrut review reference |
| `Wifes tasks log.docx` | Teacher's evaluation of competing tools (Morai, SkillCet, StudyWise) + pedagogy preferences + feature wishlist. Key source for design decisions. |

### Output (`output/`)
Ephemeral directory for `scripts/generate-exam.ts` CLI output. Not imported by the app.

### Forward-looking code (intentionally unreferenced from app, not dead code)
| Module | Purpose | Target MVP |
|--------|---------|------------|
| `src/examRubric/renderRubric.ts` | Renders rubric JSON to markdown | MVP 6 (supervised grading UI) |
| `src/providers/impl/NextAuthProvider.ts` | IAuthProvider wrapper around Auth.js | Wiring when auth guard is added to routes |
| `src/providers/interfaces/IDocumentExporter.ts` | Export interface (partially realized via exportDocx + exportPdf) | Current |
| `src/providers/interfaces/IOCRProvider.ts` | OCR interface | MVP 3 (question bank scanning) |
| `src/providers/interfaces/IGradingProvider.ts` | Grading interface | MVP 6 (supervised grading) |
| `src/types/grading.ts` | Grade record types | MVP 5-6 |

---

## Testing Standards
- Near-100% coverage on all deterministic (non-AI) code. No exceptions.
- AI outputs: eval framework ONLY — do not use unit tests to assert LLM output quality.
- Evals live in `/evals/`. See `evals/README.md` for the framework contract.
- Lesson-plan sign-off is encoded in `npm run test:lesson-plan` and documented in
  `docs/lesson-plan-signoff.md`.
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
| 0   | Foundation + scaffold          | ✅ Complete | — |
| 1   | מערך שיעור generator           | 🟡 In progress | Rubric sign-off + prompt review + live eval |
| 2   | Exercise/exam creator + verify | 🟡 In progress | SymPy verifier done; needs Gemini backend + UI |
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
| 2 | Math verifier | MVP 2 start | **Decided: SymPy primary** (local, free, sufficient for middle/high school algebra+geometry). Wolfram Full Results API available as cross-check for 5-unit bagrut content (AppID configured). |
| 3 | Grading infra | MVP 6 start | GradeLab · ExamAI · custom on OCR layer |
| 4 | AI generation | default backend chain | **Current:** lesson/exam generation uses `src/exam/backends.ts`. UI can select Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, or GPT-5.5 via Codex CLI. Anthropic API backend support remains in code for a future key. Best observed lesson-plan output: GPT-5.5 (Codex). Gemini 2.5 Pro may fail on free keys. |
| 6 | **Auth provider** | ✅ Decided | Auth.js v5 + Google OAuth + @auth/pg-adapter, allowDangerousEmailAccountLinking. |
| 5 | Geometry validation | MVP 2, when live | **Update: programmatic SVG generation works** (scripts/generate-diagram.py). GeoGebra API deferred unless interactive diagrams needed. |

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
