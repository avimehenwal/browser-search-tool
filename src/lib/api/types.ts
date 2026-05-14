/**
 * API Types — defines the contract for the search API.
 *
 * This static Next.js app runs entirely in the browser, so there is no HTTP
 * server. However, the search layer is designed to exactly mirror a REST
 * endpoint so the same interface can be lifted to a real server without
 * changing any calling code.
 *
 * Equivalent REST endpoint: GET /api/search
 *
 * Example call (if server-side):
 *   fetch('/api/search?q=jackson&credit=IMAGO+%2F+teutopress&page=1&pageSize=10')
 *
 * Client-side equivalent (this implementation):
 *   import { searchAPI } from '@/lib/api';
 *   const response = await searchAPI({ q: 'jackson', credit: 'IMAGO / teutopress' });
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Parameters accepted by GET /api/search.
 * All fields are optional — an empty request browses all items (page 1).
 */
export type SearchRequest = {
  /** Full-text keyword query. Searched across suchtext (primary), fotografen (secondary), bildnummer (tertiary). */
  q?: string;

  /**
   * Filter by credit (fotografen).
   * Accepts a single credit string; exact or contains-match against the
   * normalised fotografen field.
   */
  credit?: string;

  /** Filter start date. ISO format yyyy-MM-dd (inclusive). */
  dateFrom?: string;

  /** Filter end date. ISO format yyyy-MM-dd (inclusive). */
  dateTo?: string;

  /**
   * One or more publication-restriction codes extracted from suchtext.
   * Examples: ["GER", "SUI", "AUT"]
   * A result matches if it carries ANY of the requested codes.
   */
  restrictions?: string[];

  /** Array of archive IDs to filter by (e.g. UnitedArchives numbers such as "00421717"). */
  archive_id?: string[];

  /** Sort order. Defaults to added_desc. */
  sort?: "datum_asc" | "datum_desc" | "added_desc" | "added_asc";

  /** 1-based page number. Defaults to 1. */
  page?: number;

  /** Items per page, 1–100. Defaults to 10. */
  pageSize?: number;
};

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/** A single media item returned in a search response. */
export type SearchResultItem = {
  bildnummer: string;
  fotografen: string;
  /** Normalised ISO date e.g. "1948-01-07". */
  datum: string;
  /** Original formatted date for display e.g. "07.01.1948". */
  datumFormatted: string;
  suchtext: string;
  hoehe?: string;
  breite?: string;
  /** Publication-restriction codes extracted during preprocessing. */
  restrictions: string[];
  /**
   * HTML snippet with matched terms wrapped in <mark> tags.
   * Only present when a keyword query was executed.
   */
  highlight?: string | null;
};

/** Paginated response from GET /api/search. */
export type SearchResponse = {
  items: SearchResultItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Server-side (or client-side) execution time in milliseconds. */
  durationMs: number;
};

// ---------------------------------------------------------------------------
// Filter options (used to populate filter dropdowns)
// ---------------------------------------------------------------------------

/** Available filter choices derived from the current dataset. */
export type FilterOptions = {
  credits: string[];
  photographers: string[];
  restrictions: string[];
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** One recorded search event. */
export type AnalyticsEntry = {
  query: string;
  timestamp: number;
  durationMs: number;
  resultsCount: number;
};

/** Aggregate analytics summary. */
export type AnalyticsSummary = {
  totalSearches: number;
  avgDurationMs: number;
  fastestMs: number;
  slowestMs: number;
  topKeywords: Array<{ keyword: string; count: number }>;
  recentSearches: AnalyticsEntry[];
};
