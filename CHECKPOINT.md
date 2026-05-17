# CHECKPOINT.md — Ready for next slice

## Current State
MVP 3 question-bank first slice is complete and folded into `PROGRESS.md` / `MVP_STATUS.md`.

Completed in this slice:
- Provenance/license schema + migration.
- Seed JSON format + ingest CLI.
- 10 בני גורן complex-number items with copyrighted-personal-use provenance.
- 10 teacher-original May-2026 grade-8 exam items.
- Idempotent DB ingest: current local DB has 20 catalog rows.
- `/question-bank` browse UI + list/detail APIs.
- `/exam` seed-from-bank UI and server path with `style-reference` / `verbatim` modes.
- License gate: copyrighted-personal-use items require explicit teacher acknowledgement before verbatim closed classroom/exam use; verbatim items get exam markdown attribution.
- License tiers now also include `open-license` and `public-domain` for explicitly reusable sources.
- Tests and signoff updated.

User constraint preserved:
> "make sure that in metadata you extract you save credit, topics, page numbers, etc. everything to later protect us in terms of trademark if needed."

## Verification
- `npm run db:ingest-question-bank -- --dry` passed: 20 items across 2 seed files.
- `npm run db:migrate` passed after adding `open-license` and `public-domain` tiers.
- `npm run test:signoff` passed:
  - 74 lesson-plan tests
  - 21 progress tests
  - 27 rubric tests
  - 26 artifact/question-bank tests
  - MVP1 evals 2/2
  - MVP2 evals 4/4
- `npm run build` passed.
- Local smoke:
  - `GET /exam` -> 200
  - `GET /question-bank` -> 200
  - `GET /api/question-bank?grade=חי` -> 10 items
  - Cached Playwright/Chrome smoke verified `/exam` bank picker loads copyrighted textbook items, switches to verbatim mode, shows the acknowledgement warning, disables generation before acknowledgement, enables it after acknowledgement, and logs 0 console warnings/errors.

## Environment
- Dev server is running on `http://localhost:3000`.
- Docker `math-teacher-pg` is still expected to be running on port 5432.
- `.env.local` has `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `WOLFRAM_APP_ID`; Google OAuth creds are still blank.
- `dev-email` auth is passwordless and dev-only (`NODE_ENV !== 'production'`); do not expose it publicly.

## Next Options
- MVP3: ingest a real ministry-public/open-license/public-domain source once a PDF/URL/license is provided.
- MVP3 hardening: deterministic pre-placement for allowed verbatim bank questions instead of relying on prompt instruction.
- MVP2 reliability: fix Gemini JSON parse fragility with LaTeX backslashes or change default exam backend.
- MVP4: subtopic-level progress.
- Auth: wire real Google OAuth creds and confirm the Google path after the JWT-session switch.

## Planned Next Slice — Question-Bank Teacher-Facing Titles
Do not implement this until the next session. The current question-bank picker uses `sourceTitle`, which is good provenance but a bad teacher-facing title because many rows only say the book/exam name.

Backend plan:
- Add compact pedagogical metadata to question-bank items, separate from provenance:
  - `displayTitle`: short instructional title, e.g. "משוואה ריבועית עם פתרונות מרוכבים".
  - `shortPrompt`: one-line safe preview/truncated prompt.
  - `concepts`: small tag list for math concepts.
  - `skills`: small tag list for required actions.
  - `estimatedMinutes?`: optional compact planning hint.
  - `examFit?`: optional `starter | standard | challenge | bonus`.
- Keep `sourceTitle`, author, publisher, page, exercise, license, etc. as provenance/audit metadata, not as the primary row title.
- Support seed JSON overrides for these fields; derive reasonable defaults during ingest for existing seed items from prompt/tags/difficulty/provenance.
- Add API response fields to both list and detail routes. Do not require clients to parse the full prompt just to render a useful picker row.

UX plan:
- Keep the UI compact and intuitive. Avoid large verbose cards in `/exam` or lesson-plan flows.
- In `/question-bank`, show a concise row/card:
  - primary: `displayTitle`
  - secondary: grade/topic/difficulty/estimated minutes
  - chips: 2-3 concepts/skills max
  - muted source line: book/exam + page/exercise
  - full prompt/answer/provenance only in the detail panel after selection.
- In `/exam`, replace the current book-name checkbox list with a compact searchable picker:
  - row title: `displayTitle`
  - one-line preview: `shortPrompt`
  - badges: difficulty, source/license, estimated minutes
  - selected items shown as small chips/cards above the generator.
  - copyright acknowledgement remains visible only when relevant, not repeated on every row.
- For lesson-plan integration later, reuse the same picker but with intent labels like "דוגמה בכיתה", "דף עבודה", "שאלת אתגר", or "השראה בלבד".

Smoke-test expectations for next slice:
- Desktop and mobile `/exam` picker should fit without tall verbose cards.
- Long titles/previews must truncate or wrap cleanly without layout overlap.
- `/question-bank` remains usable: list rows scan quickly, detail view carries the full content.
- Playwright smoke should confirm picker search/filter, item selection, compact row rendering, and no console warnings/errors.
