"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Meeting {
  id: number;
  title: string;
  schedule: string;
  division_id: number | null;
  proker_id: number | null;
  minutes: string;
  qc_status: string;
  created_by: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listMeetings()
      .then((res) => setMeetings(res.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rapat & Kegiatan</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Jadwalkan rapat divisi atau organisasi, rekam notulensi, dan catat kehadiran
          </p>
        </div>
        <button className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Jadwalkan Rapat
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
      ) : meetings.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada rapat terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {meetings.map((m) => (
            <div key={m.id} className="glass-card p-5 flex flex-col justify-between hover:translate-y-[-1px] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge ${m.qc_status === "Approved" ? "badge-success" : "badge-warning"}`}>
                    QC: {m.qc_status}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(m.schedule).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{m.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4">
                  {m.minutes || "Notulensi rapat belum ditulis."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-auto">
                <span className="text-xs text-[var(--text-muted)]">Oleh: {m.created_by}</span>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs py-1.5 px-3">Kehadiran</button>
                  <button className="btn-primary text-xs py-1.5 px-3">Tulis Notulensi</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
