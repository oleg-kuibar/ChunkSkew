# Rebuild Audit: Simpler Version-Skew Learning Path

This audit records the current implementation and UI/UX friction before deeper rebuild work. The goal is to make the project easier to understand, easier to test, and easier to reuse as simple robust examples.

## Current Strengths

- The core mitigation modules are already separated: release identity, version checks, policy, chunk classification, recovery, drafts, idempotency, mutation guards, telemetry, and audit.
- React Router and TanStack Router examples both exist.
- Payment, invoice, card, KYB, transaction, settings, debug, and audit flows exercise realistic failure pressure.
- The Playwright suite covers the most important safety behaviors.
- The docs now make the repo discoverable for build version skew search terms.

## UI Evidence

Desktop screenshots for the learning path and recovery states are saved in `docs/audits/ui-evidence/`; notes are in `docs/audits/ui-evidence/notes.md`.

Captured steps:

1. Start page: clear mental model and scenario entry points.
2. Simple examples: ordered minimal patterns with proof and source anchors.
3. Guided lab controls: reset, lab mode, and starting step are visible before setup.
4. Payment required update: saved work, build identity, and safe refresh are explicit.
5. KYB incompatible draft: review-required fallback is calm and prevents unsafe submit.

Observed UX risk fixed in the follow-up pass: the update toast now offsets away from the right-side release debug panel on desktop, with a focused Playwright regression.

## Measured Cognitive Snapshot

Measured from the codebase graph after the latest fast index.

| Area | Symbol | Cognitive score | Reading signal |
| --- | --- | ---: | --- |
| Guided lab | `VersionSkewDebugPage` | 0 | The page now renders controls while named helpers own scenario preparation. |
| Guided lab | `prepareGuidedScenario` / `finishGuidedScenario` | 0 / 1 | Reset, mode setup, seeding, and navigation are named as the learner sees them. |
| Payment | `PaymentWorkflow` / `usePaymentDraft` | 3 / 1 | The primary walkthrough keeps rendering local while submit/vendor guard envelopes are named helpers. |
| Invoice approval | `InvoiceApprovalModal` | 2 | Reject-note autosave and approve/reject guard rules are named; optimistic rollback remains local. |
| KYB | `KybWorkflow` / `useKybDraft` | 2 / 0 | The workflow renders steps while restore, hydrate, save-if-ready, and schema fallback rules are named helpers. |
| Card controls | `CardDetailRoute.Component` / `useCardLimitDraft` | 3 / 1 | The route still renders the card UI, while draft and action guard rules are named helpers. |
| Transaction monitoring | `TransactionsPage` / `TransactionReportRoute.Component` | 0 / 0 | The list, lazy drawer, and heavy report are already simple enough as supporting examples. |
| Settings | `SettingsPage` | 2 | Role switching, session expiry, and API key generation are compact but still guarded by shared mutation safety. |
| Release UI | `BuildVersionStamp` | 0 | Bundle, session, and latest release labels are now explicit without extra branching. |
| Mutation safety | `guardSensitiveMutation` / `handleBlockedMutationGuard` | 3 / 2 | Session, permission, update policy, and blocked-result packaging now read as named decisions. |

## Main Friction

### 1. The first screen taught finance, not version skew

The previous root page opened with account balances, pending approvals, and risk alerts. Those are useful fake-domain details, but they made the learner infer the real topic from debug controls and tests.

Change made in this pass:

- Replaced the root dashboard with a learning-first lab page.
- The first viewport now explains the four-step mental model: deploy, lazy route, missing chunk, safe recovery.
- Tightened the mental-model grid so all four checkpoints stay visible in the first desktop viewport with the release debug rail open.
- The primary actions now link to the ordered simple examples before the denser lab controls and payment recovery path.
- Direct scenario links now point to payment recovery, missing chunk recovery, KYB draft recovery, and lab controls.
- Scenario links that require setup now open lab controls with the matching guided card highlighted from the start page and simple examples page.

### 2. Navigation labels mixed product app and teaching artifact

The previous sidebar used production-like labels such as Dashboard, Payments, Invoices, Cards, KYB, Transactions, Settings, Version skew.

Change made in this pass:

- Renamed the shell to `ChunkSkew Lab`.
- Renamed sidebar items to `Start here`, `Payment example`, `Invoice example`, `Card example`, `KYB example`, `Report example`, `Session and roles`, `Audit log`, and `Lab controls`.
- Renamed the Lab controls page heading and start-page control card to `Lab controls` so navigation, cards, docs, and tests use the same label.
- Updated the retest docs to describe the Lab controls page and guided `Return to example` path instead of old manual route reconstruction.

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

Change made in this pass:

- Extracted KYB server snapshot-to-draft shaping into a named helper so the workflow effect reads as a recovery rule instead of a data-mapping block.
- Reused one Card controls draft shape for autosave and submit, and gated autosave until the current card draft or matching server snapshot is applied.
- Extracted the Card controls draft lifecycle into `useCardLimitDraft` so the route reads as fetch, restore/autosave, guard, render.
- Reworked the Card controls autosave hook around one draft state so restore, server hydration, save gating, and save payload are separate named rules.
- Named the Card controls action guard and action runner so saving limits and freeze/unfreeze follow the same readable guard-then-mutate shape as payments.
- Extracted the Payment draft lifecycle into `usePaymentDraft` and named repeated guard-result handling so the workflow body reads closer to the user journey.
- Named the Payment submit/vendor mutation guard envelopes so the primary safe-refresh walkthrough reads as audit/MFA check, update gate check, then mutate.
- Named the Invoice approval reject-draft save and approve/reject guard rules so the lazy modal reads as autosave, optimistic mutation, guard, render.
- Extracted the KYB draft lifecycle into `useKybDraft` so migration, incompatible schema, server snapshot hydration, and autosave are easier to study together.
- Split KYB hydrate and save-if-ready rules out of `useKybDraft` so the schema migration example now reads as a flat restore/save/hydrate/update loop.
- Centralized required-update-vs-blocked-dialog handling in `handleBlockedMutationGuard` so sensitive workflows share one guard-result shape.
- Tightened version-state subscriptions so build version stamps react to version-state changes after the current render, not to unrelated autosave/idempotency storage writes.
- Made every build stamp show `Bundle / Session / Latest` explicitly, and only mark the badge fully current when all three identities match.
- Split sensitive mutation guard outcomes into named session, permission, update policy, and required-update result helpers so the shared safety path reads like the production checklist.
- Expanded the cognitive snapshot to include invoice approval, transaction monitoring, and settings so the audit covers the supporting examples, not only the primary walkthrough.

### 4. Debug controls are powerful but dense

`VersionSkewDebugPage` combines mode switching, release state, draft seeding, telemetry clearing, full reset, preload table, and audit table. This is useful for tests, but cognitively dense.

Change made in the next pass:

- Added a guided scenario runner above the manual controls.
- Added one-click preparation for payment recovery, missing chunk fallback, KYB draft review, and API contract blocking.
- Moved live skew-mode writes to ignored runtime state so retests no longer leave tracked `server/skew-state.json` diffs.
- Aligned CLI skew scripts and lab controls so they assign the same update severity for each mode.
- Added a focused script test so CLI skew-mode rules stay aligned without touching tracked seed state.
- Added lightweight setup progress in the guided banner so the active step matches the route opened by each scenario.
- Exposed each guided scenario's lab mode and starting step on the card so setup is visible before clicking without raw route text in the primary path.
- Clarified in the guided runner that scenario cards start from a clean reset.
- Changed guided scenario cards to reset browser and backend simulation state automatically before applying their scenario mode.
- Added `Reset included` to each guided scenario card so the setup contract is visible at the click target.
- Named the scenario lifecycle as `prepareGuidedScenario` and `finishGuidedScenario` so the Lab controls page no longer hides reset/setup/navigation inside one inline mutation block.
- Renamed release summary labels from ambiguous `current release` wording to `loaded bundle`, `session release`, and `latest release`.
- Moved manual mode controls, release state, preload status, telemetry, and audit trail into a collapsible advanced diagnostics section.
- Moved the manual `Check version` action into advanced diagnostics so the primary lab page keeps only scenario setup and full reset visible.
- Moved the release debug panel into a desktop right rail so it stays visible without covering reset or guided scenario controls.
- Widened guided scenario card tracks so the debug right rail no longer squeezes route labels and primary setup buttons.
- Removed pre-click step lists from scenario cards so setup actions stay visible; the active guided banner still shows step progress after a scenario starts.
- Added current-step status and a `Return to example` action to the guided scenario banner so users can visit lab controls and get back to the prepared workflow.
- Centralized debug/router/scenario URL generation in `src/shared/routerLinks.ts` so start-page, examples-page, guided-banner, and reset links cannot drift.
- Updated the retest runbook to use the guided banner's `Return to example` path instead of telling testers to manually reconstruct the route.
- Renamed start-page and simple-example entry links to `Open guided setup` so they do not imply that setup already ran before the lab card is clicked.

Remaining rebuild target:

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
- Each card now shows a step number so the examples read as an ordered learning path instead of an unordered catalog.
- Added `src/examples/simpleVersionSkewPatterns.ts` as a tiny source file for copy/paste release, chunk, refresh, idempotency, gate, and asset-strategy examples.
- Added a direct Playwright check for the tiny source examples so they stay runnable, not only rendered as text.
- Added shared simple-source and `tests/simple-patterns.spec.ts` proof anchors on the simple examples page without repeating them on every card.
- Shortened visible proof filenames on `/examples` so the first viewport stays readable while docs still link the full source paths.
- Labeled each simple card's realistic workflow bridge as `Robust path` with shorter text so the page reads as rule, code, source, robust path, action.
- Updated the retest runbook and example docs to use guided scenarios as the primary path instead of old manual mode-switching steps.
- Added `pnpm test:learning:windows` as the one-command proof for the tiny source examples plus the rendered learning page.
- Aligned the root README, knowledge map, and examples index with the guided setup flow so new readers see auto-reset, diagnostics, and `Return to example` before manual reset instructions.

Future rebuild target:

- Expand `src/examples/simpleVersionSkewPatterns.ts` only if readers need runnable examples beyond the current tiny functions.

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
