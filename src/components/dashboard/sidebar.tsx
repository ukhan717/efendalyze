"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, History } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/audits", icon: History, label: "All Audits" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-white/10 bg-black lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex items-center border-b border-white/10 px-5 py-4">
        <Image
          src="/logo.jpg"
          alt="Efendy Partners"
          width={120}
          height={40}
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium tracking-wide transition-colors",
                isActive
                  ? "bg-white text-black"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 text-xs text-white/25 tracking-widest uppercase">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
}
