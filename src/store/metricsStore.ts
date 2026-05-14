import { db } from "@/lib/db";
import { getIndexCount } from "@/lib/flexIndex";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type MetricsState = {
  photoCount: number | null;
  flexCount: number | null;
  setPhotoCount: (n: number | null) => void;
  setFlexCount: (n: number | null) => void;
  refreshPhotoCount: () => Promise<void>;
  refreshFlexCount: () => Promise<void>;
};

export const useMetricsStore = create<MetricsState>()(
  devtools((set) => ({
    photoCount: null,
    flexCount: null,
    setPhotoCount: (n: number | null) => set({ photoCount: n }),
    setFlexCount: (n: number | null) => set({ flexCount: n }),
    refreshPhotoCount: async () => {
      try {
        const c = await db.photoMetadata.count();
        set({ photoCount: c });
      } catch (e) {
        console.warn("refreshPhotoCount failed", e);
        set({ photoCount: null });
      }
    },
    refreshFlexCount: async () => {
      try {
        // Use DB count as the authoritative source for document counts
        // (FlexSearch may not yet be mounted), but prefer index count when available.
        let c = await db.photoMetadata.count();
        try {
          const idx = await Promise.resolve(getIndexCount());
          if (typeof idx === "number" && idx > 0) c = idx;
        } catch {}
        set({ flexCount: c });
      } catch (e) {
        console.warn("refreshFlexCount failed", e);
        set({ flexCount: null });
      }
    },
  })),
);

export default useMetricsStore;
