"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const { user } = useAuth();
  const router = useRouter();

  return (
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 px-4 py-3 backdrop-blur-md md:hidden">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <span className="font-bold text-sm gradient-text">Canopy</span>
           <p className="max-w-[11rem] truncate text-[10px] leading-none text-[var(--text-muted)]">{user?.role_name || user?.group_name || "Pengguna"}</p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
         <Link aria-label="Buka notifikasi" href="/dashboard/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-[var(--bg-primary)] transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </Link>

         <button aria-label="Buka profil" onClick={() => router.push("/dashboard/profile")} className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-[var(--bg-primary)] transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xs font-bold text-white">
            {user?.nama?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </button>
      </div>
    </header>
  );
}
