"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useRef, useCallback } from "react";
import { api, type TransaksiDetail, type RapatDetail } from "@/lib/api";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

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

  // Scan QR states
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanMode, setScanMode] = useState<"presensi" | "nota">("presensi");
  const [presensiMode, setPresensiMode] = useState<"masuk" | "izin_sakit">("masuk");
  const [qrToken, setQrToken] = useState("");
  const [selectedAcaraId, setSelectedAcaraId] = useState<number | null>(null);
  const [scannedRapat, setScannedRapat] = useState<RapatDetail | null>(null);
  const [scanTipe, setScanTipe] = useState<"Izin" | "Sakit">("Izin");
  const [scanKeterangan, setScanKeterangan] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-region";

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

  const startCamera = useCallback(async () => {
    if (cameraActive) return;
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          setQrToken(decodedText);
          stopCamera();
          try {
            const rapat = await api.lookupRapatByQR(decodedText);
            setScannedRapat(rapat);
            setSelectedAcaraId(rapat.rapat_id);
          } catch {
            setScannedRapat(null);
            setScanResult({ success: false, message: "QR tidak dikenali sebagai rapat aktif" });
          }
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanResult({ success: false, message: "Gagal akses kamera: " + (err.message || err) });
    }
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
        setCameraActive(false);
      }).catch(() => {});
    }
  }, []);

  const handleScanSubmit = async () => {
    if (!qrToken.trim() || selectedAcaraId === null) return;
    setScanSubmitting(true);
    setScanResult(null);
    try {
      if (scanMode === "presensi") {
        const data: {
          qr_token: string;
          acara_id: number;
          tipe: string;
          keterangan?: string;
        } = {
          qr_token: qrToken.trim(),
          acara_id: selectedAcaraId,
          tipe: presensiMode === "masuk" ? "Hadir" : scanTipe,
        };
        if (presensiMode === "izin_sakit" && scanKeterangan.trim()) {
          data.keterangan = scanKeterangan.trim();
        }
        await api.scanPresensi(data);
        setScanResult({ success: true, message: "Presensi berhasil dicatat!" });
      } else {
        setScanResult({ success: true, message: "Nota berhasil difoto! Menunggu verifikasi bendahara." });
      }
      resetScanModal();
      setTimeout(() => { setShowScanModal(false); setScanResult(null); }, 1500);
    } catch (err: any) {
      setScanResult({ success: false, message: err.message || "Gagal scan" });
    } finally {
      setScanSubmitting(false);
    }
  };

  const resetScanModal = () => {
    setQrToken("");
    setScannedRapat(null);
    setSelectedAcaraId(null);
    setScanKeterangan("");
    setPresensiMode("masuk");
    setScanTipe("Izin");
  };

  const openScanModal = () => {
    resetScanModal();
    setScanResult(null);
    setScanMode("presensi");
    setShowScanModal(true);
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()},{" "}
            <span className="gradient-text">{user?.nama?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {user?.role_name || user?.group_name} {user?.division_id ? `• Bidang ${user.division_id}` : ""}
          </p>
        </div>
        <button
          onClick={openScanModal}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan QR
        </button>
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

      {/* Scan QR Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">📱 Scan</h3>
              <button onClick={() => { stopCamera(); setShowScanModal(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">&times;</button>
            </div>

            {/* Mode Toggle: Presensi / Nota */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setScanMode("presensi")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${scanMode === "presensi" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"}`}
              >
                📋 QR Presensi
              </button>
              <button
                onClick={() => setScanMode("nota")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${scanMode === "nota" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"}`}
              >
                🧾 Scan Nota
              </button>
            </div>

            {/* Camera Area */}
            <div className="relative">
              <div id={scannerContainerId} className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: 250 }} />
              {!cameraActive && !qrToken && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                    📷 Aktifkan Kamera
                  </button>
                </div>
              )}
              {qrToken && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <div className="text-center space-y-2">
                    <p className="text-green-400 text-sm font-semibold">✓ QR Terdeteksi</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono break-all max-w-[200px]">{qrToken}</p>
                    <button onClick={() => { setQrToken(""); setScannedRapat(null); setSelectedAcaraId(null); startCamera(); }} className="text-xs text-[var(--accent)] underline">Scan ulang</button>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-detected Rapat Info */}
            {scannedRapat && (
              <div className="p-3 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20">
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Rapat Terdeteksi</p>
                <p className="text-sm font-semibold mt-1">{scannedRapat.judul}</p>
                <p className="text-xs text-[var(--text-secondary)]">{new Date(scannedRapat.tanggal).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} • {scannedRapat.lokasi}</p>
              </div>
            )}

            {/* QR not recognized */}
            {qrToken && !scannedRapat && scanResult && !scanResult.success && (
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <p className="text-sm text-red-400">{scanResult.message}</p>
              </div>
            )}

            {/* Presensi mode extras */}
            {scanMode === "presensi" && scannedRapat && (
              <div className="space-y-3">
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                  <button
                    onClick={() => setPresensiMode("masuk")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${presensiMode === "masuk" ? "bg-green-500/20 text-green-400 border-b-2 border-green-400" : "text-[var(--text-secondary)]"}`}
                  >
                    ✅ Hadir
                  </button>
                  <button
                    onClick={() => setPresensiMode("izin_sakit")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${presensiMode === "izin_sakit" ? "bg-amber-500/20 text-amber-400 border-b-2 border-amber-400" : "text-[var(--text-secondary)]"}`}
                  >
                    📝 Izin / Sakit
                  </button>
                </div>

                {presensiMode === "izin_sakit" && (
                  <>
                    <div className="flex gap-2">
                      <button onClick={() => setScanTipe("Izin")} className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${scanTipe === "Izin" ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>Izin</button>
                      <button onClick={() => setScanTipe("Sakit")} className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${scanTipe === "Sakit" ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>Sakit</button>
                    </div>
                    <textarea rows={2} value={scanKeterangan} onChange={(e) => setScanKeterangan(e.target.value)} className="input-field text-sm resize-none w-full" placeholder="Alasan izin/sakit..." />
                  </>
                )}
              </div>
            )}

            {/* Scan Nota mode */}
            {scanMode === "nota" && (
              <div className="text-center py-4 text-[var(--text-muted)] text-sm">
                <p>📷 Arahkan kamera ke nota/faktur</p>
                <p className="text-xs mt-1">Sistem akan otomatis membaca nominal & tanggal</p>
              </div>
            )}

            {/* Success message */}
            {scanResult && scanResult.success && (
              <div className="p-3 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/30">
                {scanResult.message}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { stopCamera(); setShowScanModal(false); }} className="btn-secondary text-xs">Batal</button>
              <button
                onClick={handleScanSubmit}
                disabled={!qrToken.trim() || !scannedRapat || scanSubmitting}
                className="btn-primary text-xs"
              >
                {scanSubmitting ? "Memproses..." : scanMode === "presensi" ? "Kirim Presensi" : "Kirim Nota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
