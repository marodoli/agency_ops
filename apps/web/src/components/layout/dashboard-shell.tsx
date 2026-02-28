"use client";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

type DashboardShellProps = {
  user: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64">
        <Sidebar user={user} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigace</SheetTitle>
          <Sidebar user={user} onNavClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </TooltipProvider>
  );
}
