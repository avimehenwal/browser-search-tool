import useAnalyticsStore from "@/store/analyticsStore";
import { db } from "./db";
import { ensureDbOpen } from "./dbInit";

export async function addAnalyticsRecord(payload: {
  query: string;
  timestamp: number;
  durationMs: number;
  resultsCount: number;
}) {
  try {
    await ensureDbOpen();
    // persist to IndexedDB
    const id = await db.analytics.add(payload as any);
    try {
      // update in-memory store so UI (Analytics page) updates immediately
      // use store API to prepend the new record
      const add = useAnalyticsStore.getState().addSearch;
      if (typeof add === "function") add(payload as any);
    } catch (e) {
      // non-fatal if store update fails
      console.warn("analytics.store update failed", e);
    }
    return id;
  } catch (err) {
    console.warn("addAnalyticsRecord failed", err);
    throw err;
  }
}

export async function getAnalytics(limit = 1000, offset = 0) {
  try {
    await ensureDbOpen();
    return await db.analytics
      .orderBy("timestamp")
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  } catch (err) {
    console.warn("getAnalytics failed", err);
    return [];
  }
}

export async function clearAnalytics() {
  try {
    await ensureDbOpen();
    return await db.analytics.clear();
  } catch (err) {
    console.warn("clearAnalytics failed", err);
    throw err;
  }
}

export default {
  addAnalyticsRecord,
  getAnalytics,
  clearAnalytics,
};
