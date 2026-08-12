"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Asset {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listAssets()
      .then((res) => setAssets(res.assets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aset & Inventaris</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Daftar inventaris sekolah yang bisa dipinjam/dibooking untuk kegiatan program kerja
          </p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Aset baru
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada inventaris/aset terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {assets.map((a) => (
            <div key={a.id} className="glass-card p-5 flex flex-col justify-between hover:translate-y-[-1px] transition-all">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{a.name}</h3>
                  <span className={`badge ${a.status === "Available" ? "badge-success" : "badge-warning"}`}>
                    {a.status === "Available" ? "Tersedia" : "Dipinjam"}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{a.description || "Tidak ada deskripsi."}</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4 mt-auto">
                <button className="btn-secondary text-xs py-1.5 px-3">Riwayat Booking</button>
                <button className="btn-primary text-xs py-1.5 px-3" disabled={a.status !== "Available"}>
                  Booking Aset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
