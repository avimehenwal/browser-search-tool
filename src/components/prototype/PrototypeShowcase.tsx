"use client";

import { useState } from "react";
import { IconButton, PrimaryButton, SecondaryButton } from "./Buttons";
import Card from "./Card";
import { GridIcon, ListIcon } from "./Icons";
import { GridView, ListView } from "./ListGrid";
import SearchInput from "./SearchInput";
import ThemeToggle from "./ThemeToggle";

type Item = { id: number; title: string; desc?: string };

const SAMPLE_ITEMS: Item[] = [
  { id: 1, title: "Apple", desc: "A red fruit" },
  { id: 2, title: "Banana", desc: "A yellow fruit" },
  { id: 3, title: "Cherry", desc: "Small red fruit" },
  { id: 4, title: "Date", desc: "Dry fruit" },
  { id: 5, title: "Elderberry", desc: "Small dark berry" },
  { id: 6, title: "Fig", desc: "Sweet fruit" },
];

export default function PrototypeShowcase() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const items = SAMPLE_ITEMS.filter((it) =>
    it.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search items..."
          />
        </div>
        <div className="flex gap-2">
          <PrimaryButton onClick={() => alert("Primary action")}>
            Primary
          </PrimaryButton>
          <SecondaryButton onClick={() => alert("Secondary action")}>
            Secondary
          </SecondaryButton>
          <ThemeToggle />
          <IconButton
            onClick={() => setView(view === "list" ? "grid" : "list")}
            aria-label={
              view === "list" ? "Switch to grid view" : "Switch to list view"
            }
          >
            {view === "list" ? (
              <GridIcon className="w-5 h-5" />
            ) : (
              <ListIcon className="w-5 h-5" />
            )}
          </IconButton>
        </div>
      </div>

      <Card title="Example card">
        <p className="text-sm text-gray-600">
          Cards are useful for showing search results and metadata.
        </p>
      </Card>

      <div>
        {view === "list" ? (
          <ListView items={items} />
        ) : (
          <GridView items={items} />
        )}
      </div>
    </section>
  );
}
