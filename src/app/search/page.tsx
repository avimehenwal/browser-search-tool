"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { GridIcon, ListIcon, SearchIcon } from "@/components/prototype/Icons";
import ListGridView from "@/components/prototype/ListGridView";
import ThemeToggle from "@/components/prototype/ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { addAnalyticsRecord } from "@/lib/analytics.repo";
import type { Result } from "@/lib/db";
import { searchIndex } from "@/lib/index.repo";
import { useEffect, useMemo, useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    (Result & { highlight?: string | null })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!query || String(query).trim().length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const start = performance.now();
        const hits = await searchIndex(query, 100);
        const durationMs = Math.round(performance.now() - start);
        if (cancelled) return;
        const docs = (hits || [])
          .map((h) => {
            const d = (h.doc ? (h.doc as Result) : null) as
              | (Result & {
                  highlight?: string | null;
                })
              | null;
            if (!d) return null;
            const raw = h.highlight ?? null;
            const highlighted = raw
              ? String(raw).replace(
                  /<mark>/g,
                  '<mark class="search-highlight">',
                )
              : null;
            return { ...d, highlight: highlighted };
          })
          .filter(Boolean) as (Result & { highlight?: string | null })[];
        setResults(docs);
        try {
          await addAnalyticsRecord({
            query,
            timestamp: Date.now(),
            durationMs: typeof durationMs === "number" ? durationMs : 0,
            resultsCount: (hits || []).length || 0,
          });
        } catch (err) {
          // ignore analytics errors
          console.warn("failed to persist analytics", err);
        }
      } catch (e) {
        console.error("search failed", e);
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const inferRestrictionsFromText = useMemo(() => {
    return (_text: string) => {
      void _text;
      return [] as string[];
    };
  }, []);

  const toggleRestriction = (_r: string) => {
    void _r;
    // noop for simple search page
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    <h1 className="h1">Index Search</h1>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <h1 className="text-3xl m-1 px-8">Simple Index Search</h1>

        <div className="flex flex-1 flex-col gap-6 px-4 py-10">
          <div className="w-full max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the index..."
                    className="h-12 pl-10"
                    aria-label="Search"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-2">
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <ListIcon className="size-4" />
                </Button>
                <Button
                  variant={view === "grid" ? "default" : "ghost"}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                >
                  <GridIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <div>Results: {loading ? "Searching..." : results.length}</div>
              </div>

              <div className="h-[60vh] overflow-auto">
                <ListGridView
                  items={results as Result[]}
                  view={view}
                  inferRestrictionsFromText={inferRestrictionsFromText}
                  toggleRestriction={toggleRestriction}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
