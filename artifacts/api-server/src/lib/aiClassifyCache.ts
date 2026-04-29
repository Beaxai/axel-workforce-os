import { createHash } from "node:crypto";

export interface ClassCodeSuggestion {
  classCode: string;
  description: string;
  confidence: number;
  reasoning: string;
}

interface CacheEntry {
  expiresAt: number;
  suggestions: ClassCodeSuggestion[];
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

const store = new Map<string, CacheEntry>();
let ttlMs = DEFAULT_TTL_MS;

function makeKey(description: string, state: string): string {
  const normalized = `${description.toLowerCase().replace(/\s+/g, " ").trim()}|${state.toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const overflow = store.size - MAX_ENTRIES;
  let removed = 0;
  for (const key of store.keys()) {
    if (removed >= overflow) break;
    store.delete(key);
    removed += 1;
  }
}

export function getCachedSuggestions(
  description: string,
  state: string,
): ClassCodeSuggestion[] | undefined {
  const key = makeKey(description, state);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  store.delete(key);
  store.set(key, entry);
  return entry.suggestions;
}

export function setCachedSuggestions(
  description: string,
  state: string,
  suggestions: ClassCodeSuggestion[],
): void {
  const key = makeKey(description, state);
  store.set(key, {
    expiresAt: Date.now() + ttlMs,
    suggestions,
  });
  evictIfNeeded();
}

export function clearClassifyCache(): void {
  store.clear();
}

export function getClassifyCacheSize(): number {
  return store.size;
}

export function setClassifyCacheTtlMs(ms: number): void {
  ttlMs = ms;
}
