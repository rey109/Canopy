"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  type RapatDetail,
  type NotulensiDetail,
  type DokumentasiDetail,
  type DivisionDetail,
  type ProkerDetail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STATUS_LABELS: Record<string, string> = {
  Terjadwal: "Terjadwal",
  Berlangsung: "Berlangsung",
  Selesai: "Selesai",
  Dibatalkan: "Dibatalkan",
};

const STATUS_BADGE: Record<string, string> = {
  Terjadwal: "badge-neutral",
  Berlangsung: "badge-info",
  Selesai: "badge-success",
  Dibatalkan: "badge-error",
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rapatId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  const [rapat, setRapat] = useState<RapatDetail | null>(null);
  const [notulensi, setNotulensi] = useState<NotulensiDetail | null>(null);
  const [dokumentasi, setDokumentasi] = useState<DokumentasiDetail[]>([]);
  const [divisions, setDivisions] = useState<DivisionDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notulensi modal
  const [showNotulensiModal, setShowNotulensiModal] = useState(false);
  const [savingNotulensi, setSavingNotulensi] = useState(false);
  const [notulensiForm, setNotulensiForm] = useState({
    isi: "",
    tempat: "",
    pimpinan_rapat: "",
    notulis: "",
    peserta: "",
    agenda_pembahasan: "",
    hasil_pembahasan: "",
    keputusan_rapat: "",
    tindak_lanjut: "",
    pic: "",
    deadline_tl: "",
    catatan_tambahan: "",
  });

  // Dokumentasi modal
  const [showDokModal, setShowDokModal] = useState(false);
  const [dokForm, setDokForm] = useState({ file_url: "", keterangan: "" });
  const [savingDok, setSavingDok] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isStaf = user?.group_name === "Staf";
  const isSekretariat = user?.group_name === "Sekretaris" || user?.group_name === "Trimitra";
  const isSekretarisUmum = user?.group_name === "Sekretaris" && user?.level === 1;
  const canEdit = !isStaf;

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [rRes, dRes, pRes] = await Promise.allSettled([
        api.getMeeting(rapatId),
        api.listDivisions(),
        api.listProkers(),
      ]);

      if (rRes.status === "fulfilled") {
        setRapat(rRes.value);
      } else {
        setError("Rapat tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (dRes.status === "fulfilled") setDivisions(dRes.value.divisions || []);
      if (pRes.status === "fulfilled") setProkers(pRes.value.prokers || []);

      const [nRes, dokRes] = await Promise.allSettled([
        api.getNotulensi(rapatId),
        api.listDokumentasi(rapatId),
      ]);

      if (nRes.status === "fulfilled") {
        setNotulensi(nRes.value);
        setNotulensiForm({
          isi: nRes.value.isi || "",
          tempat: nRes.value.tempat || "",
          pimpinan_rapat: nRes.value.pimpinan_rapat || "",
          notulis: nRes.value.notulis || "",
          peserta: nRes.value.peserta || "",
          agenda_pembahasan: nRes.value.agenda_pembahasan || "",
          hasil_pembahasan: nRes.value.hasil_pembahasan || "",
          keputusan_rapat: nRes.value.keputusan_rapat || "",
          tindak_lanjut: nRes.value.tindak_lanjut || "",
          pic: nRes.value.pic || "",
          deadline_tl: nRes.value.deadline_tl || "",
          catatan_tambahan: nRes.value.catatan_tambahan || "",
        });
      }

      if (dokRes.status === "fulfilled") setDokumentasi(dokRes.value.dokumentasi || []);
    } catch (e: any) {
      setError(e.message || "Gagal memuat data rapat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rapatId) fetchAll();
  }, [rapatId]);

  const handleUpdateStatus = async (status: string) => {
    if (!rapat) return;
    setUpdatingStatus(true);
    try {
      await api.updateStatusRapat(rapat.rapat_id, status);
      await fetchAll();
    } catch (err: any) {
      alert("Gagal memperbarui status: " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotulensi = async (finalisasi = false) => {
    if (!rapat) return;
    setSavingNotulensi(true);
    try {
      await api.upsertNotulensi(rapat.rapat_id, {
        ...notulensiForm,
        deadline_tl: notulensiForm.deadline_tl || undefined,
      });
      if (finalisasi) {
        await api.finalisasiNotulensi(rapat.rapat_id);
      }
      await fetchAll();
      setShowNotulensiModal(false);
    } catch (err: any) {
      alert("Gagal menyimpan notulensi: " + err.message);
    } finally {
      setSavingNotulensi(false);
    }
  };

  const handleAddDokumentasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rapat || !dokForm.file_url) return;
    setSavingDok(true);
    try {
      await api.addDokumentasi(rapat.rapat_id, dokForm);
      setDokForm({ file_url: "", keterangan: "" });
      setShowDokModal(false);
      await fetchAll();
    } catch (err: any) {
      alert("Gagal mengunggah dokumentasi: " + err.message);
    } finally {
      setSavingDok(false);
    }
  };

  const handleDeleteDokumentasi = async (dok_id: number) => {
    if (!confirm("Hapus dokumentasi ini?")) return;
    try {
      await api.deleteDokumentasi(dok_id);
      await fetchAll();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-8 w-48 bg-[var(--border)] rounded animate-pulse" />
        <div className="glass-card p-6 space-y-3 animate-pulse">
          <div className="h-6 w-64 bg-[var(--border)] rounded" />
          <div className="h-4 w-full bg-[var(--border)] rounded" />
          <div className="h-4 w-3/4 bg-[var(--border)] rounded" />
        </div>
      </div>
    );
  }

  if (error || !rapat) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[var(--text-muted)] mb-4">{error || "Rapat tidak ditemukan."}</p>
        <Link href="/dashboard/meetings" className="btn-primary text-sm">← Kembali ke Rapat</Link>
      </div>
    );
  }

  const division = divisions.find((d) => d.division_id === rapat.division_id);
  const proker = prokers.find((p) => p.proker_id === rapat.proker_id);
  const isNotulensiReadonly = notulensi?.status === "Final" || isStaf || !isSekretariat;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/meetings" className="btn-secondary text-xs py-1.5 px-3">← Kembali</Link>
        <div>
          <h1 className="text-xl font-bold">{rapat.judul}</h1>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">
            {new Date(rapat.tanggal).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      </div>

      {/* Info Rapat */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className={`badge ${STATUS_BADGE[rapat.status] || "badge-neutral"}`}>
            {STATUS_LABELS[rapat.status] || rapat.status}
          </span>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              {rapat.status === "Terjadwal" && (
                <button
                  onClick={() => handleUpdateStatus("Berlangsung")}
                  disabled={updatingStatus}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Tandai Berlangsung
                </button>
              )}
              {(rapat.status === "Terjadwal" || rapat.status === "Berlangsung") && (
                <button
                  onClick={() => handleUpdateStatus("Selesai")}
                  disabled={updatingStatus}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  Tandai Selesai
                </button>
              )}
              {rapat.status !== "Selesai" && rapat.status !== "Dibatalkan" && (
                <button
                  onClick={() => handleUpdateStatus("Dibatalkan")}
                  disabled={updatingStatus}
                  className="btn-secondary text-xs py-1.5 px-3 text-red-400 hover:text-red-300"
                >
                  Batalkan Rapat
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Lokasi</p>
            <p className="text-sm">{rapat.lokasi || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Dibuat oleh</p>
            <p className="text-sm">{rapat.dibuat_oleh}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Divisi</p>
            <p className="text-sm">{division ? division.division_name : "Organisasi (Semua)"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Program Kerja</p>
            <p className="text-sm">{proker ? proker.nama : "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Agenda</p>
            <p className="text-sm whitespace-pre-wrap">{rapat.agenda || "—"}</p>
          </div>
        </div>

        {rapat.qr_code && (
          <div className="p-3 bg-[var(--bg-primary)] rounded border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">QR Code Token</p>
            <p className="text-sm font-mono font-bold text-[var(--accent)] select-all mt-1">{rapat.qr_code}</p>
          </div>
        )}
      </div>

      {/* Notulensi */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            ✍️ Notulensi
            {notulensi && (
              <span className={`badge text-xs ${notulensi.status === "Final" ? "badge-success" : "badge-warning"}`}>
                {notulensi.status}
              </span>
            )}
          </h2>
          {isSekretariat && notulensi?.status !== "Final" && (
            <button onClick={() => setShowNotulensiModal(true)} className="btn-primary text-xs py-1.5 px-3">
              {notulensi ? "Edit Notulensi" : "Tambah Notulensi"}
            </button>
          )}
        </div>

        {!notulensi ? (
          <p className="text-sm text-[var(--text-muted)]">Belum ada notulensi untuk rapat ini.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {[
              { label: "Tempat/Media", value: notulensi.tempat },
              { label: "Pimpinan Rapat", value: notulensi.pimpinan_rapat },
              { label: "Notulis", value: notulensi.notulis },
              { label: "Peserta", value: notulensi.peserta },
              { label: "Agenda Pembahasan", value: notulensi.agenda_pembahasan },
              { label: "Isi / Ringkasan", value: notulensi.isi },
              { label: "Hasil Pembahasan", value: notulensi.hasil_pembahasan },
              { label: "Keputusan Rapat", value: notulensi.keputusan_rapat },
              { label: "Tindak Lanjut", value: notulensi.tindak_lanjut },
              { label: "PIC / Penanggung Jawab", value: notulensi.pic },
              { label: "Deadline Tindak Lanjut", value: notulensi.deadline_tl || "—" },
              { label: "Catatan Tambahan", value: notulensi.catatan_tambahan },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{label}</p>
                <p className="whitespace-pre-wrap">{value}</p>
              </div>
            ) : null)}
            {notulensi.difinalisasi_oleh && (
              <p className="text-xs text-[var(--text-muted)]">Difinalisasi oleh: {notulensi.difinalisasi_oleh}</p>
            )}
          </div>
        )}
      </div>

      {/* Dokumentasi */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">📷 Dokumentasi</h2>
          {canEdit && (
            <button onClick={() => setShowDokModal(true)} className="btn-primary text-xs py-1.5 px-3">
              + Upload Dokumentasi
            </button>
          )}
        </div>

        {dokumentasi.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Belum ada dokumentasi.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {dokumentasi.map((d) => (
              <div key={d.dok_id} className="relative group rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-primary)]">
                <img
                  src={d.file_url}
                  alt={d.keterangan || "Dokumentasi"}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="p-2">
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{d.keterangan || "Tanpa keterangan"}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">oleh {d.diunggah_oleh}</p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteDokumentasi(d.dok_id)}
                    className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notulensi Modal */}
      {showNotulensiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold border-b border-[var(--border)] pb-3 flex-shrink-0">
              ✍️ {notulensi ? "Edit Notulensi" : "Buat Notulensi"} — {rapat.judul}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
              {[
                { key: "tempat", label: "Tempat / Media Rapat", placeholder: "Contoh: Ruang OSIS / Google Meet" },
                { key: "pimpinan_rapat", label: "Pimpinan Rapat", placeholder: "Nama pimpinan" },
                { key: "notulis", label: "Notulis", placeholder: "Nama notulis" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
                  <input
                    type="text"
                    value={(notulensiForm as any)[key]}
                    onChange={(e) => setNotulensiForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field text-sm"
                  />
                </div>
              ))}
              {[
                { key: "peserta", label: "Peserta Rapat", placeholder: "Daftar peserta (pisah koma atau baris baru)", rows: 3 },
                { key: "agenda_pembahasan", label: "Agenda Pembahasan", placeholder: "Poin-poin agenda...", rows: 3 },
                { key: "isi", label: "Isi / Ringkasan Rapat", placeholder: "Ringkasan jalannya rapat...", rows: 4 },
                { key: "hasil_pembahasan", label: "Hasil Pembahasan", placeholder: "Hasil dari setiap poin agenda...", rows: 3 },
                { key: "keputusan_rapat", label: "Keputusan Rapat", placeholder: "Keputusan-keputusan yang diambil...", rows: 3 },
                { key: "tindak_lanjut", label: "Tindak Lanjut", placeholder: "Langkah-langkah yang harus dilakukan setelah rapat...", rows: 3 },
              ].map(({ key, label, placeholder, rows }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
                  <textarea
                    rows={rows}
                    value={(notulensiForm as any)[key]}
                    onChange={(e) => setNotulensiForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field text-sm resize-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">PIC / Penanggung Jawab Tindak Lanjut</label>
                <input
                  type="text"
                  value={notulensiForm.pic}
                  onChange={(e) => setNotulensiForm((f) => ({ ...f, pic: e.target.value }))}
                  placeholder="Nama PIC"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Deadline Tindak Lanjut</label>
                <input
                  type="date"
                  value={notulensiForm.deadline_tl}
                  onChange={(e) => setNotulensiForm((f) => ({ ...f, deadline_tl: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={notulensiForm.catatan_tambahan}
                  onChange={(e) => setNotulensiForm((f) => ({ ...f, catatan_tambahan: e.target.value }))}
                  placeholder="Catatan lain..."
                  className="input-field text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] flex-shrink-0">
              <button onClick={() => setShowNotulensiModal(false)} className="btn-secondary text-xs">Batal</button>
              <button onClick={() => handleSaveNotulensi(false)} disabled={savingNotulensi} className="btn-secondary text-xs">
                {savingNotulensi ? "Menyimpan..." : "Simpan Draft"}
              </button>
              {isSekretarisUmum && (
                <button onClick={() => handleSaveNotulensi(true)} disabled={savingNotulensi} className="btn-primary text-xs">
                  {savingNotulensi ? "Memproses..." : "Simpan & Finalisasi"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dokumentasi Modal */}
      {showDokModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">📷 Upload Dokumentasi</h3>
            <form onSubmit={handleAddDokumentasi} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">URL Gambar / File</label>
                <input
                  type="url"
                  value={dokForm.file_url}
                  onChange={(e) => setDokForm((f) => ({ ...f, file_url: e.target.value }))}
                  placeholder="https://..."
                  className="input-field"
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Upload gambar ke layanan seperti Imgur, Cloudinary, atau Google Drive (public link)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={dokForm.keterangan}
                  onChange={(e) => setDokForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Contoh: Foto peserta rapat"
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDokModal(false)} className="btn-secondary text-xs">Batal</button>
                <button type="submit" disabled={savingDok} className="btn-primary text-xs">
                  {savingDok ? "Mengupload..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
