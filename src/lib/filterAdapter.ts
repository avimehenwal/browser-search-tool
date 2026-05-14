export type FilterOptions = {
  photographers?: string[];
  credits?: string[];
  dateFrom?: string; // ISO yyyy-mm-dd
  dateTo?: string;
  // explicit filters
  publicationRestrictions?: string[];
  unitedArchives?: string[]; // United Archive IDs
  // legacy / generic restrictions
  restrictions?: string[];
};

function splitNames(raw?: string) {
  if (!raw) return [] as string[];
  return String(raw)
    .split(/[,;|\/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractPublicationRestrictions(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const joined = m[1];
    const items = joined.split("x").filter(Boolean);
    for (const it of items) res.push(it);
  }
  return Array.from(new Set(res));
}

function extractUnitedArchives(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bUnitedArchives(\d+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    res.push(m[1]);
  }
  return Array.from(new Set(res));
}

export function buildFlexTags(filters?: FilterOptions): string[] {
  const tags: string[] = [];
  if (!filters) return tags;
  if (filters.photographers && filters.photographers.length) {
    tags.push(...filters.photographers.map((p) => `photographer:${p}`));
  }
  // publicationRestrictions
  if (
    filters.publicationRestrictions &&
    filters.publicationRestrictions.length
  ) {
    tags.push(...filters.publicationRestrictions.map((r) => `pub:${r}`));
  }
  // unitedArchives (IDs)
  if (filters.unitedArchives && filters.unitedArchives.length) {
    tags.push(...filters.unitedArchives.map((u) => `ua:${u}`));
  }
  // legacy / generic restrictions: apply to both prefixes as a best-effort
  if (filters.restrictions && filters.restrictions.length) {
    for (const r of filters.restrictions) {
      tags.push(`pub:${r}`);
      tags.push(`ua:${r}`);
    }
  }
  return tags;
}

export function buildDexiePredicate(
  filters?: FilterOptions,
  query?: string,
): (r: unknown) => boolean {
  const qn = query ? String(query).toLowerCase().trim() : null;
  const toRecord = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return (r: unknown) => {
    try {
      const rec = toRecord(r);
      const data = toRecord(rec.data);
      const textSource =
        rec.suchtext ??
        data.suchtext ??
        rec.bildnummer ??
        rec.fotografen ??
        data.fotografen ??
        "";
      const text = String(textSource).toLowerCase();

      if (qn && qn.length > 0 && !text.includes(qn)) return false;

      if (filters) {
        // photographers filter (matches any of the photographer names found on the record)
        if (filters.photographers && filters.photographers.length > 0) {
          const fp = String(rec.fotografen ?? data.fotografen ?? "");
          const extracted = splitNames(fp).map((s) => s.toLowerCase());
          const ok = filters.photographers.some((p) =>
            extracted.includes(String(p).toLowerCase()),
          );
          if (!ok) return false;
        }

        // credits filter - treat similar to photographers (exact or contained match)
        if (filters.credits && filters.credits.length > 0) {
          const fp = String(rec.fotografen ?? data.fotografen ?? "");
          const extracted = splitNames(fp).map((s) => s.toLowerCase());
          const ok = filters.credits.some((c) =>
            extracted.includes(String(c).toLowerCase()),
          );
          if (!ok) return false;
        }

        // date range (compare record datum if available)
        if (filters.dateFrom || filters.dateTo) {
          const val = String(rec.datum ?? data.datum ?? "");
          if (val) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              if (filters.dateFrom) {
                const from = new Date(filters.dateFrom + "T00:00:00Z");
                if (d < from) return false;
              }
              if (filters.dateTo) {
                const to = new Date(filters.dateTo + "T23:59:59Z");
                if (d > to) return false;
              }
            }
          }
        }

        // publicationRestrictions - check stored field or infer from text
        if (
          filters.publicationRestrictions &&
          filters.publicationRestrictions.length > 0
        ) {
          const prRaw =
            rec.publicationRestrictions ?? data.publicationRestrictions ?? "";
          let extracted: string[] = [];
          if (Array.isArray(prRaw) && prRaw.length)
            extracted = prRaw.map(String);
          else if (typeof prRaw === "string" && prRaw.length)
            extracted = String(prRaw)
              .split(/[,;|\/]+/)
              .map((s) => s.trim());
          if (extracted.length === 0) {
            extracted = extractPublicationRestrictions(
              String(rec.suchtext ?? data.suchtext ?? ""),
            );
          }
          const lowered = extracted.map((s) => s.toLowerCase());
          const ok = filters.publicationRestrictions.some((p) =>
            lowered.includes(String(p).toLowerCase()),
          );
          if (!ok) return false;
        }

        // unitedArchives (IDs)
        if (filters.unitedArchives && filters.unitedArchives.length > 0) {
          const uaRaw = rec.unitedArchives ?? data.unitedArchives ?? "";
          let extracted: string[] = [];
          if (Array.isArray(uaRaw) && uaRaw.length)
            extracted = uaRaw.map(String);
          else if (typeof uaRaw === "string" && uaRaw.length)
            extracted = String(uaRaw)
              .split(/[,;|\/]+/)
              .map((s) => s.trim());
          if (extracted.length === 0) {
            extracted = extractUnitedArchives(
              String(rec.suchtext ?? data.suchtext ?? ""),
            );
          }
          const lowered = extracted.map((s) => s.toLowerCase());
          const ok = filters.unitedArchives.some((u) =>
            lowered.includes(String(u).toLowerCase()),
          );
          if (!ok) return false;
        }

        // restrictions - best-effort: look for tokens in `text`
        if (filters.restrictions && filters.restrictions.length > 0) {
          const ok = filters.restrictions.some((rstr) =>
            text.includes(String(rstr).toLowerCase()),
          );
          if (!ok) return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  };
}

const filterAdapter = { buildFlexTags, buildDexiePredicate };

export default filterAdapter;
