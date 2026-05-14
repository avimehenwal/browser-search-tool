import useIndexStore from "@/store/indexStore";
import { db } from "./db";
import {
  buildDexiePredicate,
  buildFlexTags,
  FilterOptions,
} from "./filterAdapter";
import { escapeHtmlPreserveMark, sanitizeSearchQuery } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

type BuildOptions = {
  batchSize?: number;
  concurrency?: number;
  useWorker?: boolean;
  progressCb?: (processed: number, total: number) => void;
};

const DEFAULTS = { batchSize: 200, concurrency: 16, useWorker: true };

let currentIndex: any = null;
let currentIndexCount = 0;

function extractPublicationRestrictions(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const joined = m[1];
    const items = joined.split("x").filter(Boolean);
    res.push(...items);
  }
  return Array.from(new Set(res));
}

function extractUnitedArchives(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bUnitedArchives(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    res.push(m[1]);
  }
  return Array.from(new Set(res));
}

function extractPhotographers(data: any) {
  const res: string[] = [];
  if (!data) return res;
  const p = data.fotografen || data.photographer || data.photographers;
  if (!p) return res;
  return String(p)
    .split(/[,;|\/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function addDocs(idx: any, docs: any[], concurrency: number) {
  for (let i = 0; i < docs.length; i += concurrency) {
    const slice = docs.slice(i, i + concurrency);
    // call add (or addAsync) and await any returned promises so this works
    // for both worker-based indexes (which return Promises) and sync indexes.
    await Promise.all(
      slice.map((d) => {
        try {
          if (typeof idx.addAsync === "function") return idx.addAsync(d);
          const res = idx.add(d);
          if (res && typeof (res as any).then === "function") return res;
          return Promise.resolve(res);
        } catch (e) {
          return Promise.reject(e);
        }
      }),
    );
  }
}

export async function initIndexPersistent() {
  if (currentIndex) return currentIndex;
  const flex: any = await import("flexsearch");
  const { Document, IndexedDB } = flex as any;
  const idx = new Document({
    document: {
      id: "id",
      index: ["suchtext", "bildnummer", "fotografen"],
      tag: ["tags", "publicationRestrictions", "unitedArchives", "fotografen"],
      store: [
        "id",
        "bildnummer",
        "fotografen",
        "datum",
        "tags",
        "publicationRestrictions",
        "unitedArchives",
        "suchtext",
      ],
    },
    tokenize: "forward",
  });
  try {
    const adapter = new IndexedDB("flexsearch-photo-index");
    await idx.mount(adapter);
  } catch (err) {
    console.warn("FlexSearch mount failed", err);
  }
  currentIndex = idx;
  try {
    // Initialise the count from IndexedDB as a best-effort value
    currentIndexCount = await db.photoMetadata.count();
  } catch {
    currentIndexCount = 0;
  }
  return idx;
}

export async function buildIndexFromIndexedDB(opts: BuildOptions = {}) {
  const {
    batchSize = DEFAULTS.batchSize,
    concurrency = DEFAULTS.concurrency,
    useWorker = DEFAULTS.useWorker,
    progressCb,
  } = opts;
  const store = useIndexStore.getState();
  store.setIndexBuildStart?.();
  const startTime = performance.now();
  await (await import("./dbInit")).ensureDbOpen();
  try {
    if (useWorker) {
      try {
        // Use FlexSearch built-in Document worker model (no custom Web Worker defined here)
        const flex: any = await import("flexsearch");
        const { Document, IndexedDB } = flex as any;
        const idx = new Document({
          worker: true,
          document: {
            id: "id",
            index: ["suchtext", "bildnummer", "fotografen"],
            tag: [
              "tags",
              "publicationRestrictions",
              "unitedArchives",
              "fotografen",
            ],
            store: [
              "id",
              "bildnummer",
              "fotografen",
              "datum",
              "tags",
              "publicationRestrictions",
              "unitedArchives",
              "suchtext",
            ],
          },
          tokenize: "forward",
        });
        try {
          const adapter = new IndexedDB("flexsearch-photo-index");
          await idx.mount(adapter);
        } catch (err) {
          console.warn("FlexSearch mount failed", err);
        }
        const totalCount = await db.photoMetadata.count();
        let offset = 0;
        let processed = 0;
        while (offset < totalCount) {
          const batch = await db.photoMetadata
            .orderBy("id")
            .offset(offset)
            .limit(batchSize)
            .toArray();
          if (!batch || batch.length === 0) break;
          const docs = batch.map((record: any) => {
            const data = record.data || {};
            const suchtext =
              `${data.suchtext ?? ""} ${record.bildnummer ?? ""} ${data.fotografen ?? ""}`.trim();
            const publicationRestrictions =
              extractPublicationRestrictions(suchtext);
            const unitedArchives = extractUnitedArchives(suchtext);
            const photographers = extractPhotographers(data);
            const tags = [
              ...publicationRestrictions.map((r) => `pub:${r}`),
              ...unitedArchives.map((n) => `ua:${n}`),
              ...photographers.map((p) => `photographer:${p}`),
            ];
            return {
              id: record.id,
              suchtext,
              bildnummer: record.bildnummer,
              fotografen: data.fotografen || "",
              datum: data.datum || "",
              publicationRestrictions,
              unitedArchives,
              tags,
            };
          });
          await addDocs(idx, docs, concurrency);
          processed += docs.length;
          offset += docs.length;
          progressCb?.(processed, totalCount);
          store.setIndexBuildProgress?.(processed, totalCount);
        }
        try {
          if (typeof idx.commit === "function") await idx.commit();
        } catch {}
        const duration = performance.now() - startTime;
        store.setIndexBuildComplete?.(processed, duration);
        currentIndex = idx;
        currentIndexCount = processed;
        return { builtCount: processed, durationMs: duration };
      } catch (e) {
        console.warn(
          "FlexSearch worker build failed, falling back to main-thread",
          e,
        );
      }
    }
    // main-thread build
    const flex: any = await import("flexsearch");
    const { Document, IndexedDB } = flex as any;
    const idx = new Document({
      document: {
        id: "id",
        index: ["suchtext", "bildnummer", "fotografen"],
        tag: [
          "tags",
          "publicationRestrictions",
          "unitedArchives",
          "fotografen",
        ],
        store: [
          "id",
          "bildnummer",
          "fotografen",
          "datum",
          "tags",
          "publicationRestrictions",
          "unitedArchives",
          "suchtext",
        ],
      },
      tokenize: "forward",
    });
    try {
      const adapter = new IndexedDB("flexsearch-photo-index");
      await idx.mount(adapter);
    } catch (e) {
      console.warn("flexsearch mount failed", e);
    }
    const total = await db.photoMetadata.count();
    let offset = 0;
    let processed = 0;
    while (offset < total) {
      const batch = await db.photoMetadata
        .orderBy("id")
        .offset(offset)
        .limit(batchSize)
        .toArray();
      if (!batch || batch.length === 0) break;
      const docs = batch.map((record: any) => {
        const data = record.data || {};
        const suchtext =
          `${data.suchtext ?? ""} ${record.bildnummer ?? ""} ${data.fotografen ?? ""}`.trim();
        const publicationRestrictions =
          extractPublicationRestrictions(suchtext);
        const unitedArchives = extractUnitedArchives(suchtext);
        const photographers = extractPhotographers(data);
        const tags = [
          ...publicationRestrictions.map((r) => `pub:${r}`),
          ...unitedArchives.map((n) => `ua:${n}`),
          ...photographers.map((p) => `photographer:${p}`),
        ];
        return {
          id: record.id,
          suchtext,
          bildnummer: record.bildnummer,
          fotografen: data.fotografen || "",
          datum: data.datum || "",
          publicationRestrictions,
          unitedArchives,
          tags,
        };
      });
      await addDocs(idx, docs, concurrency);
      processed += docs.length;
      offset += docs.length;
      progressCb?.(processed, total);
      store.setIndexBuildProgress?.(processed, total);
    }
    try {
      if (typeof idx.commit === "function") await idx.commit();
    } catch {}
    const duration = performance.now() - startTime;
    store.setIndexBuildComplete?.(processed, duration);
    currentIndex = idx;
    currentIndexCount = processed;
    return {
      builtCount: processed,
      durationMs: duration,
      indexMounted: true,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    store.setIndexBuildError?.(msg);
    throw err;
  }
}

/**
 * Add a single document to the current flex index (initialises index if needed).
 */
export async function addDocumentToIndex(doc: any) {
  try {
    const idx = currentIndex || (await initIndexPersistent());
    if (!idx) return;
    if (typeof idx.addAsync === "function") return idx.addAsync(doc);
    const res = idx.add(doc);
    if (res && typeof (res as any).then === "function") return res;
    // update count optimistically
    try {
      currentIndexCount = (currentIndexCount || 0) + 1;
    } catch {}
    return Promise.resolve(res);
  } catch (e) {
    console.warn("flexIndex.addDocumentToIndex failed", e);
  }
}

/**
 * Add multiple documents to the current flex index in batches.
 */
export async function addDocumentsToIndex(docs: any[], concurrency = 16) {
  try {
    const idx = currentIndex || (await initIndexPersistent());
    if (!idx) return;
    await addDocs(idx, docs, concurrency);
    try {
      if (typeof idx.commit === "function") await idx.commit();
    } catch {}
    try {
      currentIndexCount = (currentIndexCount || 0) + docs.length;
    } catch {}
  } catch (e) {
    console.warn("flexIndex.addDocumentsToIndex failed", e);
  }
}

export function getIndexCount() {
  return currentIndexCount;
}

export async function search(
  query: string,
  limit = 1000,
  opts?: FilterOptions,
) {
  query = sanitizeSearchQuery(query);
  if (!query || String(query).trim().length === 0) return [];
  const idx = currentIndex || (await initIndexPersistent());
  if (!idx) return [];

  try {
    const tagFilters = buildFlexTags(opts);

    const raw: unknown = await idx.search({
      query,
      limit,
      highlight: "<mark>$1</mark>",
      suggest: true,
      tag: tagFilters.length ? tagFilters : undefined,
    });

    let ids: number[] = [];
    const highlights: Record<number, string> = {};

    if (Array.isArray(raw)) {
      if (raw.length && typeof raw[0] === "object") {
        for (const r of raw as any[]) {
          const rObj: Record<string, unknown> = r as any;
          if (rObj.id !== undefined) {
            const id = Number(String(rObj.id));
            ids.push(id);
            if (rObj.highlight !== undefined)
              highlights[id] = String(rObj.highlight);
          }
        }
      } else {
        ids = (raw as any[]).map((x) => Number(String(x)));
      }
    } else if (raw && typeof raw === "object") {
      for (const v of Object.values(raw)) {
        if (Array.isArray(v)) ids.push(...v.map((x) => Number(String(x))));
      }
    }

    ids = Array.from(new Set(ids));
    if (ids.length === 0) return [];

    // fetch original records from IndexedDB and preserve ordering
    const docs = await db.photoMetadata.bulkGet(ids);
    const results = ids.map((id) => {
      const doc = (docs as any[]).find((d) => d?.id === id) || null;
      return { id, doc, highlight: highlights[id] ?? null };
    });

    // sanitize highlights produced by FlexSearch (allow only <mark> tags)
    try {
      for (const r of results) {
        if (r && typeof (r as any).highlight === "string") {
          (r as any).highlight = escapeHtmlPreserveMark(
            (r as any).highlight as string,
          );
        }
      }
    } catch {
      /* best-effort */
    }

    // Apply any additional filters that cannot be expressed as flex tags
    const pred = buildDexiePredicate(opts, query);
    const filtered = results.filter((r) => (r.doc ? pred(r.doc) : false));
    return filtered;
  } catch (err) {
    console.warn("flexindex.search failed", err);
    return [];
  }
}

const flexIndex = {
  buildIndexFromIndexedDB,
  initIndexPersistent,
  search,
  getIndex,
};

/** Return the current FlexSearch index instance (may be null if not yet built). */
function getIndex() {
  return currentIndex;
}

export default flexIndex;
