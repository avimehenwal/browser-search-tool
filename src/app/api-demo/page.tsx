"use client";

import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/prototype/ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { SearchRequest, SearchResponse } from "@/lib/api";
import { searchAPI } from "@/lib/api";
import React, { ChangeEvent, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// API Reference docs (static)
// ---------------------------------------------------------------------------

const API_PARAMS = [
  {
    name: "q",
    type: "string",
    required: false,
    description:
      "Full-text keyword query. Searched across suchtext (primary), fotografen (secondary), bildnummer (tertiary). Uses forward tokenization — prefix matches work.",
  },
  {
    name: "credit",
    type: "string",
    required: false,
    description:
      "Filter by photographer credit (fotografen). Contains-match after lowercasing. Example: IMAGO / teutopress",
  },
  {
    name: "dateFrom",
    type: "string (yyyy-MM-dd)",
    required: false,
    description:
      "Inclusive start date for the datum field. Example: 1990-01-01",
  },
  {
    name: "dateTo",
    type: "string (yyyy-MM-dd)",
    required: false,
    description: "Inclusive end date for the datum field. Example: 2000-12-31",
  },
  {
    name: "restrictions",
    type: "string[]",
    required: false,
    description:
      'Publication restriction codes extracted from suchtext. Example: ["GER","SUI"]. A result matches if it carries ANY of the listed codes.',
  },
  {
    name: "sort",
    type: '"datum_asc" | "datum_desc"',
    required: false,
    description: "Sort order by datum. Defaults to datum_desc (newest first).",
  },
  {
    name: "page",
    type: "number",
    required: false,
    description: "1-based page number. Defaults to 1.",
  },
  {
    name: "pageSize",
    type: "number (1–100)",
    required: false,
    description: "Items per page. Defaults to 10.",
  },
] as const;

const RESPONSE_SHAPE = `{
  "items": [
    {
      "bildnummer": "0059987730",
      "fotografen": "IMAGO / United Archives International",
      "datum": "1900-01-01",
      "datumFormatted": "01.01.1900",
      "suchtext": "J.Morris, Manchester Utd ...",
      "hoehe": "2460",
      "breite": "3643",
      "restrictions": ["IN", "GER", "SUI", "AUT"],
      "highlight": "J.<mark>Morris</mark>, Manchester Utd ..."
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 105,
  "totalPages": 11,
  "durationMs": 4
}`;

const SCALE_NOTE = `
How this scales:

10,000 items  → In-memory FlexSearch forward index: < 10 ms per query.
               Dexie/IndexedDB browse with native indexes: < 5 ms.

Millions       → The browser's memory budget (~500 MB) is the hard ceiling.
               Recommended migration path:
               1. Move search to a server (Elasticsearch, Typesense, MeiliSearch).
               2. The SearchRequest/SearchResponse contract stays identical —
                  only replace "await searchAPI(req)" with
                  "await fetch('/api/search?' + new URLSearchParams(req as any))".
               3. Or: shard the FlexSearch index by date/credit bucket and
                  only load the relevant shard into memory per query.

Incremental    → New item every minute:
               1. preprocessItem(raw) → normalise datum, extract restrictions.
               2. db.photoMetadata.add(processed)  (IndexedDB persist).
               3. addDocumentToIndex(processed)     (FlexSearch incremental add).
               No full index rebuild required; latency stays low.
`.trim();

// ---------------------------------------------------------------------------
// Playground state
// ---------------------------------------------------------------------------

type PlaygroundForm = {
  q: string;
  credit: string;
  dateFrom: string;
  dateTo: string;
  restrictions: string;
  sort: "datum_asc" | "datum_desc";
  page: string;
  pageSize: string;
};

const DEFAULT_FORM: PlaygroundForm = {
  q: "",
  credit: "",
  dateFrom: "",
  dateTo: "",
  restrictions: "",
  sort: "datum_desc",
  page: "1",
  pageSize: "5",
};

function formToRequest(f: PlaygroundForm): SearchRequest {
  return {
    q: f.q || undefined,
    credit: f.credit || undefined,
    dateFrom: f.dateFrom || undefined,
    dateTo: f.dateTo || undefined,
    restrictions: f.restrictions
      ? f.restrictions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    sort: f.sort,
    page: parseInt(f.page, 10) || 1,
    pageSize: parseInt(f.pageSize, 10) || 5,
  };
}

function requestToUrl(req: SearchRequest): string {
  const params = new URLSearchParams();
  if (req.q) params.set("q", req.q);
  if (req.credit) params.set("credit", req.credit);
  if (req.dateFrom) params.set("dateFrom", req.dateFrom);
  if (req.dateTo) params.set("dateTo", req.dateTo);
  if (req.restrictions?.length)
    params.set("restrictions", req.restrictions.join(","));
  if (req.sort) params.set("sort", req.sort);
  params.set("page", String(req.page ?? 1));
  params.set("pageSize", String(req.pageSize ?? 5));
  return `/api/search?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApiDemoPage() {
  const [form, setForm] = useState<PlaygroundForm>(DEFAULT_FORM);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField =
    (field: keyof PlaygroundForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const req = formToRequest(form);
      const res = await searchAPI(req);
      setResponse(res);
    } catch (e) {
      setError(String(e));
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on mount with defaults
  useEffect(() => {
    void handleExecute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equivalentUrl = requestToUrl(formToRequest(form));

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
                  <BreadcrumbPage>API Reference</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-col gap-8 px-6 py-8 max-w-5xl mx-auto w-full">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <section>
            <h1 className="text-3xl font-bold">GET /api/search</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              This app implements a fully typed search service that mirrors a
              REST API. Because it is a static Next.js site (
              <code className="text-xs bg-muted px-1 rounded">
                output: &quot;export&quot;
              </code>
              ) the endpoint runs entirely in the browser using FlexSearch +
              IndexedDB. Switching to a server deployment requires only
              replacing{" "}
              <code className="text-xs bg-muted px-1 rounded">
                searchAPI(req)
              </code>{" "}
              with{" "}
              <code className="text-xs bg-muted px-1 rounded">
                fetch(&apos;/api/search?&apos; + params)
              </code>
              .
            </p>
          </section>

          {/* ── Parameters table ────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Query Parameters</h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-2 font-semibold">Parameter</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Required</th>
                    <th className="px-4 py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {API_PARAMS.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">
                        {p.name}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {p.type}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {p.required ? (
                          <span className="text-destructive font-semibold">
                            yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">no</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {p.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Response shape ──────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Response Shape</h2>
            <pre className="rounded-xl bg-muted/20 p-4 text-xs overflow-x-auto border font-mono leading-relaxed">
              {RESPONSE_SHAPE}
            </pre>
          </section>

          {/* ── Preprocessing note ──────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold mb-3">
              Preprocessing &amp; Relevance
            </h2>
            <div className="rounded-xl border p-4 bg-muted/10 text-sm space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">Date normalisation</strong>{" "}
                — German{" "}
                <code className="bg-muted px-1 rounded">dd.MM.yyyy</code> is
                converted to ISO{" "}
                <code className="bg-muted px-1 rounded">yyyy-MM-dd</code> at
                ingest time. This enables reliable date-range filtering and
                chronological sorting.
              </p>
              <p>
                <strong className="text-foreground">
                  Restriction extraction
                </strong>{" "}
                —{" "}
                <code className="bg-muted px-1 rounded">
                  PUBLICATIONxGERxSUIxAUTxONLY
                </code>{" "}
                is parsed into{" "}
                <code className="bg-muted px-1 rounded">
                  [&quot;GER&quot;, &quot;SUI&quot;, &quot;AUT&quot;]
                </code>{" "}
                during preprocessing so restriction filters use exact code
                matches instead of substring search.
              </p>
              <p>
                <strong className="text-foreground">Relevance ranking</strong> —
                FlexSearch forward-tokenises{" "}
                <code className="bg-muted px-1 rounded">suchtext</code>{" "}
                (primary),{" "}
                <code className="bg-muted px-1 rounded">fotografen</code>{" "}
                (secondary), and{" "}
                <code className="bg-muted px-1 rounded">bildnummer</code>{" "}
                (tertiary). Hits are de-duplicated and returned in relevance
                order. Prefix matching is supported natively.
              </p>
              <pre className="rounded-lg bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap border">
                {SCALE_NOTE}
              </pre>
            </div>
          </section>

          {/* ── Live playground ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Live Playground</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: form */}
              <div className="space-y-4">
                <Field label="q (keyword)" htmlFor="pg-q">
                  <Input
                    id="pg-q"
                    placeholder="jackson"
                    value={form.q}
                    onChange={setField("q")}
                  />
                </Field>

                <Field label="credit (fotografen filter)" htmlFor="pg-credit">
                  <Input
                    id="pg-credit"
                    placeholder="IMAGO / teutopress"
                    value={form.credit}
                    onChange={setField("credit")}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="dateFrom (yyyy-MM-dd)" htmlFor="pg-from">
                    <Input
                      id="pg-from"
                      type="date"
                      value={form.dateFrom}
                      onChange={setField("dateFrom")}
                    />
                  </Field>
                  <Field label="dateTo (yyyy-MM-dd)" htmlFor="pg-to">
                    <Input
                      id="pg-to"
                      type="date"
                      value={form.dateTo}
                      onChange={setField("dateTo")}
                    />
                  </Field>
                </div>

                <Field
                  label="restrictions (comma-separated codes)"
                  htmlFor="pg-restrictions"
                >
                  <Input
                    id="pg-restrictions"
                    placeholder="GER, SUI"
                    value={form.restrictions}
                    onChange={setField("restrictions")}
                  />
                </Field>

                <Field label="sort" htmlFor="pg-sort">
                  <select
                    id="pg-sort"
                    value={form.sort}
                    onChange={setField("sort")}
                    className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="datum_desc">
                      datum_desc (newest first)
                    </option>
                    <option value="datum_asc">datum_asc (oldest first)</option>
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="page" htmlFor="pg-page">
                    <Input
                      id="pg-page"
                      type="number"
                      min={1}
                      value={form.page}
                      onChange={setField("page")}
                    />
                  </Field>
                  <Field label="pageSize" htmlFor="pg-pagesize">
                    <Input
                      id="pg-pagesize"
                      type="number"
                      min={1}
                      max={100}
                      value={form.pageSize}
                      onChange={setField("pageSize")}
                    />
                  </Field>
                </div>

                {/* Equivalent URL */}
                <div className="rounded-xl bg-muted/20 border p-3">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    Equivalent HTTP request
                  </p>
                  <code className="text-xs font-mono break-all text-primary">
                    GET {equivalentUrl}
                  </code>
                </div>

                <Button
                  onClick={handleExecute}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Executing…" : "Execute Request"}
                </Button>
              </div>

              {/* Right: response */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Response</p>

                {error && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {response && (
                  <div className="space-y-2">
                    {/* Summary */}
                    <div className="flex gap-3 text-sm">
                      <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold">
                        {response.total} total
                      </span>
                      <span className="rounded-full bg-muted/30 px-3 py-0.5 text-xs font-semibold">
                        page {response.page}/{response.totalPages}
                      </span>
                      <span className="rounded-full bg-muted/30 px-3 py-0.5 text-xs font-semibold">
                        {response.durationMs} ms
                      </span>
                    </div>

                    {/* Raw JSON */}
                    <pre className="rounded-xl bg-muted/20 border p-4 text-xs font-mono overflow-auto max-h-[500px] leading-relaxed">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                )}

                {!response && !loading && !error && (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    Execute a request to see the response here.
                  </div>
                )}

                {loading && (
                  <div className="text-sm text-muted-foreground py-8 text-center animate-pulse">
                    Running…
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Code example ────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Code Example</h2>
            <pre className="rounded-xl bg-muted/20 border p-4 text-xs font-mono overflow-x-auto leading-relaxed">
              {`// Client-side (current implementation)
import { searchAPI } from '@/lib/api';

const response = await searchAPI({
  q: 'manchester',
  credit: 'IMAGO / United Archives International',
  dateFrom: '1940-01-01',
  dateTo: '1960-12-31',
  restrictions: ['GER', 'SUI'],
  sort: 'datum_desc',
  page: 1,
  pageSize: 10,
});

console.log(response.total);        // total matching items
console.log(response.items[0]);     // first result
console.log(response.durationMs);   // query time in ms

// ──────────────────────────────────────────────────────────────
// Server-side migration (drop-in replacement):
// ──────────────────────────────────────────────────────────────

// Replace the searchAPI import with:
async function searchAPI(req) {
  const params = new URLSearchParams(
    Object.entries(req).filter(([, v]) => v !== undefined)
  );
  const res = await fetch(\`/api/search?\${params}\`);
  return res.json();
}
// The response shape is identical — no other changes needed.`}
            </pre>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// ---------------------------------------------------------------------------
// Tiny helper
// ---------------------------------------------------------------------------
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
