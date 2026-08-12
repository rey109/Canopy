"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Handover {
  id: number;
  period: string;
  final_balance: number;
  signature_old_ketua: string;
  signature_new_ketua: string;
  signature_pembina: string;
  created_at: string;
}

export default function HandoverPage() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listHandovers()
      .then((res) => setHandovers(res.handovers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Handover & Serah Terima</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Arsip berita acara serah terima jabatan pengurus lintas periode
          </p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          Mulai Handover Wizard
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : handovers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada berita acara serah terima terdaftar.</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {handovers.map((h) => (
            <div key={h.id} className="glass-card p-6">
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4 mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Berita Acara Serah Terima Jabatan</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Periode Pengurus: {h.period}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Dibuat: {new Date(h.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Saldo Kas Akhir</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(h.final_balance)}</p>
                </div>
              </div>

              {/* Signatures status */}
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-3">Status Tanda Tangan Digital</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { role: "Ketua Lama", sign: h.signature_old_ketua },
                    { role: "Ketua Baru", sign: h.signature_new_ketua },
                    { role: "Pembina OSIS", sign: h.signature_pembina },
                  ].map((s) => (
                    <div key={s.role} className="p-3 rounded-lg border border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs font-medium">{s.role}</span>
                      <span className={`badge ${s.sign ? "badge-success" : "badge-warning"}`}>
                        {s.sign ? "Ditandatangani" : "Menunggu"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button className="btn-secondary text-xs">Unduh PDF</button>
                <button className="btn-primary text-xs">Tanda Tangani</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
