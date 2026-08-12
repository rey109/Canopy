"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Proker {
  id: number;
  name: string;
  description: string;
  division_id: number;
  budget: number;
  status: string;
  start_date: string;
  end_date: string;
  created_by: string;
}

const statusBadge: Record<string, string> = {
  Rencana: "badge-neutral",
  Berjalan: "badge-info",
  Dinjau: "badge-warning",
  Selesai: "badge-success",
};

export default function ProkerPage() {
  const [prokers, setProkers] = useState<Proker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listProkers()
      .then((res) => setProkers(res.prokers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Program Kerja</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Kelola seluruh program kerja organisasi
          </p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Buat Proker
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : prokers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada program kerja.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {prokers.map((p) => (
            <div key={p.id} className="glass-card p-5 transition-all hover:translate-y-[-1px]">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className={`badge ${statusBadge[p.status] || "badge-neutral"}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                {p.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>
                  Anggaran:{" "}
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(p.budget)}
                </span>
                <span>•</span>
                <span>
                  {new Date(p.start_date).toLocaleDateString("id-ID")} —{" "}
                  {new Date(p.end_date).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
