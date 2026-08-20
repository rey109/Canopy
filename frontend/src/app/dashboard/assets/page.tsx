"use client";

import { useEffect, useState } from "react";
import { api, type AssetDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [prokerId, setProkerId] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const fetchAssets = () => {
    setLoading(true);
    api
      .listAssets()
      .then((res) => setAssets(res.assets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleOpenBooking = (asset: AssetDetail) => {
    setSelectedAsset(asset);
    setShowModal(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSubmitting(true);
    try {
      await api.bookAsset({
        asset_id: selectedAsset.asset_id,
        waktu_mulai: new Date(startTime).toISOString(),
        waktu_selesai: new Date(endTime).toISOString(),
        proker_id: prokerId ? Number(prokerId) : undefined,
        keterangan: keterangan || "Peminjaman aset",
      });
      setShowModal(false);
      setSelectedAsset(null);
      setStartTime("");
      setEndTime("");
      setProkerId("");
      setKeterangan("");
      alert("Aset berhasil dipesan untuk kegiatan!");
      fetchAssets();
    } catch (err: any) {
      alert("Gagal memesan aset: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Aset & Inventaris</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Daftar inventaris sekolah yang bisa dipinjam/dibooking untuk kegiatan program kerja
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 w-48 bg-[var(--border)] rounded mb-2" />
              <div className="h-4 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada inventaris/aset terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {assets.map((a) => (
            <div key={a.asset_id} className="glass-card p-5 flex flex-col justify-between hover:translate-y-[-1px] transition-all">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{a.nama}</h3>
                  <span className={`badge ${a.status === "Tersedia" ? "badge-success" : "badge-warning"}`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{a.deskripsi || "Tidak ada deskripsi."}</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4 mt-auto">
                <button
                  onClick={() => handleOpenBooking(a)}
                  className="btn-primary text-xs py-1.5 px-3"
                  disabled={a.status !== "Tersedia" || user?.group_name === "Staf"}
                >
                  Booking Aset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {showModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">🔑 Booking Aset: {selectedAsset.nama}</h3>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mulai Peminjaman</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Selesai Peminjaman</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ID Proker Terkait (Opsional)</label>
                <input
                  type="number"
                  value={prokerId}
                  onChange={(e) => setProkerId(e.target.value)}
                  placeholder="Contoh: 1"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Keterangan / Keperluan</label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Untuk perlengkapan rapat divisi"
                  className="input-field min-h-[80px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setSelectedAsset(null); }} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Memproses..." : "Konfirmasi Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
