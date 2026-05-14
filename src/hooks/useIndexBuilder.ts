import useIndexStore from "@/store/indexStore";
import { useCallback } from "react";
import flexIndex from "../lib/flexIndex";

export function useIndexBuilder() {
  const indexAnalytics = useIndexStore((s: any) => s.indexAnalytics);
  const setIndexBuildProgress = useIndexStore(
    (s: any) => s.setIndexBuildProgress,
  );
  const setIndexBuildError = useIndexStore((s: any) => s.setIndexBuildError);

  const build = useCallback(
    async (opts?: {
      batchSize?: number;
      concurrency?: number;
      useWorker?: boolean;
    }) => {
      try {
        await flexIndex.buildIndexFromIndexedDB({
          ...opts,
          progressCb: (processed: number, total: number) => {
            setIndexBuildProgress?.(processed, total);
          },
        });
      } catch (e: any) {
        setIndexBuildError?.(e?.message || String(e));
        throw e;
      }
    },
    [setIndexBuildProgress, setIndexBuildError],
  );

  return { build, indexAnalytics } as const;
}

export default useIndexBuilder;
