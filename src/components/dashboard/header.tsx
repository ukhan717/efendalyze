"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";

export default function DashboardHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-black px-6">
      <div />
      <div className="flex items-center gap-3">
        <button className="p-2 text-white/30 hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
