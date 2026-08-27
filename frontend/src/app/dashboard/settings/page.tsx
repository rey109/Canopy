"use client";

import { useAuth } from "@/lib/auth-context";
import { canManageOrganization, canMutate } from "@/lib/role-access";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const personalOnly = !canManageOrganization(user) || !canMutate(user);

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Akun</p>
        <h1 className="mt-1 text-2xl font-bold">Setting</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Pengaturan personal akun {user?.nama || "pengguna"}.</p>
      </div>
      <div className="glass-card divide-y divide-[var(--border)]">
        <div className="p-5"><h2 className="font-semibold">Ganti Password</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Perbarui password secara berkala untuk menjaga keamanan akun.</p><button className="btn-secondary mt-4 text-xs">Buka form ganti password</button></div>
        <div className="p-5"><h2 className="font-semibold">Preferensi Notifikasi</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Notifikasi actionable seperti Task dan Approval tetap aktif.</p><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" defaultChecked disabled={personalOnly} /> Notifikasi in-app aktif</label></div>
        <div className="p-5"><h2 className="font-semibold">Tampilan</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Pilih tampilan yang nyaman digunakan.</p><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" /> Gunakan mode terang</label></div>
        <div className="flex items-center justify-between p-5"><div><h2 className="font-semibold">Keluar</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Akhiri sesi di perangkat ini.</p></div><button onClick={logout} className="btn-danger text-xs">Logout</button></div>
      </div>
    </div>
  );
}
