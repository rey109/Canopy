"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type NotulensiListItem, type DivisionDetail, type ProkerDetail } from "@/lib/api";

export default function ManajemenNotulensiPage() {
  const [notulensiList, setNotulensiList] = useState<NotulensiListItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Draft" | "Final">("Semua");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [nRes, dRes, pRes] = await Promise.allSettled([
          api.listAllNotulensi(),
          api.listDivisions(),
          api.listProkers(),
        ]);
        if (nRes.status === "fulfilled") setNotulensiList(nRes.value.notulensi || []);
        if (dRes.status === "fulfilled") setDivisions(dRes.value.divisions || []);
        if (pRes.status === "fulfilled") setProkers(pRes.value.prokers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const getDivisionName = (id: number | null) => {
    if (!id) return "Organisasi";
    return divisions.find((d) => d.division_id === id)?.division_name || `Divisi ${id}`;
  };

  const getProkerName = (id: number | null) => {
    if (!id) return "—";
    return prokers.find((p) => p.proker_id === id)?.nama || "—";
  };

  const filtered = notulensiList.filter((n) => {
    const matchStatus = filterStatus === "Semua" || n.status === filterStatus;
    const matchSearch =
      !search ||
      n.judul_rapat.toLowerCase().includes(search.toLowerCase()) ||
      n.notulis.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notulensi & Dokumentasi</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Arsip notulensi seluruh rapat organisasi — terintegrasi dengan Modul Manajemen
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul rapat atau notulis..."
          className="input-field flex-1 text-sm"
        />
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          {(["Semua", "Draft", "Final"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                filterStatus === s
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-5 w-64 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-48 bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)]">
          {search ? "Tidak ada hasil pencarian." : "Belum ada notulensi yang tersimpan."}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left px-4 py-3">Judul Rapat</th>
                  <th className="text-left px-4 py-3">Tanggal</th>
                  <th className="text-left px-4 py-3">Divisi</th>
                  <th className="text-left px-4 py-3">Proker</th>
                  <th className="text-left px-4 py-3">Notulis</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((n) => (
                  <tr key={n.notulensi_id} className="hover:bg-[var(--bg-primary)] transition-colors">
                    <td className="px-4 py-3 font-medium">{n.judul_rapat}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(n.tanggal_rapat).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{getDivisionName(n.division_id ?? null)}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)] max-w-[150px] truncate">{getProkerName(n.proker_id ?? null)}</td>
                    <td className="px-4 py-3">{n.notulis || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${n.status === "Final" ? "badge-success" : "badge-warning"}`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/meetings/${n.rapat_id}`}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
        <span>{filtered.length} notulensi ditemukan</span>
        <Link href="/dashboard/meetings" className="text-[var(--accent)] hover:underline">
          → Kelola Rapat
        </Link>
      </div>
    </div>
  );
}
