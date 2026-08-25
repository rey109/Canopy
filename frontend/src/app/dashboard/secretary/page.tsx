"use client";

import { useAuth } from "@/lib/auth-context";
import { canManageSecretariat } from "@/lib/role-access";

export default function SecretaryPage() {
  const { user } = useAuth();
  const isSecretary = canManageSecretariat(user);
  const isGeneral = isSecretary && user?.level === 1;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Modul Sekretariat</p>
        <h1 className="mt-1 text-2xl font-bold">Dokumen & Administrasi</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Kelola dokumen, kelengkapan administrasi, dan alur persetujuan sesuai scope jabatan.</p>
      </div>
      {!isSecretary && <div className="glass-card p-6 text-sm text-[var(--text-secondary)]">Halaman ini hanya tersedia untuk Sekretaris.</div>}
      {isSecretary && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Dokumen masuk", "Periksa kelengkapan proposal, surat, dan LPJ."],
            ["Approval berjenjang", "Pantau status persetujuan dan revisi dokumen."],
            ["Verifikasi eksternal", isGeneral ? "Tersedia untuk Sekretaris Umum." : "Menunggu verifikasi Sekretaris Umum."],
            ["Scope kerja", user?.scope_divisi_awal == null ? "Organisasi penuh" : `Sekbid ${user.scope_divisi_awal}–${user.scope_divisi_akhir}`],
          ].map(([title, description]) => (
            <div key={title} className="glass-card p-5">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
