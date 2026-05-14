import { create } from "zustand";
import { combine, devtools, persist } from "zustand/middleware";

export type SortType = "added_desc" | "added_asc" | "datum_desc" | "datum_asc";

type Filters = {
  query: string;
  selectedCredits: string[];
  selectedPhotographers: string[];
  selectedPublicationRestrictions: string[];
  selectedUnitedArchives: string[];
  dateFrom: string;
  dateTo: string;
  activeRestrictions: string[];
  view: "list" | "grid";
  sort: SortType;
  page: number;
  pageSize: number;
  // A simple numeric trigger that callers can update to force an immediate
  // re-run of the search effect (useful for external controls).
  searchTrigger: number;
};

const initialState: Filters = {
  query: "",
  selectedCredits: [],
  selectedPhotographers: [],
  selectedPublicationRestrictions: [],
  selectedUnitedArchives: [],
  dateFrom: "",
  dateTo: "",
  activeRestrictions: [],
  view: "list",
  sort: "added_desc",
  page: 1,
  pageSize: 10,
  searchTrigger: 0,
};

export type SearchFilterActions = {
  setView: (v: "list" | "grid") => void;
  setQuery: (q: string) => void;
  setSelectedCredits: (c: string[]) => void;
  setSelectedPhotographers: (c: string[]) => void;
  setSelectedPublicationRestrictions: (c: string[]) => void;
  setSelectedUnitedArchives: (c: string[]) => void;
  setDateFrom: (d: string) => void;
  setDateTo: (d: string) => void;
  setActiveRestrictions: (r: string[]) => void;
  setSort: (s: SortType) => void;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  setSearchTrigger: (n: number) => void;
  reset: () => void;
};

export type SearchFilterStore = Filters & SearchFilterActions;

export const useSearchFilterStore = create<SearchFilterStore>()(
  devtools(
    persist(
      combine(initialState, (set) => ({
        setView: (v: "list" | "grid") => set({ view: v }),
        setQuery: (q: string) => set({ query: q }),
        setSelectedCredits: (c: string[]) => set({ selectedCredits: c }),
        setSelectedPhotographers: (c: string[]) =>
          set({ selectedPhotographers: c }),
        setSelectedPublicationRestrictions: (c: string[]) =>
          set({ selectedPublicationRestrictions: c }),
        setSelectedUnitedArchives: (c: string[]) =>
          set({ selectedUnitedArchives: c }),
        setDateFrom: (d: string) => set({ dateFrom: d }),
        setDateTo: (d: string) => set({ dateTo: d }),
        setActiveRestrictions: (r: string[]) => set({ activeRestrictions: r }),
        setSort: (s: SortType) => set({ sort: s }),
        setPage: (p: number) => set({ page: p }),
        setPageSize: (n: number) => set({ pageSize: n }),
        setSearchTrigger: (n: number) => set({ searchTrigger: n }),

        reset: () => set(initialState),
      })),
      {
        name: "search-filters",
      },
    ),
    { name: "searchFilterStore" },
  ),
);

export default useSearchFilterStore;
