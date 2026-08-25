"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getRoleNavigation, profileNavigation } from "@/lib/role-access";

const icons: Record<string, string> = {
  Home: "⌂", Task: "✓", "Program Kerja": "▣", Rapat: "◷", Menu: "☰", Info: "ⓘ", Member: "♙", Profile: "◉", Setting: "⚙",
};

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const roleItems = getRoleNavigation(user);
  const menuItems = [...roleItems, ...profileNavigation];
  const tabs = [
    { label: "Home", href: "/dashboard" },
    { label: "Task", href: "/dashboard/task" },
    { label: "Proker", href: "/dashboard/proker" },
    { label: "Rapat", href: "/dashboard/meetings" },
  ];
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));


  return <>
    {open && <button aria-label="Tutup menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" />}
    <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl transition-transform md:hidden ${open ? "translate-y-0" : "translate-y-full"}`}>
      <div className="mx-auto max-h-[78vh] max-w-lg overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-5">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Menu role</p><h2 className="mt-1 font-bold text-white">{user?.role_name || "Pengguna"}</h2></div><button onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-slate-800">Tutup</button></div>
        <div className="grid grid-cols-2 gap-3">{menuItems.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className={`flex min-h-14 items-center rounded-2xl border p-3 text-sm transition ${isActive(item.href) ? "border-blue-400/50 bg-blue-500/10 text-blue-300" : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500"}`}><span className="mr-2 text-lg">{icons[item.label] || "•"}</span>{item.label}</Link>)}</div>
      </div>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--bg-secondary)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"><div className="mx-auto flex max-w-lg items-stretch">{tabs.map((tab) => <Link key={tab.href} href={tab.href} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition ${isActive(tab.href) ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}><span className="text-lg leading-5">{icons[tab.label]}</span><span className="text-[10px] font-medium">{tab.label}</span></Link>)}<button onClick={() => setOpen(true)} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition ${open ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}><span className="text-lg leading-5">{icons.Menu}</span><span className="text-[10px] font-medium">Menu</span></button></div></nav>
  </>;
}
