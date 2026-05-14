"use client";

import { AppSidebar } from "@/components/app-sidebar";
import DashboardSearch from "@/components/prototype/DashboardSearch";
import ThemeToggle from "@/components/prototype/ThemeToggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ensureSampleData } from "@/lib/dbInit";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const fetchData = async () => {
      await ensureSampleData();
    };

    fetchData();

    return () => {};
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    <h1 className="h1">Browser Search Tool</h1>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <ThemeToggle />
          </div>
        </header>

        <h1 className="text-3xl m-1 px-8">Search Tool</h1>
        <div className="flex flex-1 flex-col gap-6 px-4 py-10">
          <DashboardSearch />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
