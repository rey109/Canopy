"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Transaction {
  id: number;
  date: string;
  type: string;
  amount: number;
  description: string;
  proker_id: number | null;
  proof_url: string | null;
  created_by: string;
}

export default function FinancePage() {
  const { user } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState({ total_debit: 0, total_credit: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState("");
  const [type, setType] = useState("debit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [prokerId, setProkerId] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const fetchTransactions = () => {
    setLoading(true);
    api
      .listTransactions()
      .then((res) => {
        setTxns(res.transactions || []);
        setBalance({
          total_debit: res.total_debit,
          total_credit: res.total_credit,
          balance: res.balance,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTransaction({
        date: new Date(date).toISOString(),
        type,
        amount: Number(amount),
        description,
        proker_id: prokerId ? Number(prokerId) : undefined,
        proof_url: proofUrl || undefined,
      });
      setShowModal(false);
      // Reset form
      setDate("");
      setType("debit");
      setAmount("");
      setDescription("");
      setProkerId("");
      setProofUrl("");
      fetchTransactions();
    } catch (err: any) {
      alert("Gagal mencatat transaksi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isBendahara = user?.role === "Bendahara" || user?.role === "Trimitra" || user?.role === "Pembina";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Keuangan & Kas</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Buku besar keuangan dan riwayat transaksi real-time
          </p>
        </div>
        {isBendahara && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Catat Transaksi
          </button>
        )}
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 stagger-children">
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">TOTAL PENGELUARAN (DEBIT)</p>
          {loading ? (
            <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(balance.total_debit)}</p>
          )}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">TOTAL PENERIMAAN (KREDIT)</p>
          {loading ? (
            <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(balance.total_credit)}</p>
          )}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">SALDO SAAT INI</p>
          {loading ? (
            <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(balance.balance)}</p>
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
            <div className="h-10 w-full bg-[var(--border)] rounded" />
          </div>
        ) : txns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">Belum ada transaksi tercatat.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Deskripsi</th>
                  <th>Tipe</th>
                  <th>Jumlah</th>
                  <th>Oleh</th>
                  <th>Bukti</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString("id-ID")}</td>
                    <td>
                      <div>
                        <p className="font-medium">{t.description}</p>
                        {t.proker_id && (
                          <p className="text-xs text-[var(--text-muted)]">Proker ID: {t.proker_id}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${t.type === "credit" ? "badge-success" : "badge-danger"}`}>
                        {t.type === "credit" ? "Kredit" : "Debit"}
                      </span>
                    </td>
                    <td className={`font-semibold ${t.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.type === "credit" ? "+" : "-"} {formatCurrency(t.amount)}
                    </td>
                    <td className="text-[var(--text-secondary)]">{t.created_by}</td>
                    <td>
                      {t.proof_url ? (
                        <a href={t.proof_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline font-medium">
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
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                    required
                  >
                    <option value="debit">Debit (Pengeluaran)</option>
                    <option value="credit">Kredit (Pemasukan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500000"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ID Proker (Opsional)</label>
                  <input
                    type="number"
                    value={prokerId}
                    onChange={(e) => setProkerId(e.target.value)}
                    placeholder="Contoh: 1"
                    className="input-field"
                  />
                </div>
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link Bukti Transaksi (Opsional)</label>
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
