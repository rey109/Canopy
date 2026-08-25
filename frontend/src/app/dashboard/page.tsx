"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, type TransaksiDetail, type RapatDetail } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleContextCard from "@/components/role-context-card";
import { getRoleGroup } from "@/lib/role-access";

interface Stats {
  prokerCount: number;
  pendingApprovals: number;
  balance: number;
  meetingCount: number;
}

interface PendingApproval {
  persetujuan_id: number;
  dokumen_id: number;
  urutan: number;
  approver_group_name: string;
  keputusan: string;
  catatan: string | null;
  waktu: string | null;
  urgency?: "Urgent" | "High" | "Normal";
}

export interface Agenda {
  id: number | string;
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location: string;
  isOnline: boolean;
  description: string;
  createdBy: string;
}

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [stats, setStats] = useState<Stats>({
    prokerCount: 0,
    pendingApprovals: 0,
    balance: 0,
    meetingCount: 0,
  });

  const [pendingList, setPendingList] = useState<PendingApproval[]>([]);
  const [meetingList, setMeetingList] = useState<RapatDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval modal states
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState<number | null>(null);

  // SweetAlert & Confirmation States
  const [agendaToDelete, setAgendaToDelete] = useState<Agenda | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "delete"; title: string; message: string } | null>(null);

  // Dynamic Calendar State (Default: August 2026)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 7, 24));
  const [selectedDay, setSelectedDay] = useState<number>(24);

  // All Agendas stored in array
  const [agendas, setAgendas] = useState<Agenda[]>([]);

  const currentYear = currentCalendarDate.getFullYear();
  const currentMonthIndex = currentCalendarDate.getMonth();

  // Dynamic calculation for Days in Month & Start Day Offset (Monday = 0)
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const rawFirstDay = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0 = Sun
  const startDayOffset = (rawFirstDay + 6) % 7; // Mon = 0, Tue = 1, ..., Sun = 6

  // Key generator for date comparison: "YYYY-MM-DD"
  const getDateStr = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const currentSelectedDateStr = getDateStr(currentYear, currentMonthIndex, selectedDay);

  const showSwalToast = (title: string, message: string, type: "success" | "delete" = "success") => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 1200);
  };

  const loadAgendas = async () => {
    try {
      const response = await api.listMeetings();
      setAgendas(response.rapat.map((meeting) => ({
        id: meeting.rapat_id,
        title: meeting.judul,
        startDate: meeting.tanggal.slice(0, 10),
        startTime: meeting.tanggal.slice(11, 16),
        endTime: meeting.tanggal.slice(11, 16),
        location: meeting.lokasi,
        isOnline: false,
        description: meeting.agenda,
        createdBy: meeting.dibuat_oleh,
      })));
    } catch {
      setAgendas([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [prokers, approvals, balance, meetings] =
        await Promise.allSettled([
          api.listProkers(),
          api.listPendingApprovals(),
          api.getBalance(),
          api.listMeetings(),
        ]);

      const rawPending =
        approvals.status === "fulfilled" ? approvals.value.persetujuan || [] : [];

      const pending: PendingApproval[] = rawPending.map((item, idx) => ({
        ...item,
        urgency: idx === 0 ? "Urgent" : idx % 2 === 0 ? "High" : "Normal",
      }));

      setPendingList(pending);

      if (meetings.status === "fulfilled") {
        setMeetingList(meetings.value.rapat || []);
      }

       const actualProkerCount = prokers.status === "fulfilled" && Array.isArray(prokers.value.prokers) ? prokers.value.prokers.length : 0;

      setStats({
        prokerCount: actualProkerCount,
        pendingApprovals: pending.length,
        balance: 0, // Kas belum diisi (0)
        meetingCount: meetings.status === "fulfilled" && Array.isArray(meetings.value.rapat) ? meetings.value.rapat.length : 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    void loadAgendas();
  }, [user]);

  const handleApprovalAction = async (
    id: number,
    keputusan: string,
    notes: string = ""
  ) => {
    setActioningId(id);
    try {
      await api.actionApproval(id, keputusan, notes || undefined);
      await fetchDashboardData();
      setShowRevisionModal(null);
      setRevisionNotes("");
    } catch (err: any) {
      alert("Gagal memproses persetujuan: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  // Confirmed Delete Agenda
  const handleConfirmDelete = () => {
    if (!agendaToDelete) return;
    const updated = agendas.filter((a) => a.id !== agendaToDelete.id);
    setAgendas(updated);
    void api.deleteMeeting(Number(agendaToDelete.id)).catch(() => {});

    setAgendaToDelete(null);
    showSwalToast("Berhasil Dihapus!", "Agenda telah berhasil dihapus.", "delete");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const selectedAgendas = agendas.filter((a) => a.startDate === currentSelectedDateStr);
  const roleGroup = getRoleGroup(user);
  const showFinanceCard = roleGroup === "Bendahara" || roleGroup === "Trimitra";
  const showApprovalCard = roleGroup === "Sekretaris" || roleGroup === "Bendahara" || roleGroup === "Trimitra";
  const roleSummary = roleGroup === "Staf"
    ? "Tugas personal, jadwal rapat, dan pengumuman divisi."
    : roleGroup === "Kepala Divisi"
      ? "Progres divisi, task anggota, dan kehadiran Sekbid."
      : roleGroup === "Sekretaris"
        ? "Dokumen, notulensi, presensi, dan aset sesuai scope."
        : roleGroup === "Bendahara"
          ? "Saldo, transaksi, verifikasi nota, dan approval berisiko."
          : roleGroup === "Pembina"
            ? "Pemantauan organisasi dan catatan pembinaan."
            : "Approval pusat, struktur, dan ringkasan seluruh organisasi.";

  return (
    <div className="animate-fade-in space-y-6 pb-12 text-slate-100 font-sans">
      
      <RoleContextCard />

      {/* TOP BREADCRUMB & HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Manajemen OSIS</span>
            <span>&gt;</span>
            <span className="text-blue-400 font-bold">Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Selamat datang kembali, <span className="text-blue-400 font-semibold">{user?.nama || "Pengurus OSIS"}</span> ({user?.role_name || user?.group_name || "Anggota"})
          </p>
        </div>
      </div>

      <div className="glass-card border border-slate-700/70 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Prioritas role hari ini</p>
        <p className="mt-2 text-sm text-slate-200">{roleSummary}</p>
      </div>

      {/* EXECUTIVE SUMMARY GRID (4 KPI CARDS ROW) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Executive Summary Grid
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Stat Card 1: Program Kerja */}
          <Link
            href="/dashboard/proker"
            className="bg-[#1e293b]/90 border border-slate-700/60 hover:border-blue-500/60 rounded-2xl p-5 shadow-lg hover:shadow-blue-500/5 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                  📋
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  PROGRAM KERJA
                </span>
              </div>
              <span className="text-slate-500 group-hover:text-blue-400 transition-colors text-xs font-bold">→</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white">{stats.prokerCount}</span>
                <span className="text-xs font-semibold text-slate-400">Active</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {stats.prokerCount > 0 ? `${stats.prokerCount} Program Kerja Tersimpan` : "Belum Ada Program Kerja"}
              </p>
            </div>
          </Link>

          {/* Stat Card 2: Pending Approval */}
          {showApprovalCard && <button
            onClick={() => {
              const el = document.getElementById("approval-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-[#1e293b]/90 border border-slate-700/60 hover:border-purple-500/60 rounded-2xl p-5 shadow-lg hover:shadow-purple-500/5 transition-all group text-left flex flex-col justify-between space-y-4 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-xs">
                  📄
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  PENDING APPROVAL
                </span>
              </div>
              <span className="text-slate-500 group-hover:text-purple-400 transition-colors text-xs font-bold">→</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white">{pendingList.length}</span>
                <span className="text-xs font-semibold text-rose-400">Urgent</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Proposals &amp; Letters</p>
            </div>
          </button>}

           {/* Stat Card 3: Saldo Kas (Rp 0) */}
           {showFinanceCard ? <Link
             href="/dashboard/finance"
            className="bg-[#1e293b]/90 border border-slate-700/60 hover:border-emerald-500/60 rounded-2xl p-5 shadow-lg hover:shadow-emerald-500/5 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                  💵
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  SALDO KAS
                </span>
              </div>
              <span className="text-slate-500 group-hover:text-emerald-400 transition-colors text-xs font-bold">→</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-white">{formatCurrency(0)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Belum Ada Kas Masuk</p>
            </div>
           </Link> : <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
             <p className="text-xs font-bold uppercase tracking-wider text-slate-400">KEHADIRAN PRIBADI</p>
             <p className="mt-3 text-2xl font-extrabold text-emerald-400">—</p>
             <p className="mt-1 text-[11px] text-slate-400">Rekap presensi periode aktif</p>
           </div>}

           {/* Stat Card 4: Total Rapat */}
          <Link
            href="/dashboard/meetings"
            className="bg-[#1e293b]/90 border border-slate-700/60 hover:border-rose-500/60 rounded-2xl p-5 shadow-lg hover:shadow-rose-500/5 transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs">
                  👥
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  TOTAL RAPAT
                </span>
              </div>
              <span className="text-slate-500 group-hover:text-rose-400 transition-colors text-xs font-bold">→</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white">{stats.meetingCount}</span>
                <span className="text-xs font-semibold text-slate-400">Upcoming</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Hari ini - Minggu ini</p>
            </div>
          </Link>

        </div>
      </div>

      {/* MAIN 2-COLUMN SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">

        {/* LEFT COLUMN: ANTRIAN PERSETUJUAN DOKUMEN TABLE (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <div id="approval-section" className="bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📥 Antrian Persetujuan Dokumen</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {pendingList.length} Berkas
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifikasi proposal dan berkas laporan yang membutuhkan pengesahan pimpinan.
                </p>
              </div>
            </div>

            {/* TABLE FORMATTED ACCORDING TO MOCKUP */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700/80 bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 rounded-l-xl">Dokumen</th>
                    <th className="py-3.5 px-4">Divisi</th>
                    <th className="py-3.5 px-4">Pengaju</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Memuat antrian persetujuan...
                      </td>
                    </tr>
                  ) : pendingList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 font-bold border border-emerald-500/20">
                          ✓
                        </div>
                        Tidak ada antrian persetujuan dokumen saat ini.
                      </td>
                    </tr>
                  ) : (
                    pendingList.map((doc, idx) => (
                      <tr key={doc.persetujuan_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                          <span>📄</span> Proposal Proker Divisi {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {doc.approver_group_name || `Divisi ${idx + 1}`}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {user?.nama || "Pengurus OSIS"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.urgency === "Urgent"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : doc.urgency === "High"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}>
                            {doc.urgency || "Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowRevisionModal(doc.persetujuan_id)}
                              disabled={actioningId !== null}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                            >
                              Revisi
                            </button>
                            <button
                              onClick={() => handleApprovalAction(doc.persetujuan_id, "Disetujui")}
                              disabled={actioningId !== null}
                              className="bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-[11px] py-1.5 px-3.5 rounded-lg shadow-sm transition-all cursor-pointer"
                            >
                              Setujui
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR & HARIAN AGENDA (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl p-6 shadow-lg space-y-5">
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {monthNames[currentMonthIndex].slice(0, 3)} {currentYear}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    aria-label="Bulan Sebelumnya"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    aria-label="Bulan Berikutnya"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              <Link
                href="/dashboard/schedule"
                className="bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-xs py-2 px-3.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📅</span> Kelola Kalender
              </Link>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 text-center gap-y-1.5 text-xs font-medium">
              {Array.from({ length: startDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1 text-transparent" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayDateStr = getDateStr(currentYear, currentMonthIndex, dayNum);
                const hasAgenda = agendas.some((a) => a.startDate === dayDateStr);
                const isSelected = selectedDay === dayNum;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`py-1.5 mx-auto w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs relative ${
                      isSelected
                        ? "bg-[#2563eb] text-white font-bold shadow-md shadow-blue-500/40 scale-105"
                        : hasAgenda
                        ? "bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {dayNum}
                    {hasAgenda && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Harian Agenda Box */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-white">
                  Harian Agenda
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                  {selectedAgendas.length} Acara
                </span>
              </div>

              {selectedAgendas.length > 0 ? (
                <div className="space-y-3">
                  {selectedAgendas.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 animate-fade-in relative group"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-blue-400">{item.startTime} - {item.endTime} WIB</span>
                        <button
                          onClick={() => setAgendaToDelete(item)}
                          className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Hapus Agenda Ini"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                        <span>📍 {item.location}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700/80 space-y-2">
                  <p>Tidak ada agenda khusus pada tanggal {selectedDay} {monthNames[currentMonthIndex]}.</p>
                  <Link
                    href="/dashboard/schedule?action=add"
                    className="text-xs font-semibold text-blue-400 hover:underline inline-block cursor-pointer"
                  >
                    + Tambah agenda untuk tanggal ini
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL MODALS: RENDERED AT BODY LEVEL VIA createPortal */}
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
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SWEETALERT TOAST NOTIFICATION */}
      {mounted && toast && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pointer-events-none animate-fade-in">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center max-w-xs w-full space-y-3 pointer-events-auto transform scale-100 transition-all">
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

      {/* REVISION / REJECTION MODAL */}
      {mounted && showRevisionModal !== null && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl border border-slate-700 text-slate-100">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              📝 Berikan Catatan Revisi
            </h3>
            <textarea
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all font-medium resize-none"
              placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
              required
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRevisionModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  handleApprovalAction(showRevisionModal, "Ditolak", revisionNotes)
                }
                disabled={!revisionNotes.trim() || actioningId !== null}
                className="bg-[#2563eb] hover:bg-blue-600 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
