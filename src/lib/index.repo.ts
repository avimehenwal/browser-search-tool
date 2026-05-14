import type { Result } from "./db";
import { db } from "./db";
import { ensureDbOpen } from "./dbInit";
import { buildDexiePredicate, FilterOptions } from "./filterAdapter";
import flexIndex from "./flexIndex";
import {
  escapeHtml,
  escapeHtmlPreserveMark,
  sanitizeSearchQuery,
} from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SearchHit = {
  id: number;
  doc: Result | null;
  highlight: string | null;
};

export async function searchIndex(
  query: string,
  limit = 20,
  opts?: FilterOptions,
): Promise<SearchHit[]> {
  // sanitize incoming query to avoid injection/XSS vectors
  query = sanitizeSearchQuery(query);
  if (!query || String(query).trim().length === 0) return [];
  try {
    const res = (await flexIndex.search(query, limit, opts)) as SearchHit[];
    if (res && res.length > 0) {
      // sanitize any highlights coming from flexsearch (allow only <mark>)
      try {
        for (const h of res) {
          if (h && typeof (h as any).highlight === "string") {
            (h as any).highlight = escapeHtmlPreserveMark(
              (h as any).highlight as string,
            );
          }
        }
      } catch {
        /* best-effort */
      }
      return res;
    }

    // Fallback: if the flexsearch index is empty or unavailable, do a simple
    // substring search over the Dexie store so users still get realtime
    // suggestions while the full index is being built.
    // const qn = String(query).toLowerCase().trim(); // unused by fallback logic
    const escapeRegExp = (s: string) =>
      s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const highlightText = (text: string | null | undefined, q: string) => {
      if (!text) return null;
      try {
        const safe = escapeHtml(String(text));
        const regex = new RegExp(`(${escapeRegExp(q)})`, "ig");
        // run replace on escaped text so injected HTML in the source cannot run
        return safe.replace(regex, "<mark>$1</mark>");
      } catch {
        return escapeHtml(String(text));
      }
    };

    try {
      await ensureDbOpen();
      const pred = buildDexiePredicate(opts, query);
      const rows = (await db.photoMetadata
        .filter((r: any) => {
          try {
            return pred(r);
          } catch {
            return false;
          }
        })
        .limit(Math.min(Number(limit || 20), 20))
        .toArray()) as any[];

      return rows.map((row) => {
        const docText = (
          (row && (row.suchtext ?? row.data?.suchtext)) ||
          row?.bildnummer ||
          row?.fotografen ||
          ""
        ).toString();
        const highlighted = highlightText(docText, query);
        return {
          id: Number(row.id),
          doc: row,
          highlight: highlighted,
        };
      });
    } catch (e) {
      // If Dexie fallback fails, return empty list
      console.warn("index.repo.fallbackSearch failed", e);
      return [];
    }
  } catch (err) {
    console.warn("index.repo.searchIndex failed", err);
    return [];
  }
}

export async function getPhotographers(
  query = "",
  limit = 50,
): Promise<string[]> {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  try {
    await ensureDbOpen();
    const rows = (await db.photoMetadata.toArray()) as any[];
    const names = new Set<string>();
    for (const r of rows) {
      const fp = (r?.fotografen || r?.data?.fotografen || "")?.toString();
      if (!fp) continue;
      const parts = String(fp)
        .split(/[,;|\/]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (!p) continue;
        if (q.length === 0 || p.toLowerCase().includes(q)) names.add(p);
      }
      if (names.size >= limit) break;
    }

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit);
  } catch (e) {
    console.warn("index.repo.getPhotographers failed", e);
    return [];
  }
}

export async function getPublicationRestrictions(
  query = "",
  limit = 50,
): Promise<string[]> {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  try {
    await ensureDbOpen();
    const rows = (await db.photoMetadata.toArray()) as any[];
    const set = new Set<string>();
    const regex = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/gi;
    for (const r of rows) {
      let pr: string[] = [];
      if (
        r?.publicationRestrictions &&
        Array.isArray(r.publicationRestrictions)
      ) {
        pr = r.publicationRestrictions.map(String);
      } else if (
        r?.data?.publicationRestrictions &&
        Array.isArray(r.data.publicationRestrictions)
      ) {
        pr = r.data.publicationRestrictions.map(String);
      } else {
        const text = (
          (r && (r.suchtext ?? r.data?.suchtext)) ||
          r?.bildnummer ||
          r?.fotografen ||
          ""
        ).toString();
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          const joined = m[1];
          const items = joined.split("x").filter(Boolean);
          pr.push(...items);
        }
      }

      for (const p of pr) {
        if (!p) continue;
        if (q.length === 0 || p.toLowerCase().includes(q)) set.add(p);
      }
      if (set.size >= limit) break;
    }

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit);
  } catch (e) {
    console.warn("index.repo.getPublicationRestrictions failed", e);
    return [];
  }
}

export async function getUnitedArchives(
  query = "",
  limit = 50,
): Promise<string[]> {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  try {
    await ensureDbOpen();
    const rows = (await db.photoMetadata.toArray()) as any[];
    const set = new Set<string>();
    const regex = /\bUnitedArchives(\d+)\b/gi;
    for (const r of rows) {
      let ua: string[] = [];
      if (r?.unitedArchives && Array.isArray(r.unitedArchives)) {
        ua = r.unitedArchives.map(String);
      } else if (
        r?.data?.unitedArchives &&
        Array.isArray(r.data.unitedArchives)
      ) {
        ua = r.data.unitedArchives.map(String);
      } else {
        const text = (
          (r && (r.suchtext ?? r.data?.suchtext)) ||
          r?.bildnummer ||
          r?.fotografen ||
          ""
        ).toString();
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
          ua.push(m[1]);
        }
      }

      for (const u of ua) {
        if (!u) continue;
        if (q.length === 0 || u.toLowerCase().includes(q)) set.add(u);
      }
      if (set.size >= limit) break;
    }

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit);
  } catch (e) {
    console.warn("index.repo.getUnitedArchives failed", e);
    return [];
  }
}

const indexRepo = {
  searchIndex,
  getPhotographers,
  getPublicationRestrictions,
  getUnitedArchives,
};

export default indexRepo;
