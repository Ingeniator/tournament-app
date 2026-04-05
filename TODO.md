# Code Review — Weak Points

## Critical / High Severity

- [ ] **Known dependency vulnerabilities** — minimatch (ReDoS), flatted (DoS), ajv (ReDoS), brace-expansion (DoS)
  - Fix: `npm audit fix`
  - Comment: 

- [ ] **Firebase race conditions** — multi-step reads then writes without transactions (player claim, partner update, cross-device sync)
  - Files: `planner/src/hooks/usePlayers.ts`, `useTelegramSync.ts`
  - Fix: Use Firebase transactions for all multi-step writes
  - Comment: 

- [ ] **Makefile release pushes even if e2e tests fail** — exit code not checked before `git push`
  - File: `Makefile:73-85`
  - Fix: Add `set -e` or explicit exit code check
  - Comment: 

- [ ] **`execSync('git rev-parse')` in vite configs** — no try/catch, crashes build if git unavailable
  - Files: All 3 `vite.config.ts`
  - Fix: Wrap in try/catch with `'dev'` fallback
  - Comment: 

- [ ] **Auth tokens in plaintext localStorage** — vulnerable to XSS
  - File: `common/src/hooks/useSupporters.ts:55`
  - Fix: Move to sessionStorage or secure HTTP-only cookies
  - Comment: 

- [ ] **Firebase rules allow Telegram username reuse** — old username holder can modify another user's tournaments
  - File: `planner/database.rules.json`
  - Fix: Enforce unique telegram usernames or use Telegram ID
  - Comment: 

## Medium Severity — State & Data

- [ ] **Listener leaks in useEventTournaments** — listeners not properly cleaned when links array changes
  - File: `planner/src/hooks/useEventTournaments.ts:65-186`
  - Comment: 

- [ ] **`Promise.all` fails entirely on single error** — should use `Promise.allSettled` for partial results
  - Files: `useMyTournaments.ts`, `useRegisteredTournaments.ts`, `useMyEvents.ts`
  - Comment: 

- [ ] **No retry logic for failed Firebase listeners** — transient network error kills listener permanently
  - File: `planner/src/hooks/usePlayers.ts:17-39`
  - Comment: 

- [ ] **Stale closure in TournamentContext Firebase sync** — effect depends on partial tournament fields but reads full object
  - File: `runner/src/state/TournamentContext.tsx:28-50`
  - Comment: 

- [ ] **Blob URLs not cleaned up on mobile** — `URL.createObjectURL` without `revokeObjectURL`
  - File: `runner/src/utils/standingsImage.ts:72-74`
  - Comment: 

- [ ] **Player deletion doesn't clear partner's `partnerName`** — orphaned reference
  - File: `planner/src/hooks/usePlayers.ts:101-116`
  - Comment: 

- [ ] **Duplicate tournament creation on rapid clicks** — no debounce/pending flag
  - File: `planner/src/state/TournamentContext.tsx:112-118`
  - Comment: 

## Medium Severity — Performance

- [ ] **Cascading re-renders from unstable Firebase object identity** — `clubs`, `rankLabels` get new refs on every update
  - File: `planner/src/screens/OrganizerScreen.tsx:51-56`
  - Fix: Stabilize with JSON key selectors or deep compare
  - Comment: 

- [ ] **No pagination for tournaments list** — all fetched/rendered at once
  - File: `planner/src/hooks/useMyTournaments.ts`
  - Comment: 

- [ ] **Uncleaned `setTimeout` in ScoreInput** — fires on unmounted component
  - File: `runner/src/components/rounds/ScoreInput.tsx:69-95`
  - Comment: 

## Medium Severity — Build & CI

- [ ] **CI smoke tests have no timeout** — can hang the entire job
  - File: `.github/workflows/deploy.yml:36`
  - Fix: Add `timeout-minutes`
  - Comment: 

- [ ] **Env vars not validated at startup** — `VITE_FIREBASE_*` silently undefined
  - File: `common/src/hooks/useSupporters.ts:6-7`
  - Comment: 

- [ ] **Inconsistent tsconfig exclude rules** — planner excludes test files, runner/landing don't
  - Files: `tsconfig.app.json` across packages
  - Comment: 

## Accessibility

- [ ] **Modal missing `role="dialog"`, `aria-modal`, Escape key handling**
  - File: `common/src/components/Modal.tsx:14-15`
  - Comment: 

- [ ] **Toast missing `aria-live="polite"`** — screen readers won't announce
  - File: `common/src/components/Toast.tsx`
  - Comment: 

- [ ] **Hidden share cards still keyboard-focusable** — `aria-hidden` but interactive
  - File: `runner/src/screens/PlayScreen.tsx:274`
  - Comment: 
