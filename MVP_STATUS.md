# MVP Status Rundown

Last updated: 2026-05-17 (post MVP3 question-bank first slice)

Source of truth: `PROGRESS.md` and `CHECKPOINT.md`.

## MVP 0 — Foundation + Scaffold

Status: complete.

Done:
- Next.js/TypeScript/Postgres scaffold, tests, coverage gate, Hebrew RTL/font setup.
- Curriculum PDFs and parsed curriculum JSON for middle school and high-school 5 יח"ל.
- Auth.js v5 with Google OAuth, dev-only `dev-email` Credentials provider (passwordless, gated to `NODE_ENV !== 'production'`), and PG adapter. JWT session strategy.
- Database schema and provider interfaces.
- Local Postgres 18.3 stood up via docker (`math-teacher-pg` + named volume). Schema + both migrations applied; `npm run db:migrate` is idempotent.

Missing:
- Production Google OAuth path not yet exercised end-to-end (no `AUTH_GOOGLE_ID`/`SECRET` configured); the JWT session-strategy switch made for Credentials should be confirmed not to regress Google sign-in.
- PG client/ORM refinement is deferred until it is needed.

## MVP 1 — Lesson Plan Generator

Status: in progress, but substantially usable and browser-smoked.

Done:
- `LessonPlan` schema and deterministic invariant validator.
- Claude-backed `ITextGenerator` implementation with fake-client tests.
- Eval harness and MVP1 fake deterministic evals.
- Lesson-plan curriculum grounding from local curriculum JSON.
- Reusable lesson-plan Markdown renderer.
- Generated/exported י"ב 5 יח"ל complex-numbers intro lesson plan: JSON, Markdown, DOCX, PDF.
- Local-only copyrighted resource guardrail for `data/resources/*`.
- `/lesson-plan` UI with explicit model selector and browser-local recent plans.
- `/lesson-plan` UI has a worksheet toggle for suitable lesson types and forces worksheets off for `מבחן`.
- Lesson-plan prompt/API path carries `includeWorksheet` and gives explicit worksheet/no-worksheet instructions to the model.
- Worksheet math verification now runs for structured generated worksheet exercises (`verificationItem`) and surfaces verified/failed/skipped counts in the UI.
- Model choices: Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemini 2.5 Pro, Claude CLI, GPT-5.5 (Codex).
- GPT-5.5 (Codex) browser exports approved by user as quality references:
  - `data/lesson-plans/generated/grade7-equations-common-denominator-90min-approved-gpt55.pdf`
  - `data/lesson-plans/generated/grade11-complex-algebra-90min-approved-gpt55.pdf`
- Teacher-facing renderer no longer leaks implementation metadata such as `מצב עבודה` or `זמן משוער`.

Missing:
- Broader rubric sign-off for LLM-judged lesson-plan quality.
- Live evals against more real model outputs, including cases where worksheet verification items are missing or fail.
- Anthropic API can be re-exposed and smoked when an API key is available.

## MVP 2 — Exercise / Exam Creator + Verification

Status: complete for exam generation; one latent reliability issue with default backend.

Done:
- Exam schema, prompt, renderer, answer key rendering.
- Gemini/Anthropic backend factory.
- SymPy math verifier for equations, inequalities, numeric checks, and proof passthrough.
- `/exam` UI and `/api/exam/generate`, `/api/exam/export`, `/api/exam/regenerate-question`.
- Curriculum grounding and grade/topic validation, including `אחר / פירוט חופשי`.
- Question type taxonomy: `חישובי`, `בעיה מילולית`, `הוכחה`, `קריאה וניתוח`, `מעורב`.
- Saved exam history, structured preview, one-question regeneration.
- DOCX export with RTL bidi post-processing.
- PDF export via the same `/api/exam/export` route; `/exam` exposes docx+pdf buttons for both exam and answer key, `/lesson-plan` already used the pdf format.
- MVP2 deterministic eval suite and Playwright smoke coverage.
- Real exam rubric extraction infrastructure and May 2026 rubric exported as JSON/Markdown/DOCX/PDF. This has immediate MVP2 value because it attaches to generated/real exams, but the reusable criterion-level rubric model is mainly groundwork for MVP6 supervised grading.
- `/rubrics` browser UI lists rubric artifacts from `data/exam-rubrics/`, previews rendered markdown, and offers DOCX/PDF download via the shared `/api/exam/export` route. Backed by `GET /api/rubrics` and `GET /api/rubrics/[id]`.
- Auto-rubric on every `/exam` generation. Default mode is deterministic (mechanical mapping with 70/30 criteria split); toggle exposes an AI mode that reuses the default backend chain to enrich criteria + common mistakes (identity fields and totals are reconciled against the deterministic base so model drift cannot break the schema); `none` mode skips. Generated rubrics persist to `data/exam-rubrics/<id>.json` and surface in `/rubrics` automatically, with the result panel deep-linking to `/rubrics?rubric=<id>`.
- `/exam` page exposes a "מודל AI" selector (parity with `/lesson-plan`): auto / Gemini 2.5 Flash / Gemini 3 Flash Preview / Gemini 2.5 Pro / Claude CLI / GPT-5.5 (Codex). `/api/exam/generate` accepts a `backend` body field and routes via `createBackendByName`.

Missing:
- Gemini 2.5 Flash exam JSON-escape fragility is a known reliability issue: the model emits raw LaTeX backslashes (`\frac`, `\sqrt`) inside JSON strings and the response fails to parse. Today's smoke saw this fail 3× in a row on the same prompt; Codex/GPT-5.5 succeeded first try. Workaround in place: teacher can pick the model. Real fixes pending: tolerant JSON parser, or default exam path to a more reliable backend.
- OCR ingestion for scanned/student work is deferred.

## MVP 3 — Question Bank / Bagrut Archive

Status: first slice complete; reusable catalog and `/exam` seed path are live.

Done:
- Provenance-first schema, migration, and TypeScript types for question-bank items/tags.
- License tiers are explicit: `ministry-public`, `teacher-original`, `open-license`, `public-domain`, `copyrighted-personal-use`, `student-submitted`, `unknown`.
- Insert validation rejects `unknown`; copyrighted-personal-use items require author, page number, and exercise number.
- Idempotent seed ingest CLI exists: `npm run db:ingest-question-bank`; script-level dry run is `npm run db:ingest-question-bank -- --dry`.
- Seed catalog has 20 items: 10 בני גורן complex-number exercises (`copyrighted-personal-use`, pages 16-17, exercise numbers kept) and 10 teacher-original May-2026 grade-8 exam items.
- `/question-bank` browse UI lists/filter items and shows prompt, answer, tags, and full provenance footer.
- `GET /api/question-bank` and `GET /api/question-bank/[id]` are live and tested.
- `/exam` has a "השתמש בבנק שאלות" toggle, grade-filtered picker, and `style-reference` / `verbatim` modes.
- Server-side exam seed resolution loads selected items, enforces grade/license gates, requires teacher acknowledgement before copyrighted-personal-use verbatim classroom use, and adds markdown attribution for verbatim items.

Missing:
- Real ministry-public Bagrut archive ingestion/parsing once a PDF/URL is provided.
- Topic-grade picker is basic; no advanced search, bulk actions, or preview-in-exam panel yet.
- Current verbatim mode is prompt-directed for generation; deterministic pre-placement of exact questions can be a later hardening slice.
- Copyrighted acknowledged-verbatim and style-reference outputs still need real-teacher quality review for classroom expectations and non-public distribution wording.

## MVP 4 — Curriculum Tracker / Class Progress

Status: in progress; first interactive loop is usable.

Done:
- Static curriculum JSON exists.
- Exam and lesson-plan prompts can already use grade/topic curriculum context.
- `/curriculum` UI tracks class progress in browser-local storage.
- Authenticated `/api/curriculum/classes` persists class progress to Postgres.
- Browser-local storage remains cache/fallback for unauthenticated use.
- Per topic: status, actual hours, last-taught date, and teacher notes.
- Lesson-plan page can apply the tracker's next-topic suggestion as editable defaults.
- Lesson-plan suggestions include a deterministic editable `בקשת המורה`, and switching to `ללא הקשר כיתה` clears stale previous-lesson context.
- Lesson-plan result view can save post-lesson status, hours taught now, date, and actual notes back into class progress.
- Exam page can fill editable question specs from taught/review material.
- Exam page warns when a selected topic is not yet taught for the selected class, without blocking teacher override.
- Generation APIs (`/api/lesson-plan/generate`, `/api/exam/generate`) accept `classId` + `classContextSource` (`auto` / `manual` / `none`); signed-in path loads the profile fresh from Postgres per request, signed-out path keeps the client-rendered snapshot as a fallback. UI selectors expose all three modes.
- Per-class continuity timeline derived from dated post-lesson notes + `lastTaughtDate`: 8-entry panel on `/curriculum` and a compact 4-entry strip on `/lesson-plan`.

Missing:
- Apply/test the DB migration against the active local Postgres instance before relying on signed-in persistence.
- Subtopic-level progress.

## MVP 5 — Grade Tracker

Status: not started.

Done:
- Existing grading-related TypeScript interfaces and memory notes from the spreadsheet.
- Rubric artifacts create useful future grading units.

Missing:
- Gradebook schema/UI.
- Import from existing grade spreadsheets.
- Exam/task score entry and weighting.
- Student-level progress reports and analytics.
- Connection between generated exams/rubrics and recorded scores.

## MVP 6 — AI Grading, Supervised

Status: not started.

Done:
- `IGradingProvider` interface exists.
- Rubric model now supports criterion-level grading units; the מחוון work belongs here as MVP6 grading infrastructure, even though it was useful earlier for MVP2 exam artifacts.
- OCR remains identified as a prerequisite for scanned work.

Missing:
- OCR provider decision and tested OCR pipeline.
- Grading provider decision.
- Supervised grading UI where teacher reviews every suggested mark.
- Student work upload, answer segmentation, rubric alignment, feedback drafts.
- Audit trail for teacher overrides.

## Current Cross-Cutting State

Known broken: nothing hard-broken. Gemini Flash exam JSON parsing is stochastically fragile; workaround via `/exam` model selector.

Recent verification (2026-05-17):
- MVP3 question-bank first slice and copyright-policy update: `npm run db:migrate`, `npm run db:ingest-question-bank -- --dry`, `npm run test:signoff`, and `npm run build` passed; `/exam` and `/question-bank` returned 200; `/api/question-bank?grade=חי` returned 10 teacher-original items; `/api/question-bank?grade=יבי` returned 10 copyrighted textbook items; cached Playwright/Chrome verified the copyrighted-verbatim acknowledgement warning, disabled/enabled generate state, and 0 console warnings/errors.
- Full signed-in Playwright MCP smoke (signin via dev-email → `/curriculum` → `/lesson-plan` → post-lesson update → `/exam` → `/rubrics`) green end-to-end against the new local Postgres. DB rows confirmed at each step.
- `npm run type-check`, `npm run test:lesson-plan` (74 tests), `npm run test:rubrics` (27 tests) passed after the two route-side fixes (lesson-plan grade persistence, /exam backend param).

Earlier verification:
- Real `/lesson-plan` generation smoke produced a worksheet with 3/3 SymPy-verified worksheet items.
- Real `/exam` generation smoke produced 2/2 verified items and deterministic rubric `rubric-20260516-194359-fd56d9`.
- `/api/artifacts` unauthenticated smoke returned `200 { authenticated:false, artifacts:[] }`.
- `npm run type-check` passed.
- `npm run test:lesson-plan` is the focused lesson-plan sign-off command.
- `npm run test:artifacts` passed: 5 tests (generated artifacts + question-bank store).
- `npm run test:progress` passed: 20 tests (progress + serverStore + classContextResolver).
- `npm run test:rubrics` passed: 27 tests (renderRubric + loadRubrics + buildRubricFromExam + saveRubric + aiRubricGenerator + /api/rubrics route).
- `npm run test:signoff` passed after auto-rubric: 67 lesson-plan, 20 progress, 27 rubric, MVP1 2/2, MVP2 4/4.
- `npm run build` passed.
- Playwright MCP smoke (unauthenticated, localStorage seeded): three classContextSource modes on `/lesson-plan` and `/exam` sent expected payloads; `/curriculum` and `/lesson-plan` continuity timelines rendered with correct sort/labels; `/api/exam/export` returned a real PDF (`%PDF` magic, 15KB); four exam download buttons rendered after generation. 0 console warnings/errors.

Immediate next decision:
- Open options now that the signed-in real-class loop and MVP3 first slice are live: real ministry-public Bagrut ingestion, MVP 2 exam reliability (Gemini JSON fragility), deterministic pre-placement for bank verbatim mode, MVP 4 subtopic-level progress, or wiring Google OAuth credentials and confirming the Google path post-JWT-switch.
