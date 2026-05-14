/**
 * analyticsService.ts — Analytics tracking for the search API.
 *
 * Wraps the existing analytics.repo.ts + analyticsStore.ts and provides a
 * clean, typed interface that matches what a server-side analytics endpoint
 * would expose.
 *
 * Tracked metrics:
 *   - Number of searches
 *   - Query response time (durationMs per request)
 *   - Most common search keywords (top-N by frequency)
 *
 * Storage: IndexedDB (persisted) + Zustand store (in-memory for live UI).
 */

import {
  addAnalyticsRecord as dbAdd,
  clearAnalytics as dbClear,
  getAnalytics as dbGet,
} from "@/lib/analytics.repo";
import type { AnalyticsEntry, AnalyticsSummary } from "./types";

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Record a completed search. Called automatically by searchAPI(). */
export async function trackSearch(entry: AnalyticsEntry): Promise<void> {
  await dbAdd(entry);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetch paginated raw analytics records (newest first). */
export async function getSearchHistory(
  limit = 1000,
  offset = 0,
): Promise<AnalyticsEntry[]> {
  const rows = await dbGet(limit, offset);
  return rows as AnalyticsEntry[];
}

/** Compute aggregate analytics summary from persisted records. */
export async function getAnalyticsSummary(
  limit = 5000,
): Promise<AnalyticsSummary> {
  const records = await dbGet(limit, 0);

  if (!records || records.length === 0) {
    return {
      totalSearches: 0,
      avgDurationMs: 0,
      fastestMs: 0,
      slowestMs: 0,
      topKeywords: [],
      recentSearches: [],
    };
  }

  const totalSearches = records.length;
  const avgDurationMs = Math.round(
    records.reduce((acc, r) => acc + (r.durationMs ?? 0), 0) / totalSearches,
  );
  const fastestMs = Math.min(...records.map((r) => r.durationMs ?? 0));
  const slowestMs = Math.max(...records.map((r) => r.durationMs ?? 0));

  // Top keywords — count non-empty queries
  const freq: Record<string, number> = {};
  for (const r of records) {
    const kw = (r.query ?? "").trim().toLowerCase();
    if (!kw) continue;
    freq[kw] = (freq[kw] ?? 0) + 1;
  }
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    totalSearches,
    avgDurationMs,
    fastestMs,
    slowestMs,
    topKeywords,
    recentSearches: records.slice(0, 20) as AnalyticsEntry[],
  };
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

/** Clear all persisted analytics records. */
export async function clearAnalytics(): Promise<void> {
  await dbClear();
}
