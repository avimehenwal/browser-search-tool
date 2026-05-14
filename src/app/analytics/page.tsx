"use client";

import { AppSidebar } from "@/components/app-sidebar";
import Card from "@/components/prototype/Card";
import LatencyChart from "@/components/prototype/LatencyChart";
import ThemeToggle from "@/components/prototype/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import BigMetric from "@/components/ui/big-metric";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { AnalyticsSummary } from "@/lib/api";
import { clearAnalytics, getAnalyticsSummary } from "@/lib/api";
import useMetricsStore from "@/store/metricsStore";

import useAnalyticsStore from "@/store/analyticsStore";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const records = useAnalyticsStore((s) => s.records || []);
  const clear = useAnalyticsStore((s) => s.clear);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const refreshPhotoCount = useMetricsStore((s) => s.refreshPhotoCount);
  const refreshFlexCount = useMetricsStore((s) => s.refreshFlexCount);

  useEffect(() => {
    void refreshPhotoCount();
    void refreshFlexCount();
  }, [refreshPhotoCount, refreshFlexCount]);

  // Load summary from IndexedDB on mount and whenever records change
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getAnalyticsSummary(5000);
        if (!mounted) return;
        setSummary(s);
        // Sync into zustand so the latency chart renders immediately
        if (s.recentSearches.length > 0) {
          useAnalyticsStore.setState({ records: s.recentSearches });
        }
      } catch (err) {
        console.warn("failed to load analytics summary", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const total = summary?.totalSearches ?? records.length;
  const avgMs = summary?.avgDurationMs ?? 0;
  const fastest = summary?.fastestMs ?? 0;
  const slowest = summary?.slowestMs ?? 0;
  const topKeywords = summary?.topKeywords ?? [];

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
                    Analytics
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <h1 className="text-3xl m-1 px-8">Analytics</h1>
        <div className="flex flex-1 flex-col gap-6 px-4 py-10">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <BigMetric
                title="IndexedDB records"
                value={useMetricsStore((s) => s.photoCount)}
              />
              <BigMetric
                title="FlexSearch documents"
                value={useMetricsStore((s) => s.flexCount)}
              />
              <Card title="Total Searches">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold">{total}</div>
                  <Badge>{total}</Badge>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <Card title="Average Query Time">
                <div className="text-2xl font-semibold">{avgMs} ms</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Fastest: {fastest} ms • Slowest: {slowest} ms
                </div>
              </Card>

              <Card title="Actions">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await clearAnalytics();
                    } catch (err) {
                      console.warn("clearAnalytics failed", err);
                    }
                    clear();
                    setSummary(null);
                  }}
                >
                  Clear History
                </Button>
              </Card>
            </div>

            {/* ── Latency chart ─────────────────────────────────────── */}
            <div className="mb-6">
              <Card title="Latency (last 50 searches)">
                <LatencyChart
                  data={records
                    .slice(0, 50)
                    .map((r) => r.durationMs)
                    .reverse()}
                  height={64}
                />
              </Card>
            </div>

            {/* ── Top keywords ──────────────────────────────────────── */}
            {topKeywords.length > 0 && (
              <div className="mb-6">
                <Card title="Most Common Keywords">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {topKeywords.map(({ keyword, count }) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                      >
                        <span className="font-medium">{keyword}</span>
                        <Badge>{count}</Badge>
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Search history table ──────────────────────────────── */}
            <Card title="Search History">
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Query</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={`${r.timestamp}-${i}`} className="border-t">
                        <td className="px-3 py-2 align-top whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="max-w-xl break-words">
                            {r.query || (
                              <span className="text-muted-foreground italic">
                                browse
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {r.durationMs} ms
                        </td>
                        <td className="px-3 py-2 align-top tabular-nums">
                          {r.resultsCount}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-muted-foreground text-sm"
                        >
                          No searches recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
