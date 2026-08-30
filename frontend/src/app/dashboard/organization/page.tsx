"use client";

import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import { canManageOrganization, canMutate } from "@/lib/role-access";

export default function OrganizationPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "summary";
  const canManage = canManageOrganization(user);
  const readOnly = !canMutate(user) || user?.group_name === "Pembina";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Modul Organisasi</p>
        <h1 className="mt-1 text-2xl font-bold">{view === "approval" ? "Approval Pusat" : "Ringkasan Organisasi"}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{view === "approval" ? "Tinjau dokumen yang menunggu persetujuan pusat sesuai scope jabatan." : "Pantau performa proker, struktur, persetujuan pusat, dan serah terima kepengurusan."}</p>
      </div>
      {view === "approval" && <div className="glass-card border-indigo-500/30 p-6"><h2 className="font-semibold">Antrian approval pusat</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Tidak ada dokumen yang menunggu persetujuan pada scope aktif.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Progres proker", "0%", "Semua divisi"],
          ["Kehadiran", "—", "Periode aktif"],
          ["Persetujuan pusat", "0", canManage ? "Bisa diproses" : "Read-only"],
          ["Struktur", "Aktif", canManage ? "Kelola kepengurusan" : "Lihat struktur"],
        ].map(([label, value, detail]) => (
          <div key={label} className="glass-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
          </div>
        ))}
      </div>
      <div className="glass-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Mode akses: {readOnly ? "Read-only" : user?.role_name}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{canManage ? "Kamu dapat mengelola struktur dan approval pusat sesuai otoritas Ketua Trimitra." : "Data ditampilkan untuk pemantauan sesuai role dan scope kamu."}</p>
          </div>
          <span className="badge badge-info">{user?.scope_divisi_awal == null ? "Organisasi penuh" : "Scope kelompok"}</span>
        </div>
      </div>
    </div>
  );
}
