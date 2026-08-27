"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface NotificationItem {
  notifikasi_id: number;
  kategori: string;
  judul: string;
  pesan: string;
  link_ref: string;
  status: string;
  dibuat_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.listNotifications().then((result) => setItems(result.notifikasi || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [user]);

  const markRead = async (item: NotificationItem) => {
    try { await api.markNotificationRead(item.notifikasi_id); } catch {}
    setItems((current) => current.map((entry) => entry.notifikasi_id === item.notifikasi_id ? { ...entry, status: "Dibaca" } : entry));
  };

  return <div className="animate-fade-in space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-blue-400">Pusat informasi</p><h1 className="mt-1 text-2xl font-bold">Notifikasi</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Task, approval, presensi, keuangan, aset, dan informasi sistem untuk role kamu.</p></div>
    {loading ? <div className="glass-card h-32 animate-pulse" /> : items.length === 0 ? <div className="glass-card p-10 text-center text-sm text-[var(--text-secondary)]">Belum ada notifikasi.</div> : <div className="space-y-3">{items.map((item) => <button key={item.notifikasi_id} onClick={() => markRead(item)} className={`glass-card block w-full p-5 text-left transition hover:border-blue-500/40 ${item.status === "Belum Dibaca" ? "border-blue-500/30" : "opacity-75"}`}><div className="flex items-start justify-between gap-4"><div><span className="badge badge-info text-[10px]">{item.kategori}</span><h2 className="mt-2 font-semibold">{item.judul}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{item.pesan}</p></div><span className="text-[10px] text-[var(--text-muted)]">{new Date(item.dibuat_at).toLocaleDateString("id-ID")}</span></div></button>)}</div>}
  </div>;
}
