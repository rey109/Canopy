"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

interface PendingDoc {
  file_url: string; // data URL (base64) — disimpan persistent di backend
  nama_file: string;
  tipe_file: string;
  ukuran: number;
  keterangan: string;
}

const STATUS_BADGE: Record<string, string> = {
  Terjadwal: "badge-neutral",
  Berlangsung: "badge-info",
  Selesai: "badge-success",
  Dibatalkan: "badge-error",
};

function formatUkuran(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const rapatId = Number(id);
  const { user } = useAuth();

  const [rapat, setRapat] = useState<RapatDetail | null>(null);
  const [notulensi, setNotulensi] = useState<NotulensiDetail | null>(null);
  const [dokumentasi, setDokumentasi] = useState<DokumentasiDetail[]>([]);
  const [divisions, setDivisions] = useState<DivisionDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notulensi + Dokumentasi modal (alur simpan terpadu)
  const [showNotulensiModal, setShowNotulensiModal] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [saveError, setSaveError] = useState("");
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
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [tandaiSelesai, setTandaiSelesai] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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

  const openNotulensiModal = () => {
    setSaveError("");
    setPendingDocs([]);
    setTandaiSelesai(rapat?.status === "Berlangsung");
    setShowNotulensiModal(true);
  };

  const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingFiles(true);
    let processed = 0;
    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`File "${file.name}" melebihi batas 8MB dan dilewati.`);
        processed++;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPendingDocs((prev) => [
          ...prev,
          {
            file_url: reader.result as string,
            nama_file: file.name,
            tipe_file: file.type || "application/octet-stream",
            ukuran: file.size,
            keterangan: "",
          },
        ]);
        processed++;
        if (processed === files.length) setUploadingFiles(false);
      };
      reader.onerror = () => {
        alert(`Gagal membaca file "${file.name}".`);
        processed++;
        if (processed === files.length) setUploadingFiles(false);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePendingDoc = (idx: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== idx));
  };

  /**
   * ALUR SIMPAN TERPADU:
   * 1. Validasi form
   * 2. Simpan notulensi (semua field) → terhubung rapat_id
   * 3. (Opsional) Finalisasi oleh Sekretaris Umum
   * 4. (Opsional) Update status rapat menjadi Selesai
   * 5. Upload semua dokumen/dokumentasi secara ATOMIK (batch transaction)
   *
   * Jika notulensi berhasil tetapi file gagal: notulensi TIDAK dibuang,
   * antrian file dipertahankan, pesan jelas ditampilkan untuk retry.
   */
  const handleSimpanSemua = async (finalisasi = false) => {
    if (!rapat) return;
    if (!notulensiForm.isi.trim() && !pendingDocs.length) {
      setSaveError("Isi ringkasan notulensi atau tambahkan minimal satu lampiran.");
      return;
    }
    setSavingAll(true);
    setSaveError("");

    // STEP 1-2: simpan notulensi
    try {
      await api.upsertNotulensi(rapat.rapat_id, {
        ...notulensiForm,
        deadline_tl: notulensiForm.deadline_tl || undefined,
      });

      // STEP 3: finalisasi (Sekretaris Umum saja)
      if (finalisasi && isSekretarisUmum) {
        await api.finalisasiNotulensi(rapat.rapat_id);
      }

      // STEP 4: update status rapat
      if (tandaiSelesai && rapat.status !== "Selesai") {
        await api.updateStatusRapat(rapat.rapat_id, "Selesai").catch((err) => {
          console.error("Gagal update status rapat:", err);
        });
      }
    } catch (err: any) {
      setSavingAll(false);
      setSaveError(err.message || "Gagal menyimpan notulensi. Periksa koneksi ke server.");
      return;
    }

    // STEP 5: upload dokumen/dokumentasi (atomik)
    if (pendingDocs.length > 0) {
      try {
        await api.addBatchDokumentasi(rapat.rapat_id, pendingDocs);
      } catch (err: any) {
        setSavingAll(false);
        // Notulensi sudah aman tersimpan — jangan dibuang. File tetap di antrian untuk retry.
        setSaveError(
          `✓ Notulensi berhasil disimpan, TAPI ${pendingDocs.length} file gagal diupload (${err.message}). ` +
          `Tekan tombol Simpan lagi untuk mencoba upload ulang file.`
        );
        return;
      }
    }

    // Sukses penuh
    setSavingAll(false);
    setShowNotulensiModal(false);
    setPendingDocs([]);
    await fetchAll();
    alert(
      finalisasi
        ? "✓ Notulensi difinalisasi dan dokumentasi berhasil disimpan."
        : "✓ Notulensi dan dokumentasi berhasil disimpan."
    );
  };

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

  const handleDeleteDokumentasi = async (dokId: number) => {
    if (!confirm("Hapus dokumentasi ini?")) return;
    try {
      await api.deleteDokumentasi(dokId);
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
            {STATUS_BADGE[rapat.status] ? rapat.status : rapat.status}
          </span>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              {rapat.status === "Terjadwal" && (
                <button onClick={() => handleUpdateStatus("Berlangsung")} disabled={updatingStatus} className="btn-secondary text-xs py-1.5 px-3">
                  Tandai Berlangsung
                </button>
              )}
              {(rapat.status === "Terjadwal" || rapat.status === "Berlangsung") && (
                <button onClick={() => handleUpdateStatus("Selesai")} disabled={updatingStatus} className="btn-primary text-xs py-1.5 px-3">
                  Tandai Selesai
                </button>
              )}
              {rapat.status !== "Selesai" && rapat.status !== "Dibatalkan" && (
                <button onClick={() => handleUpdateStatus("Dibatalkan")} disabled={updatingStatus} className="btn-secondary text-xs py-1.5 px-3 text-red-400 hover:text-red-300">
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            ✍️ Notulensi
            {notulensi && (
              <span className={`badge text-xs ${notulensi.status === "Final" ? "badge-success" : "badge-warning"}`}>
                {notulensi.status}
              </span>
            )}
          </h2>
          {isSekretariat && notulensi?.status !== "Final" && (
            <button onClick={openNotulensiModal} className="btn-primary text-xs py-1.5 px-3">
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
              { label: "Deadline Tindak Lanjut", value: notulensi.deadline_tl || "" },
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">📷 Dokumentasi ({dokumentasi.length})</h2>
          {(canEdit || isSekretariat) && notulensi?.status !== "Final" && (
            <button onClick={openNotulensiModal} className="btn-primary text-xs py-1.5 px-3">
              + Tambah via Notulensi
            </button>
          )}
        </div>

        {dokumentasi.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Belum ada dokumentasi.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {dokumentasi.map((d) => {
              const isImage = d.tipe_file.startsWith("image/") || d.file_url.startsWith("data:image");
              return (
                <div key={d.dok_id} className="relative group rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-primary)]">
                  {isImage ? (
                    <img src={d.file_url} alt={d.nama_file || "Dokumentasi"} className="w-full h-32 object-cover" />
                  ) : (
                    <a href={d.file_url} download={d.nama_file} className="w-full h-32 flex items-center justify-center text-4xl no-underline">📄</a>
                  )}
                  <div className="p-2">
                    <p className="text-[10px] truncate font-medium">{d.nama_file || d.keterangan || "Tanpa nama"}</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{formatUkuran(d.ukuran)} • {d.diunggah_oleh}</p>
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
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL SIMPAN TERPADU: Notulensi + Dokumentasi */}
      {showNotulensiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold border-b border-[var(--border)] pb-3 flex-shrink-0">
              ✍️ {notulensi ? "Edit Notulensi" : "Buat Notulensi"} & Dokumentasi — {rapat.judul}
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
                { key: "peserta", label: "Peserta Rapat", placeholder: "Daftar peserta...", rows: 2 },
                { key: "agenda_pembahasan", label: "Agenda Pembahasan", placeholder: "Poin-poin agenda...", rows: 2 },
                { key: "isi", label: "Isi / Ringkasan Rapat *", placeholder: "Ringkasan jalannya rapat...", rows: 3 },
                { key: "hasil_pembahasan", label: "Hasil Pembahasan", placeholder: "Hasil dari setiap poin agenda...", rows: 2 },
                { key: "keputusan_rapat", label: "Keputusan Rapat", placeholder: "Keputusan yang diambil...", rows: 2 },
                { key: "tindak_lanjut", label: "Tindak Lanjut", placeholder: "Langkah setelah rapat...", rows: 2 },
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">PIC / Penanggung Jawab</label>
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

              {/* Lampiran / Dokumentasi — ikut tersimpan saat tombol Simpan ditekan */}
              <div className="border border-dashed border-[var(--border)] rounded-lg p-3 space-y-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  📷 Dokumentasi / Lampiran (foto rapat, peserta, dokumen — bisa pilih beberapa sekaligus)
                </label>
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-dashed border-[var(--accent)]/40 text-xs text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/5 transition-all ${uploadingFiles ? "opacity-50 pointer-events-none" : ""}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {uploadingFiles ? "Memproses..." : "Klik untuk pilih gambar / file (maks 8MB per file)"}
                  <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" className="hidden" onChange={handlePilihFile} disabled={uploadingFiles} />
                </label>

                {pendingDocs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">Menyatu saat Simpan ({pendingDocs.length} file)</p>
                    {pendingDocs.map((p, idx) => {
                      const isImage = p.tipe_file.startsWith("image/");
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                          {isImage ? (
                            <img src={p.file_url} alt={p.nama_file} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center rounded bg-[var(--bg-secondary)] text-lg">📄</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.nama_file}</p>
                            <p className="text-[9px] text-[var(--text-muted)]">{formatUkuran(p.ukuran)}</p>
                          </div>
                          <button onClick={() => removePendingDoc(idx)} className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-all flex-shrink-0">
                            Hapus
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rapat.status !== "Selesai" && (
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer pt-1">
                    <input type="checkbox" checked={tandaiSelesai} onChange={(e) => setTandaiSelesai(e.target.checked)} className="accent-[var(--accent)]" />
                    ✓ Tandai rapat ini sebagai <strong>Selesai</strong> saat disimpan
                  </label>
                )}
              </div>

              {saveError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 whitespace-pre-line">
                  ⚠️ {saveError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] flex-shrink-0">
              <button onClick={() => setShowNotulensiModal(false)} className="btn-secondary text-xs">Batal</button>
              <button onClick={() => handleSimpanSemua(false)} disabled={savingAll} className="btn-primary text-xs">
                {savingAll ? "Menyimpan..." : "💾 Simpan Notulensi & Dokumentasi"}
              </button>
              {isSekretarisUmum && (
                <button onClick={() => handleSimpanSemua(true)} disabled={savingAll} className="btn-primary text-xs">
                  {savingAll ? "Memproses..." : "Simpan & Finalisasi"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
