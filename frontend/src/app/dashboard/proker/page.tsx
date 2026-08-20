"use client";

import { useEffect, useState } from "react";
import { api, type ProkerDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const statusBadge: Record<string, string> = {
  "Belum Mulai": "badge-neutral",
  "Berjalan": "badge-info",
  "Selesai": "badge-success",
  "Dibatalkan": "badge-danger",
};

export default function ProkerPage() {
  const { user } = useAuth();
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchProkers = () => {
    setLoading(true);
    api
      .listProkers()
      .then((res) => setProkers(res.prokers || []))
      .catch((err) => console.error("Gagal load proker:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProkers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProker({
        nama: name,
        deskripsi: description,
        division_id: user?.division_id || undefined,
        anggaran_disetujui: Number(budget),
        tanggal_mulai: new Date(startDate).toISOString(),
        tanggal_selesai: new Date(endDate).toISOString(),
      });
      setShowModal(false);
      // Reset form
      setName("");
      setDescription("");
      setBudget("");
      setStartDate("");
      setEndDate("");
      fetchProkers();
    } catch (err: any) {
      alert("Gagal membuat program kerja: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAjukanProposal = async (proker_id: number) => {
    setActioningId(proker_id);
    try {
      // Proposal diajukan dengan membuat Dokumen jenis_id = 1 (Proposal Kegiatan)
      await api.buatDokumen({
        proker_id,
        jenis_id: 1, // 1 = Proposal Kegiatan
        file_url: `https://canopy-docs.s3.amazonaws.com/proposals/proker-${proker_id}.pdf`,
        is_eksternal: false,
      });
      alert("Proposal berhasil diajukan untuk proses persetujuan!");
      fetchProkers();
    } catch (err: any) {
      alert("Gagal mengajukan proposal: " + err.message);
    } finally {
      setActioningId(proker_id);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isKetuaBidang = user?.group_name === "Kepala Divisi";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Program Kerja</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Kelola seluruh program kerja organisasi
          </p>
        </div>
        {isKetuaBidang && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Proker
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : prokers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada program kerja.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {prokers.map((p) => {
            const canSubmit = isKetuaBidang && user?.division_id === p.division_id && p.status === "Belum Mulai";
            return (
              <div key={p.proker_id} className="glass-card p-5 transition-all hover:translate-y-[-1px] flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {p.division_id && (
                      <span className="badge badge-info text-[10px]">Bidang {p.division_id}</span>
                    )}
                    <h3 className="font-semibold text-base hover:text-[var(--accent)]">
                      <Link href={`/dashboard/proker/${p.proker_id}`}>
                        {p.nama}
                      </Link>
                    </h3>
                    <span className={`badge ${statusBadge[p.status] || "badge-neutral"}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
                    {p.deskripsi}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span>Anggaran: <span className="font-medium text-[var(--text-primary)]">{formatCurrency(p.anggaran_disetujui)}</span></span>
                    <span>•</span>
                    <span>Jadwal: {new Date(p.tanggal_mulai).toLocaleDateString("id-ID")} — {new Date(p.tanggal_selesai).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>

                {canSubmit && (
                  <div className="flex items-center self-end md:self-center">
                    <button
                      onClick={() => handleAjukanProposal(p.proker_id)}
                      disabled={actioningId === p.proker_id}
                      className="btn-primary text-xs whitespace-nowrap"
                    >
                      {actioningId === p.proker_id ? "Memproses..." : "Ajukan Proposal"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold">✨ Buat Program Kerja Baru</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nama Program Kerja</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Lomba Classmeeting Semester I"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan tujuan dan detail kegiatan..."
                  className="input-field resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1500000"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mulai</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Selesai</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Menyimpan..." : "Simpan Proker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
