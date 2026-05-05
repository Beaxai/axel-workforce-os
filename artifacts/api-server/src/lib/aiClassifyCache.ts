import { createHash } from "node:crypto";
import { db, aiClassifyCacheTable } from "@workspace/db";
import { eq, lte, sql } from "drizzle-orm";

export interface ClassCodeSuggestion {
  classCode: string;
  description: string;
  confidence: number;
  reasoning: string;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

let ttlMs = DEFAULT_TTL_MS;

function makeKey(description: string, state: string): string {
  const normalized = `${description.toLowerCase().replace(/\s+/g, " ").trim()}|${state.toUpperCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedSuggestions(
  description: string,
  state: string,
): Promise<ClassCodeSuggestion[] | undefined> {
  const key = makeKey(description, state);
  const rows = await db
    .select()
    .from(aiClassifyCacheTable)
    .where(eq(aiClassifyCacheTable.key, key))
    .limit(1);
  const entry = rows[0];
  if (!entry) return undefined;
  if (entry.expiresAt.getTime() <= Date.now()) {
    await db.delete(aiClassifyCacheTable).where(eq(aiClassifyCacheTable.key, key));
    return undefined;
  }
  return entry.suggestions as ClassCodeSuggestion[];
}

export async function setCachedSuggestions(
  description: string,
  state: string,
  suggestions: ClassCodeSuggestion[],
): Promise<void> {
  const key = makeKey(description, state);
  const expiresAt = new Date(Date.now() + ttlMs);
  await db
    .insert(aiClassifyCacheTable)
    .values({
      key,
      description: description.slice(0, 4000),
      state: state.slice(0, 8),
      suggestions: suggestions as unknown as object,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: aiClassifyCacheTable.key,
      set: {
        suggestions: suggestions as unknown as object,
        expiresAt,
      },
    });
}

export async function clearClassifyCache(): Promise<void> {
  await db.delete(aiClassifyCacheTable);
}

export async function getClassifyCacheSize(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiClassifyCacheTable);
  return row?.count ?? 0;
}

export async function purgeExpiredClassifyCache(): Promise<void> {
  await db
    .delete(aiClassifyCacheTable)
    .where(lte(aiClassifyCacheTable.expiresAt, new Date()));
}

export function setClassifyCacheTtlMs(ms: number): void {
  ttlMs = ms;
}
