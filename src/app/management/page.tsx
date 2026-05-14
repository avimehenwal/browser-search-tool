"use client";

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
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import useIndexBuilder from "@/hooks/useIndexBuilder";
import { clearPhotoMetadata, deleteDatabase } from "@/lib/db";
import useMetricsStore from "@/store/metricsStore";
import { useEffect, useState } from "react";

export default function ManagementPage() {
  const { build, indexAnalytics } = useIndexBuilder();
  const [isBuilding, setIsBuilding] = useState(false);
  const [useWorker] = useState(true);
  const photoCount = useMetricsStore((s) => s.photoCount);
  const flexCount = useMetricsStore((s) => s.flexCount);
  const refreshPhotoCount = useMetricsStore((s) => s.refreshPhotoCount);
  const refreshFlexCount = useMetricsStore((s) => s.refreshFlexCount);

  useEffect(() => {
    // Refresh metrics initially and whenever the index metadata changes
    void refreshPhotoCount();
    void refreshFlexCount();
  }, [indexAnalytics.updatedAt, refreshPhotoCount, refreshFlexCount]);

  const handleClearDB = async () => {
    if (!confirm("Clear photo metadata table? This cannot be undone.")) return;
    try {
      await clearPhotoMetadata();
      await refreshPhotoCount();
      alert("Photo metadata cleared.");
    } catch (e) {
      console.error(e);
      alert("Failed to clear database.");
    }
  };

  const handleDeleteDB = async () => {
    if (!confirm("Delete the entire IndexedDB database? Page will reload."))
      return;
    try {
      await deleteDatabase();
      alert("Database deleted. Reloading.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to delete database.");
    }
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    try {
      await build({ useWorker });
      await refreshPhotoCount();
    } catch (e) {
      console.error(e);
    } finally {
      setIsBuilding(false);
    }
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
                    <h1 className="h1">Management</h1>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <h1 className="text-3xl m-1 px-8">Management</h1>
        <div className="px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <BigMetric title="IndexedDB records" value={photoCount} />
            <BigMetric title="FlexSearch documents" value={flexCount} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-6 px-4 py-10">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={"IndexedDB"}>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Manage the local IndexedDB store for photo metadata.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={async () => {
                      await refreshPhotoCount();
                    }}
                  >
                    Refresh Count
                  </Button>
                  <Button variant="destructive" onClick={handleClearDB}>
                    Clear DB
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteDB}>
                    Delete DB
                  </Button>
                </div>
                <div className="text-sm">
                  <strong>Indexed records:</strong> {photoCount ?? "—"}
                </div>
              </div>
            </Card>

            <Card title={"FlexSearch Index"}>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Build and inspect the FlexSearch index used for fast lookups.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleBuild}
                    disabled={
                      isBuilding || indexAnalytics.status === "building"
                    }
                  >
                    {isBuilding || indexAnalytics.status === "building"
                      ? "Building..."
                      : "Build Index"}
                  </Button>
                  {/* <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useWorker}
                      onChange={(e) => setUseWorker(e.target.checked)}
                    />
                    Use Web Worker
                  </label> */}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-3">
                    <strong>Status:</strong>
                    <div className="text-sm text-muted-foreground">
                      {indexAnalytics.status}
                    </div>
                  </div>
                  <div>
                    <strong>Built Count:</strong>{" "}
                    {indexAnalytics.builtCount ?? 0}
                  </div>
                  <div>
                    <strong>Last Duration:</strong>{" "}
                    {indexAnalytics.lastBuildDurationMs ?? 0} ms
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
