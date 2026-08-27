"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canManageSecretariat } from "@/lib/role-access";

interface Aspiration {
  id: number;
  content: string;
  is_anonymous: boolean;
  user_nis: string | null;
  status: string;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  created_by: string;
}

const statusBadge: Record<string, string> = {
  Diterima: "badge-neutral",
  Diproses: "badge-warning",
  Ditindaklanjuti: "badge-success",
};

export default function PublicPage() {
  const { user } = useAuth();
  const canManage = canManageSecretariat(user) || user?.group_name === "Trimitra";
  const [aspirations, setAspirations] = useState<Aspiration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"aspirations" | "events">("aspirations");

  useEffect(() => {
    Promise.all([api.listAspirations(), api.listEvents()])
      .then(([aspRes, evtRes]) => {
        setAspirations(aspRes.aspirations || []);
        setEvents(evtRes.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateAspirationStatus(id, status);
      setAspirations(aspirations.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      alert("Gagal mengubah status aspirasi.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Portal Publik</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Kelola aspirasi siswa umum dan daftar event publik eksternal
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setActiveTab("aspirations")}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === "aspirations" ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Aspirasi Masuk ({aspirations.length})
          {activeTab === "aspirations" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === "events" ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Event Publik ({events.length})
          {activeTab === "events" && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : activeTab === "aspirations" ? (
        aspirations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-[var(--text-muted)]">Belum ada aspirasi masuk.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {aspirations.map((a) => (
              <div key={a.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`badge ${statusBadge[a.status] || "badge-neutral"}`}>{a.status}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-3">
                      {new Date(a.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                     {canManage && <div className="flex gap-2">
                     <button
                      onClick={() => handleUpdateStatus(a.id, "Diproses")}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      Proses
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(a.id, "Ditindaklanjuti")}
                      className="btn-primary text-xs py-1 px-2.5"
                    >
                      Selesai
                    </button>
                   </div>}
                 </div>
                 <p className="text-sm text-[var(--text-primary)] leading-relaxed">{a.content}</p>
                <div className="mt-3 text-xs text-[var(--text-muted)]">
                  Pengirim: {a.is_anonymous ? "Anonim (Siswa Umum)" : a.user_nis || "Siswa Umum"}
                </div>
              </div>
            ))}
          </div>
        )
      ) : events.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada event terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {events.map((e) => (
            <div key={e.id} className="glass-card p-5 hover:translate-y-[-1px] transition-all">
              <span className="text-xs text-[var(--text-muted)]">
                Event Date: {new Date(e.date).toLocaleDateString("id-ID")}
              </span>
              <h3 className="font-semibold text-lg mt-1 mb-2">{e.name}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{e.description}</p>
              <div className="flex justify-between items-center border-t border-[var(--border)] pt-4 mt-auto">
                <span className="text-xs text-[var(--text-muted)]">Penyelenggara: {e.created_by}</span>
                <button className="btn-secondary text-xs py-1.5 px-3">Lihat Pendaftar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
