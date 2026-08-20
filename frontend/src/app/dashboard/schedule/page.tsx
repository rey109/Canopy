"use client";

import { useAuth } from "@/lib/auth-context";

export default function SchedulePage() {
  const { user } = useAuth();

  // Mock schedule data
  const schedules = [
    { id: 1, title: "Rapat Koordinasi", date: "15", type: "Rapat", time: "15:00" },
    { id: 2, title: "Lomba Futsal", date: "20", type: "Event", time: "08:00" },
  ];

  const canCreateDivisi = user?.group_name === "Kepala Divisi";
  const canCreateOrganisasi = user?.group_name === "Sekretaris";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jadwal</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Kalender kegiatan dan rapat organisasi.
          </p>
        </div>
        
        {canCreateDivisi && (
          <button className="btn-primary text-xs">Buat Jadwal Divisi</button>
        )}
        
        {canCreateOrganisasi && (
          <button className="btn-primary text-xs">Kelola Jadwal Organisasi</button>
        )}
      </div>

      <div className="card p-4">
        {/* Mockup Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="font-bold">Oktober 2023</h2>
          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Mockup Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
            <div key={day} className="bg-[var(--bg-secondary)] p-2 text-center text-[10px] font-medium text-[var(--text-muted)]">
              {day}
            </div>
          ))}
          
          {Array.from({ length: 35 }).map((_, i) => {
            const date = i - 2; // Offset for starting day
            const isCurrentMonth = date > 0 && date <= 31;
            const hasEvent = schedules.find(s => parseInt(s.date) === date);
            
            return (
              <div key={i} className={`bg-[var(--bg-secondary)] min-h-[80px] p-1.5 ${isCurrentMonth ? "" : "opacity-30"}`}>
                <div className={`text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  date === 15 ? "bg-[var(--accent)] text-white" : ""
                }`}>
                  {isCurrentMonth ? date : ""}
                </div>
                {hasEvent && (
                  <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] truncate">
                    {hasEvent.time} {hasEvent.title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
