"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api, type ModuleEntry } from "@/lib/api";

// Icon mapper untuk setiap module name
const iconMap: Record<string, React.ReactNode> = {
  "Dashboard": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  "Home": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  "Task": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  "Program Kerja": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  "Rapat": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  "Notulensi": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  "Keuangan": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  "Sekretariat": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  "Divisiku": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  "Organisasi": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  "Info": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  "Member": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  "Profile": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  "Setting": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  "Aset": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  ),
  "Handover": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  "Public Portal": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

// URL mapper untuk nama modul
const hrefMap: Record<string, string> = {
  "Dashboard": "/dashboard",
  "Home": "/dashboard",
  "Task": "/dashboard/task",
  "Program Kerja": "/dashboard/proker",
  "Rapat": "/dashboard/meetings",
  "Notulensi": "/dashboard/notulensi",
  "Keuangan": "/dashboard/finance",
  "Sekretariat": "/dashboard/secretary",
  "Divisiku": "/dashboard/my-division",
  "Organisasi": "/dashboard/organization",
  "Info": "/dashboard/updates",
  "Member": "/dashboard/team",
  "Profile": "/dashboard/profile",
  "Setting": "/dashboard/settings",
  "Aset": "/dashboard/assets",
  "Handover": "/dashboard/handover",
  "Public Portal": "/dashboard/public",
};

// Modul Manajemen items (dipindahkan dari dashboard center ke sidebar)
const modulManajemen: { label: string; key: string }[] = [
  { label: "Dashboard", key: "Dashboard" },
  { label: "Proker", key: "Program Kerja" },
  { label: "Keuangan", key: "Keuangan" },
  { label: "Rapat", key: "Rapat" },
  { label: "Notulensi", key: "Notulensi" },
  { label: "Aset", key: "Aset" },
  { label: "Handover", key: "Handover" },
  { label: "Public Portal", key: "Public Portal" },
];

interface RenderItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isSpecial?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [navItems, setNavItems] = useState<RenderItem[]>([]);

  useEffect(() => {
    if (!user) return;

    // Ambil modul navigasi dinamis dari backend
    api.getNavModules()
      .then((res) => {
        const items: RenderItem[] = [];

        // 1. Tambah core modules
        res.core_modules.forEach((m) => {
          items.push({
            label: m.module_name,
            href: hrefMap[m.module_name] || "/dashboard",
            icon: iconMap[m.module_name] || iconMap["Home"],
          });
        });

        // 2. Tambah role modules (dengan tanda isSpecial untuk style aksen per spec 06)
        res.role_modules.forEach((m) => {
          items.push({
            label: m.module_name,
            href: hrefMap[m.module_name] || "/dashboard",
            icon: iconMap[m.module_name] || iconMap["Home"],
            isSpecial: true,
          });
        });

        // 3. Tambah divisi modules
        res.divisi_modules.forEach((m) => {
          items.push({
            label: m.module_name,
            href: hrefMap[m.module_name] || "/dashboard",
            icon: iconMap[m.module_name] || iconMap["Home"],
          });
        });

        setNavItems(items);
      })
      .catch((err) => {
        console.error("Gagal load navigasi dinamis:", err);
      });
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Brand */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-sm gradient-text">Canopy</h2>
            <p className="text-[10px] text-[var(--text-muted)]">Manajemen OSIS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          // Style aksen khusus untuk role module (spec 06)
          const itemClass = item.isSpecial
            ? `sidebar-link border-l-2 border-[var(--accent)] pl-2 font-semibold ${isActive ? "active text-[var(--accent)]" : "text-[var(--text-secondary)]"}`
            : `sidebar-link ${isActive ? "active" : ""}`;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={itemClass}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 px-3">
          <div className="border-t border-[var(--border)]"></div>
        </div>

        {/* Modul Manajemen Section */}
        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Modul Manajemen</p>
        </div>
        {modulManajemen.map((mod) => {
          const href = hrefMap[mod.key] || "/dashboard";
          const icon = iconMap[mod.key] || iconMap["Home"];
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={mod.key}
              href={href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              {icon}
              {mod.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.nama?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.nama || "User"}</p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {user?.role_name || "—"} • {user?.nis || "—"}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary w-full justify-center text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  );
}
