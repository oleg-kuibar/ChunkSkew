const namespace = "chunk-skew-lab";

export function storageKey(key: string) {
  return `${namespace}:${key}`;
}

export function readStoredValue(storage: Storage, key: string) {
  return storage.getItem(storageKey(key));
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = readStoredValue(window.localStorage, key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key } }));
}

export function removeKey(key: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(storageKey(key));
  window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key } }));
}

export function readSessionFlag(key: string) {
  if (typeof window === "undefined") {
    return null;
  }
  return readStoredValue(window.sessionStorage, key);
}

export function writeSessionFlag(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(storageKey(key), value);
}
