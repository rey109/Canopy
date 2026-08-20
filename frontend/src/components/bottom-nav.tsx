"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type ModuleEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Icon mapper untuk mobile bottom nav
const iconMap: Record<string, React.ReactNode> = {
  "Home": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  "Task": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  "Program Kerja": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  "Rapat": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  "Keuangan": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  "Sekretariat": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  "Divisiku": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  ),
  "Organisasi": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  "Info": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
    </svg>
  ),
  "Member": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  "Profile": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  "Setting": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  "Menu": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

const hrefMap: Record<string, string> = {
  "Home": "/dashboard",
  "Task": "/dashboard/task",
  "Program Kerja": "/dashboard/proker",
  "Rapat": "/dashboard/meetings",
  "Keuangan": "/dashboard/finance",
  "Sekretariat": "/dashboard/secretary",
  "Divisiku": "/dashboard/my-division",
  "Organisasi": "/dashboard/organization",
  "Info": "/dashboard/updates",
  "Member": "/dashboard/team",
  "Profile": "/dashboard/profile",
  "Setting": "/dashboard/settings",
};

interface RenderTab {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tabs, setTabs] = useState<RenderTab[]>([]);

  useEffect(() => {
    if (!user) return;

    api.getNavModules()
      .then((res) => {
        // Spec 02: Bottom nav 5 slot tetap (Home, Task, Program Kerja, [Slot 4 Dynamic], Menu)
        // - Slot 1: Home
        // - Slot 2: Task
        // - Slot 3: Program Kerja
        // - Slot 4: Dinamis (diambil dari role_modules[0] jika ada, jika tidak default Rapat)
        // - Slot 5: Menu (membuka drawer/drawer menu)
        const output: RenderTab[] = [];

        // Slot 1: Home
        output.push({
          label: "Home",
          href: "/dashboard",
          icon: iconMap["Home"],
        });

        // Slot 2: Task
        output.push({
          label: "Task",
          href: "/dashboard/task",
          icon: iconMap["Task"],
        });

        // Slot 3: Program Kerja
        output.push({
          label: "Proker",
          href: "/dashboard/proker",
          icon: iconMap["Program Kerja"],
        });

        // Slot 4: Dynamic (Swap to first role module if exists, otherwise Rapat)
        if (res.role_modules.length > 0) {
          const dynamicMod = res.role_modules[0];
          output.push({
            label: dynamicMod.module_name,
            href: hrefMap[dynamicMod.module_name] || "/dashboard",
            icon: iconMap[dynamicMod.module_name] || iconMap["Home"],
          });
        } else {
          output.push({
            label: "Rapat",
            href: "/dashboard/meetings",
            icon: iconMap["Rapat"],
          });
        }

        // Slot 5: Menu drawer trigger (di web ini dialihkan ke route Updates/Info sebagai representasi drawer sementara)
        output.push({
          label: "Menu",
          href: "/dashboard/updates",
          icon: iconMap["Menu"],
        });

        setTabs(output);
      })
      .catch((err) => {
        console.error("Gagal load mobile nav:", err);
      });
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur-md">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-[var(--accent)]/10" : ""}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
