/**
 * Preprocessor — normalises raw media items before they are stored.
 *
 * ## What we preprocess
 * 1. **datum** — German "dd.MM.yyyy" → ISO "yyyy-MM-dd"
 *    Why: enables reliable date-range filtering and chronological sorting.
 *
 * 2. **restrictions** — extracted from suchtext via regex
 *    Pattern: `PUBLICATIONxGERxSUIxAUTxONLY` → ["GER", "SUI", "AUT"]
 *    Why: the raw field embeds structured data in free-text form; extracting
 *         it at ingest time means filters can be exact matches rather than
 *         slow full-text scans.
 *
 * 3. **creditNormalized** — fotografen lowercased
 *    Why: case-insensitive credit filtering without repeated toLowerCase() at
 *         query time.
 *
 * 4. **suchtext** — Unicode-normalized, collapsed whitespace
 *    Why: prevents duplicate matches from different Unicode representations.
 *
 * ## Where it happens
 * At ingest time (dbInit.ts) when data is loaded into IndexedDB.  Incremental
 * items (e.g. the "one per minute" scenario) are preprocessed in
 * `preprocessItem()` before being added to the DB and live search index.
 *
 * ## Updating the index with new items
 * Call `preprocessItem(raw)` → store result in IndexedDB → call
 * `flexIndex.addDocumentToIndex(processed)` to update the FlexSearch index
 * incrementally without a full rebuild.
 */

export type RawMediaItem = {
  suchtext: string;
  bildnummer: string;
  fotografen: string;
  /** Raw date string, typically "dd.MM.yyyy". */
  datum: string;
  hoehe?: string;
  breite?: string;
};

export type ProcessedMediaItem = RawMediaItem & {
  /** Normalised ISO date "yyyy-MM-dd". */
  datumISO: string;
  /** Publication-restriction codes extracted from suchtext. */
  restrictions: string[];
  /** Lowercase fotografen for case-insensitive credit filtering. */
  creditNormalized: string;
};

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Parses a date string into "yyyy-MM-dd".
 * Handles:
 *   - German format "dd.MM.yyyy"  → "yyyy-MM-dd"
 *   - ISO strings starting with "yyyy-MM-dd"  (pass-through)
 *   - ISO datetime (trims time component)
 * Returns empty string for unparseable values.
 */
export function parseDatum(datum: string): string {
  if (!datum || typeof datum !== "string") return "";

  // Already ISO yyyy-MM-dd[T...]
  if (/^\d{4}-\d{2}-\d{2}/.test(datum)) return datum.slice(0, 10);

  // German dd.MM.yyyy
  const parts = datum.split(".");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const day = (d ?? "").padStart(2, "0");
    const month = (m ?? "").padStart(2, "0");
    const year = y ?? "";
    if (
      day.length <= 2 &&
      month.length <= 2 &&
      year.length === 4 &&
      !isNaN(Number(day)) &&
      !isNaN(Number(month)) &&
      !isNaN(Number(year))
    ) {
      return `${year}-${month}-${day}`;
    }
  }

  // Fall back: look for yyyy-MM-dd anywhere in the string
  const m = datum.match(/\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];

  return "";
}

// ---------------------------------------------------------------------------
// Restriction extraction
// ---------------------------------------------------------------------------

/**
 * Extracts publication-restriction codes from a suchtext string.
 *
 * Matches patterns like:
 *   PUBLICATIONxINxGERxSUIxAUTxONLY  → ["IN", "GER", "SUI", "AUT"]
 *   PUBLICATIONxGERxONLY              → ["GER"]
 *   PUBLICATIONxINxONLY               → ["IN"]
 *
 * The regex captures all 2–3 character uppercase tokens between
 * `PUBLICATIONx` and `ONLY`, splitting on "x".
 */
export function extractRestrictions(suchtext: string): string[] {
  if (!suchtext || typeof suchtext !== "string") return [];

  const results: string[] = [];
  const regex = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(suchtext)) !== null) {
    const codes = match[1].split("x").filter(Boolean);
    results.push(...codes);
  }
  return Array.from(new Set(results));
}

// ---------------------------------------------------------------------------
// Credit normalisation
// ---------------------------------------------------------------------------

/** Lowercase + trim fotografen for case-insensitive filtering. */
export function normalizeCredit(fotografen: string): string {
  return (fotografen ?? "").toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// suchtext normalisation
// ---------------------------------------------------------------------------

/**
 * Unicode-normalize suchtext and collapse runs of whitespace.
 * Converts to NFC so precomposed and decomposed forms compare equally.
 */
export function normalizeSuchtext(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Main preprocessing functions
// ---------------------------------------------------------------------------

/** Apply all preprocessing steps to a single raw item. */
export function preprocessItem(item: RawMediaItem): ProcessedMediaItem {
  return {
    ...item,
    suchtext: normalizeSuchtext(item.suchtext),
    datumISO: parseDatum(item.datum),
    restrictions: extractRestrictions(item.suchtext),
    creditNormalized: normalizeCredit(item.fotografen),
  };
}

/** Preprocess a batch of raw items. */
export function preprocessItems(items: RawMediaItem[]): ProcessedMediaItem[] {
  return items.map(preprocessItem);
}
