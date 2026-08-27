"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getRoleGroup, hasFullScope } from "@/lib/role-access";

export default function RoleContextCard({ title = "Ruang kerja kamu" }: { title?: string }) {
  const { user } = useAuth();
  const group = getRoleGroup(user);
  const scope = hasFullScope(user) ? "Organisasi penuh" : user?.division_id ? `Divisi ${user.division_id}` : "Scope terbatas";
  const descriptions: Record<string, string> = {
    Staf: "Fokus pada task yang ditugaskan dan kegiatan divisi.",
    "Kepala Divisi": "Kelola proker, task, dan anggota divisi sendiri.",
    Bendahara: "Pantau transaksi, laporan, dan verifikasi keuangan.",
    Sekretaris: "Kelola dokumen, rapat, presensi, dan aset organisasi.",
    Trimitra: "Pantau persetujuan, struktur, dan ringkasan organisasi.",
    Pembina: "Pantau seluruh organisasi dan berikan catatan pembinaan.",
  };
  const links: Record<string, string> = {
    Staf: "/dashboard/task",
    "Kepala Divisi": "/dashboard/team/" + (user?.division_id || "1"),
    Bendahara: "/dashboard/finance",
    Sekretaris: "/dashboard/secretary",
    Trimitra: "/dashboard/organization",
    Pembina: "/dashboard/organization",
  };

  return (
    <section className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">{title}</p>
          <h2 className="mt-1 text-lg font-bold text-white">{user?.role_name || group}</h2>
          <p className="mt-1 text-sm text-slate-400">{descriptions[group]}</p>
        </div>
        <div className="flex items-center gap-3">
          {group !== "Pembina" && (
            <span className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-300">{scope}</span>
          )}
          <Link href={links[group]} className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-400">Buka ruang kerja</Link>
        </div>
      </div>
    </section>
  );
}
