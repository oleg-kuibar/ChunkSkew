/// <reference types="vite/client" />

declare const __APP_RELEASE_ID__: string;

interface ImportMetaEnv {
  readonly VITE_STATIC_DEMO?: string;
}

interface Window {
  __CHUNK_SKEW_TEST_NO_RELOAD__?: boolean;
}
