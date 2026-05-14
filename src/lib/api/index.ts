/**
 * @/lib/api — Public surface of the search API layer.
 *
 * This is the single import point for all API-related functionality.
 * Components should import from here, not from the individual sub-modules.
 *
 * ## Design note
 * The functions exported here have the same signatures and return types as
 * a real REST API would. Moving to server-side rendering only requires:
 *   1. Replacing `searchAPI(req)` calls with `fetch('/api/search?' + qs(req))`
 *   2. Implementing a Next.js Route Handler that calls `searchEngine.ts` on
 *      the server. No changes to the calling components are needed.
 *
 * ## Example usage
 * ```ts
 * import { searchAPI, getCredits, getRestrictionOptions } from '@/lib/api';
 *
 * // Execute a paginated search
 * const response = await searchAPI({
 *   q: 'jackson',
 *   credit: 'IMAGO / teutopress',
 *   dateFrom: '1990-01-01',
 *   dateTo: '2000-12-31',
 *   restrictions: ['GER'],
 *   sort: 'datum_desc',
 *   page: 1,
 *   pageSize: 10,
 * });
 * // response: { items, page, pageSize, total, totalPages, durationMs }
 * ```
 */

export { getUnitedArchives } from "../index.repo";
export {
  clearAnalytics,
  getAnalyticsSummary,
  getSearchHistory,
  trackSearch,
} from "./analyticsService";
export {
  extractRestrictions,
  parseDatum,
  preprocessItem,
  preprocessItems,
} from "./preprocessor";
export {
  addDocumentToIndex,
  getCredits,
  getRestrictionOptions,
  searchAPI,
} from "./searchEngine";
export type {
  AnalyticsEntry,
  AnalyticsSummary,
  FilterOptions,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
} from "./types";
