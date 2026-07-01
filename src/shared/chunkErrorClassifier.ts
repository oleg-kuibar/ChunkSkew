export interface ChunkErrorClassification {
  isChunkLoadError: boolean;
  reason: string;
  message: string;
  assetUrl?: string;
}

const patterns = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk/i,
  /vite:preloadError/i,
  /CSS chunk/i,
  /error loading dynamically imported module/i
];

export function classifyChunkError(error: unknown): ChunkErrorClassification {
  const message = error instanceof Error ? error.message : String(error);
  const assetUrl = message.match(/https?:\/\/\S+|\/assets\/\S+|\/releases\/\S+/)?.[0]?.replace(/[)"']$/, "");
  const isChunkLoadError = patterns.some((pattern) => pattern.test(message));
  return {
    isChunkLoadError,
    reason: isChunkLoadError ? "version-skew-or-missing-asset" : "non-chunk-error",
    message,
    assetUrl
  };
}

export function createSyntheticChunkError(routeId: string) {
  return new TypeError(`Failed to fetch dynamically imported module: /assets/${routeId}.missing-release-a.js`);
}
