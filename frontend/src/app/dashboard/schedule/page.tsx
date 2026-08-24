"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";

// ==========================================
// 1. DATA STRUCTURE & TYPES
// ==========================================
export interface Agenda {
  id: number | string;
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location: string;
  isOnline: boolean;
  description: string;
  targetAudience: string;
  createdBy: string;
}

// Initial Agendas: Starts 100% EMPTY per user request
const initialAgendas: Agenda[] = [];

export default function SchedulePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [agendas, setAgendas] = useState<Agenda[]>(initialAgendas);
  const [toast, setToast] = useState<{
    type: "success" | "delete";
    title: string;
    message: string;
  } | null>(null);

  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 1200);
  };

  // Load agendas strictly from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("canopy_schedule_agendas");
      if (saved !== null) {
        const parsed: Agenda[] = JSON.parse(saved);
        setAgendas(parsed);
      } else {
        setAgendas([]);
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("action") === "add") {
        setIsAddModalOpen(true);
      }
    } catch (e) {
      console.error("Failed to load agendas from localStorage", e);
    }
  }, []);

  // Save agendas helper (persists to localStorage & state)
  const saveAgendas = (newList: Agenda[]) => {
    setAgendas(newList);
    try {
      localStorage.setItem("canopy_schedule_agendas", JSON.stringify(newList));
    } catch (e) {
      console.error("Failed to save agendas to localStorage", e);
    }
  };
  
  // Date navigation states (Default: August 2026)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 24));
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [agendaToDelete, setAgendaToDelete] = useState<Agenda | null>(null);

  // Form states (location starts empty - no automatic "Ruang OSIS")
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("2026-08-25");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("12:00");
  const [newLocation, setNewLocation] = useState("");
  const [newIsOnline, setNewIsOnline] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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
      id: Date.now().toString(),
      title: newTitle.trim(),
      startDate: newDate || "2026-08-25",
      startTime: newStartTime || "10:00",
      endTime: newEndTime || "12:00",
      location: newLocation.trim() || (newIsOnline ? "Online Meeting" : "-"),
      isOnline: newIsOnline,
      description: newDescription.trim(),
      targetAudience: "Seluruh Pengurus",
      createdBy: `${user?.nama || "Pimpinan"} (${user?.group_name || "OSIS"})`,
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
    const updated = agendas.filter((a) => a.id !== id);
    saveAgendas(updated);
    setSelectedAgenda(null);
    setAgendaToDelete(null);
    showSwalAlert("Berhasil Dihapus!", "Agenda telah dihapus dari kalender.", "delete");
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

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-blue-400 uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manajemen Kalender & Agenda
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-1 text-white">
            Jadwal Organisasi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Kelola agenda kegiatan, rapat, dan evaluasi OSIS secara terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2563eb] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Agenda
          </button>
        </div>
      </div>

      {/* CONTROLS BAR: MONTH STEPPER */}
      <div className="flex items-center justify-between gap-4 bg-[#1e293b]/90 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-bold text-white px-3 min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* MONTHLY CALENDAR DISPLAY */}
      <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl p-5 shadow-lg space-y-4">
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
              className="bg-slate-800/30 border border-slate-800/60 rounded-2xl min-h-[110px] p-2 opacity-30"
            ></div>
          ))}

          {/* Current Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dayNum === 24 && month === 7 && year === 2026;
            
            // Find matching agendas for this day
            const dayAgendas = agendas.filter((a) => a.startDate === dateStr);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => handleDayCellClick(dateStr, dayAgendas)}
                className={`bg-slate-800/50 border rounded-2xl min-h-[110px] p-2.5 flex flex-col justify-start transition-all hover:border-blue-500/60 cursor-pointer ${
                  isToday ? "border-blue-500 bg-blue-500/10 shadow-sm" : "border-slate-700/60"
                }`}
                title={dayAgendas.length > 0 ? "Klik untuk lihat detail agenda" : "Klik untuk tambah agenda"}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-[#2563eb] text-white shadow-md shadow-blue-500/30"
                        : "text-slate-200"
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
                      className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors text-xs font-bold"
                      title="Tambah agenda baru di tanggal ini"
                    >
                      +
                    </button>
                    {dayAgendas.length > 0 && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {dayAgendas.length} event
                      </span>
                    )}
                  </div>
                </div>

                {/* Agenda Badges inside day box */}
                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayAgendas.map((agenda) => {
                    return (
                      <div
                        key={agenda.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgenda(agenda);
                        }}
                        className="p-1.5 rounded-lg border text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.02] truncate bg-blue-500/20 text-blue-300 border-blue-500/30"
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

      {/* DETAIL MODAL FOR SELECTED AGENDA (RENDERED VIA PORTAL) */}
      {mounted && selectedAgenda && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1e293b] rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 text-slate-100 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-white">Detail Agenda</h3>
              <button
                onClick={() => setSelectedAgenda(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-blue-400">{selectedAgenda.title}</h3>
              <p className="text-xs text-slate-400">
                📅 Tanggal: <strong className="text-slate-200">{selectedAgenda.startDate}</strong>
              </p>
              <p className="text-xs text-slate-400">
                ⏰ Waktu: <strong className="text-slate-200">{selectedAgenda.startTime} - {selectedAgenda.endTime} WIB</strong>
              </p>
              <p className="text-xs text-slate-400">
                📍 Lokasi: <strong className="text-slate-200">{selectedAgenda.location}</strong>
              </p>
              {selectedAgenda.description && (
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-200 mt-2">
                  {selectedAgenda.description}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setAgendaToDelete(selectedAgenda)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-colors cursor-pointer"
              >
                Hapus Agenda
              </button>
              <button
                onClick={() => setSelectedAgenda(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD AGENDA MODAL (RENDERED VIA PORTAL) */}
      {mounted && isAddModalOpen && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 overflow-hidden text-slate-100">
            
            {/* Top Header */}
            <div className="bg-slate-800/80 p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Tambah Agenda Baru
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jadwalkan kegiatan atau agenda rapat baru pada kalender OSIS
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                aria-label="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateAgenda} className="p-6 space-y-4">
              {/* Judul Agenda */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Judul Agenda
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masukkan judul agenda (mis. Rapat Pleno OSIS)"
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-slate-800 font-medium transition-all"
                  required
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                />
              </div>

              {/* Jam Mulai & Jam Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  />
                </div>
              </div>

              {/* Lokasi & Online Toggle (Starts EMPTY, no automatic pre-filled "Ruang OSIS") */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Lokasi / Link Meeting
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsOnline}
                      onChange={(e) => setNewIsOnline(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-[#2563eb] focus:ring-0"
                    />
                    Online Meeting
                  </label>
                </div>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder={newIsOnline ? "https://meet.google.com/..." : "Masukkan lokasi kegiatan..."}
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 font-medium transition-all"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detail pembahasan agenda..."
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 font-medium resize-none transition-all"
                ></textarea>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span> Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION MODAL: HAPUS AGENDA (RENDERED VIA PORTAL) */}
      {mounted && agendaToDelete && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xl max-w-sm w-full space-y-5 text-slate-100 border border-slate-700 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-white">Hapus Agenda Ini?</h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
                Apakah Anda yakin ingin menghapus agenda &quot;<span className="font-bold text-slate-200">{agendaToDelete.title}</span>&quot;?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setAgendaToDelete(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteAgenda(agendaToDelete.id)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SWEETALERT STYLE TOAST NOTIFICATION (RENDERED VIA PORTAL) */}
      {mounted && toast && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pointer-events-none animate-fade-in">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center max-w-xs w-full space-y-3 pointer-events-auto">
            {toast.type === "success" ? (
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            )}
            <h3 className="text-base font-extrabold text-white mt-1">{toast.title}</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">{toast.message}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
