"use client";

import { Button } from "@/components/ui/button";
import type { Result as PhotoResult } from "@/lib/db";

type Props = {
  items: PhotoResult[];
  view: "list" | "grid";
  inferRestrictionsFromText: (text: string) => string[];
  toggleRestriction: (r: string) => void;
};

export default function ListGridView({
  items,
  view,
  inferRestrictionsFromText,
  toggleRestriction,
}: Props) {
  if (view === "list") {
    return (
      <div className="space-y-3">
        {items.map((r) => (
          <div
            key={r.bildnummer}
            className="rounded-xl border p-3 bg-background"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">
                  {(r as any).highlight ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (r as any).highlight as string,
                      }}
                    />
                  ) : (
                    r.suchtext
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.fotografen}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {r.bildnummer} • {r.datum}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-muted-foreground">
                  {r.hoehe}×{r.breite}
                </div>
                <div className="flex gap-1">
                  {inferRestrictionsFromText(r.suchtext).map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="xs"
                      onClick={() => toggleRestriction(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((r) => (
        <div
          key={r.bildnummer}
          className="rounded-xl border p-3 bg-background flex flex-col"
        >
          <div className="h-40 bg-muted/5 rounded-md mb-3 flex items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
          <div className="flex-1">
            <div className="font-medium">
              {(r as any).highlight ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: (r as any).highlight as string,
                  }}
                />
              ) : (
                r.suchtext
              )}
            </div>
            <div className="text-sm text-muted-foreground">{r.fotografen}</div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <div>{r.bildnummer}</div>
            <div>
              {r.hoehe}×{r.breite}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
