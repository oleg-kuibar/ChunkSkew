# Glossary

## Asset Retention

Keeping old hashed JS/CSS assets available after a new release is deployed so old tabs can continue lazy-loading chunks during a compatibility window.

## Build Version Skew

The mismatch between the app build running in a user's browser and the latest build/assets/API contract served by infrastructure.

## Bundle Release

The release identity compiled into the JavaScript bundle currently loaded by the browser.

## Compatibility Window

The period during which old clients and old assets remain supported after a new release.

## Deployment Affinity

A routing strategy that keeps a client pinned to the deployment it originally loaded.

## Idempotency Key

A stable key attached to a sensitive mutation so retrying the same action returns the previous result instead of creating a duplicate side effect.

## Latest Release

The release advertised by `/version.json` or the release bus.

## Release Bus

SSE or WebSocket channel that notifies clients about release availability, required updates, rollbacks, asset retention expiry, or API contract changes.

## Safe Refresh

A controlled refresh path that preserves workflow state and idempotency metadata before reloading.

## Session Release

The release identity used by runtime guards and recovery logic for the current browser session. In local simulation, this can differ from the actual loaded bundle.

## Stale Chunk

A JavaScript or CSS chunk requested by an old client after that chunk is no longer available from the server/CDN.
