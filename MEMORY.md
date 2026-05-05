# MEMORY.md — Math Teacher AI Assistant

## Teacher Profile
- Israeli high school math teacher + university math professor
- Works primarily in Hebrew; all output must be Hebrew-first
- Moderate technical comfort — no CLI, no install steps, no LaTeX editing
- High school tools: Google Classroom, Google Drive/Sheets, Word, Mashov, WhatsApp
- University tools: Moodle, Overleaf/LaTeX, Zoom, Panopto
- Pain points (priority order): מערכי שיעור > exercises/exams > curriculum tracking > grade tracking > AI grading

## Lesson Plan Style (confirmed from 5 real examples)
- Opening: short exercise during admin time (attendance, board setup) — students work independently
- Practice modes: board (shared), interactive erasable whiteboards (לוחות מחיקים), independent
- Independent work: last ≥15 min always (≥30 min for 90-min review lessons)
- Homework: sometimes withheld if class meets again later that week
- Bagrut review: 1–2 problems on board, then self-study; topic chosen by student poll
- Bagrut sources: יואל גבע and בני גורן websites
- Post-lesson notes: teacher records what actually happened vs. planned — use for next lesson continuity

## Grading Logic (from מעקב ציונים 2025-2026.xlsx)
- Annual grade = 70% × best 3 of 4 exams
- מתכונות (matkona) = 30% of final grade
- Bonus tasks: up to 5 × 10 pts each, supplements any exam grade
- Absence deduction (הורדה מהעדרות): applied above threshold
- מועד מיוחד: special sitting that replaces a failed exam
- Sub-question granularity: 1א, 1ב, 1ג, 1ד — enables per-topic mastery tracking

## Israeli Tools Evaluated (2026-04-29)
- **Morai**: Dead end. Generic prompt relay, not math-specific, imposes wrong lesson structure.
- **SkillCet**: Inaccessible — no access even with Ministry of Education credentials.
- **StudyWise**: Partial value only. Cannot generate graphs, poor Hebrew quality, limited file upload formats. May be useful for simple algebraic topics. Revisit before next exam cycle.
- **MagicSchool**: Does not recognize Israel as a location.
- **Ministry approved list**: Mostly ChatGPT + interactive content tools. Nothing relevant.
- **Conclusion**: No existing tool does what we are building. Build is confirmed.

## Confirmed Wrong — Do Not Repeat
- AWS Textract does NOT support Hebrew. Use MathPix (math) + TBD provider (Hebrew prose).
- Node 22 is NOT current LTS. Node 24 is Active LTS (since Oct 2025).
- TypeScript 5.x is NOT current. TypeScript 6.0 released March 23, 2026.
- PostgreSQL 17 is NOT current. PostgreSQL 18 is current major.

## Curriculum
- תשפ"ו (2025–2026) is the current curriculum — always the primary source
- Middle school: "פריסת הוראה" — published every summer; includes topic list + hour allocation
- Hour allocation is indicative; actual pace varies by teacher and school

## Open Decisions (must ask user before implementing)
1. OCR provider — test first, then ask
2. Math verifier — ask at MVP 2 start
3. Grading infrastructure — ask at MVP 6 start
4. AI generation — Claude API default, interface allows swap
5. Geometry validation — ask at MVP 2, when live
6. **Auth provider — revisit before any auth code.** PROGRESS.md says "Cognito + Google OAuth" but Cognito's default = separate user per IdP, which produces the "signed up with email, locked out of OAuth" failure the teacher explicitly dislikes (mirrors the vaulty project pain). Auth.js with `allowDangerousEmailAccountLinking` for verified providers links automatically; Clerk / WorkOS handle it as managed services. Cognito should only stay if we're prepared to ship a Lambda trigger for `AdminLinkProviderForUser`.
