import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type UiState = {
  sidebarOpen: boolean;
  sidebarOpenMobile: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarMobile: () => void;
};

export const useUiStore = create<UiState>()(
  devtools(
    persist<UiState>(
      (set) => ({
        sidebarOpen: true,
        sidebarOpenMobile: false,
        setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
        setSidebarOpenMobile: (open: boolean) =>
          set({ sidebarOpenMobile: open }),
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        toggleSidebarMobile: () =>
          set((s) => ({ sidebarOpenMobile: !s.sidebarOpenMobile })),
      }),
      {
        name: "ui-store",
      },
    ),
  ),
);

export default useUiStore;
