"use client";

import { useEffect, useState } from "react";
import { api, type HandoverDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function HandoverPage() {
  const { user } = useAuth();
  const [handovers, setHandovers] = useState<HandoverDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sign State
  const [signingItem, setSigningItem] = useState<HandoverDetail | null>(null);
  const [sigRole, setSigRole] = useState("old_ketua");
  const [signature, setSignature] = useState("");
  const [submittingSign, setSubmittingSign] = useState(false);

  // Form State
  const [period, setPeriod] = useState("");
  const [finalBalance, setFinalBalance] = useState("");
  const [unfinishedText, setUnfinishedText] = useState("");
  const [vendorsText, setVendorsText] = useState("");

  const fetchHandovers = () => {
    setLoading(true);
    api
      .listHandovers()
      .then((res) => setHandovers(res.handovers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHandovers();
    // Pre-populate actual current balance
    api.getBalance().then((b) => setFinalBalance(String(b.saldo))).catch(() => {});
  }, []);

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const parts = period.split("->");
    const periode_lama = parts[0]?.trim() || "";
    const periode_baru = parts[1]?.trim() || period.trim();

    const unfinishedArray = unfinishedText
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => ({ task: line.trim() }));

    const vendorsArray = vendorsText
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const p = line.split(":");
        return {
          name: p[0]?.trim() || "",
          contact: p[1]?.trim() || "",
        };
      });

    try {
      await api.createTransaction({
        tanggal: new Date().toISOString().split("T")[0],
        jenis: "Keluar",
        nominal: Number(finalBalance),
        deskripsi: `Serah Terima Jabatan & Penutupan Kas Periode ${period}`,
      }).catch(() => {});

      await api.createHandover({
        periode_lama,
        periode_baru,
        saldo_akhir: Number(finalBalance),
        proker_belum_selesai: unfinishedArray,
        kontak_vendor: vendorsArray,
        catatan: `Serah Terima Jabatan & Penutupan Kas dari Periode ${periode_lama} ke Periode ${periode_baru}`,
      });

      setShowWizard(false);
      setPeriod("");
      setUnfinishedText("");
      setVendorsText("");
      alert("Berita acara serah terima berhasil diinisiasi!");
      fetchHandovers();
    } catch (err: any) {
      alert("Gagal membuat berita acara: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingItem) return;
    setSubmittingSign(true);
    try {
      await api.signHandover(signingItem.id, {
        signature_role: sigRole,
        signature,
      });
      setSigningItem(null);
      setSignature("");
      alert("Dokumen berhasil ditandatangani!");
      fetchHandovers();
    } catch (err: any) {
      alert("Gagal tanda tangan: " + err.message);
    } finally {
      setSubmittingSign(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const canCreate = user?.group_name === "Trimitra" || user?.group_name === "Pembina";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Handover & Serah Terima</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Arsip berita acara serah terima jabatan pengurus lintas periode
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowWizard(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            Mulai Handover Wizard
          </button>
        )}
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
      ) : handovers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada berita acara serah terima terdaftar.</p>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {handovers.map((h) => (
            <div key={h.id} className="glass-card p-6">
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4 mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Berita Acara Serah Terima Jabatan</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Periode Pengurus: {h.periode_lama} {"->"} {h.periode_baru}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Dibuat: {new Date(h.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Saldo Kas Akhir</p>
                  <p className="text-lg font-bold text-blue-400 mt-1">{formatCurrency(h.saldo_akhir)}</p>
                </div>
              </div>

              {/* Signatures status */}
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-3">Status Tanda Tangan Digital</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Ketua Lama (Trimitra)", sign: h.signature_ketua_lama },
                    { label: "Ketua Baru (Trimitra)", sign: h.signature_ketua_baru },
                    { label: "Pembina OSIS (Pembina)", sign: h.signature_pembina },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-lg border border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs font-medium">{s.label}</span>
                      <span className={`badge ${s.sign ? "badge-success" : "badge-warning"}`}>
                        {s.sign ? "Ditandatangani" : "Menunggu"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {user?.group_name !== "Staf" && (
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setSigningItem(h)} className="btn-primary text-xs">
                    Tanda Tangani
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Handover Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold">🔄 Inisiasi Serah Terima Jabatan</h3>
            <form onSubmit={handleCreateHandover} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Periode Transisi</label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="Contoh: 2024/2025 -> 2025/2026"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Saldo Kas Terakhir (Rp)</label>
                <input
                  type="number"
                  value={finalBalance}
                  onChange={(e) => setFinalBalance(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Proker Belum Selesai (Satu per baris)</label>
                <textarea
                  rows={2}
                  value={unfinishedText}
                  onChange={(e) => setUnfinishedText(e.target.value)}
                  placeholder="Contoh: Laporan LPJ Classmeeting&#10;Pengembalian inventaris tenda"
                  className="input-field resize-none text-xs"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Daftar Vendor/Hubungan Eksternal (Format: Nama : Kontak)</label>
                <textarea
                  rows={2}
                  value={vendorsText}
                  onChange={(e) => setVendorsText(e.target.value)}
                  placeholder="Contoh: Baju Konveksi Cepat : 0812345678&#10;Sewa Sound System : 089876543"
                  className="input-field resize-none text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWizard(false)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Memproses..." : "Inisiasi Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signing Modal */}
      {signingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">✍️ Tanda Tangani Dokumen</h3>
            <form onSubmit={handleSignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Peran Tanda Tangan</label>
                <select
                  value={sigRole}
                  onChange={(e) => setSigRole(e.target.value)}
                  className="input-field bg-[var(--bg-primary)]"
                >
                  <option value="old_ketua">Ketua Lama (Trimitra)</option>
                  <option value="new_ketua">Ketua Baru (Trimitra)</option>
                  <option value="pembina">Pembina OSIS (Pembina)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama / Tanda Tangan Digital (Ketik Nama Lengkap)</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Ketik nama lengkap Anda"
                  className="input-field"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSigningItem(null)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingSign} className="btn-primary text-xs">
                  {submittingSign ? "Menandatangani..." : "Konfirmasi TTD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
