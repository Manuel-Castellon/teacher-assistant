# AGENTS.md — Math Teacher AI Assistant

## Hard Stop Conditions (REFUSE, do not proceed)

1. **PROGRESS.md unread**: Cannot write feature code without reading PROGRESS.md first and stating current state.

2. **MVP prerequisites unmet**: Cannot start MVP N without:
   - MVP N-1 test suite passing
   - MVP N-1 eval scores recorded in PROGRESS.md
   - All blockers listed for MVP N in PROGRESS.md cleared

3. **Unverified math exercise**: Cannot surface any generated math exercise to the teacher
   without Wolfram/SymPy verification returning `isValid: true`. Non-optional.

4. **Missing provider interface**: Cannot write any code that calls an external API
   without that API's TypeScript interface defined in `src/providers/interfaces/` first.

5. **Curriculum JSON missing for MVP 1**: MVP 1 (lesson plan generator) cannot start
   until `data/curriculum/` contains parsed JSON from the Ministry PDFs.

6. **OCR untested for MVP 2**: MVP 2 cannot start until the OCR stack has been tested
   on real Hebrew math exam scans and a provider has been chosen (ask user).

7. **Math eval framework missing for MVP 2**: MVP 2 cannot start until the eval
   framework for exercise quality is defined in `evals/mvp2/`.

8. **Version unchecked**: Cannot start a new MVP without re-verifying Node/TS/React/
   PostgreSQL/Next.js versions against current LTS. State the versions you verified.

9. **Service decision skipped**: Cannot implement any external service integration
   without presenting the user with the options from CLAUDE.md and waiting for a choice.

---

## Agent Roles

### Generator Agent
- Responsible for: lesson plan generation, exercise drafting, exam drafting
- Uses: Claude API via `ITextGenerator` interface
- Output: DRAFT only — never shown to teacher until Verifier confirms (for math exercises)
- Context injected: curriculum JSON, teacher's lesson plan examples, grade level

### Verifier Agent
- Responsible for: math correctness verification of all generated exercises
- Uses: `IMathVerifier` interface (provider decided at MVP 2)
- Input: Exercise draft from Generator Agent
- Output: `VerificationResult` — only exercises where `isValid: true` proceed
- Operates as a separate agent call, not inline with generation

### OCR Agent (MVP 2+)
- Responsible for: extracting text and math notation from scanned exam images
- Uses: `IOCRProvider` interface (provider decided at MVP 0 after testing)
- Hebrew + math notation must both be handled; test separately

### Grading Agent (MVP 6)
- Responsible for: AI-assisted exam grading — SUPERVISED, teacher reviews every mark
- Uses: `IGradingProvider` interface (provider decided at MVP 6)
- No grade is written to the system without teacher confirmation

---

## Eval Framework Contract
- Every MVP that produces AI output ships with an eval suite in `/evals/mvpN/`
- Eval criteria (rubric) must be defined and agreed with user BEFORE implementation starts
- Evals run via `npm run test:evals`
- Minimum passing threshold is defined per MVP in `/evals/mvpN/README.md`
- Scores are recorded in PROGRESS.md before the MVP is marked complete
- Do NOT use Jest unit tests to assert LLM output quality — use evals

---

## Lesson Plan Generator — Style Contract (MVP 1)
Derived from 5 real מערכי שיעור examples. See `data/lesson-plans/examples/`.

Key invariants the generator MUST respect:
- Opening exercise runs during teacher admin time (attendance, board setup) — students work independently
- Last ≥15 min of any lesson (≥30 min for 90-min review lessons) = independent work
- Interactive erasable whiteboards (לוחות מחיקים) are a valid practice mode — include when appropriate
- Homework may be withheld if the class meets again later that week
- Bagrut review lessons: topic is chosen by student poll; exercises sourced from past Bagrut exams
- `teacherNotes` (הערות לקלוד) are explicit instructions that OVERRIDE defaults — always honor them
- `postLessonNotes` are filled AFTER the lesson and feed into continuity context for the next plan
