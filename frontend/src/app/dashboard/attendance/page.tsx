"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pribadi" | "rekap">("pribadi");

  // Mock data for UI demonstration
  const personalRecords = [
    { id: 1, title: "Rapat Rutin Bulanan", date: "2023-10-15", status: "Hadir" },
    { id: 2, title: "Evaluasi Proker Porseni", date: "2023-10-10", status: "Izin" },
    { id: 3, title: "Rapat Koordinasi Bidang", date: "2023-10-05", status: "Hadir" },
  ];

  const canSeeRekap = 
    user?.group_name === "Kepala Divisi" || 
    user?.group_name === "Sekretaris" || 
    user?.group_name === "Trimitra" || 
    user?.group_name === "Pembina";
  const canVerify = user?.group_name === "Sekretaris";

  const rekapTitle = 
    user?.group_name === "Kepala Divisi" ? "Rekap Divisi" :
    user?.group_name === "Sekretaris" ? "Rekap Organisasi" :
    "Rekap Lintas Divisi";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kehadiran</h1>
           <p className="text-[var(--text-muted)] text-sm mt-1">
           Pantau status kehadiran kegiatan organisasi.{canVerify ? " Verifikasi izin dan sakit tersedia untuk scope sekretariat." : ""}
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

      {activeTab === "pribadi" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-500">8</p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Hadir</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">1</p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Izin</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-red-500">0</p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Alpa</p>
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">Riwayat Kehadiran</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {personalRecords.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{r.date}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                    r.status === "Hadir" ? "bg-green-500/10 text-green-500" :
                    r.status === "Izin" ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rekap" && canSeeRekap && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-[var(--bg-primary)] rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Modul {rekapTitle}</h3>
          <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto">
            Fitur pelaporan kehadiran sedang dalam tahap pengembangan.
          </p>
        </div>
      )}
    </div>
  );
}
