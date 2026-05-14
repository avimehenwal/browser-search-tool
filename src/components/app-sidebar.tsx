"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ChartIcon,
  CubeIcon,
  HomeIcon,
  PlusSignIcon,
  SearchIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

// Helper to get base path from window or environment
const getBasePath = (): string => {
  if (typeof window !== "undefined") {
    return (window as any).__NEXT_PUBLIC_BASE_PATH__ || "";
  }
  return "";
};

// This is sample data.
const data = {
  navMain: [
    {
      title: "Home",
      url: "/browser-search-tool/",
      icon: <HugeiconsIcon icon={HomeIcon} strokeWidth={2} />,
      isActive: true,
    },
    {
      title: "Search",
      url: `/browser-search-tool/search`,
      icon: <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />,
    },
    {
      title: "Management",
      url: `/browser-search-tool/management`,
      icon: <HugeiconsIcon icon={CubeIcon} strokeWidth={2} />,
    },
    {
      title: "Add Items",
      url: `/browser-search-tool/management/add`,
      icon: <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />,
    },
    {
      title: "Analytics",
      url: `/browser-search-tool/analytics`,
      icon: <HugeiconsIcon icon={ChartIcon} strokeWidth={2} />,
    },
    {
      title: "API Reference",
      url: `/browser-search-tool/api-demo`,
      icon: <HugeiconsIcon icon={SourceCodeIcon} strokeWidth={2} />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() || "/";

  const normalize = (u: string) => {
    if (!u) return u;
    const p = String(u).split("#")[0].split("?")[0];
    if (p !== "/" && p.endsWith("/")) return p.slice(0, -1);
    return p;
  };

  const current = (() => {
    const p = String(pathname).split("#")[0].split("?")[0] || "/";
    return p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;
  })();

  const items = data.navMain.map((it) => ({
    ...it,
    isActive: normalize(it.url) === current,
  }));

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader />
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
