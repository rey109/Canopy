"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Stats {
  prokerCount: number;
  pendingApprovals: number;
  balance: number;
  meetingCount: number;
}

interface PendingApproval {
  id: number;
  document_type: string;
  document_id: number;
  step: number;
  status: string;
  approver_role: string;
  revision_notes: string | null;
  created_at: string;
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
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [prokers, approvals, balance, meetings] = await Promise.allSettled([
        api.listProkers(),
        api.listPendingApprovals(),
        api.getBalance(),
        api.listMeetings(),
      ]);

      const pending = approvals.status === "fulfilled" ? approvals.value.approvals || [] : [];
      setPendingList(pending);

      setStats({
        prokerCount: prokers.status === "fulfilled" ? prokers.value.prokers?.length || 0 : 0,
        pendingApprovals: pending.length,
        balance: balance.status === "fulfilled" ? balance.value.balance : 0,
        meetingCount: meetings.status === "fulfilled" ? meetings.value.meetings?.length || 0 : 0,
      });
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprovalAction = async (id: number, status: string, notes: string = "") => {
    setActioningId(id);
    try {
      await api.actionApproval(id, status, notes);
      await fetchDashboardData();
      setShowRevisionModal(null);
      setRevisionNotes("");
    } catch (err: any) {
      alert("Gagal melakukan aksi persetujuan: " + err.message);
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

  const isTrimitra = user?.role === "Trimitra";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()},{" "}
          <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Peran: <span className="font-semibold text-white">{user?.role}</span> 
          {user?.division_id ? ` • Bidang ${user.division_id}` : ""} • Periode {user?.management_period || "—"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          {
            label: "Program Kerja",
            value: stats.prokerCount,
            suffix: "program",
            gradient: "from-blue-500 to-cyan-500",
          },
          {
            label: "Persetujuan Pending",
            value: stats.pendingApprovals,
            suffix: "menunggu",
            gradient: "from-amber-500 to-orange-500",
          },
          {
            label: "Saldo Kas",
            value: formatCurrency(stats.balance),
            suffix: "",
            gradient: "from-emerald-500 to-green-500",
          },
          {
            label: "Total Rapat",
            value: stats.meetingCount,
            suffix: "rapat",
            gradient: "from-purple-500 to-pink-500",
          },
        ].map((card, i) => (
          <div key={i} className="glass-card p-5 transition-all duration-200 hover:translate-y-[-2px]">
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">{card.label}</p>
            {loading ? (
              <div className="h-8 w-24 bg-[var(--border)] rounded animate-pulse mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            )}
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{card.suffix}</p>
          </div>
        ))}
      </div>

      {/* Special Content for Trimitra Role */}
      {isTrimitra && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Inbox */}
          <div className="glass-card p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                📥 Kotak Masuk Persetujuan
                {pendingList.length > 0 && (
                  <span className="badge badge-warning">{pendingList.length}</span>
                )}
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 bg-[var(--border)] rounded" />
                <div className="h-12 bg-[var(--border)] rounded" />
              </div>
            ) : pendingList.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                Tidak ada dokumen proposal/LPJ yang menunggu persetujuan Anda saat ini.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-info uppercase">{app.document_type}</span>
                        <span className="text-xs text-[var(--text-muted)]">ID Dokumen: {app.document_id}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">Langkah Otorisasi: {app.step} ({app.approver_role})</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Diajukan: {new Date(app.created_at).toLocaleDateString("id-ID")}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprovalAction(app.id, "Approved")}
                        disabled={actioningId !== null}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => setShowRevisionModal(app.id)}
                        disabled={actioningId !== null}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Revisi
                      </button>
                      <button
                        onClick={() => handleApprovalAction(app.id, "Rejected")}
                        disabled={actioningId !== null}
                        className="btn-danger text-xs py-1.5 px-3"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats & Announcements compose */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">📢 Pengumuman Organisasi</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Pengumuman berhasil disiarkan ke seluruh pengurus!");
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Judul Pengumuman</label>
                <input type="text" className="input-field text-sm" placeholder="Contoh: Rapat Pleno Semester I" required />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Isi Pesan Broadcast</label>
                <textarea rows={3} className="input-field text-sm resize-none" placeholder="Tulis instruksi atau pengumuman..." required></textarea>
              </div>
              <button type="submit" className="btn-primary w-full text-xs justify-center py-2">
                Siarkan Pengumuman
              </button>
            </form>
          </div>
        </div>
      )}

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
              placeholder="Jelaskan bagian mana yang perlu diperbaiki oleh Ketua Bidang..."
              required
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRevisionModal(null)} className="btn-secondary text-xs">
                Batal
              </button>
              <button
                onClick={() => handleApprovalAction(showRevisionModal, "Revision", revisionNotes)}
                disabled={!revisionNotes.trim() || actioningId !== null}
                className="btn-primary text-xs"
              >
                Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Buat Proker", href: "/dashboard/proker", color: "from-blue-500 to-cyan-500" },
            { label: "Catat Keuangan", href: "/dashboard/finance", color: "from-emerald-500 to-green-500" },
            { label: "Jadwalkan Rapat", href: "/dashboard/meetings", color: "from-purple-500 to-pink-500" },
            { label: "Booking Aset", href: "/dashboard/assets", color: "from-amber-500 to-orange-500" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--border-hover)] transition-all hover:translate-y-[-1px]"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${action.color}`} />
              <span className="text-sm font-medium">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
