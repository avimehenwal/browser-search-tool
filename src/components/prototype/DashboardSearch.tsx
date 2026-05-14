"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GridIcon, ListIcon } from "@/components/prototype/Icons";
import ListGridView from "@/components/prototype/ListGridView";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageSizeCombobox from "@/components/ui/page-size-combobox";
import type { SearchRequest, SearchResponse } from "@/lib/api";
import {
  getCredits,
  getRestrictionOptions,
  getUnitedArchives,
  searchAPI,
} from "@/lib/api";
import useSearchFilterStore from "@/store/searchFilterStore";
import { Cancel01Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardSearch() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- Zustand filter state ---
  const query = useSearchFilterStore((s) => s.query);
  const setQuery = useSearchFilterStore((s) => s.setQuery);
  const selectedCredits = useSearchFilterStore((s) => s.selectedCredits);
  const setSelectedCredits = useSearchFilterStore((s) => s.setSelectedCredits);
  const dateFrom = useSearchFilterStore((s) => s.dateFrom);
  const setDateFrom = useSearchFilterStore((s) => s.setDateFrom);
  const dateTo = useSearchFilterStore((s) => s.dateTo);
  const setDateTo = useSearchFilterStore((s) => s.setDateTo);
  const selectedPublicationRestrictions = useSearchFilterStore(
    (s) => s.selectedPublicationRestrictions,
  );
  const setSelectedPublicationRestrictions = useSearchFilterStore(
    (s) => s.setSelectedPublicationRestrictions,
  );
  const selectedUnitedArchives = useSearchFilterStore(
    (s) => s.selectedUnitedArchives,
  );
  const setSelectedUnitedArchives = useSearchFilterStore(
    (s) => s.setSelectedUnitedArchives,
  );
  const sort = useSearchFilterStore((s) => s.sort);
  const setSort = useSearchFilterStore((s) => s.setSort);
  const page = useSearchFilterStore((s) => s.page);
  const setPage = useSearchFilterStore((s) => s.setPage);
  const pageSize = useSearchFilterStore((s) => s.pageSize);
  const searchTrigger = useSearchFilterStore((s) => s.searchTrigger);
  const resetFilters = useSearchFilterStore((s) => s.reset);
  const view = useSearchFilterStore((s) => s.view);
  const setView = useSearchFilterStore((s) => s.setView);

  // --- Search result state ---
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Typeahead suggestions ---
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- Filter-option dropdown state ---
  const [creditOptions, setCreditOptions] = useState<string[]>([]);
  const [restrictionOptions, setRestrictionOptions] = useState<string[]>([]);
  const [creditFilterQuery, setCreditFilterQuery] = useState("");
  const [restrictionFilterQuery, setRestrictionFilterQuery] = useState("");
  const [creditOpen, setCreditOpen] = useState(false);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const creditButtonRef = useRef<HTMLButtonElement | null>(null);
  const creditPopupRef = useRef<HTMLDivElement | null>(null);
  const restrictionButtonRef = useRef<HTMLButtonElement | null>(null);
  const restrictionPopupRef = useRef<HTMLDivElement | null>(null);
  const [unitedOptions, setUnitedOptions] = useState<string[]>([]);
  const [unitedFilterQuery, setUnitedFilterQuery] = useState("");
  const [unitedOpen, setUnitedOpen] = useState(false);
  const unitedButtonRef = useRef<HTMLButtonElement | null>(null);
  const unitedPopupRef = useRef<HTMLDivElement | null>(null);

  // page size options are handled by PageSizeCombobox

  // ---------------------------------------------------------------------------
  // Close popups on outside click / Escape
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!creditOpen && !restrictionOpen) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      if (
        creditOpen &&
        !creditPopupRef.current?.contains(t) &&
        !creditButtonRef.current?.contains(t)
      )
        setCreditOpen(false);
      if (
        restrictionOpen &&
        !restrictionPopupRef.current?.contains(t) &&
        !restrictionButtonRef.current?.contains(t)
      )
        setRestrictionOpen(false);
      if (
        unitedOpen &&
        !unitedPopupRef.current?.contains(t) &&
        !unitedButtonRef.current?.contains(t)
      )
        setUnitedOpen(false);
    };
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === "Escape") {
        setCreditOpen(false);
        setRestrictionOpen(false);
        setUnitedOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [creditOpen, restrictionOpen, unitedOpen]);

  // ---------------------------------------------------------------------------
  // Load filter options
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const [c, r, u] = await Promise.all([
          getCredits(creditFilterQuery, 200),
          getRestrictionOptions(restrictionFilterQuery, 200),
          getUnitedArchives(unitedFilterQuery, 200),
        ]);
        if (cancelled) return;
        setCreditOptions(c);
        setRestrictionOptions(r);
        setUnitedOptions(u);
      } catch (e) {
        console.warn("filter options failed", e);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [creditFilterQuery, restrictionFilterQuery, unitedFilterQuery]);

  // ---------------------------------------------------------------------------
  // Build SearchRequest
  // ---------------------------------------------------------------------------
  const buildRequest = useCallback(
    (overrides?: Partial<SearchRequest>): SearchRequest => {
      // Pass through UI sort values (supports added_asc/added_desc and datum_asc/datum_desc)
      const apiSort = sort as SearchRequest["sort"];
      const credit =
        selectedCredits.length > 0 ? selectedCredits[0] : undefined;
      const archive_id =
        selectedUnitedArchives.length > 0 ? selectedUnitedArchives : undefined;
      return {
        q: query || undefined,
        credit,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        restrictions:
          selectedPublicationRestrictions.length > 0
            ? selectedPublicationRestrictions
            : undefined,
        archive_id,
        sort: apiSort,
        page,
        pageSize,
        ...overrides,
      };
    },
    [
      query,
      selectedCredits,
      selectedUnitedArchives,
      dateFrom,
      dateTo,
      selectedPublicationRestrictions,
      sort,
      page,
      pageSize,
    ],
  );

  // ---------------------------------------------------------------------------
  // Execute search
  // ---------------------------------------------------------------------------
  const executeSearch = useCallback(
    async (req: SearchRequest) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchAPI(req);
        setResponse(result);
        if (result.page !== req.page) setPage(result.page);
      } catch (e) {
        console.error("searchAPI error", e);
        setError("Search failed. Please try again.");
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    [setPage],
  );

  // Debounced auto-search on filter/query/page change
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      await executeSearch(buildRequest());
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    selectedCredits,
    selectedUnitedArchives,
    dateFrom,
    dateTo,
    selectedPublicationRestrictions,
    sort,
    page,
    pageSize,
    searchTrigger,
  ]);

  // Typeahead suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      const idle = setTimeout(() => {
        setSuggestions([]);
        setShowSuggestions(false);
      }, 0);
      return () => clearTimeout(idle);
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await searchAPI({ q: query, pageSize: 6, page: 1 });
        if (cancelled) return;
        setSuggestions(res.items);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;
  const currentPage = response?.page ?? page;
  const displayStart = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const displayEnd = Math.min(displayStart + pageSize, total);

  const toggleRestriction = (r: string) => {
    setSelectedPublicationRestrictions(
      selectedPublicationRestrictions.includes(r)
        ? selectedPublicationRestrictions.filter((x: string) => x !== r)
        : [...selectedPublicationRestrictions, r],
    );
    setPage(1);
  };

  const toggleUnitedArchive = (u: string) => {
    setSelectedUnitedArchives(
      selectedUnitedArchives.includes(u)
        ? selectedUnitedArchives.filter((x: string) => x !== u)
        : [...selectedUnitedArchives, u],
    );
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div ref={containerRef} className="w-full px-4 md:px-0">
      <div className="flex flex-col items-stretch gap-3 w-full max-w-6xl mx-auto">
        {/* ── Filters row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap w-full">
          {/* Credit filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setCreditOpen((v) => !v)}
              ref={creditButtonRef}
              aria-haspopup="listbox"
              aria-expanded={creditOpen}
            >
              <span>Image Credits</span>
              <FilterBadge count={selectedCredits.length} />
            </Button>
            {creditOpen && (
              <FilterPopup
                ref={creditPopupRef}
                placeholder="Filter credits…"
                filterQuery={creditFilterQuery}
                onFilterQueryChange={setCreditFilterQuery}
                options={creditOptions}
                selected={selectedCredits}
                onToggle={(c) => {
                  setSelectedCredits(
                    selectedCredits.includes(c)
                      ? selectedCredits.filter((x) => x !== c)
                      : [...selectedCredits, c],
                  );
                  setPage(1);
                }}
                onClear={() => {
                  setSelectedCredits([]);
                  setPage(1);
                }}
                onClose={() => setCreditOpen(false)}
              />
            )}
          </div>

          {/* Restrictions filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setRestrictionOpen((v) => !v)}
              ref={restrictionButtonRef}
              aria-haspopup="listbox"
              aria-expanded={restrictionOpen}
            >
              <span>Restrictions</span>
              <FilterBadge count={selectedPublicationRestrictions.length} />
            </Button>
            {restrictionOpen && (
              <FilterPopup
                ref={restrictionPopupRef}
                placeholder="Filter restrictions…"
                filterQuery={restrictionFilterQuery}
                onFilterQueryChange={setRestrictionFilterQuery}
                options={restrictionOptions}
                selected={selectedPublicationRestrictions}
                onToggle={(r) => {
                  toggleRestriction(r);
                }}
                onClear={() => {
                  setSelectedPublicationRestrictions([]);
                  setPage(1);
                }}
                onClose={() => setRestrictionOpen(false)}
              />
            )}
          </div>

          {/* Archive ID filter */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setUnitedOpen((v) => !v)}
              ref={unitedButtonRef}
              aria-haspopup="listbox"
              aria-expanded={unitedOpen}
            >
              <span>Archive ID</span>
              <FilterBadge count={selectedUnitedArchives.length} />
            </Button>
            {unitedOpen && (
              <FilterPopup
                ref={unitedPopupRef}
                placeholder="Filter archive IDs…"
                filterQuery={unitedFilterQuery}
                onFilterQueryChange={setUnitedFilterQuery}
                options={unitedOptions}
                selected={selectedUnitedArchives}
                onToggle={(u) => {
                  setSelectedUnitedArchives(
                    selectedUnitedArchives.includes(u)
                      ? selectedUnitedArchives.filter((x: string) => x !== u)
                      : [...selectedUnitedArchives, u],
                  );
                  setPage(1);
                }}
                onClear={() => {
                  setSelectedUnitedArchives([]);
                  setPage(1);
                }}
                onClose={() => setUnitedOpen(false)}
              />
            )}
          </div>

          {/* Active restriction chips */}
          {selectedPublicationRestrictions.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {selectedPublicationRestrictions.map((r: string) => (
                <button
                  key={r}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => toggleRestriction(r)}
                  aria-label={`Remove restriction ${r}`}
                >
                  {r}
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={2}
                    className="size-3"
                  />
                </button>
              ))}
            </div>
          )}
          {selectedUnitedArchives.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {selectedUnitedArchives.map((u: string) => (
                <button
                  key={u}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => toggleUnitedArchive(u)}
                  aria-label={`Remove archive ${u}`}
                >
                  {u}
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={2}
                    className="size-3"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Search input ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 relative">
            <HugeiconsIcon
              icon={SearchIcon}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Escape") setShowSuggestions(false);
                if (e.key === "Enter") {
                  setShowSuggestions(false);
                  void executeSearch(buildRequest({ page: 1 }));
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search photos, credits, image numbers…"
              className="pl-10 pr-12 h-12"
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="search-suggestions"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-8 inline-flex items-center justify-center rounded-full hover:bg-muted/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </button>
            )}

            {/* Typeahead suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id="search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 mt-1 z-50 rounded-2xl bg-popover p-2 shadow-2xl ring-1 ring-foreground/5 max-h-[50vh] overflow-y-auto space-y-1"
              >
                {suggestions.map((item) => (
                  <li key={item.bildnummer} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="w-full text-left rounded-md px-3 py-2 hover:bg-accent/10 flex items-start gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => {
                        setQuery(item.suchtext ?? "");
                        setShowSuggestions(false);
                        setPage(1);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium line-clamp-1">
                          {item.highlight ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: item.highlight,
                              }}
                            />
                          ) : (
                            item.suchtext
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.fotografen}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {item.bildnummer}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Date range + sort + reset ───────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground hidden md:block">
          Set one date to filter a single day; set both to pick a range.
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-from" className="text-sm shrink-0">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="date-to" className="text-sm shrink-0">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {sort.startsWith("added")
                    ? sort === "added_asc"
                      ? "Oldest added"
                      : "Newest added"
                    : sort === "datum_asc"
                      ? "Oldest by date"
                      : "Newest by date"}
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  setSort("added_desc");
                  setPage(1);
                }}
              >
                Newest added (recently added)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setSort("added_asc");
                  setPage(1);
                }}
              >
                Oldest added (earliest added)
              </DropdownMenuItem>

              <div className="px-1">
                <DropdownMenuSeparator />
              </div>

              <DropdownMenuItem
                onSelect={() => {
                  setSort("datum_desc");
                  setPage(1);
                }}
              >
                Newest by date (datum ↓)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setSort("datum_asc");
                  setPage(1);
                }}
              >
                Oldest by date (datum ↑)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => {
              resetFilters();
              setShowSuggestions(false);
            }}
            className="border-primary text-primary hover:bg-primary/10"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto mt-6">
        {/* Meta bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 flex-wrap gap-2">
          <div aria-live="polite" aria-atomic="true">
            {loading ? (
              <span>Searching…</span>
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <span>
                {total === 0
                  ? "No results"
                  : `Showing ${displayStart + 1}–${displayEnd} of ${total}`}
                {response?.durationMs != null && (
                  <span className="ml-2 opacity-60">
                    ({response.durationMs} ms)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <PageSizeCombobox />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
            >
              Next
            </Button>

            <div className="inline-flex items-center gap-1 rounded-xl bg-muted/10 p-1 ml-2">
              <Button
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
                onClick={() => setView("list")}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <ListIcon className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={view === "grid" ? "default" : "ghost"}
                onClick={() => setView("grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <GridIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && <ResultsSkeleton count={pageSize} view={view} />}

        {/* Empty state */}
        {!loading && !error && total === 0 && (
          <div
            className="text-center py-20 text-muted-foreground"
            role="status"
          >
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm mt-1">
              Try adjusting your search terms or clearing filters.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && total > 0 && (
          <ListGridView
            items={(response?.items ?? []) as any[]}
            view={view}
            inferRestrictionsFromText={() => []}
            toggleRestriction={toggleRestriction}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={
        count > 0
          ? {
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }
          : {
              backgroundColor: "transparent",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            }
      }
    >
      {count}
    </span>
  );
}

type FilterPopupProps = {
  placeholder: string;
  filterQuery: string;
  onFilterQueryChange: (v: string) => void;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
};

const FilterPopup = React.forwardRef<HTMLDivElement, FilterPopupProps>(
  function FilterPopup(
    {
      placeholder,
      filterQuery,
      onFilterQueryChange,
      options,
      selected,
      onToggle,
      onClear,
      onClose,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role="listbox"
        aria-multiselectable="true"
        className="absolute left-0 mt-2 z-50 w-72 rounded-2xl bg-popover p-2 shadow-2xl ring-1 ring-foreground/5 max-h-[50vh] overflow-y-auto"
      >
        <div className="px-1 py-1 mb-1">
          <Input
            placeholder={placeholder}
            value={filterQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onFilterQueryChange(e.target.value)
            }
            className="h-8 text-sm"
            autoFocus
            aria-label={placeholder}
          />
        </div>

        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
        ) : (
          <div className="space-y-0.5">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className="w-full text-left rounded-lg px-3 py-1.5 text-sm hover:bg-accent/10 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => onToggle(opt)}
                >
                  <span
                    className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? "bg-primary border-primary" : "border-border"
                    }`}
                    aria-hidden
                  >
                    {checked && (
                      <svg
                        viewBox="0 0 10 8"
                        className="size-2.5 text-primary-foreground fill-current"
                      >
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 truncate">{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mt-2 px-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="flex-1"
          >
            Clear
          </Button>
          <Button size="sm" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    );
  },
);

function ResultsSkeleton({
  count,
  view,
}: {
  count: number;
  view: "list" | "grid";
}) {
  const items = Array.from({ length: Math.min(count, 6) });
  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-4 bg-background animate-pulse"
          >
            <div className="h-32 bg-muted/30 rounded-md mb-3" />
            <div className="h-3 bg-muted/30 rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted/30 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <div
          key={i}
          className="rounded-xl border p-4 bg-background animate-pulse"
        >
          <div className="h-3 bg-muted/30 rounded w-2/3 mb-3" />
          <div className="h-3 bg-muted/30 rounded w-1/3 mb-2" />
          <div className="h-3 bg-muted/30 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
