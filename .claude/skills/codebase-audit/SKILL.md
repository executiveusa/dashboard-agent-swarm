---
name: codebase-audit
description: Scan the dashboard-agent-swarm codebase for stubs, TODOs, hardcoded values, broken routes, and unimplemented features. Produces a prioritized fix list. Run this after any major feature branch merge to keep technical debt visible.
disable-model-invocation: true
---

# Codebase Audit — Dashboard Agent Swarm

## What This Skill Does

Launches three parallel sub-agents to audit the codebase from different angles, then produces a prioritized fix list with file:line references.

## Pre-flight

Verify you are in the dashboard-agent-swarm directory or the archonx-os-main root:
```bash
ls src/pages/ && echo "✓ in dashboard-agent-swarm" || ls dashboard-agent-swarm/src/pages/ && echo "✓ in root"
```

---

## Phase 1: Parallel Research (3 sub-agents)

Launch **all three simultaneously** using the Task tool.

### Sub-agent 1: Stub & TODO Hunter

> Scan every file in `src/` and `server/` for the following patterns. Return a table with: file path, line number, pattern type, and the exact code snippet.
>
> Patterns to find:
> 1. `// TODO` `// FIXME` `// HACK` `// XXX` comments
> 2. `setTimeout` used as a fake async operation (not for UI animation)
> 3. Hardcoded strings that should come from env: API keys, URLs, org IDs, model names
> 4. `console.log` statements that should be proper logging
> 5. `disabled` props on buttons with no issue tracker reference
> 6. Empty state placeholders with no data fetching wired up
> 7. `Promise.resolve(hardcodedData)` — mock service functions
> 8. `// Mock` or `// Stub` or `// placeholder` comments
> 9. Route handlers that always return the same static response
> 10. `any` TypeScript type where a proper type should exist
>
> Sort results by severity: CRITICAL (broken functionality) > HIGH (missing feature) > MEDIUM (tech debt) > LOW (cosmetic).

### Sub-agent 2: Dead Code & Unused Imports

> Scan every file in `src/` for:
> 1. Imported packages that are never used (`@tanstack/react-query` is installed — find any `useQuery`/`useMutation` calls; if none exist, flag the package as unused)
> 2. React components defined but never imported anywhere
> 3. TypeScript types/interfaces defined but never referenced
> 4. Functions defined in services/ that are never called
> 5. Routes registered in `src/App.tsx` that have no corresponding nav item in `AppSidebar.tsx`
> 6. Nav items in `AppSidebar.tsx` that have no route in `App.tsx`
> 7. Server routes mounted in `server/index.ts` that have no corresponding client fetch in `src/`
>
> Return a deduplicated list with file paths.

### Sub-agent 3: Broken Wiring & Runtime Risks

> Analyze the codebase for runtime issues:
> 1. Fetch calls to hardcoded ports/URLs that will fail in production (e.g., `http://localhost:50001`)
> 2. Missing error boundaries around pages that do network calls
> 3. `useEffect` with missing or incorrect dependency arrays
> 4. State that is fetched but never displayed
> 5. Forms with `onSubmit` that do nothing or just call `preventDefault`
> 6. Proxy targets in `vite.config.ts` that point to services not documented anywhere
> 7. Environment variables read in server code with no `.env.example` entry
> 8. Missing TypeScript return types on exported functions
>
> Return a prioritized list with file paths and line numbers.

**Wait for all three sub-agents to complete before proceeding.**

---

## Phase 2: Build Fix List

Merge findings from all three sub-agents. Deduplicate. Sort by:

1. **CRITICAL** — broken functionality (server returns mock, button is disabled with no path forward)
2. **HIGH** — missing live data (hardcoded status, unused React Query)
3. **MEDIUM** — tech debt (console.log, `any` types, missing error handling)
4. **LOW** — cosmetic or minor (unused imports, missing return types)

Create a TodoWrite list with one item per CRITICAL and HIGH finding.

---

## Phase 3: Auto-Fix Pass

For each CRITICAL item:
1. Read the file
2. Implement the fix (wire up real data, remove hardcoded values)
3. Verify TypeScript compiles: `npx tsc --noEmit`
4. Mark the todo as completed

For HIGH items — implement fixes where straightforward (< 20 lines), flag the rest for manual review.

Skip MEDIUM and LOW items in the auto-fix pass — document them in the output report instead.

---

## Phase 4: Report

Output a structured report:

```
## Codebase Audit — <date>

### Summary
- Files scanned: [N]
- Issues found: [N] (CRITICAL: N, HIGH: N, MEDIUM: N, LOW: N)
- Issues auto-fixed: [N]
- Issues requiring manual attention: [N]

### CRITICAL Issues Fixed
- [file:line] — description — fix applied

### HIGH Issues (Fixed)
- [file:line] — description — fix applied

### Remaining Issues (Manual Review Required)
- MEDIUM: [file:line] — description
- LOW: [file:line] — description

### Unused Dependencies
- [package] — not referenced in any source file
```

---

## Known Stubs (as of 2026-02-26)

These were identified in the last audit and are being tracked:

| File | Line | Issue | Severity | Status |
|---|---|---|---|---|
| `server/routes/whatsapp.ts` | ~20 | TODO: orgId from phone number | HIGH | open |
| `server/routes/whatsapp.ts` | ~24 | Hardcoded Spanish response, never sends | CRITICAL | open |
| `server/routes/lemonStub.ts` | ~8 | Entire route is a stub, always returns mock | HIGH | open |
| `server/routes/darya.ts` | ~180 | Feedback not persisted to DB | MEDIUM | open |
| `src/pages/CommandInput.tsx` | ~45 | setTimeout mock instead of real job queue | HIGH | open |
| `src/pages/Files.tsx` | all | No data fetching, all empty states, Upload disabled | HIGH | open |
| `server/routes/devika.ts` | ~8 | Phase gates in-memory only (reset on restart) | HIGH | open |
| `src/pages/Content.tsx` | ~30 | Hardcoded `orgId: "default-org"` | MEDIUM | open |
| `src/pages/Analytics.tsx` | ~5 | Stats from mockMetrics.ts (hardcoded numbers) | MEDIUM | open |
