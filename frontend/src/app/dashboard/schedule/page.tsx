"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// ==========================================
// 1. DATA STRUCTURE & TYPES
// ==========================================
export type AgendaCategory = "Rapat BPH" | "Gladi Bersih" | "Proker" | "Public Event";

export interface Agenda {
  id: number | string;
  title: string;
  category: AgendaCategory;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location: string;
  isOnline: boolean;
  description: string;
  targetAudience: string;
  createdBy: string;
}

// Initial Agendas (starts empty so deleted items never re-appear)
const initialAgendas: Agenda[] = [];

// Visual Color Badge Config for Categories
const categoryStyles: Record<
  AgendaCategory,
  { bg: string; text: string; border: string; dot: string }
> = {
  "Rapat BPH": {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
  "Gladi Bersih": {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    dot: "bg-purple-400",
  },
  Proker: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  "Public Event": {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
};

export default function SchedulePage() {
  const { user } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [viewMode, setViewMode] = useState<"Monthly" | "Weekly">("Monthly");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [toast, setToast] = useState<{
    type: "success" | "delete";
    title: string;
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 1200);
  };

  // Load agendas strictly from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("canopy_schedule_agendas");
      if (saved !== null) {
        const parsed: Agenda[] = JSON.parse(saved);
        const cleaned = parsed.filter(
          (item) => item.title && !item.title.toUpperCase().includes("LEFI")
        );
        setAgendas(cleaned);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem("canopy_schedule_agendas", JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.error("Failed to load agendas from localStorage", e);
    }
  }, []);

  // Save agendas helper
  const saveAgendas = (newList: Agenda[]) => {
    setAgendas(newList);
    try {
      localStorage.setItem("canopy_schedule_agendas", JSON.stringify(newList));
    } catch (e) {
      console.error("Failed to save agendas to localStorage", e);
    }
  };
  
  // Date navigation states
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 24)); // Aug 2026
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [agendaToDelete, setAgendaToDelete] = useState<Agenda | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<AgendaCategory>("Rapat BPH");
  const [newDate, setNewDate] = useState("2026-08-25");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [newLocation, setNewLocation] = useState("");
  const [newIsOnline, setNewIsOnline] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newTargetAudience, setNewTargetAudience] = useState("Trimitra");

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate()));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter agendas
  const filteredAgendas = agendas.filter((item) => {
    if (selectedCategory !== "All" && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Open Add Modal prefilled with date
  const handleOpenAddModalForDate = (dateStr: string) => {
    setNewDate(dateStr);
    setIsAddModalOpen(true);
  };

  // Smart day cell click handler
  const handleDayCellClick = (dateStr: string, dayAgendas: Agenda[]) => {
    if (dayAgendas.length > 0) {
      setSelectedAgenda(dayAgendas[0]);
    } else {
      handleOpenAddModalForDate(dateStr);
    }
  };

  // Create agenda handler
  const handleCreateAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: Agenda = {
      id: Date.now(),
      title: newTitle,
      category: "Rapat BPH",
      startDate: newDate || "2026-08-25",
      startTime: newStartTime || "10:00",
      endTime: newEndTime || "12:00",
      location: newLocation.trim() || (newIsOnline ? "Online Meeting" : "Ruang OSIS"),
      isOnline: newIsOnline,
      description: newDescription,
      targetAudience: "BPH & Presidium",
      createdBy: `${user?.nama || "User"} (${user?.group_name || "BPH"})`,
    };

    const updated = [created, ...agendas];
    saveAgendas(updated);
    setIsAddModalOpen(false);
    showSwalAlert("Berhasil Disimpan!", "Agenda baru telah berhasil ditambahkan ke kalender.", "success");

    // Reset Form
    setNewTitle("");
    setNewLocation("");
    setNewDescription("");
  };

  const handleDeleteAgenda = (id: number | string) => {
    setDeletingId(id);
    setTimeout(() => {
      const updated = agendas.filter((a) => a.id !== id);
      saveAgendas(updated);
      setSelectedAgenda(null);
      setAgendaToDelete(null);
      setDeletingId(null);
      showSwalAlert("Berhasil Dihapus!", "Agenda telah dihapus dari sistem.", "delete");
    }, 100);
  };

  // Calendar calculation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday start offset

  // Check if Trimitra / Executive can manage calendar
  const canManageCalendar =
    user?.group_name === "Trimitra" ||
    user?.group_name === "Sekretaris" ||
    user?.group_name === "Pembina" ||
    true; // Default enabled for UI demonstration

  // Calculate start of the week (Monday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  
  const startOfWeek = getStartOfWeek(currentDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d.getDay()];
    const shortMonth = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"][d.getMonth()];
    return { day: dayName, date: dateStr, displayDate: `${String(d.getDate()).padStart(2, "0")} ${shortMonth}` };
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-blue-400 uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manajemen Kalender & Agenda
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-slate-50">
            Jadwal Organisasi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Kelola agenda rapat presidium, gladi bersih, dan program kerja pusat secara terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageCalendar && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Agenda
            </button>
          )}
        </div>
      </div>

      {/* CONTROLS BAR: MONTH STEPPER & VIEW MODE SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
        {/* Month Stepper */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title="Bulan Sebelumnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-slate-200 px-2 min-w-[110px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title="Bulan Berikutnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode("Monthly")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === "Monthly"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setViewMode("Weekly")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === "Weekly"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mingguan
          </button>
        </div>
      </div>

      {/* CALENDAR DISPLAY AREA */}
      {viewMode === "Monthly" ? (
        /* ==========================================
           MONTHLY VIEW GRID (7 KOLOM)
           ========================================== */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 border-b border-slate-800 pb-3">
            {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => (
              <div key={day} className="uppercase tracking-wider text-[11px]">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty Offset Days */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div
                key={`offset-${i}`}
                className="bg-slate-950/30 border border-slate-800/40 rounded-xl min-h-[110px] p-2 opacity-30"
              ></div>
            ))}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = dayNum === 24 && month === 7 && year === 2026; // Demo today marker
              
              // Find matching agendas for this day
              const dayAgendas = agendas.filter((a) => a.startDate === dateStr);

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => handleDayCellClick(dateStr, dayAgendas)}
                  className={`bg-slate-950/60 border rounded-xl min-h-[110px] p-2 flex flex-col justify-start transition-all hover:border-blue-500/50 cursor-pointer ${
                    isToday ? "border-blue-500/80 ring-1 ring-blue-500/40 bg-blue-950/10" : "border-slate-800"
                  }`}
                  title={dayAgendas.length > 0 ? "Klik untuk lihat detail agenda" : "Klik untuk tambah agenda"}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                          : "text-slate-300"
                      }`}
                    >
                      {dayNum}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModalForDate(dateStr);
                        }}
                        className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors text-xs font-bold"
                        title="Tambah agenda baru di tanggal ini"
                      >
                        +
                      </button>
                      {dayAgendas.length > 0 && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {dayAgendas.length} event
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Agenda Badges inside day box */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px]">
                    {dayAgendas.map((agenda) => {
                      const style = categoryStyles[agenda.category];
                      const isDeleting = deletingId === agenda.id;
                      return (
                        <div
                          key={agenda.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgenda(agenda);
                          }}
                          className={`p-1.5 rounded-lg border text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.03] truncate ${
                            isDeleting ? "animate-agenda-delete" : "animate-agenda-add"
                          } ${style.bg} ${style.text} ${style.border}`}
                          title={`${agenda.startTime} - ${agenda.title}`}
                        >
                          <div className="font-bold truncate">{agenda.startTime} {agenda.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ==========================================
           WEEKLY VIEW (7 TIMELINE DAYS)
           ========================================== */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>Minggu Ini ({startOfWeek.getDate()} {monthNames[startOfWeek.getMonth()].slice(0,3)} - {endOfWeek.getDate()} {monthNames[endOfWeek.getMonth()].slice(0,3)} {endOfWeek.getFullYear()})</span>
            <span className="text-blue-400">Timeline Agenda Mingguan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((dayObj) => {
              const dayAgendas = agendas.filter((a) => a.startDate === dayObj.date);
              return (
                <div
                  key={dayObj.date}
                  onClick={() => handleDayCellClick(dayObj.date, dayAgendas)}
                  className="bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 rounded-xl p-3 space-y-3 min-h-[220px] cursor-pointer transition-all"
                  title={dayAgendas.length > 0 ? "Klik untuk lihat detail agenda" : "Klik untuk tambah agenda"}
                >
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{dayObj.day}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">{dayObj.displayDate}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModalForDate(dayObj.date);
                        }}
                        className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors text-xs font-bold"
                        title="Tambah agenda baru di tanggal ini"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {dayAgendas.length === 0 ? (
                    <p className="text-[11px] text-slate-600 italic py-4 text-center">+ Tambah Agenda</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAgendas.map((agenda) => {
                        const style = categoryStyles[agenda.category];
                        return (
                          <div
                            key={agenda.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgenda(agenda);
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all hover:scale-[1.02] space-y-1 ${style.bg} ${style.text} ${style.border}`}
                          >
                            <div className="text-[10px] font-mono text-slate-400">
                              {agenda.startTime} - {agenda.endTime}
                            </div>
                            <div className="font-bold line-clamp-2 text-slate-100">{agenda.title}</div>
                            <div className="text-[10px] opacity-80 truncate">{agenda.location}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENDA DETAIL MODAL */}
      {selectedAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-blue-400">Detail Agenda</span>
              <button
                onClick={() => setSelectedAgenda(null)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-100">{selectedAgenda.title}</h3>
            {/* Detail info body */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span>Waktu: <strong>{selectedAgenda.startDate} • {selectedAgenda.startTime} - {selectedAgenda.endTime} WIB</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span>Lokasi: <strong className="text-blue-400 underline">{selectedAgenda.location}</strong></span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-1">Deskripsi Agenda:</h4>
              <p className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                {selectedAgenda.description || "Tidak ada deskripsi."}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {canManageCalendar ? (
                <button
                  onClick={() => setAgendaToDelete(selectedAgenda)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Agenda
                </button>
              ) : <div></div>}
              <button
                onClick={() => setSelectedAgenda(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: TAMBAH AGENDA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-modal-backdrop overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-modal-pop">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>➕ Tambah Agenda Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAgenda} className="space-y-4 text-xs">
              {/* Judul Agenda */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Judul Agenda <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Misal: Rapat Koordinasi Presidium BPH..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tanggal & Jam (Mulai - Selesai) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lokasi & Type Checkbox */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Lokasi / Link Meeting
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-blue-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsOnline}
                      onChange={(e) => setNewIsOnline(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                    />
                    Online Meeting
                  </label>
                </div>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder={newIsOnline ? "https://meet.google.com/..." : "Ruang OSIS / Lapangan..."}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Deskripsi Agenda</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detail pembahasan atau agenda..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: HAPUS AGENDA */}
      {agendaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Hapus Agenda Ini?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <p className="font-semibold text-slate-200">{agendaToDelete.title}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {agendaToDelete.startDate} • {agendaToDelete.startTime} WIB
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setAgendaToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteAgenda(agendaToDelete.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Ya, Hapus Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SWEETALERT STYLE POPUP NOTIFICATION */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-modal-backdrop pointer-events-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm w-full space-y-3 animate-swal-pop pointer-events-auto">
            {toast.type === "success" ? (
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-swal-icon shadow-xl shadow-emerald-500/10">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-400 animate-swal-icon shadow-xl shadow-rose-500/10">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            )}

            <h3 className="text-base font-bold text-slate-100 mt-1">{toast.title}</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
