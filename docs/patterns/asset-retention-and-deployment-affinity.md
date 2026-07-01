# Pattern: Asset Retention And Deployment Affinity

Asset retention and deployment affinity reduce how often users hit missing chunks.

## Problem

Client recovery is necessary, but hosting strategy should prevent most stale chunk failures before they reach users.

## Modes In This Repo

| Mode | Meaning |
| --- | --- |
| `no-affinity` | Latest app shell/assets win; old chunks may 404. |
| `affinity` | Client stays pinned to the original deployment. |
| `asset-retention` | Old chunks remain during a compatibility window. |
| `broken` | Old chunks are intentionally missing. |
| `compatibility-window-expired` | Retained assets expired while an old tab is open. |
| `api-contract-incompatible` | Old client can load, but risky mutations are blocked/read-only. |

## Code Anchors

- `server/skew-server.ts`
- `src/shared/assetRetentionSimulator.ts`
- `src/shared/deploymentAffinityClient.ts`
- `scripts/set-skew-mode.mjs`

## Production Recommendation

- Serve `index.html` with `no-cache` or revalidation.
- Serve hashed JS/CSS assets as immutable.
- Keep old assets for a compatibility window, often 24-72 hours.
- Consider deployment affinity for sensitive long-running workflows.
- Use SSE/WebSocket for release awareness, not executable code streaming.
- Make API compatibility explicit and versioned.

## Tradeoff

Asset retention costs storage and CDN cache complexity. Deployment affinity can delay users from seeing the latest release. Both are usually cheaper than losing a payment workflow or creating duplicate sensitive actions.
