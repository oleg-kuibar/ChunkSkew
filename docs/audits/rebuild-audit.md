# Rebuild Audit: Simpler Version-Skew Learning Path

This audit records the current implementation and UI/UX friction before deeper rebuild work. The goal is to make the project easier to understand, easier to test, and easier to reuse as simple robust examples.

## Current Strengths

- The core mitigation modules are already separated: release identity, version checks, policy, chunk classification, recovery, drafts, idempotency, mutation guards, telemetry, and audit.
- React Router and TanStack Router examples both exist.
- Payment, invoice, card, KYB, transaction, settings, debug, and audit flows exercise realistic failure pressure.
- The Playwright suite covers the most important safety behaviors.
- The docs now make the repo discoverable for build version skew search terms.

## Main Friction

### 1. The first screen taught finance, not version skew

The previous root page opened with account balances, pending approvals, and risk alerts. Those are useful fake-domain details, but they made the learner infer the real topic from debug controls and tests.

Change made in this pass:

- Replaced the root dashboard with a learning-first lab page.
- The first viewport now explains the four-step mental model: deploy, lazy route, missing chunk, safe recovery.
- Direct scenario links now point to payment recovery, missing chunk recovery, KYB draft recovery, and lab controls.
- Scenario links that require setup now open lab controls with the matching guided card highlighted from the start page and simple examples page.

### 2. Navigation labels mixed product app and teaching artifact

The previous sidebar used production-like labels such as Dashboard, Payments, Invoices, Cards, KYB, Transactions, Settings, Version skew.

Change made in this pass:

- Renamed the shell to `ChunkSkew Lab`.
- Renamed sidebar items to `Start here`, `Payment example`, `Invoice example`, `Card example`, `KYB example`, `Report example`, `Session and roles`, `Audit log`, and `Lab controls`.

### 3. Conceptual complexity is higher than code complexity

The main UI components are not algorithmically complex, but the project asks the reader to hold too many concepts at once:

- fintech domain data
- two routers
- release state
- skew modes
- draft storage
- mutation idempotency
- telemetry and audit
- service worker caveats
- backend API compatibility

The rebuild should progressively disclose these concepts. The first screen should teach only the small model, then examples should reveal deeper details.

### 4. Debug controls are powerful but dense

`VersionSkewDebugPage` combines mode switching, release state, draft seeding, telemetry clearing, full reset, preload table, and audit table. This is useful for tests, but cognitively dense.

Change made in the next pass:

- Added a guided scenario runner above the manual controls.
- Added one-click preparation for payment recovery, missing chunk fallback, KYB draft review, and API contract blocking.
- Moved manual mode controls, release state, preload status, telemetry, and audit trail into a collapsible advanced diagnostics section.
- Moved the release debug panel into a desktop right rail so it stays visible without covering reset or guided scenario controls.
- Centralized debug/router/scenario URL generation in `src/shared/routerLinks.ts` so start-page, examples-page, guided-banner, and reset links cannot drift.

Remaining rebuild target:

- Add richer per-step completion states if the current lightweight guided scenario banner is not enough.
- Keep the current diagnostics table for verification, but keep it opt-in behind the guided scenario path.

### 5. Examples need a "minimal path" variant

The realistic fintech examples are valuable, but they are not always minimal. A new learner should also have tiny canonical examples:

- one release-state check
- one missing chunk recovery
- one draft restore
- one idempotent mutation
- one required-update gate

Change made in this pass:

- Added a dedicated `/examples` route with tiny cards for release identity, chunk recovery, safe refresh, idempotent mutation, required update gates, and asset strategy.
- Kept each card linked to the realistic fintech/debug workflow that proves the same rule under pressure.
- Cards that need skew setup now prepare the matching guided scenario instead of jumping directly into an unprepared workflow.
- Each card now names the implementation file to study after the minimal rule.
- Each card now shows a tiny TypeScript-shaped check before linking to the broader implementation.

Future rebuild target:

- Add `src/examples/simple-*` modules only if the implementation anchors still feel too broad for readers who want copy/paste code snippets.

## Target Information Architecture

1. Start here: mental model and scenario cards.
2. Try one scenario: payment safe refresh as the primary walkthrough.
3. Inspect the pattern: release identity, policy, chunk recovery, autosave, idempotency.
4. Compare routers: use the topbar router switch to replay the same path in React Router or TanStack Router mode.
5. Run diagnostics: skew modes, preload table, telemetry, audit.
6. Read production rollout: checklist and tradeoffs.

## Done Criteria For The Full Rebuild

- A new reader can explain build version skew from the first screen.
- A new reader can run one scenario without reading source code first.
- Each pattern has a minimal example and a realistic fintech example.
- Debug controls are separated from primary learning flow.
- The docs, UI labels, and tests use the same vocabulary.
- E2E tests still prove the safety guarantees.
