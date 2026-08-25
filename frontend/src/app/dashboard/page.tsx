"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api, type TransaksiDetail, type RapatDetail } from "@/lib/api";
import Link from "next/link";

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

interface SavedAgenda {
  id: number | string;
  title: string;
  category: string;
  startDate: string;
  startTime: string;
  endTime: string;
  location: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    prokerCount: 0,
    pendingApprovals: 0,
    balance: 0,
    meetingCount: 0,
  });
  const [pendingList, setPendingList] = useState<PendingApproval[]>([]);
  const [meetingList, setMeetingList] = useState<RapatDetail[]>([]);
  const [savedAgendas, setSavedAgendas] = useState<SavedAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"All" | "Urgent">("All");

  // Load saved agendas from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("canopy_schedule_agendas");
      if (saved) {
        const parsed: SavedAgenda[] = JSON.parse(saved);
        const cleaned = parsed.filter(
          (item) => item.title && !item.title.toUpperCase().includes("LEFI")
        );
        setSavedAgendas(cleaned);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem("canopy_schedule_agendas", JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.error("Failed to load saved agendas on dashboard", e);
    }
  }, []);

  // Approval modal states
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [prokers, approvals, balance, meetings, tasks, txs] =
        await Promise.allSettled([
          api.listProkers(),
          api.listPendingApprovals(),
          api.getBalance(),
          api.listMeetings(),
          api.listTasks(),
          api.listTransactions(),
        ]);

      const rawPending =
        approvals.status === "fulfilled" ? approvals.value.persetujuan || [] : [];

      // Assign dynamic urgency markers for UI demo & clear priority visualization
      const pending: PendingApproval[] = rawPending.map((item, idx) => ({
        ...item,
        urgency: idx === 0 ? "Urgent" : idx % 2 === 0 ? "High" : "Normal",
      }));

      setPendingList(pending);

      if (meetings.status === "fulfilled") {
        setMeetingList(meetings.value.rapat || []);
      }

      // Hitung task saya yang belum selesai
      let myTasks = 0;
      if (tasks.status === "fulfilled" && user) {
        myTasks = tasks.value.tasks.filter(
          (t) => t.assigned_to === user.nis && t.status !== "Selesai"
        ).length;
      }
      setMyTasksCount(myTasks);

      // Hitung pemasukan/pengeluaran bulan ini
      let inc = 0;
      let exp = 0;
      if (txs.status === "fulfilled") {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        txs.value.transaksi.forEach((t: TransaksiDetail) => {
          const tDate = new Date(t.tanggal);
          if (
            tDate.getMonth() === currentMonth &&
            tDate.getFullYear() === currentYear &&
            t.status === "Disetujui"
          ) {
            if (t.jenis === "Masuk") {
              inc += t.nominal;
            } else {
              exp += t.nominal;
            }
          }
        });
      }
      setMonthlyIncome(inc);
      setMonthlyExpense(exp);

      const localProkersCount = (() => {
        try {
          const saved = localStorage.getItem("canopy_proker_data");
          return saved !== null ? JSON.parse(saved).length : 0;
        } catch {
          return 0;
        }
      })();

      const localAgendasCount = (() => {
        try {
          const saved = localStorage.getItem("canopy_schedule_agendas");
          return saved ? JSON.parse(saved).length : 0;
        } catch {
          return 0;
        }
      })();

      setStats({
        prokerCount: localProkersCount,
        pendingApprovals: pending.length,
        balance: balance.status === "fulfilled" ? balance.value.saldo : 0,
        meetingCount:
          localAgendasCount > 0
            ? localAgendasCount
            : meetings.status === "fulfilled"
            ? meetings.value.rapat?.length || 0
            : 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 17) return "Selamat Siang";
    return "Selamat Malam";
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered pending list based on urgency filter
  const filteredPending = pendingList.filter((doc) => {
    if (activeFilter === "Urgent") return doc.urgency === "Urgent";
    return true;
  });

  // View capabilities based on roles
  const gName = user?.group_name;
  const isTrimitra = !gName || gName === "Trimitra"; // Executive dashboard components restricted to Trimitra
  const isKetuaDivisi = gName === "Kepala Divisi";
  const isSekretariat = gName === "Sekretaris";
  const isBendahara = gName === "Bendahara";
  const isPembina = gName === "Pembina";
  const isStaf = gName === "Staf";

  const showApprovalInbox = isTrimitra;
  const showFinancialSummary = isTrimitra;
  const showOrgStats = isTrimitra;
  const showPersonalSummary = !isTrimitra;

  const totalArusKas = monthlyIncome + monthlyExpense;
  const incomeRatio = totalArusKas > 0 ? Math.round((monthlyIncome / totalArusKas) * 100) : 100;

  return (
    <div className="animate-fade-in space-y-8">
      {/* HEADER SECTION */}
      <div className="border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
            Executive Dashboard • {user?.group_name || "Platform OSIS"} Mode
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[var(--text-primary)]">
            {greeting()},{" "}
            <span className="gradient-text">{user?.nama?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {user?.role_name || user?.group_name}{" "}
            {user?.division_id ? `• Bidang ${user.division_id}` : ""}
          </p>
        </div>
      </div>

      {/* 1. TOP SUMMARY STAT CARDS (GRID 4 KOLOM) */}
      {showOrgStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CARD 1: Program Kerja */}
          <div className="relative group bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] hover:border-blue-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Program Kerja
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-16 bg-[var(--border)] rounded animate-pulse" />
              ) : (
                <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                  {stats.prokerCount}
                </span>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Program aktif terdaftar
              </p>
            </div>
          </div>

          {/* CARD 2: Persetujuan Pending */}
          <div className="relative group bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] hover:border-amber-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Persetujuan Pending
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                {loading ? (
                  <div className="h-8 w-16 bg-[var(--border)] rounded animate-pulse" />
                ) : (
                  <span className="text-3xl font-extrabold text-amber-400">
                    {stats.pendingApprovals}
                  </span>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">Dokumen butuh persetujuan</p>
              </div>
              {pendingList.length > 0 && (
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                  Action Needed
                </span>
              )}
            </div>
          </div>

          {/* CARD 3: Saldo Kas (Read-Only) */}
          <div className="relative group bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Saldo Kas
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-[var(--border)] rounded animate-pulse" />
              ) : (
                <span className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] truncate block">
                  {formatCurrency(stats.balance)}
                </span>
              )}
            </div>
          </div>

          {/* CARD 4: Total Rapat */}
          <div className="relative group bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] hover:border-purple-500/50 rounded-2xl p-5 transition-all duration-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Total Rapat
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-16 bg-[var(--border)] rounded animate-pulse" />
              ) : (
                <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                  {stats.meetingCount}
                </span>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Agenda mendatang
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA: MAIN WIDGET (KIRI) + SIDE WIDGET (KANAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ==========================================
            2. MAIN WIDGET: MENUNGGU PERSETUJUAN (70%)
           ========================================== */}
        <div className="lg:col-span-2 space-y-6">
          {showApprovalInbox && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>📥 Menunggu Persetujuan</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {pendingList.length} Antrian
                    </span>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Dokumen & proposal yang membutuhkan tindakan langsung (Approve/Reject)
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border)] text-xs">
                  <button
                    onClick={() => setActiveFilter("All")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeFilter === "All"
                        ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Semua ({pendingList.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter("Urgent")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeFilter === "Urgent"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    Urgent ({pendingList.filter((d) => d.urgency === "Urgent").length})
                  </button>
                </div>
              </div>

              {/* Document Queue List */}
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 bg-[var(--border)] rounded-xl" />
                  <div className="h-16 bg-[var(--border)] rounded-xl" />
                </div>
              ) : filteredPending.length === 0 ? (
                /* EMPTY STATE PER SPEC */
                <div className="text-center py-12 px-4 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-primary)]/40">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Semua bersih!
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                    Tidak ada dokumen yang menunggu persetujuan.
                  </p>
                </div>
              ) : (
                /* LIST ITEMS */
                <div className="space-y-3">
                  {filteredPending.map((doc) => (
                    <div
                      key={doc.persetujuan_id}
                      className="group bg-[var(--bg-primary)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-xl p-4 transition-all duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Info */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Langkah {doc.urutan}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                doc.urgency === "Urgent"
                                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {doc.urgency || "Normal"}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              Dokumen ID: #{doc.dokumen_id}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                            Grup Approver: {doc.approver_group_name}
                          </p>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
                          <button
                            onClick={() => setShowRevisionModal(doc.persetujuan_id)}
                            disabled={actioningId !== null}
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            Revisi / Tolak
                          </button>
                          <button
                            onClick={() =>
                              handleApprovalAction(doc.persetujuan_id, "Disetujui")
                            }
                            disabled={actioningId !== null}
                            className="btn-primary text-xs py-1.5 px-4"
                          >
                            Setujui
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showPersonalSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <h2 className="font-semibold mb-3">Kehadiran Saya</h2>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-bold text-green-500">92%</div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">
                    Tingkat kehadiran (11/12 rapat)
                  </div>
                </div>
                <Link
                  href="/dashboard/attendance"
                  className="text-xs text-[var(--accent)] mt-3 inline-block hover:underline"
                >
                  Lihat detail kehadiran →
                </Link>
              </div>
              <div className="glass-card p-5">
                <h2 className="font-semibold mb-3">Tugas Aktif</h2>
                <div className="space-y-2">
                  {myTasksCount === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Tidak ada tugas aktif.
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-[var(--accent)]">
                      {myTasksCount} tugas menunggu diselesaikan!
                    </p>
                  )}
                </div>
                <Link
                  href="/dashboard/task"
                  className="text-xs text-[var(--accent)] mt-3 inline-block hover:underline"
                >
                  Kelola tugas →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            3. SIDE WIDGET (KANAN): AGENDA & KAS
           ========================================== */}
        <div className="space-y-6">
          {/* WIDGET: AGENDA */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>📅 Agenda</span>
              </h2>
              <Link
                href="/dashboard/schedule"
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                Kalender →
              </Link>
            </div>

            <div className="space-y-3">
              {savedAgendas.length > 0 ? (
                savedAgendas.slice(0, 3).map((item, idx) => {
                  const dateParts = item.startDate ? item.startDate.split("-") : [];
                  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                  const dateLabel = dateParts.length === 3 ? `${parseInt(dateParts[2], 10)} ${months[parseInt(dateParts[1], 10) - 1]}` : item.startDate;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] transition-all"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-blue-400">
                          {dateLabel ? `${dateLabel} • ` : ""}{item.startTime || "15:00"} WIB
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {item.location || "Ruang OSIS"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                  Belum ada agenda terdaftar.
                </div>
              )}
            </div>
            <Link
              href="/dashboard/schedule"
              className="btn-secondary w-full text-xs justify-center block text-center"
            >
              Lihat Kalender Lengkap
            </Link>
          </div>

          {/* WIDGET: RINGKASAN KAS BULAN INI */}
          {showFinancialSummary && (
            <div className="bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    📊 Ringkasan Arus Kas
                  </h2>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Performa Keuangan Bulan Ini
                  </p>
                </div>
              </div>

              {/* Income vs Expense Stat */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                  <span className="text-[10px] font-medium text-[var(--text-muted)] block">
                    Pemasukan
                  </span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block truncate">
                    ↑ {formatCurrency(monthlyIncome)}
                  </span>
                </div>
                <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                  <span className="text-[10px] font-medium text-[var(--text-muted)] block">
                    Pengeluaran
                  </span>
                  <span className="text-sm font-bold text-rose-400 mt-0.5 block truncate">
                    ↓ {formatCurrency(monthlyExpense)}
                  </span>
                </div>
              </div>

              {/* Visual Ratio Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-medium text-[var(--text-muted)]">
                  <span>Rasio Arus Kas</span>
                  <span className="text-emerald-400 font-semibold">
                    {incomeRatio}% Pemasukan
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden flex">
                  <div
                    style={{ width: `${incomeRatio}%` }}
                    className="bg-emerald-500 h-full rounded-l-full"
                  ></div>
                  <div
                    style={{ width: `${100 - incomeRatio}%` }}
                    className="bg-rose-500 h-full rounded-r-full"
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REVISION / REJECTION MODAL */}
      {showRevisionModal !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📝 Berikan Catatan Revisi
            </h3>
            <textarea
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="input-field text-sm resize-none"
              placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
              required
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRevisionModal(null)}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                onClick={() =>
                  handleApprovalAction(showRevisionModal, "Ditolak", revisionNotes)
                }
                disabled={!revisionNotes.trim() || actioningId !== null}
                className="btn-primary text-xs"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
