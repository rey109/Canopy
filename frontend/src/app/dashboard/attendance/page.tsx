"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { api, type RiwayatPresensiItem } from "@/lib/api";

export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pribadi" | "rekap">("pribadi");
  const [riwayat, setRiwayat] = useState<RiwayatPresensiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.listRiwayatPresensi()
      .then((res) => setRiwayat(res.riwayat || []))
      .catch((err) => setError(err.message || "Gagal memuat data kehadiran"))
      .finally(() => setLoading(false));
  }, [user]);

  const personalStats = useMemo(() => {
    let hadir = 0, izin = 0, sakit = 0, alpa = 0;
    for (const r of riwayat) {
      const mine = r.details.find((d) => d.nis === user?.nis);
      if (mine) {
        switch (mine.tipe) {
          case "Hadir": hadir++; break;
          case "Izin": izin++; break;
          case "Sakit": sakit++; break;
          default: alpa++;
        }
      }
    }
    return { hadir, izin, sakit, alpa };
  }, [riwayat, user]);

  const personalRecords = useMemo(() => {
    const records: { rapat_id: number; judul: string; tanggal: string; tipe: string }[] = [];
    for (const r of riwayat) {
      const mine = r.details.find((d) => d.nis === user?.nis);
      records.push({
        rapat_id: r.rapat_id,
        judul: r.judul,
        tanggal: r.tanggal,
        tipe: mine ? mine.tipe : "Belum dicatat",
      });
    }
    return records;
  }, [riwayat, user]);

  const canSeeRekap =
    user?.group_name === "Kepala Divisi" ||
    user?.group_name === "Sekretaris" ||
    user?.group_name === "Trimitra" ||
    user?.group_name === "Pembina";

  const rekapTitle =
    user?.group_name === "Kepala Divisi" ? "Rekap Divisi" :
    user?.group_name === "Sekretaris" ? "Rekap Organisasi" :
    "Rekap Lintas Divisi";

  const formatDateTime = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString("id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }) + " • " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    } catch {
      return String(dateVal);
    }
  };

  const statusColor = (t: string) => {
    switch (t) {
      case "Hadir": return "bg-green-500/10 text-green-500";
      case "Izin": return "bg-yellow-500/10 text-yellow-500";
      case "Sakit": return "bg-blue-500/10 text-blue-500";
      default: return "bg-red-500/10 text-red-500";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kehadiran</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Pantau status kehadiran kegiatan organisasi.
        </p>
      </div>

      {canSeeRekap && (
        <div className="flex gap-2 border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab("pribadi")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "pribadi"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Presensi Pribadi
          </button>
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "rekap"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {rekapTitle}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="h-4 w-48 bg-[var(--border)] rounded" />
              <div className="h-8 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-2xl">⚠️</p>
          <p className="text-sm font-semibold text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xs mx-auto">Coba Lagi</button>
        </div>
      ) : (
        <>
          {activeTab === "pribadi" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{personalStats.hadir}</p>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Hadir</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{personalStats.izin}</p>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Izin</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-blue-500">{personalStats.sakit}</p>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Sakit</p>
                </div>
              </div>

              <div className="card">
                <div className="p-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold">Riwayat Kehadiran</h3>
                </div>
                {personalRecords.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                    Belum ada data kehadiran.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {personalRecords.map((r) => (
                      <div key={r.rapat_id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{r.judul}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDateTime(r.tanggal)}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${statusColor(r.tipe)}`}>
                          {r.tipe}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rekap" && canSeeRekap && (
            <div className="space-y-4">
              {riwayat.length === 0 ? (
                <div className="card p-8 text-center text-[var(--text-muted)] text-sm">
                  Belum ada data rekap kehadiran.
                </div>
              ) : (
                riwayat.map((r) => (
                  <div key={r.rapat_id} className="card">
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                      onClick={() => setExpandedId(expandedId === r.rapat_id ? null : r.rapat_id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{r.judul}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDateTime(r.tanggal)} • {r.lokasi || "-"}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="flex gap-2 text-[11px] font-semibold">
                          <span className="text-green-500">{r.total_hadir} Hadir</span>
                          <span className="text-yellow-500">{r.total_izin} Izin</span>
                          <span className="text-blue-500">{r.total_sakit} Sakit</span>
                          <span className="text-red-500">{r.total_alpa} Alpa</span>
                        </div>
                        <span className="text-[var(--text-muted)] text-xs">
                          {expandedId === r.rapat_id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {expandedId === r.rapat_id && r.details.length > 0 && (
                      <div className="border-t border-[var(--border)]">
                        <div className="divide-y divide-[var(--border)]">
                          {r.details.map((d) => (
                            <div key={d.nis} className="px-4 py-2.5 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{d.nama}</span>
                                <span className="text-[var(--text-muted)] ml-2 text-xs">({d.nis})</span>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor(d.tipe)}`}>
                                {d.tipe}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
