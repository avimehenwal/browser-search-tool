"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSidebar } from "@/components/app-sidebar";
import Card from "@/components/prototype/Card";
import ThemeToggle from "@/components/prototype/ThemeToggle";
import BigMetric from "@/components/ui/big-metric";
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
import { preprocessItem, type RawMediaItem } from "@/lib/api/preprocessor";
import { db } from "@/lib/db";
import useAddItemsStore from "@/store/addItemsStore";
import useMetricsStore from "@/store/metricsStore";
import { faker } from "@faker-js/faker";
import { useEffect, useState } from "react";
import { registerDexieIndexSync } from "../../../lib/indexSync";

export default function AddItemsPage() {
  const [generatingCount, setGeneratingCount] = useState(10);
  const indexCount = useMetricsStore((s) => s.flexCount);
  const dbCount = useMetricsStore((s) => s.photoCount);
  const refreshPhotoCount = useMetricsStore((s) => s.refreshPhotoCount);
  const refreshFlexCount = useMetricsStore((s) => s.refreshFlexCount);

  useEffect(() => {
    // Ensure metrics are refreshed on mount
    void refreshPhotoCount();
    void refreshFlexCount();
    // Poll index count periodically in case flexIndex updates internally
    const id = setInterval(() => {
      void refreshFlexCount();
    }, 1000);
    return () => clearInterval(id);
  }, [refreshPhotoCount, refreshFlexCount]);

  useEffect(() => {
    registerDexieIndexSync();
  }, []);

  const form = useAddItemsStore((s) => s.form);
  const logs = useAddItemsStore((s) => s.logs);
  const setFormField = useAddItemsStore((s) => s.setFormField);
  const resetForm = useAddItemsStore((s) => s.resetForm);
  const setStatus = useAddItemsStore((s) => s.setStatus);
  const appendLog = useAddItemsStore((s) => s.appendLog);
  const clearLogs = useAddItemsStore((s) => s.clearLogs);
  const bulk = useAddItemsStore((s) => s.bulk);
  const setBulkProgress = useAddItemsStore((s) => s.setBulkProgress);
  const setBulkRunning = useAddItemsStore((s) => s.setBulkRunning);
  const addBulkError = useAddItemsStore((s) => s.addBulkError);

  const handleAddSingle = async () => {
    setStatus("Adding...");
    appendLog("Starting single add...");
    try {
      const raw: RawMediaItem = {
        suchtext: form.suchtext || "",
        bildnummer: form.bildnummer || faker.string.uuid(),
        fotografen: form.fotografen || "",
        datum: form.datum || "",
        hoehe: form.hoehe,
        breite: form.breite,
      } as RawMediaItem;

      const processed = preprocessItem(raw);
      const record = {
        ...processed,
        bildnummer: raw.bildnummer,
        datum: processed.datumISO || raw.datum,
        datumISO: processed.datumISO,
        restrictions: processed.restrictions,
        creditNormalized: processed.creditNormalized,
        createdAt: new Date(),
      } as Record<string, unknown>;

      const id = await db.photoMetadata.add(record as any);
      appendLog(`Added record id=${id} bildnummer=${record.bildnummer}`);
      setStatus(`Added id ${id}`);
      resetForm();
      // Refresh metrics so the UI reflects the new DB/index counts
      void refreshPhotoCount();
      void refreshFlexCount();
    } catch (e: any) {
      console.error(e);
      appendLog(`Add failed: ${String(e?.message || e)}`);
      setStatus("Add failed");
    }
  };

  const handleGenerate = async (count: number) => {
    clearLogs();
    setBulkRunning(true);
    setBulkProgress(0, count);
    appendLog(`Starting generation of ${count} items...`);
    let processed = 0;
    try {
      for (let i = 0; i < count; i++) {
        const raw: RawMediaItem = {
          suchtext: faker.lorem.sentence(),
          bildnummer: faker.string.uuid(),
          fotografen: `${faker.person.firstName()} ${faker.person.lastName()}`,
          datum: faker.date.past({ years: 10 }).toISOString().slice(0, 10),
        } as RawMediaItem;

        const processedItem = preprocessItem(raw);
        const record = {
          ...processedItem,
          bildnummer: raw.bildnummer,
          datum: processedItem.datumISO || raw.datum,
          datumISO: processedItem.datumISO,
          restrictions: processedItem.restrictions,
          creditNormalized: processedItem.creditNormalized,
          createdAt: new Date(),
        } as Record<string, unknown>;

        try {
          const id = await db.photoMetadata.add(record as any);
          processed++;
          setBulkProgress(processed, count);
          appendLog(`Inserted ${processed}/${count} id=${id}`);
        } catch (err: any) {
          addBulkError(String(err?.message || err));
          appendLog(`Insert error: ${String(err?.message || err)}`);
        }
      }
      appendLog(`Generation complete: ${processed} inserted`);
      // Refresh metrics after bulk insertion completes
      void refreshPhotoCount();
      void refreshFlexCount();
    } catch (e: any) {
      console.error(e);
      appendLog(`Generation failed: ${String(e?.message || e)}`);
    } finally {
      setBulkRunning(false);
      setStatus(`Generated ${processed} items`);
    }
  };

  const handleAutoFill = () => {
    // Populate the manual entry form with realistic fake values
    setFormField("bildnummer", faker.string.uuid());
    setFormField(
      "fotografen",
      `${faker.person.firstName()} ${faker.person.lastName()}`,
    );
    setFormField(
      "datum",
      faker.date.past({ years: 10 }).toISOString().slice(0, 10),
    );
    setFormField("suchtext", faker.lorem.sentence());
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
                    <h1 className="h1">Add Items</h1>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <div className="text-3xl m-1 px-8">Add Items</div>
        <div className="px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <BigMetric title="IndexedDB records" value={dbCount} />
            <BigMetric title="FlexSearch documents" value={indexCount} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-6 px-4 py-6">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={"Manual entry (full form)"}>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Fill all fields and click Add to insert a single record.
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Bildnummer</label>
                  <Input
                    value={form.bildnummer}
                    onChange={(e) => setFormField("bildnummer", e.target.value)}
                    placeholder="Unique picture identifier"
                  />

                  <label className="text-sm">Fotografen</label>
                  <Input
                    value={form.fotografen}
                    onChange={(e) => setFormField("fotografen", e.target.value)}
                    placeholder="Photographer name"
                  />

                  <label className="text-sm">Datum</label>
                  <Input
                    value={form.datum}
                    onChange={(e) => setFormField("datum", e.target.value)}
                    placeholder="yyyy-MM-dd or dd.MM.yyyy"
                  />

                  <label className="text-sm">Suchtext</label>
                  <Input
                    value={form.suchtext}
                    onChange={(e) => setFormField("suchtext", e.target.value)}
                    placeholder="Search text / description"
                  />

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => resetForm()}>
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAutoFill}
                      className="border-primary"
                    >
                      Auto-fill
                    </Button>
                    <Button onClick={handleAddSingle}>Add</Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card title={"Generate with Faker (bulk)"}>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Generate fake items and insert into IndexedDB + index.
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={String(generatingCount)}
                    onChange={(e) => setGeneratingCount(Number(e.target.value))}
                    placeholder="Number to generate"
                  />
                  <Button
                    onClick={() => handleGenerate(generatingCount)}
                    disabled={bulk.isRunning}
                  >
                    {bulk.isRunning
                      ? `Running (${bulk.processed}/${bulk.total})`
                      : "Generate"}
                  </Button>
                </div>

                <div className="text-sm">
                  <strong>Progress:</strong> {bulk.processed}/{bulk.total}
                </div>
                <div className="text-sm">
                  <strong>Status:</strong>{" "}
                  {useAddItemsStore((s) => s.status) ?? "idle"}
                </div>
              </div>
            </Card>
          </div>

          <div className="w-full max-w-7xl mx-auto">
            <Card title={"Activity & Logs"}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button onClick={() => clearLogs()}>Clear Logs</Button>
                  <div className="text-sm text-muted-foreground">
                    Recent activity
                  </div>
                </div>
                <div className="max-h-60 overflow-auto bg-muted/10 p-2 rounded">
                  {logs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No logs</div>
                  ) : (
                    logs.map((l, i) => (
                      <div key={i} className="text-sm">
                        {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
