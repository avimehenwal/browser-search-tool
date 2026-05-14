import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type IndexAnalytics = {
  status: "idle" | "building" | "ready" | "error";
  createdAt?: string | null;
  updatedAt?: string | null;
  lastBuildDurationMs?: number;
  builtCount?: number;
  lastError?: string | null;
  progress?: { processed: number; total?: number };
};

type IndexState = {
  indexAnalytics: IndexAnalytics;
  setIndexBuildStart?: () => void;
  setIndexBuildProgress?: (processed: number, total?: number) => void;
  setIndexBuildComplete?: (builtCount: number, durationMs: number) => void;
  setIndexBuildError?: (err: string) => void;
  resetIndexAnalytics?: () => void;
};

const initialAnalytics: IndexAnalytics = {
  status: "idle",
  createdAt: null,
  updatedAt: null,
  lastBuildDurationMs: 0,
  builtCount: 0,
  lastError: null,
  progress: { processed: 0, total: 0 },
};

export const useIndexStore = create<IndexState>()(
  devtools(
    persist<IndexState>(
      (set) => ({
        indexAnalytics: initialAnalytics,

        setIndexBuildStart: () =>
          set((state) => ({
            indexAnalytics: {
              ...state.indexAnalytics,
              status: "building",
              createdAt: new Date().toISOString(),
              // reset some fields
              lastBuildDurationMs: 0,
              builtCount: 0,
              lastError: null,
              progress: { processed: 0, total: 0 },
            },
          })),

        setIndexBuildProgress: (processed: number, total?: number) =>
          set((state) => ({
            indexAnalytics: {
              ...state.indexAnalytics,
              status: "building",
              progress: { processed, total },
            },
          })),

        setIndexBuildComplete: (builtCount: number, durationMs: number) =>
          set((state) => ({
            indexAnalytics: {
              ...state.indexAnalytics,
              status: "ready",
              lastBuildDurationMs: durationMs,
              builtCount,
              lastError: null,
              progress: {
                processed: builtCount,
                total: state.indexAnalytics?.progress?.total,
              },
              updatedAt: new Date().toISOString(),
            },
          })),

        setIndexBuildError: (err: string) =>
          set((state) => ({
            indexAnalytics: {
              ...state.indexAnalytics,
              status: "error",
              lastError: err,
            },
          })),

        resetIndexAnalytics: () => set({ indexAnalytics: initialAnalytics }),
      }),
      {
        name: "index-store",
      },
    ),
  ),
);

export default useIndexStore;
