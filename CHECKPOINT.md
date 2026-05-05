# CHECKPOINT.md — In-flight state (overwrite freely)

> Live cursor for the current task. PROGRESS.md is the milestone log; this file is "where I am RIGHT NOW".

## Current task
MVP 0 setup — pre-implementation gates: git init + version verification.

## Last action that succeeded
- `git init -b main` in `project-scaffold/`
- Staged scaffold files (CLAUDE.md, AGENTS.md, MEMORY.md, PROGRESS.md, CHECKPOINT.md, package.json, tsconfig.json, .env.example, .gitignore). Untracked dirs with content: data/, evals/, src/, tests/.
- Web-verified versions (2026-05-05).

## Version verification (2026-05-05, corrected after user pushback)
- Node.js **24.x** Active LTS, supported through Apr 2028. ✅
- TypeScript **6.0.3** is current stable (npm `latest` dist-tag). 6.0 shipped Mar 23, 2026. CLAUDE.md/MEMORY.md correct as written. Note: TS 7.0 (Go-native) is close to release; 6.0 is the last JS-based version and carries deprecations that become hard removals in 7.0 — plan a migration in 3–6 months.
- React **19.2.5** stable (Apr 8, 2026). ✅
- PostgreSQL **18.3** current (Feb 26, 2026); 19 due Sep 2026. ✅
- Next.js **16.2** stable (Mar 2026), on React 19.2. CLAUDE.md "verify" line resolved.

## What I was about to do next
1. Add resolved Next.js 16.x version to CLAUDE.md Versions table (replaces "verify").
2. Note the TS 7 migration window in CLAUDE.md (or skip if user prefers).
3. Initial git commit of scaffold.
4. Begin MVP 0 implementation: Next.js install, RTL layout, etc.

## Open question / waiting on user
- OK to record Next.js 16.x in CLAUDE.md Versions table and proceed to initial commit?
- Want a note in CLAUDE.md flagging the TS 6 → 7 migration window (3–6 months out)?

## Correction log (this session)
- I initially reported TS 5.9 as current stable. That was wrong — npm registry shows `latest: 6.0.3`. User pushed back; I verified via `npm view typescript dist-tags`. CLAUDE.md and MEMORY.md were correct as written; do not change them.

## Files touched this session
- `CHECKPOINT.md` (this file)
- `.git/` (initialized)
