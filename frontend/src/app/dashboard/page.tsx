"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api, type TransaksiDetail } from "@/lib/api";
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
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ prokerCount: 0, pendingApprovals: 0, balance: 0, meetingCount: 0 });
  const [pendingList, setPendingList] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  // Approval modal states
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [prokers, approvals, balance, meetings, tasks, txs] = await Promise.allSettled([
        api.listProkers(),
        api.listPendingApprovals(),
        api.getBalance(),
        api.listMeetings(),
        api.listTasks(),
        api.listTransactions(),
      ]);

      const pending = approvals.status === "fulfilled" ? approvals.value.persetujuan || [] : [];
      setPendingList(pending);

      // Hitung task saya yang belum selesai
      let myTasks = 0;
      if (tasks.status === "fulfilled" && user) {
        myTasks = tasks.value.tasks.filter(t => t.assigned_to === user.nis && t.status !== "Selesai").length;
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
          if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear && t.status === "Disetujui") {
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

      setStats({
        prokerCount: prokers.status === "fulfilled" ? prokers.value.prokers?.length || 0 : 0,
        pendingApprovals: pending.length,
        balance: balance.status === "fulfilled" ? balance.value.saldo : 0,
        meetingCount: meetings.status === "fulfilled" ? meetings.value.rapat?.length || 0 : 0,
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

  const handleApprovalAction = async (id: number, keputusan: string, notes: string = "") => {
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
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  // View capabilities based on roles (Spec 02 & 04)
  const gName = user?.group_name;
  const isTrimitra = gName === "Trimitra";
  const isKetuaDivisi = gName === "Kepala Divisi";
  const isSekretariat = gName === "Sekretaris";
  const isBendahara = gName === "Bendahara";
  const isPembina = gName === "Pembina";
  const isStaf = gName === "Staf";

  const showApprovalInbox = isTrimitra || isSekretariat || isBendahara;
  const showFinancialSummary = isTrimitra || isBendahara || isPembina;
  const showOrgStats = isTrimitra || isPembina || isSekretariat || isBendahara;
  const showPersonalSummary = isStaf || isKetuaDivisi;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()},{" "}
          <span className="gradient-text">{user?.nama?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {user?.role_name || user?.group_name} {user?.division_id ? `• Bidang ${user.division_id}` : ""}
        </p>
      </div>

      {/* Stats Grid for Management Roles */}
      {showOrgStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {[
            { label: "Program Kerja", value: stats.prokerCount, gradient: "from-blue-500 to-cyan-500" },
            { label: "Persetujuan Pending", value: stats.pendingApprovals, gradient: "from-amber-500 to-orange-500" },
            { label: "Saldo Kas", value: formatCurrency(stats.balance), gradient: "from-emerald-500 to-green-500" },
            { label: "Total Rapat", value: stats.meetingCount, gradient: "from-purple-500 to-pink-500" },
          ].map((card, i) => (
            <div key={i} className="glass-card p-4 transition-all duration-200">
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{card.label}</p>
              {loading ? (
                <div className="h-6 w-20 bg-[var(--border)] rounded animate-pulse mt-2" />
              ) : (
                <p className="text-xl font-bold mt-1 truncate">{card.value}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Inbox / Actionable Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {showApprovalInbox && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  📥 Menunggu Persetujuan
                  {pendingList.length > 0 && <span className="badge badge-warning">{pendingList.length}</span>}
                </h2>
              </div>

              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-10 bg-[var(--border)] rounded" />
                  <div className="h-10 bg-[var(--border)] rounded" />
                </div>
              ) : pendingList.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-muted)] text-sm">
                  Semua bersih! Tidak ada dokumen yang menunggu persetujuan.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingList.map((app) => (
                    <div key={app.persetujuan_id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-info uppercase">Langkah {app.urutan}</span>
                          <span className="text-xs text-[var(--text-muted)]">Dokumen ID: {app.dokumen_id}</span>
                        </div>
                        <p className="text-sm font-medium mt-1">Grup Approver: {app.approver_group_name}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprovalAction(app.persetujuan_id, "Disetujui")} disabled={actioningId !== null} className="btn-primary text-xs py-1.5 px-3">
                          Setujui
                        </button>
                        <button onClick={() => setShowRevisionModal(app.persetujuan_id)} disabled={actioningId !== null} className="btn-secondary text-xs py-1.5 px-3">
                          Revisi
                        </button>
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
                  <div className="text-xs text-[var(--text-muted)] mb-1">Tingkat kehadiran (11/12 rapat)</div>
                </div>
                <Link href="/dashboard/attendance" className="text-xs text-[var(--accent)] mt-3 inline-block hover:underline">Lihat detail kehadiran →</Link>
              </div>
              <div className="glass-card p-5">
                <h2 className="font-semibold mb-3">Tugas Aktif</h2>
                <div className="space-y-2">
                  {myTasksCount === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Tidak ada tugas aktif.</p>
                  ) : (
                    <p className="text-sm font-bold text-[var(--accent)]">{myTasksCount} tugas menunggu diselesaikan!</p>
                  )}
                </div>
                <Link href="/dashboard/task" className="text-xs text-[var(--accent)] mt-3 inline-block hover:underline">Kelola tugas →</Link>
              </div>
            </div>
          )}


        </div>

        {/* Right Column: Timelines, Upcoming, Side widgets */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold mb-4">Agenda Hari Ini</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-10 text-right text-xs font-medium text-[var(--text-muted)] mt-1">15:00</div>
                <div className="flex-1 p-2 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20">
                  <div className="text-sm font-medium text-[var(--accent)]">Rapat Koordinasi BPH</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Ruang OSIS</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 text-right text-xs font-medium text-[var(--text-muted)] mt-1">16:30</div>
                <div className="flex-1 p-2 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                  <div className="text-sm font-medium">Gladi Bersih Porseni</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">Lapangan Basket</div>
                </div>
              </div>
            </div>
            <Link href="/dashboard/schedule" className="btn-secondary w-full text-xs mt-4 justify-center">Lihat Kalender Lengkap</Link>
          </div>

          {showFinancialSummary && (
            <div className="glass-card p-5 bg-gradient-to-br from-emerald-900/40 to-[var(--bg-secondary)] border-emerald-500/30">
              <h2 className="text-base font-semibold text-emerald-400 mb-2">Ringkasan Kas</h2>
              <p className="text-3xl font-bold">{formatCurrency(stats.balance)}</p>
              <div className="flex items-center gap-2 mt-4 text-xs">
                <span className="text-emerald-400">↑ {formatCurrency(monthlyIncome)}</span>
                <span className="text-red-400">↓ {formatCurrency(monthlyExpense)}</span>
                <span className="text-[var(--text-muted)]">(Bulan ini)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revision Modal */}
      {showRevisionModal !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">📝 Berikan Catatan Revisi</h3>
            <textarea
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="input-field text-sm resize-none"
              placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
              required
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRevisionModal(null)} className="btn-secondary text-xs">Batal</button>
              <button
                onClick={() => handleApprovalAction(showRevisionModal, "Ditolak", revisionNotes)}
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
