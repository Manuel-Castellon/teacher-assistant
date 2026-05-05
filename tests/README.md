# Tests

Near-100% coverage required on all deterministic (non-AI) code.

## What goes here
- Unit tests for grade calculation logic (`src/types/grading.ts` implementations)
- Unit tests for curriculum data parsing
- Unit tests for lesson plan phase duration validation
- Integration tests for provider interface implementations (with mocked external APIs)

## What does NOT go here
- LLM output quality tests → use `/evals/` instead
- End-to-end UI tests → add a separate `e2e/` directory when needed

## Run
```bash
npm test           # runs Jest with coverage
npm test -- --watch  # watch mode
```

## Coverage target
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%
(Exceptions require explicit `/* istanbul ignore */` with a comment explaining why.)
