"use client";

import { useEffect, useState } from "react";
import { api, type TransaksiDetail, type ProkerDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canApproveRisk, canManageFinance } from "@/lib/role-access";

export default function FinancePage() {
  const { user } = useAuth();
  const canManage = canManageFinance(user);
  const canApprove = canApproveRisk(user);
  const [activeTab, setActiveTab] = useState<"kas" | "verifikasi" | "berisiko">("kas");
  const [txns, setTxns] = useState<TransaksiDetail[]>([]);
  const [verifikasiList, setVerifikasiList] = useState<TransaksiDetail[]>([]);
  const [berisikoList, setBerisikoList] = useState<TransaksiDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [kategoriList, setKategoriList] = useState<{ kategori_id: number; nama: string }[]>([]);
  const [balance, setBalance] = useState({ total_masuk: 0, total_keluar: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState("");
  const [jenis, setJenis] = useState("Keluar"); // 'Masuk', 'Keluar'
  const [kategoriId, setKategoriId] = useState("");
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");
  const [prokerId, setProkerId] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isBerisiko, setIsBerisiko] = useState(false);
  const [sumber, setSumber] = useState("Manual"); // 'Manual', 'Scan Nota'

  // Verification prompt states
  const [showVerifPrompt, setShowVerifPrompt] = useState<number | null>(null);
  const [verifAction, setVerifAction] = useState<"approve" | "reject" | null>(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [txs, bal, cats, prs] = await Promise.allSettled([
        api.listTransactions(),
        api.getBalance(),
        api.listKategori(),
        api.listProkers(),
      ]);

      if (txs.status === "fulfilled") {
        setTxns(txs.value.transaksi || []);
        setBalance({
          total_masuk: txs.value.total_masuk,
          total_keluar: txs.value.total_keluar,
          saldo: txs.value.saldo,
        });
      }

      if (cats.status === "fulfilled") {
        setKategoriList(cats.value.kategori || []);
      }

      if (prs.status === "fulfilled") {
        setProkers(prs.value.prokers || []);
      }

      // Load antrian verifikasi & approval berisiko jika Bendahara/Trimitra
      const gName = user?.group_name;
       if (gName === "Bendahara") {
        const [verif, risk] = await Promise.allSettled([
          api.listMenungguVerifikasi(),
          api.listMenungguApprovalBerisiko(),
        ]);
        if (verif.status === "fulfilled") {
          setVerifikasiList(verif.value.transaksi || []);
        }
        if (risk.status === "fulfilled") {
          setBerisikoList(risk.value.transaksi || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTransaction({
        tanggal: new Date(date).toISOString(),
        jenis,
        kategori_id: kategoriId ? Number(kategoriId) : undefined,
        nominal: Number(nominal),
        deskripsi: description,
        proker_id: prokerId ? Number(prokerId) : undefined,
        bukti_url: proofUrl || undefined,
        sumber,
        is_berisiko: isBerisiko,
      });
      setShowModal(false);
      // Reset form
      setDate("");
      setJenis("Keluar");
      setKategoriId("");
      setNominal("");
      setDescription("");
      setProkerId("");
      setProofUrl("");
      setIsBerisiko(false);
      setSumber("Manual");
      fetchFinanceData();
    } catch (err: any) {
      alert("Gagal mencatat transaksi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const processVerifikasi = async (id: number, approved: boolean) => {
    setVerifying(true);
    try {
      if (activeTab === "verifikasi") {
        await api.verifikasiScanNota(id, approved, alasanPenolakan || undefined);
      } else {
        await api.approvalBerisiko(id, approved, alasanPenolakan || undefined);
      }
      setShowVerifPrompt(null);
      setVerifAction(null);
      setAlasanPenolakan("");
      fetchFinanceData();
    } catch (err: any) {
      alert("Gagal memproses verifikasi: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const gName = user?.group_name;
  const isBendahara = gName === "Bendahara";
  const isTrimitra = gName === "Trimitra";
  const isPembina = gName === "Pembina";
  const financeScope = isBendahara && user?.scope_divisi_awal != null ? `Scope Sekbid ${user.scope_divisi_awal}–${user.scope_divisi_akhir}` : "Organisasi penuh";
  const canWrite = canManage;
  const showRiskTab = canApprove;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Keuangan & Kas</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
             Buku besar keuangan dan riwayat transaksi real-time · {financeScope}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Catat Transaksi
          </button>
        )}
      </div>

      {/* Tab Selector */}
      {(canWrite || canApprove) && (
        <div className="flex border-b border-[var(--border)]">
          {canWrite && <button
            onClick={() => setActiveTab("kas")}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
              activeTab === "kas"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Buku Kas
          </button>}
          {canWrite && <button
            onClick={() => setActiveTab("verifikasi")}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "verifikasi"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Verifikasi Scan Nota
            {verifikasiList.length > 0 && (
              <span className="badge badge-warning text-[10px]">{verifikasiList.length}</span>
            )}
          </button>}
          {showRiskTab && (
            <button
              onClick={() => setActiveTab("berisiko")}
              className={`px-4 py-2 border-b-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "berisiko"
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Approval Berisiko
              {berisikoList.length > 0 && (
                <span className="badge badge-danger text-[10px]">{berisikoList.length}</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Tab: Buku Kas */}
      {activeTab === "kas" && (
        <>
          {/* Balance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 stagger-children">
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">TOTAL PENGELUARAN (KELUAR)</p>
              {loading ? (
                <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(balance.total_keluar)}</p>
              )}
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">TOTAL PENERIMAAN (MASUK)</p>
              {loading ? (
                <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(balance.total_masuk)}</p>
              )}
            </div>
            <div className="glass-card p-5">
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">SALDO SAAT INI</p>
              {loading ? (
                <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(balance.saldo)}</p>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Riwayat Transaksi</h2>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 w-full bg-[var(--border)] rounded" />
                <div className="h-10 w-full bg-[var(--border)] rounded" />
              </div>
            ) : txns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">Belum ada transaksi disetujui.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Deskripsi</th>
                      <th>Kategori</th>
                      <th>Tipe</th>
                      <th>Jumlah</th>
                      <th>Status</th>
                      <th>Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((t) => (
                      <tr key={t.transaksi_id}>
                        <td>{new Date(t.tanggal).toLocaleDateString("id-ID")}</td>
                        <td>
                          <div>
                            <p className="font-medium text-sm">{t.deskripsi}</p>
                            {t.proker_id && (
                              <p className="text-[10px] text-[var(--text-muted)]">Proker ID: {t.proker_id}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-xs text-[var(--text-secondary)]">{t.kategori_nama || "Lain-lain"}</td>
                        <td>
                          <span className={`badge ${t.jenis === "Masuk" ? "badge-success" : "badge-danger"}`}>
                            {t.jenis === "Masuk" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className={`font-semibold ${t.jenis === "Masuk" ? "text-emerald-400" : "text-red-400"}`}>
                          {t.jenis === "Masuk" ? "+" : "-"} {formatCurrency(t.nominal)}
                        </td>
                        <td>
                          <span className={`badge ${t.status === "Disetujui" ? "badge-success" : t.status === "Ditolak" ? "badge-danger" : "badge-warning"}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          {t.bukti_url ? (
                            <a href={t.bukti_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline font-medium text-xs">
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Verifikasi Scan Nota */}
      {activeTab === "verifikasi" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Antrian Verifikasi Nota</h2>
          {verifikasiList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">Tidak ada nota menunggu verifikasi.</p>
          ) : (
            <div className="space-y-3">
              {verifikasiList.map((t) => (
                <div key={t.transaksi_id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="badge badge-warning text-[10px]">VERIFIKASI NOTA</span>
                    <p className="font-semibold text-sm mt-1">{t.deskripsi}</p>
                    <p className="text-xs text-[var(--text-muted)]">Nominal: {formatCurrency(t.nominal)} | Proker ID: {t.proker_id || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.bukti_url && (
                      <a href={t.bukti_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3">Lihat Foto</a>
                    )}
                    <button onClick={() => { setShowVerifPrompt(t.transaksi_id); setVerifAction("approve"); }} className="btn-primary text-xs py-1.5 px-3">Lolos</button>
                    <button onClick={() => { setShowVerifPrompt(t.transaksi_id); setVerifAction("reject"); }} className="btn-danger text-xs py-1.5 px-3">Tolak</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Approval Berisiko */}
      {activeTab === "berisiko" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Antrian Approval Transaksi Berisiko</h2>
          {berisikoList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">Tidak ada transaksi berisiko menunggu approval.</p>
          ) : (
            <div className="space-y-3">
              {berisikoList.map((t) => (
                <div key={t.transaksi_id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="badge badge-danger text-[10px]">RISK APPROVAL</span>
                    <p className="font-semibold text-sm mt-1">{t.deskripsi}</p>
                    <p className="text-xs text-[var(--text-muted)]">Nominal: {formatCurrency(t.nominal)} | Kategori: {t.kategori_nama || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowVerifPrompt(t.transaksi_id); setVerifAction("approve"); }} className="btn-primary text-xs py-1.5 px-3">Approve</button>
                    <button onClick={() => { setShowVerifPrompt(t.transaksi_id); setVerifAction("reject"); }} className="btn-danger text-xs py-1.5 px-3">Tolak</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Prompt Modal */}
      {showVerifPrompt !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">
              {verifAction === "approve" ? "✅ Konfirmasi Persetujuan" : "❌ Konfirmasi Penolakan"}
            </h3>
            {verifAction === "reject" && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Alasan Penolakan</label>
                <textarea
                  rows={3}
                  value={alasanPenolakan}
                  onChange={(e) => setAlasanPenolakan(e.target.value)}
                  placeholder="Berikan alasan mengapa transaksi ini ditolak..."
                  className="input-field text-sm resize-none"
                  required
                ></textarea>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowVerifPrompt(null); setVerifAction(null); setAlasanPenolakan(""); }} className="btn-secondary text-xs">Batal</button>
              <button
                onClick={() => processVerifikasi(showVerifPrompt, verifAction === "approve")}
                disabled={verifying || (verifAction === "reject" && !alasanPenolakan.trim())}
                className={verifAction === "approve" ? "btn-primary text-xs" : "btn-danger text-xs"}
              >
                {verifying ? "Memproses..." : "Ya, Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">💰 Catat Transaksi Baru</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tipe</label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                    required
                  >
                    <option value="Keluar">Keluar (Pengeluaran)</option>
                    <option value="Masuk">Masuk (Penerimaan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                    placeholder="500000"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Kategori</label>
                  <select
                    value={kategoriId}
                    onChange={(e) => setKategoriId(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                    required
                  >
                    <option value="">Pilih Kategori...</option>
                    {kategoriList.map(c => (
                      <option key={c.kategori_id} value={c.kategori_id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Sumber Input</label>
                  <select
                    value={sumber}
                    onChange={(e) => setSumber(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                    required
                  >
                    <option value="Manual">Manual (Langsung)</option>
                    <option value="Scan Nota">Scan Nota (Antrian)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Program Kerja</label>
                  <select
                    value={prokerId}
                    onChange={(e) => setProkerId(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                  >
                    <option value="">Organisasi (Bukan Proker)</option>
                    {prokers.map(p => (
                      <option key={p.proker_id} value={p.proker_id}>{p.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="chkRisk"
                  checked={isBerisiko}
                  onChange={(e) => setIsBerisiko(e.target.checked)}
                  className="rounded border-[var(--border)] bg-[var(--bg-primary)] w-4 h-4 accent-[var(--accent)]"
                />
                <label htmlFor="chkRisk" className="text-sm font-medium text-[var(--text-secondary)] select-none">
                  ⚠️ Tandai sebagai Transaksi Berisiko
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deskripsi Transaksi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pembelian konsumsi rapat koordinasi"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link Bukti Transaksi (URL)</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
