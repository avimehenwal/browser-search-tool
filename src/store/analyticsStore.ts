import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type AnalyticsRecord = {
  query: string;
  timestamp: number;
  durationMs: number;
  resultsCount: number;
};

type AnalyticsState = {
  records: AnalyticsRecord[];
  addSearch: (rec: AnalyticsRecord) => void;
  clear: () => void;
};

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    persist(
      (set, get) => ({
        records: [],
        addSearch: (rec: AnalyticsRecord) =>
          set(() => {
            const next = [rec, ...(get().records || [])];
            return { records: next.slice(0, 5000) };
          }),
        clear: () => set({ records: [] }),
      }),
      { name: "analytics-store" },
    ),
    { name: "analyticsStore" },
  ),
);

export default useAnalyticsStore;
