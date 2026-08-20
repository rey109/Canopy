"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Jabatan {
  membership_id: number;
  role_id: number;
  role_name: string;
  group_name: string;
  division_id: number | null;
  periode_id: number;
  tahun_ajaran: string;
  status: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [riwayat, setRiwayat] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistik (Mocked aggregates / real-time counts)
  const [stats, setStats] = useState({
    kehadiran: "92%",
    taskSelesai: 0,
    prokerAktif: 0,
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.allSettled([
      api.getRiwayatJabatan(user.nis),
      api.listTasks(),
      api.listProkers(),
    ])
      .then(([rRes, tRes, pRes]) => {
        if (rRes.status === "fulfilled") {
          setRiwayat(rRes.value.riwayat || []);
        }

        let completedTasks = 0;
        if (tRes.status === "fulfilled") {
          completedTasks = tRes.value.tasks.filter(t => t.assigned_to === user.nis && t.status === "Selesai").length;
        }

        let activeProkers = 0;
        if (pRes.status === "fulfilled") {
          activeProkers = pRes.value.prokers.filter(p => p.status === "Berjalan").length;
        }

        setStats(prev => ({
          ...prev,
          taskSelesai: completedTasks,
          prokerAktif: activeProkers,
        }));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[var(--text-muted)]">Anda belum masuk sistem.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Anggota</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Histori kepengurusan dan rekap kontribusi Anda di organisasi
        </p>
      </div>

      {/* Profil Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-3xl font-extrabold text-white flex-shrink-0 shadow-lg border-2 border-[var(--border)]">
          {user.nama?.charAt(0).toUpperCase()}
        </div>
        <div className="text-center sm:text-left space-y-1.5 min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold truncate">{user.nama}</h2>
            <span className="badge badge-info text-xs self-center">{user.role_name}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">NIS: {user.nis} • Angkatan: {user.tahun_masuk}</p>
          <p className="text-xs text-[var(--text-muted)]">Jurusan: {user.jurusan}</p>
          {user.division_id && (
            <span className="badge badge-neutral text-[10px] mt-1">Seksi Bidang {user.division_id}</span>
          )}
        </div>
      </div>

      {/* Statistik Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <div className="glass-card p-5 space-y-2">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">KEHADIRAN RAPAT</p>
          <p className="text-2xl font-bold text-green-500">{stats.kehadiran}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Akumulasi seluruh rapat periode ini</p>
        </div>
        <div className="glass-card p-5 space-y-2">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">TUGAS SELESAI</p>
          <p className="text-2xl font-bold text-blue-500">{stats.taskSelesai} Tugas</p>
          <p className="text-[10px] text-[var(--text-muted)]">Dari seluruh program kerja yang diikuti</p>
        </div>
        <div className="glass-card p-5 space-y-2">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">PROKER AKTIF</p>
          <p className="text-2xl font-bold text-purple-500">{stats.prokerAktif} Proker</p>
          <p className="text-[10px] text-[var(--text-muted)]">Yang sedang berjalan saat ini</p>
        </div>
      </div>

      {/* Riwayat Jabatan */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Riwayat Kepengurusan</h3>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-[var(--border)] rounded" />
            <div className="h-10 bg-[var(--border)] rounded" />
          </div>
        ) : riwayat.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Belum ada riwayat kepengurusan.</p>
        ) : (
          <div className="relative border-l border-[var(--border)] ml-3 pl-6 space-y-6">
            {riwayat.map((r) => (
              <div key={r.membership_id} className="relative">
                {/* Dot */}
                <div className="absolute -left-[30px] mt-1.5 w-3.5 h-3.5 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-secondary)]" />
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">{r.tahun_ajaran}</span>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{r.role_name}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Kelompok: {r.group_name} {r.division_id ? `• Bidang ${r.division_id}` : ""}</p>
                  <span className={`badge text-[9px] mt-1 px-1.5 py-0.5 font-bold ${r.status === "Aktif" ? "badge-success" : "badge-neutral"}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
