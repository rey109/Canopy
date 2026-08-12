"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Stats {
  prokerCount: number;
  pendingApprovals: number;
  balance: number;
  meetingCount: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    prokerCount: 0,
    pendingApprovals: 0,
    balance: 0,
    meetingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [prokers, approvals, balance, meetings] = await Promise.allSettled([
          api.listProkers(),
          api.listPendingApprovals(),
          api.getBalance(),
          api.listMeetings(),
        ]);

        setStats({
          prokerCount:
            prokers.status === "fulfilled"
              ? prokers.value.prokers?.length || 0
              : 0,
          pendingApprovals:
            approvals.status === "fulfilled"
              ? approvals.value.approvals?.length || 0
              : 0,
          balance:
            balance.status === "fulfilled" ? balance.value.balance : 0,
          meetingCount:
            meetings.status === "fulfilled"
              ? meetings.value.meetings?.length || 0
              : 0,
        });
      } catch {
        // Silently fail stats
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  const statCards = [
    {
      label: "Program Kerja",
      value: stats.prokerCount,
      suffix: "program",
      gradient: "from-blue-500 to-cyan-500",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      label: "Persetujuan Pending",
      value: stats.pendingApprovals,
      suffix: "menunggu",
      gradient: "from-amber-500 to-orange-500",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Saldo Kas",
      value: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(stats.balance),
      suffix: "",
      gradient: "from-emerald-500 to-green-500",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: "Total Rapat",
      value: stats.meetingCount,
      suffix: "rapat",
      gradient: "from-purple-500 to-pink-500",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting()},{" "}
          <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {user?.role} • Periode {user?.management_period || "—"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-5 transition-all duration-200 hover:translate-y-[-2px]">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white opacity-90`}>
                {card.icon}
              </div>
              {card.label === "Persetujuan Pending" && stats.pendingApprovals > 0 && (
                <div className="pulse-dot" />
              )}
            </div>
            <div>
              {loading ? (
                <div className="h-7 w-20 bg-[var(--border)] rounded animate-pulse" />
              ) : (
                <p className="text-xl font-bold">
                  {typeof card.value === "number" ? card.value : card.value}
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {card.label}
                {card.suffix && ` • ${card.suffix}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Buat Proker", href: "/dashboard/proker", color: "from-blue-500 to-cyan-500" },
            { label: "Catat Keuangan", href: "/dashboard/finance", color: "from-emerald-500 to-green-500" },
            { label: "Jadwalkan Rapat", href: "/dashboard/meetings", color: "from-purple-500 to-pink-500" },
            { label: "Booking Aset", href: "/dashboard/assets", color: "from-amber-500 to-orange-500" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--border-hover)] transition-all hover:translate-y-[-1px]"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${action.color}`} />
              <span className="text-sm font-medium">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
