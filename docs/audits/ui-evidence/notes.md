# UI Evidence Notes: Rebuild Audit

Screenshots were captured from the local app on July 1, 2026 with debug mode enabled. They record the current learning path and recovery states used by the rebuild audit.

## Captured Steps

| Step | Screenshot | Health | Notes |
| --- | --- | --- | --- |
| 1 | `01-start.png` | Good after follow-up | The first screen explains the deploy, lazy route, missing chunk, and safe recovery model before showing fintech examples, with all four checkpoints visible in the desktop viewport. |
| 2 | `02-simple-examples.png` | Good after follow-up | The ordered simple examples expose the implementation anchors and proof command. A later CSS pass moved the update toast away from the release debug rail. |
| 3 | `03-guided-lab-controls.png` | Good after follow-up | Guided scenario cards make reset, lab mode, starting step, and setup actions visible; advanced diagnostics stay below the primary path. |
| 4 | `04-payment-required-update.png` | Good | The required-update payment state shows saved work, explicit `Bundle / Session / Latest` identity, and a safe refresh affordance. |
| 5 | `05-kyb-incompatible-draft.png` | Good | The incompatible draft fallback explains why review is needed and avoids submitting migrated sensitive data automatically. |

## Strengths

- The build/version stamp is visible in each inspected state, which makes recovery and skew setup easier to verify during manual retests.
- The guided controls answer the reset-state question directly at the scenario card level.
- Required-update and incompatible-draft states use calm copy and preserve the user's next safe action.

## UX Risks

- Captured issue: the update toast overlapped or visually competed with the right-side release debug panel in desktop screenshots.
- Follow-up fix: `.debug-panel-open .update-toast` now offsets the toast away from the release debug panel, with a Playwright regression covering the desktop layout.
- Debug surfaces still contain many labels, badges, and code-like values; the guided path helps, manual diagnostics are now behind the advanced section, and the scenario grid uses wider tracks when the debug rail is visible.
- Build/version labels are useful for retesting, but should remain compact so workflow content stays primary. The compact topbar stamp now keeps its status visible without clipping the latest release in the desktop debug-rail layout.

## Accessibility Risks

- Screenshots cannot prove full keyboard order, live-region announcements, or screen-reader reading order. The Simple examples reset/retest path is now covered by a keyboard activation test.
- Small badge and code-label text should be checked for contrast and legibility at browser zoom levels.

## Evidence Limits

- These captures are desktop-only visual evidence.
- They do not replace Playwright behavior tests, broader keyboard traversal checks, or assistive technology checks.
