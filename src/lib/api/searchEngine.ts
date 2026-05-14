/**
 * searchEngine.ts — core search engine implementing the GET /api/search contract.
 *
 * ## Architecture
 * This module bridges the SearchRequest/SearchResponse API types with the
 * underlying FlexSearch index (full-text) and Dexie store (structured data).
 *
 * ## Relevance approach
 * - **suchtext** (primary): FlexSearch indexes this field with forward
 *   tokenization, so prefix-matching works (e.g. "Man" matches "Manchester").
 *   Results from this field are scored highest.
 * - **fotografen** (secondary): indexed as a separate FlexSearch field.
 * - **bildnummer** (tertiary): indexed for exact look-up by image number.
 * - FlexSearch merges hits across fields and de-duplicates by document ID.
 *   The result order reflects relevance: hits in suchtext appear first.
 *
 * ## Performance for 10,000+ items
 * FlexSearch's in-memory forward index handles 10k documents in < 10 ms.
 * For a no-keyword browse query, Dexie's native `orderBy` / `offset` / `limit`
 * hits IndexedDB indexes directly and is equally fast.
 *
 * ## Scaling to millions
 * At millions of items the in-memory index becomes too large for a browser tab.
 * Options ranked by complexity:
 *   1. Move the search to a real server (Elasticsearch, Typesense, MeiliSearch).
 *      The SearchRequest/SearchResponse contract defined in types.ts maps
 *      directly to any of those APIs.
 *   2. Use FlexSearch's IndexedDB persistence adapter; only load the index
 *      shard relevant to the current query into memory.
 *   3. Partition the dataset by date range and only index the current window.
 *
 * ## Incremental updates ("one item per minute")
 * New items:
 *   1. Preprocess with `preprocessItem()` from api/preprocessor.ts.
 *   2. Persist to IndexedDB via `db.photoMetadata.add(item)`.
 *   3. Call `addDocumentToIndex(item)` (exported below) to update FlexSearch
 *      incrementally — no full rebuild needed.
 * Query latency stays low because FlexSearch supports incremental `add()`.
 * The UI is not blocked: ingest happens in a background timeout/interval and
 * Dexie's liveQuery reactivity surfaces new items automatically.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { addAnalyticsRecord } from "@/lib/analytics.repo";
import { db } from "@/lib/db";
import { ensureDbOpen } from "@/lib/dbInit";
import type { FilterOptions } from "@/lib/filterAdapter";
import { buildDexiePredicate } from "@/lib/filterAdapter";
import { searchIndex } from "@/lib/index.repo";
import { sanitizeSearchQuery } from "@/lib/utils";
import type { SearchRequest, SearchResponse, SearchResultItem } from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isoToMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return isNaN(t) ? 0 : t;
}

function datumToMs(datum: string | undefined): number {
  if (!datum) return 0;
  // datumISO preferred, fallback to raw datum
  const t = new Date(datum).getTime();
  return isNaN(t) ? 0 : t;
}

function getItemDate(item: any): number {
  // prefer preprocessed ISO field
  const iso = item.datumISO ?? "";
  if (iso) return isoToMs(iso);
  return datumToMs(item.datum ?? "");
}

function getCreatedAtMs(item: any): number {
  if (!item) return 0;
  const val =
    item.createdAt ??
    item.addedAt ??
    item.data?.createdAt ??
    item.data?.addedAt;
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  const parsed = Date.parse(String(val));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortItems<T>(items: T[], sort: string): T[] {
  return [...items].sort((a: any, b: any) => {
    // support sorting by created/added time as well as the document date
    if (sort === "added_asc" || sort === "added_desc") {
      const da = getCreatedAtMs(a);
      const db = getCreatedAtMs(b);
      return sort === "added_asc" ? da - db : db - da;
    }
    const da = getItemDate(a);
    const db = getItemDate(b);
    return sort === "datum_asc" ? da - db : db - da;
  });
}

function mapToResultItem(raw: any): SearchResultItem {
  const restrictions: string[] = Array.isArray(raw.restrictions)
    ? raw.restrictions
    : [];

  return {
    bildnummer: raw.bildnummer ?? "",
    fotografen: raw.fotografen ?? "",
    datum: raw.datumISO ?? raw.datum ?? "",
    datumFormatted: raw.datum ?? "",
    suchtext: raw.suchtext ?? "",
    hoehe: raw.hoehe,
    breite: raw.breite,
    restrictions,
    highlight: raw.highlight ?? null,
  };
}

function buildFilterOptions(req: SearchRequest): FilterOptions {
  return {
    credits: req.credit ? [req.credit] : [],
    dateFrom: req.dateFrom ?? "",
    dateTo: req.dateTo ?? "",
    restrictions: req.restrictions ?? [],
    // Keep legacy fields empty — searchEngine handles them via `credits`
    photographers: [],
    publicationRestrictions: [],
    unitedArchives: req.archive_id ?? [],
  };
}

// ---------------------------------------------------------------------------
// Browse (no keyword) — Dexie native paging
// ---------------------------------------------------------------------------

async function browseAll(
  filterOpts: FilterOptions,
  sort: string,
): Promise<any[]> {
  await ensureDbOpen();
  const pred = buildDexiePredicate(filterOpts);

  // Apply date-index range when date filters are set for faster Dexie scan.
  const inputToStart = (s: string) => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };
  const inputToEnd = (s: string) => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  };

  let coll: any;
  if (filterOpts.dateFrom || filterOpts.dateTo) {
    const from = filterOpts.dateFrom ?? filterOpts.dateTo!;
    const to = filterOpts.dateTo ?? filterOpts.dateFrom!;
    let start = inputToStart(from)!;
    let end = inputToEnd(to)!;
    if (start > end) [start, end] = [end, start];
    coll = db.photoMetadata
      .where("createdAt")
      .between(start, end, true, true)
      .filter(pred as any);
  } else {
    coll = (db.photoMetadata.orderBy("datum") as any).filter(pred as any);
  }

  const rows: any[] = await coll.toArray();
  return sortItems(rows, sort);
}

// ---------------------------------------------------------------------------
// Keyword search — FlexSearch, then sort + paginate
// ---------------------------------------------------------------------------

async function keywordSearch(
  q: string,
  filterOpts: FilterOptions,
): Promise<any[]> {
  const hits = await searchIndex(q, 1000, filterOpts);
  return hits
    .map((h) => {
      const doc = h.doc as any;
      if (!doc) return null;
      return { ...doc, highlight: h.highlight ?? null };
    })
    .filter(Boolean) as any[];
}

// ---------------------------------------------------------------------------
// Public: searchAPI — mirrors GET /api/search
// ---------------------------------------------------------------------------

/**
 * Execute a search and return a paginated SearchResponse.
 *
 * This function is the client-side equivalent of:
 *   GET /api/search?q=...&credit=...&dateFrom=...&dateTo=...&restrictions=GER,SUI&sort=datum_desc&page=1&pageSize=10
 *
 * To lift this to a server: replace this function with a fetch() call to the
 * actual endpoint; the response shape is identical.
 */
export async function searchAPI(req: SearchRequest): Promise<SearchResponse> {
  const t0 = performance.now();

  const q = sanitizeSearchQuery(req.q ?? "");
  const sort = req.sort ?? "added_desc";
  const page = Math.max(1, Math.floor(req.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(req.pageSize ?? 10)));

  const filterOpts = buildFilterOptions(req);

  let allItems: any[];
  try {
    if (q.length > 0) {
      allItems = await keywordSearch(q, filterOpts);
      // Keyword results come in relevance order; only sort by datum when
      // the caller explicitly requests a date sort.
      if (req.sort) {
        allItems = sortItems(allItems, sort);
      }
    } else {
      allItems = await browseAll(filterOpts, sort);
    }
  } catch (err) {
    console.warn("searchAPI error", err);
    allItems = [];
  }

  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageSlice = allItems.slice(start, start + pageSize);
  const items = pageSlice.map(mapToResultItem);

  const durationMs = Math.round(performance.now() - t0);

  // Fire-and-forget analytics — never reject the caller
  void addAnalyticsRecord({
    query: q,
    timestamp: Date.now(),
    durationMs,
    resultsCount: total,
  }).catch(() => {});

  return { items, page: safePage, pageSize, total, totalPages, durationMs };
}

// ---------------------------------------------------------------------------
// Public: filter-option helpers (used to populate dropdowns)
// ---------------------------------------------------------------------------

/** Return all unique credit strings from the store. */
export async function getCredits(
  filterQuery = "",
  limit = 200,
): Promise<string[]> {
  await ensureDbOpen();
  const q = filterQuery.toLowerCase().trim();
  const rows = await db.photoMetadata.toArray();
  const set = new Set<string>();
  for (const r of rows as any[]) {
    const fp: string = r.fotografen ?? r.data?.fotografen ?? "";
    if (!fp) continue;
    fp.split(/[,;|/]+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .forEach((p: string) => {
        if (q === "" || p.toLowerCase().includes(q)) set.add(p);
      });
    if (set.size >= limit) break;
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

/** Return all unique restriction codes from the store. */
export async function getRestrictionOptions(
  filterQuery = "",
  limit = 200,
): Promise<string[]> {
  await ensureDbOpen();
  const q = filterQuery.toLowerCase().trim();
  const rows = await db.photoMetadata.toArray();
  const set = new Set<string>();
  const re = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/gi;
  for (const r of rows as any[]) {
    let codes: string[] = [];
    if (Array.isArray(r.restrictions) && r.restrictions.length) {
      codes = r.restrictions.map(String);
    } else {
      const text: string = r.suchtext ?? r.data?.suchtext ?? "";
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        codes.push(...m[1].split("x").filter(Boolean));
      }
    }
    codes.forEach((c) => {
      if (q === "" || c.toLowerCase().includes(q)) set.add(c);
    });
    if (set.size >= limit) break;
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Public: incremental ingest
// ---------------------------------------------------------------------------

/**
 * Add a new preprocessed item to the live FlexSearch index.
 * Call this after persisting the item to IndexedDB.
 *
 * Usage (incremental ingest scenario):
 *   const processed = preprocessItem(raw);
 *   const id = await db.photoMetadata.add(processed);
 *   await addDocumentToIndex({ ...processed, id });
 */
export async function addDocumentToIndex(item: any): Promise<void> {
  try {
    const flexIndex = (await import("@/lib/flexIndex")).default;
    const idx = await flexIndex.getIndex();
    if (!idx) return;
    const doc = {
      id: item.id,
      suchtext: item.suchtext ?? "",
      bildnummer: item.bildnummer ?? "",
      fotografen: item.fotografen ?? "",
      datum: item.datumISO ?? item.datum ?? "",
      restrictions: item.restrictions ?? [],
      tags: (item.restrictions ?? []).map((r: string) => `pub:${r}`),
    };
    if (typeof idx.addAsync === "function") {
      await idx.addAsync(doc);
    } else {
      idx.add(doc);
    }
  } catch (err) {
    console.warn("addDocumentToIndex failed", err);
  }
}
