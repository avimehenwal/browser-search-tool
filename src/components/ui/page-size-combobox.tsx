"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import useSearchFilterStore from "@/store/searchFilterStore";
import { useCallback, useState } from "react";

const PAGE_OPTIONS = Array.from({ length: 9 }).map((_, i) => 10 + i * 5);

export default function PageSizeCombobox() {
  const pageSize = useSearchFilterStore((s) => s.pageSize);
  const setPageSize = useSearchFilterStore((s) => s.setPageSize);
  const setPage = useSearchFilterStore((s) => s.setPage);
  const setSearchTrigger = useSearchFilterStore((s) => s.setSearchTrigger);

  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const applySize = useCallback(
    (n: number) => {
      setPageSize(n);
      setPage(1);
      try {
        // Trigger an immediate search effect in the parent component
        // (DashboardSearch listens to `searchTrigger`).
        setSearchTrigger?.(Date.now());
      } catch {}
    },
    [setPageSize, setPage, setSearchTrigger],
  );

  const submitCustom = useCallback(() => {
    setError(null);
    const n = Number(custom);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      setError("Enter a positive integer");
      return;
    }
    if (n > 1000) {
      setError("Maximum is 1000");
      return;
    }
    applySize(n);
    setCustom("");
    setOpen(false);
  }, [custom, applySize]);

  return (
    <DropdownMenu open={open} onOpenChange={(v) => setOpen(Boolean(v))}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/10"
          >
            {pageSize} per page
          </Button>
        }
      />

      <DropdownMenuContent className="w-64">
        {PAGE_OPTIONS.map((n) => (
          <DropdownMenuItem
            key={n}
            onSelect={() => {
              applySize(n);
              setOpen(false);
            }}
          >
            {n} per page
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="px-3 py-2">
          <label className="text-xs text-muted-foreground">
            Custom size (1–1000)
          </label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min={1}
              max={1000}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. 100"
              className="h-9"
            />
            <Button size="sm" onClick={submitCustom}>
              Set
            </Button>
          </div>
          {error && (
            <div className="text-xs text-destructive mt-2">{error}</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
