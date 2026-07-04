# Rebuild Audit: Simpler Version-Skew Learning Path

This audit records the current implementation and UI/UX friction before deeper rebuild work. The goal is to make the project easier to understand, easier to test, and easier to reuse as simple robust examples.

## Current Strengths

- The core mitigation modules are already separated: release identity, version checks, policy, chunk classification, recovery, drafts, idempotency, mutation guards, telemetry, and audit.
- React Router and TanStack Router examples both exist.
- Plain draft, bad-draft, retained-file, guarded-action, controls, and event-log routes exercise failure pressure without asking readers to learn an app domain first.
- The Playwright suite covers the most important safety behaviors.
- The docs now make the repo discoverable for build version skew search terms.

## UI Evidence

Desktop screenshots for the learning path and recovery states are saved in `docs/audits/ui-evidence/`; notes are in `docs/audits/ui-evidence/notes.md`.

Captured steps:

1. Start page: clear mental model and three example entry points.
2. Simple examples: ordered minimal patterns with proof and source anchors.
3. Guided lab controls: reset, lab mode, and starting step are visible before setup.
4. Required update: saved work, build identity, and safe refresh are explicit.
5. Bad draft: check-required fallback is calm and prevents unsafe submit.

Observed UX risk fixed in the follow-up pass: the update toast now offsets away from the right-side release debug panel on desktop, with a focused Playwright regression.

## Measured Cognitive Snapshot

Measured from the codebase graph after the latest fast index.

| Area | Symbol | Cognitive score | Reading signal |
| --- | --- | ---: | --- |
| Guided lab | `VersionSkewDebugPage` | 0 | The page now renders controls while named helpers own scenario preparation. |
| Guided lab | `prepareGuidedScenario` / `finishGuidedScenario` | 0 / 1 | Reset, mode setup, seeding, and navigation are named as the learner sees them. |
| Save-refresh | `SaveRefreshWorkflow` / `useSaveRefreshDraft` | 3 / 1 | The primary walkthrough keeps rendering local while submit and optional extra-draft guard envelopes are named helpers. |
| Draft restore | `restoreWorkflowDraft` / `restoredDraft` / `migrateBadDraft` | 3 / 0 / 1 | The safe-refresh store now names restored, migrated, and incompatible outcomes instead of mixing telemetry, audit, migration, and return shapes inline. |
| Bad draft | `BadDraftWorkflow` / `useBadDraft` | 2 / 0 | The workflow renders one note, one review, restore, save-if-ready, and schema fallback rules. |
| Drawer and retained file | `EventRowsPage` / `RetainedFileRoute.Component` | 0 / 0 | One launcher row, one lazy drawer, and one retained-file route keep the optional example plain. |
| Lazy route recovery | `reactRouterLazy` / `tanstackLazyImport` / `componentLazyImport` | 0 / 0 / 0 | Router-specific wrappers now only bind route, router, and workflow; shared helpers own import, synthetic failure, recovery, and rethrow. |
| Chunk recovery controller | `handleChunkFailure` / `attemptSafeReload` / `preventReloadLoop` | 1 / 0 / 0 | The central recovery rule now reads as classify, count, notify, record, reload once, or prevent the loop. |
| Chunk preloading | `preloadWorkflowChunks` / `preloadRoute` / `loadRouteChunk` | 0 / 4 / 1 | The public entry now reads as workflow-to-route orchestration while route status, telemetry, and simulated chunk loading are named steps. |
| Guarded action | `SettingsPage` | 1 | One protected submit row proves the required-update guard without role or session setup. |
| Release UI | `BuildVersionStamp` | 0 | Bundle, session, and latest release labels are now explicit without extra branching. |
| Mutation safety | `guardSensitiveMutation` / `handleBlockedMutationGuard` | 3 / 2 | Session, permission, update policy, and blocked-result packaging now read as named decisions. |

## Main Friction

### 1. The first screen taught finance, not version skew

The previous root page opened with account balances, pending approvals, and risk alerts. Those are useful fake-domain details, but they made the learner infer the real topic from debug controls and tests.

Change made in this pass:

- Replaced the root dashboard with a learning-first lab page.
- The first viewport now explains three examples: old tab, saved text, blocked submit.
- The primary actions now link to the article and Lab controls without a dense app dashboard.
- Scenario links that require setup now open Lab controls with the matching guided control highlighted.

### 2. Navigation labels mixed product app and teaching artifact

The previous sidebar used production-like labels from a fake operational app.

Change made in this pass:

- Renamed the shell to `ChunkSkew Lab`.
- Reduced the sidebar to `Start`, `Examples`, and `Controls`.
- Renamed the Lab controls page heading and start-page control control to `Lab controls` so navigation, controls, docs, and tests use the same label.
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

- Extracted old-draft snapshot-to-draft shaping into a named helper so the workflow effect reads as a recovery rule instead of a data-mapping block.
- Extracted the save-refresh draft lifecycle into `useSaveRefreshDraft` and named repeated guard-result handling so the workflow body reads closer to the user journey.
- Named the submit and optional extra-draft mutation guard envelopes so the primary save-refresh walkthrough reads as check, update gate, then mutate.
- Extracted the old-draft lifecycle into `useBadDraft` so migration, incompatible schema, server snapshot hydration, and autosave are easier to study together.
- Split old-draft hydrate and save-if-ready rules out of `useBadDraft` so the schema migration example now reads as a flat restore/save/hydrate/update loop.
- Centralized required-update-vs-blocked-dialog handling in `handleBlockedMutationGuard` so sensitive workflows share one guard-result shape.
- Tightened version-state subscriptions so build version stamps react to version-state changes after the current render, not to unrelated autosave/idempotency storage writes.
- Made every build stamp show `Bundle / Session / Latest` explicitly, and only mark the badge fully current when all three identities match.
- Replaced remaining vague `current release` copy with session-specific wording and an `in sync` stamp state.
- Aligned the always-visible release debug rail with `Loaded bundle`, `Session release`, and `Latest release` labels.
- Scoped the debug-panel Playwright assertions to advanced diagnostics so the always-visible release rail and expanded diagnostics can share the same clear labels without strict-locator ambiguity.
- Reused the shared build stamp on `/examples` instead of keeping a second local release strip.
- Split sensitive mutation guard outcomes into named session, permission, update policy, and required-update result helpers so the shared safety path reads like the production checklist.
- Collapsed repeated update-policy result boilerplate so `decideUpdatePolicy` reads as ordered product rules.
- Added a pure update-policy proof so core decisions can be tested without browser storage setup.
- Made the previously type-only `allow-current-step-only` decision reachable for required updates in preloaded sensitive workflows, then expanded the pure policy proof so every named policy output has a direct case.
- Expanded the cognitive snapshot to include drawer and guarded-action examples so the audit covers the supporting examples, not only the primary walkthrough.
- Split workflow chunk preloading into public orchestration, route lifecycle, and chunk-load helpers so asset-retention and lazy-route recovery examples are easier to read from the top down.
- Trimmed workflow chunk preloading so the primary examples list only chunks that still map to visible learning steps.
- Routed release-bus mode changes into explicit telemetry for rollback, asset retention, deployment affinity, retention expiry, and API contract deprecation so the observability table proves the rare cases instead of only naming them.
- Added an optional extra-draft recovery proof for the secondary retry-key path.
- Added keyboard recovery proof for guided Lab controls, chunk fallback, required-update safe refresh, and restored-draft live-region semantics.
- Added optional service-worker lifecycle proof for release metadata caching and workflow-asset warm acknowledgement without opening windows or handling `index.html`.
- Added a 320px reflow and computed contrast proof for the learning and recovery surfaces, plus a small status-color contrast fix.
- Split draft restore outcomes into named helpers so the shared safe-refresh rule reads as missing, restored, migrated, or incompatible.
- Collapsed React Router, TanStack Router, and component-lazy import recovery into one shared lazy-route loader so router examples differ only where the router APIs differ.
- Split chunk recovery side effects into named attempt, notification, audit, reload, and loop-prevention helpers so the robust source matches the tiny reload-once/show-fallback rule.
- Added one recursive privacy redactor for telemetry, client audit posts, server audit persistence, and rendered audit-table metadata, with a focused proof for nested sensitive/idempotency values.
- Added a repo-level cognitive-complexity guardrail that flags new high-branch or long functions while documenting the few remaining larger teaching surfaces as intentional learning tradeoffs.

### 4. Debug controls are powerful but dense

`VersionSkewDebugPage` combines mode switching, release state, draft seeding, telemetry clearing, full reset, preload table, and audit table. This is useful for tests, but cognitively dense.

Change made in the next pass:

- Added a guided scenario runner above the manual controls.
- Renamed the runner copy to `Proof setup` / `Pick one proof` so Lab controls matches the named proof setup links on the start and examples pages.
- Renamed the active banner's accessible labels to `Active proof setup` and `Clear proof setup` so assistive tech uses the same vocabulary.
- Added one-click preparation for save-refresh, missing-file, bad-draft, and block-submit examples.
- Moved live skew-mode writes to ignored runtime state so retests no longer leave tracked `server/skew-state.json` diffs.
- Aligned CLI skew scripts and lab controls so they assign the same update severity for each mode.
- Added a focused script test so CLI skew-mode rules stay aligned without touching tracked seed state.
- Added lightweight setup progress in the guided banner so the active step matches the route opened by each scenario.
- Exposed each guided scenario's lab mode and starting step on the control so setup is visible before clicking without raw route text in the primary path.
- Clarified in the guided runner that scenario controls start from a clean reset.
- Changed guided scenario controls to reset browser and backend simulation state automatically before applying their scenario mode.
- Added `Reset included` to each guided scenario control so the setup contract is visible at the click target.
- Named the scenario lifecycle as `prepareGuidedScenario` and `finishGuidedScenario` so the Lab controls page no longer hides reset/setup/navigation inside one inline mutation block.
- Renamed release summary labels from ambiguous `current release` wording to `loaded bundle`, `session release`, and `latest release`.
- Kept the compact build stamp's status visible so `Bundle`, `Session`, and `Latest` also say whether the app is `in sync`, `session recovered`, or has an update pending.
- Widened the desktop topbar build stamp and covered it with a layout assertion so the latest release does not disappear behind ellipsis when the debug rail is open.
- Added the same status wording to the release debug rail and separated `Update policy` from `Status` so badges, diagnostics, and advanced diagnostics answer "did recovery work?" the same way.
- Moved manual mode controls, release state, preload status, telemetry, and audit trail into a collapsible advanced diagnostics section.
- Moved the manual `Check version` action into advanced diagnostics so the primary lab page keeps only scenario setup and full reset visible.
- Moved the release debug panel into a desktop right rail so it stays visible without covering reset or guided scenario controls.
- Widened guided scenario control tracks so the debug right rail no longer squeezes route labels and primary setup buttons.
- Removed pre-click step lists from scenario controls so setup actions stay visible; the active guided banner still shows step progress after a scenario starts.
- Added current-step status and a `Return to example` action to the guided scenario banner so users can visit lab controls and get back to the prepared workflow.
- Centralized debug/router/scenario URL generation in `src/shared/routerLinks.ts` so start-page, examples-page, guided-banner, and reset links cannot drift.
- Updated the retest runbook to use the guided banner's `Return to example` path instead of telling testers to manually reconstruct the route.
- Renamed start-page and simple-example entry links to named setup actions so they do not imply that setup already ran before the lab control is clicked.
- Added a reset confirmation strip after **Reset simulation state** so manual retests visibly prove that drafts, release overrides, reload flags, and proof setup state were cleared while debug/router choice stayed on.
- Moved guided scenario metadata into `src/examples/simpleVersionSkewPatterns.ts` so the start page, simple examples, Lab controls, and tests share one scenario catalog.
- Marked start-page scenarios inside the same catalog so the homepage no longer hard-codes which robust examples are featured.
- Named the primary guided scenario in the catalog so the start-page save-refresh CTA no longer depends on the first featured item.

Current guardrail:

- Keep the diagnostics table for verification, but keep it opt-in behind the guided scenario path.

### 5. Examples need a "minimal path" variant

The older app-shaped examples were useful for stress, but they were not minimal. A new learner should start with three tiny examples:

- one release-state check
- one draft restore
- one required-update gate

Change made in this pass:

- Added a dedicated `/examples` route with tiny controls for release identity, safe refresh, and required update gates.
- Moved optional setups out of `/examples`; missing chunks, bad drafts, and retained assets now live in Lab controls.
- `/examples` now shows only three rows: see old tab, save text, block submit.
- Optional proof setup moved to Lab controls so the simple page no longer mixes source anchors, code snippets, and setup links.
- `src/examples/simpleVersionSkewPatterns.ts` remains the tiny copy-paste source for release, refresh, and gate rules.
- `tests/simple-patterns.spec.ts` and `tests/update-policy.spec.ts` keep those tiny rules runnable without adding more UI.
- Updated the retest runbook and example docs to use guided scenarios as the primary path instead of old manual mode-switching steps.
- Added `pnpm test:article` as the smallest one-command proof for the tiny source examples plus the rendered learning page.
- Expanded `pnpm test:learning:windows` to include the start page baseline so the three-example article stays covered by the learning proof.
- Expanded `pnpm test:learning:windows` again to include named setup links from the start page into prepared robust workflows.
- Expanded `pnpm test:learning:windows` to cover the guided banner's **Return to example** path and the reset confirmation strip.
- Aligned the root README, knowledge map, and examples index with the guided setup flow so new readers see auto-reset, diagnostics, and `Return to example` before manual reset instructions.
- Aligned the Production Checklist with the same three-example order before listing rollout gates.
- Replaced the start page's pattern-vocabulary chips with the three-example article path.
- Aligned `/examples`, `src/examples/simpleVersionSkewPatterns.ts`, and tests around the same three-step path.
- Removed repeated Lab controls hrefs from the simple-pattern catalog; the catalog now stores the rule and optional guided proof id only.
- Verified that every simple example's guided scenario id exists in the shared scenario catalog so named setup links cannot silently drift.
- Changed simple-example and start-page setup buttons to name the guided proof scenario they open, instead of using a generic `Open guided setup` label.
- Centralized that setup button label in the shared catalog so the start page, `/examples`, and tests use one phrase.
- Added a TypeScript catalog contract so mistyped simple-example guided scenario ids fail at compile time before they reach the UI.
- Added a start-page scenario catalog proof so the first robust examples stay intentionally ordered with the rest of the learning path.
- Added a primary guided scenario proof so the recommended save-refresh walkthrough is explicit in source and tests.
- Added release-status doc assertions to the simple-pattern proof so stale `Bundle / Session / Latest` examples cannot lose the visible status wording.
- Added `Open Step`, `Solve path`, and simple-pattern-catalog terms to the Search Index so the new UI vocabulary is discoverable.
- Reworked the Pattern Index into a minimal-rule to robust-proof map so each pattern has a clear tiny example and prepared proof.
- Linked `Router Lazy Boundaries` directly from the ordered chunk-recovery row so router-specific recovery stays discoverable instead of hiding behind the shared recovery controller.
- Made the visible chunk-recovery copy name React/TanStack so router comparison is explicit on the start page and simple examples page.
- Added an asset-retention guided setup so the Asset Strategy control proves retained old chunks by opening a heavy lazy report without falling back.
- Moved URL-recommended guided scenarios to the top of Lab controls so simple-example links reveal the intended proof control without scrolling.
- Aligned the root README, Knowledge Map, and Search Index with the same three-example learning path so docs no longer read like an unordered page catalog.
- Added the same ordered rollout map to the Production Checklist so the path continues from simple rules to robust proofs to real-app gates.

Future rebuild target:

- Expand `src/examples/simpleVersionSkewPatterns.ts` only if readers need runnable examples beyond the current tiny functions.

## Target Information Architecture

1. Start here: mental model and scenario controls.
2. Try one scenario: save-refresh as the primary walkthrough.
3. Inspect the pattern: release identity, policy, chunk recovery, autosave, idempotency.
4. Compare routers: use the topbar router switch to replay the same path in React Router or TanStack Router mode.
5. Run diagnostics: skew modes, preload table, telemetry, audit.
6. Read production rollout: checklist and tradeoffs.

## Done Criteria For The Full Rebuild

- A new reader can explain build version skew from the first screen.
- A new reader can run one scenario without reading source code first.
- Each pattern has a minimal example and an optional robust proof.
- Debug controls are separated from primary learning flow.
- The docs, UI labels, and tests use the same vocabulary.
- E2E tests still prove the safety guarantees.

## Current Evidence Matrix

This matrix is the completion check for the rebuild goal. A row is only strong when UI, docs, and tests point at the same learner path.

| Done criterion | Current evidence | Verification |
| --- | --- | --- |
| Explain build version skew from the first screen. | Start page links into a three-example article: old tab, saved text, blocked submit. | `tests/learning-path.spec.ts` article walkthrough. |
| Run one scenario without source reading. | Lab controls controls show reset, mode, and starting step before navigation. | `tests/learning-path.spec.ts` save-refresh and controls walkthroughs; `tests/version-skew.spec.ts` deeper guided-scenario assertions. |
| Minimal plus robust proof for each pattern. | Pattern Index maps minimal rules to robust proofs; `/examples` stays to three rows while Lab controls prepares the heavier workflow proofs. | `tests/simple-patterns.spec.ts`, `tests/update-policy.spec.ts`, and `tests/learning-path.spec.ts` learning assertions. |
| Debug controls stay out of the primary path. | Manual modes, release state, preload table, telemetry, and audit table live under **Advanced diagnostics**. | `advanced diagnostics stay collapsed but still expose preload and rare event proof` expects diagnostics hidden until opened. |
| POC stays standalone and fake-data only. | `README.md` states the standalone/non-goal contract; `package.json` stays React/Vite/Express/Playwright without Next.js or real banking/auth dependencies; mock data uses fake notices and `.example.test` identities. | `pnpm test:learning:windows`, including `tests/project-contract.spec.ts`. |
| Release awareness avoids live code streaming. | Release awareness uses polling plus SSE/WebSocket metadata; the optional service worker is gated by `VITE_ENABLE_SERVICE_WORKER`, caches `/version.json`, and can warm declared workflow assets without handling `index.html` or opening windows. | `pnpm test:learning:windows`, including `tests/project-contract.spec.ts`; `pnpm test:e2e:windows test tests/service-worker.spec.ts --project=chromium --reporter=list`. |
| Reset/retest behavior is obvious. | Reset reloads with a success strip and build stamp returns to `Session dev-local` with `in sync` status; guided setups expose **Return to example** after visiting Lab controls. | `pnpm test:learning:windows` covers always-reachable controls; `tests/version-skew.spec.ts` covers dock reset from an example route. |
| Core accessibility evidence exists for learning and recovery surfaces. | Simple examples, Lab controls, restored-draft, and chunk-fallback surfaces reflow at 320px; primary buttons, chips, notices, gates, and fallback copy meet normal-text contrast. | `pnpm test:e2e:windows test tests/accessibility.spec.ts --project=chromium --reporter=list`. |
| Vocabulary matches across UI, docs, and tests. | Root README, Knowledge Map, Pattern Index, Example Index, Search Index, Production Checklist, and Release Identity note use the same three-example path, **Lab controls**, visible build status, **Update policy**, **Status**, and **Return to example** path. | `pnpm test:article`, including `tests/simple-patterns.spec.ts` docs-vocabulary assertions. |
| Sensitive mutation metadata is explicit. | `apiFetch` builds one header envelope for release ID, deployment ID, router mode, user ID, organization ID, API contract version, idempotency key, mutation intent, and mutation-created timestamp. | `pnpm test:learning:windows`, including `tests/api-client.spec.ts`. |
| Safety guarantees still hold. | Save-refresh, required update gates, retry-key recovery, chunk fallback, draft restore, service-worker metadata caching, router recovery, rare release events, and event export stay covered by focused tests. | `tests/learning-path.spec.ts` covers the readable path; compact `tests/version-skew.spec.ts` keeps the core browser regression; focused specs cover platform, accessibility, policy, privacy, and API metadata. |
