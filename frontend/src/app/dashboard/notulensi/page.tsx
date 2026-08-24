"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, fileUrl, type NotulensiListItem, type NotulensiAttachment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type FilterStatus = "Semua" | "Draft" | "Final";

export default function NotulensiPage() {
  const { user } = useAuth();
  const [notulensiList, setNotulensiList] = useState<NotulensiListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Semua");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<NotulensiListItem | null>(null);

  const fetchNotulensi = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listNotulensi();
      setNotulensiList(res.notulensi || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat notulensi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchNotulensi();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notulensiList.filter((n) => {
      if (filterStatus !== "Semua" && n.status !== filterStatus) return false;
      if (q) {
        const hay = `${n.judul_rapat} ${n.isi} ${n.lokasi_rapat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notulensiList, filterStatus, search]);

  const stats = useMemo(
    () => ({
      total: notulensiList.length,
      final: notulensiList.filter((n) => n.status === "Final").length,
      draft: notulensiList.filter((n) => n.status === "Draft").length,
      lampiran: notulensiList.reduce((acc, n) => acc + (n.attachments?.length || 0), 0),
    }),
    [notulensiList]
  );

  const formatDateTime = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return (
        d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) +
        " • " +
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
        " WIB"
      );
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notulensi Rapat</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Arsip seluruh notulensi rapat organisasi. Notulensi yang disimpan dari halaman Rapat otomatis muncul di sini.
          </p>
        </div>
        <Link href="/dashboard/meetings" className="btn-secondary text-xs whitespace-nowrap">
          ✍️ Tulis Notulensi di Halaman Rapat
        </Link>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Notulensi", value: stats.total, icon: "📚" },
          { label: "Final (Terverifikasi)", value: stats.final, icon: "✅" },
          { label: "Draft", value: stats.draft, icon: "📝" },
          { label: "Total Lampiran", value: stats.lampiran, icon: "📎" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {s.icon} {s.label}
            </p>
            <p className="text-2xl font-bold mt-1 gradient-text">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(["Semua", "Draft", "Final"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterStatus === status
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Cari judul, isi, atau lokasi rapat..."
          className="input-field py-1.5 px-3 text-xs bg-[var(--bg-primary)] max-w-[280px]"
        />
      </div>

      {/* Daftar Notulensi */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-[var(--border)] rounded" />
              <div className="h-6 w-3/4 bg-[var(--border)] rounded" />
              <div className="h-8 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card p-12 text-center space-y-2">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm font-semibold text-red-400">{error}</p>
          <button onClick={fetchNotulensi} className="btn-secondary text-xs mx-auto">Coba Lagi</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)] space-y-2">
          <p className="text-2xl">📄</p>
          <p className="font-semibold text-sm">
            {notulensiList.length === 0
              ? "Belum ada notulensi tersimpan."
              : "Tidak ada notulensi yang cocok dengan filter."}
          </p>
          <p className="text-xs">
            Buka halaman <b>Rapat</b>, pilih rapat, klik <b>Notulensi</b>, tulis isinya lalu simpan — otomatis muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filtered.map((n) => (
            <div
              key={n.notulensi_id}
              className="glass-card p-5 flex flex-col border border-[var(--border)] shadow-lg hover:border-[var(--accent)]/40 transition-all cursor-pointer"
              onClick={() => setDetail(n)}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-bold ${
                    n.status === "Final"
                      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  }`}
                >
                  {n.status === "Final" ? "✅ Final" : "📝 Draft"}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Diperbarui {formatDateTime(n.updated_at)}
                </span>
              </div>

              <h3 className="font-bold text-base text-white mb-1.5 line-clamp-2">{n.judul_rapat}</h3>

              <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold mb-3 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                <span>🗓️</span>
                <span>{formatDateTime(n.tanggal_rapat)}</span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-3 whitespace-pre-line">
                {n.isi || "(notulensi belum diisi)"}
              </p>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 mt-auto">
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  📍 {n.lokasi_rapat || "-"} • Oleh: {n.dibuat_oleh}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(n.attachments?.length || 0) > 0 && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold">
                      📎 {n.attachments.length}
                    </span>
                  )}
                  <span className="btn-primary text-xs py-1.5 px-2.5">Lihat Detail</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail Notulensi */}
      {detail !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="glass-card p-6 w-full max-w-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] pb-3 flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`badge ${detail.status === "Final" ? "badge-success" : "badge-warning"} text-xs`}
                >
                  {detail.status === "Final" ? "✅ Final" : "📝 Draft"}
                </span>
                <button onClick={() => setDetail(null)} className="text-[var(--text-muted)] hover:text-white text-sm">
                  ✕
                </button>
              </div>
              <h3 className="text-lg font-semibold">{detail.judul_rapat}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                <span>🗓️ {formatDateTime(detail.tanggal_rapat)}</span>
                <span>📍 {detail.lokasi_rapat || "-"}</span>
                <span>Status rapat: {detail.status_rapat}</span>
                {detail.difinalisasi_oleh && <span>Difinalisasi oleh: {detail.difinalisasi_oleh}</span>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Isi Notulensi
                </p>
                <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-sm whitespace-pre-line leading-relaxed">
                  {detail.isi || "(notulensi belum diisi)"}
                </div>
              </div>

              {(detail.attachments?.length || 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Lampiran ({detail.attachments.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detail.attachments.map((att: NotulensiAttachment, idx: number) => {
                      const isImage = att.type?.startsWith("image/");
                      return (
                        <a
                          key={idx}
                          href={fileUrl(att.url)}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="group block rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/60 transition-all"
                        >
                          {isImage ? (
                            <img
                              src={fileUrl(att.url)}
                              alt={att.name}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="w-full h-28 flex items-center justify-center bg-[var(--bg-secondary)] text-3xl">
                              📄
                            </div>
                          )}
                          <p className="text-[11px] px-2.5 py-2 truncate text-[var(--accent)] group-hover:underline">
                            {att.name}
                          </p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] flex-shrink-0">
              <Link
                href="/dashboard/meetings"
                className="btn-secondary text-xs"
                onClick={() => setDetail(null)}
              >
                Edit Notulensi
              </Link>
              <button onClick={() => setDetail(null)} className="btn-primary text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
