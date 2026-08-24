"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { api, type RapatDetail, type UserDetail, type DivisionDetail, type ProkerDetail, type NotulensiAttachment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface AttendanceEntry {
  user_nis: string;
  user_nama: string;
  status: string; // 'hadir', 'izin', 'sakit', 'alfa'
}

const STATUS_BADGE: Record<string, string> = {
  Terjadwal: "badge-neutral",
  Berlangsung: "badge-info",
  Selesai: "badge-success",
  Dibatalkan: "badge-error",
};

// Opsi Target Role / Peserta secara terperinci
export const TARGET_ROLE_OPTIONS = [
  { value: "TRIMITRA", label: "👑 TRIMITRA (Ketua OSIS, Wakil 1 & 2)", group: "Pimpinan & Inti", divisionId: null, badgeColor: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  { value: "BPH", label: "🏛️ BPH (Trimitra, Sekretaris, Bendahara)", group: "Pimpinan & Inti", divisionId: null, badgeColor: "border-purple-500/40 text-purple-300 bg-purple-500/10" },
  { value: "SEMUA_SEKBID", label: "🌐 SEMUA SEKBID (Seluruh Pengurus 1-10 & Anggota)", group: "Organisasi Penuh", divisionId: null, badgeColor: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
];

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<RapatDetail[]>([]);
  const [divisions, setDivisions] = useState<DivisionDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [userList, setUserList] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [filterStatus, setFilterStatus] = useState<"Semua" | "Terjadwal" | "Berlangsung" | "Selesai" | "Dibatalkan">("Semua");
  const [filterTarget, setFilterTarget] = useState<string>("Semua");

  // Form State for creating meeting
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [agenda, setAgenda] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [prokerId, setProkerId] = useState("");

  // Form State for editing meeting
  const [editingMeeting, setEditingMeeting] = useState<RapatDetail | null>(null);
  const [editJudul, setEditJudul] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editLokasi, setEditLokasi] = useState("");
  const [editAgenda, setEditAgenda] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Attendance management state
  const [selectedMeeting, setSelectedMeeting] = useState<RapatDetail | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Notulensi state
  const [notulensiMeeting, setNotulensiMeeting] = useState<RapatDetail | null>(null);
  const [notulensiIsi, setNotulensiIsi] = useState("");
  const [notulensiStatus, setNotulensiStatus] = useState("Draft");
  const [notulensiAttachments, setNotulensiAttachments] = useState<NotulensiAttachment[]>([]);
  const [savingNotulensi, setSavingNotulensi] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [uploadingFile, setUploadingFile] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR code image URLs (keyed by rapat_id)
  const [qrImages, setQrImages] = useState<Record<number, string>>({});

  const fetchMeetingsData = async () => {
    setLoading(true);
    try {
      const [mRes, dRes, pRes, uRes] = await Promise.allSettled([
        api.listMeetings(),
        api.listDivisions(),
        api.listProkers(),
        api.listUsers(),
      ]);

      if (mRes.status === "fulfilled") setMeetings(mRes.value.rapat || []);
      if (dRes.status === "fulfilled") setDivisions(dRes.value.divisions || []);
      if (pRes.status === "fulfilled") setProkers(pRes.value.prokers || []);
      if (uRes.status === "fulfilled") setUserList(uRes.value.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingsData();
  }, [user]);

  // Generate QR code images when meetings change
  useEffect(() => {
    const generateQRCodes = async () => {
      const newQrImages: Record<number, string> = {};
      for (const m of meetings) {
        if (m.qr_code) {
          try {
            const dataUrl = await QRCode.toDataURL(m.qr_code, {
              width: 256,
              margin: 2,
              color: { dark: "#1e293b", light: "#ffffff" },
            });
            newQrImages[m.rapat_id] = dataUrl;
          } catch (e) {
            console.error("QR gen error:", e);
          }
        }
      }
      setQrImages(newQrImages);
    };
    if (meetings.length > 0) generateQRCodes();
  }, [meetings]);

  // Format tanggal dan jam yang tahan banting
  const formatDateTime = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return "Waktu belum ditentukan";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return (
        d.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) +
        " • " +
        d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      return String(dateVal);
    }
  };

  // Helper untuk menentukan label & badge target rapat
  const getMeetingTargetInfo = (m: RapatDetail) => {
    if (m.division_id) {
      return { label: `SEKBID ${m.division_id}`, fullLabel: getDivisionName(m.division_id), badgeClass: "border-blue-500/40 text-blue-300 bg-blue-500/10" };
    }
    return { label: "SEMUA SEKBID", fullLabel: "🌐 SEMUA SEKBID (Seluruh Pengurus)", badgeClass: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" };
  };

  const getDivisionName = (id: number | null) => {
    if (!id) return "Organisasi";
    return divisions.find((d) => d.division_id === id)?.division_name || `Divisi ${id}`;
  };

  const getProkerName = (id: number | null) => {
    if (!id) return null;
    return prokers.find((p) => p.proker_id === id)?.nama || null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      await api.createMeeting({
        judul,
        tanggal: new Date(tanggal).toISOString(),
        lokasi,
        agenda,
        division_id: divisionId ? Number(divisionId) : undefined,
        proker_id: prokerId ? Number(prokerId) : undefined,
      });
      setShowModal(false);
      setJudul("");
      setTanggal("");
      setLokasi("");
      setAgenda("");
      setDivisionId("");
      setProkerId("");
      fetchMeetingsData();
    } catch (err: any) {
      console.error("Gagal menyimpan rapat:", err);
      setSubmitError(err.message || "Gagal menjadwalkan rapat. Periksa koneksi ke server.");
    } finally {
      setSubmitting(false);
    }
  };

  const canEditMeeting = (m: RapatDetail) => {
    if (isStaf) return false;
    if (user?.group_name === "Trimitra" || user?.group_name === "Pembina") return true;
    if (user?.group_name === "Sekretaris") return true;
    return m.dibuat_oleh === user?.nis;
  };

  const handleOpenEdit = (m: RapatDetail) => {
    setEditingMeeting(m);
    setEditJudul(m.judul);
    const d = new Date(m.tanggal);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditTanggal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setEditLokasi(m.lokasi || "");
    setEditAgenda(m.agenda || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    setSavingEdit(true);
    try {
      await api.updateMeeting(editingMeeting.rapat_id, {
        judul: editJudul,
        tanggal: new Date(editTanggal).toISOString(),
        lokasi: editLokasi,
        agenda: editAgenda,
      });
      setEditingMeeting(null);
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal memperbarui rapat: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMeeting = async (id: number, judul: string) => {
    if (!confirm(`Hapus jadwal rapat "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(id);
    try {
      await api.deleteMeeting(id);
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal menghapus rapat: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenAttendance = async (m: RapatDetail) => {
    setSelectedMeeting(m);
    setAttendanceList([]);
    try {
      const aRes = await api.listPresensiRapat(m.rapat_id).catch(() => ({ presensi: [] }));
      const current = aRes.presensi || [];
      const populated = userList.map((u) => {
        const att = current.find((a) => a.nis === u.nis);
        return {
          user_nis: u.nis,
          user_nama: u.nama,
          status: att ? att.tipe.toLowerCase() : "alfa",
        };
      });
      setAttendanceList(populated);
    } catch {
      alert("Gagal mengambil data kehadiran.");
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    setSavingAttendance(true);
    try {
      const entries = attendanceList.map((a) => ({
        user_nis: a.user_nis,
        status: a.status === "hadir" ? "hadir" : a.status === "izin" ? "izin" : a.status === "sakit" ? "sakit" : "alfa",
      }));
      await api.recordAttendance(selectedMeeting.rapat_id, { entries });
      alert("Absensi rapat berhasil disimpan!");
      setSelectedMeeting(null);
    } catch (err: any) {
      alert("Gagal menyimpan absensi: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const updateAttendanceStatus = (nis: string, status: string) => {
    setAttendanceList((prev) =>
      prev.map((a) => (a.user_nis === nis ? { ...a, status } : a))
    );
  };

  // Notulensi handlers
  const handleOpenNotulensi = async (m: RapatDetail) => {
    setNotulensiMeeting(m);
    setNotulensiIsi("");
    setNotulensiStatus("Draft");
    setNotulensiAttachments([]);
    setAutoSaveStatus("idle");
    try {
      const res = await api.getNotulensi(m.rapat_id);
      setNotulensiIsi(res.isi);
      setNotulensiStatus(res.status);
      setNotulensiAttachments(res.attachments || []);
    } catch {
      // Belum ada notulensi
    }
  };

  const handleNotulensiIsiChange = (value: string, meeting: RapatDetail, attachments: NotulensiAttachment[]) => {
    setNotulensiIsi(value);
    if (notulensiStatus === "Final") return;
    setAutoSaveStatus("saving");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await api.upsertNotulensi(meeting.rapat_id, value, attachments);
        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 1500);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!notulensiMeeting || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploadingFile(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const att: NotulensiAttachment = { url: dataUrl, nama: file.name, tipe: file.type || "application/octet-stream" };
      const newAttachments = [...notulensiAttachments, att];
      setNotulensiAttachments(newAttachments);
      await api.upsertNotulensi(notulensiMeeting.rapat_id, notulensiIsi, newAttachments);
      setAutoSaveStatus("saved");
    } catch (err: any) {
      alert("Gagal upload file: " + err.message);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = async (idx: number) => {
    if (!notulensiMeeting) return;
    const newAttachments = notulensiAttachments.filter((_, i) => i !== idx);
    setNotulensiAttachments(newAttachments);
    try {
      await api.upsertNotulensi(notulensiMeeting.rapat_id, notulensiIsi, newAttachments);
      setAutoSaveStatus("saved");
    } catch {}
  };

  const handleSaveNotulensi = async () => {
    if (!notulensiMeeting) return;
    setSavingNotulensi(true);
    try {
      // Flush autosave yang mungkin masih pending — simpan final termasuk semua lampiran
      await api.upsertNotulensi(notulensiMeeting.rapat_id, notulensiIsi, notulensiAttachments);
      setAutoSaveStatus("saved");
      alert("✓ Notulensi dan lampiran berhasil disimpan.");
      setNotulensiMeeting(null);
    } catch (err: any) {
      alert("Gagal menyimpan notulensi: " + err.message);
    } finally {
      setSavingNotulensi(false);
    }
  };

  const handleFinalisasiNotulensi = async () => {
    if (!notulensiMeeting) return;
    setSavingNotulensi(true);
    try {
      await api.finalisasiNotulensi(notulensiMeeting.rapat_id);
      alert("Notulensi berhasil difinalisasi!");
      setNotulensiMeeting(null);
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal finalisasi notulensi: " + err.message);
    } finally {
      setSavingNotulensi(false);
    }
  };

  const isStaf = user?.group_name === "Staf";

  const filteredMeetings = meetings.filter((m) => {
    if (filterStatus !== "Semua" && m.status !== filterStatus) return false;
    if (filterTarget !== "Semua") {
      const info = getMeetingTargetInfo(m);
      if (info.label !== filterTarget && !info.fullLabel.includes(filterTarget)) return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapat & Kegiatan</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Jadwalkan rapat divisi atau organisasi, rekam notulensi, dan catat kehadiran
          </p>
        </div>
        {!isStaf && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Jadwalkan Rapat
          </button>
        )}
      </div>

      {/* Filter Tabs Status & Target */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(["Semua", "Terjadwal", "Berlangsung", "Selesai", "Dibatalkan"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterStatus === status
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Filter Target Peserta */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">Filter Target:</span>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="input-field py-1 px-2.5 text-xs bg-[var(--bg-primary)] max-w-[240px]"
          >
            <option value="Semua">Semua Target</option>
            <option value="SEMUA SEKBID">🌐 Semua Sekbid</option>
            {[...new Set(divisions.map((d) => d.division_name))].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
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
      ) : filteredMeetings.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)]">
          Belum ada rapat dengan status ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filteredMeetings.map((m) => {
            const targetInfo = getMeetingTargetInfo(m);
            const prokerName = getProkerName(m.proker_id);
            return (
              <div key={m.rapat_id} className="glass-card p-5 flex flex-col justify-between hover:border-[var(--accent)]/40 transition-all border border-[var(--border)] shadow-lg">
                <div>
                  {/* Top Badges: Target Role & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold ${targetInfo.badgeClass}`}>
                      {targetInfo.fullLabel}
                    </span>
                    <span className={`badge text-[11px] font-bold ${STATUS_BADGE[m.status] || "badge-neutral"}`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Judul Rapat */}
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{m.judul}</h3>

                  {/* TANGGAL & WAKTU */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-cyan-300 font-semibold mb-3 bg-cyan-950/40 px-3 py-2 rounded-xl border border-cyan-500/30">
                    <span className="text-base">🗓️</span>
                    <span>{formatDateTime(m.tanggal)}</span>
                  </div>

                  {/* Lokasi, Divisi, Proker & Agenda */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="text-sm">📍</span>
                      <span className="font-semibold text-[var(--text-muted)]">Lokasi:</span>
                      <span className="font-medium">{m.lokasi || "Belum ditentukan"}</span>
                    </p>
                    {m.proker_id && prokerName && (
                      <p className="text-[var(--accent)] flex items-center gap-1.5">
                        <span className="text-sm">📋</span>
                        <span>{prokerName}</span>
                      </p>
                    )}
                    <p className="text-[var(--text-secondary)] flex items-start gap-1.5">
                      <span className="text-sm">📝</span>
                      <span className="font-semibold text-[var(--text-muted)] shrink-0">Agenda:</span>
                      <span className="line-clamp-2">{m.agenda || "Tidak ada rincian agenda"}</span>
                    </p>
                  </div>

                  {/* QR Code gambar jika tersedia */}
                  {m.qr_code && qrImages[m.rapat_id] && (
                    <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] mb-4 flex flex-col items-center">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase mb-2">QR Code Presensi — Pajang di Proyektor</p>
                      <img src={qrImages[m.rapat_id]} alt={`QR Rapat ${m.judul}`} className="w-44 h-44" />
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">Peserta scan QR ini untuk presensi Hadir/Izin/Sakit</p>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 mt-auto gap-2">
                  <span className="text-[11px] text-[var(--text-muted)] truncate">Oleh: {m.dibuat_oleh}</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {canEditMeeting(m) && (
                      <>
                        <button onClick={() => handleOpenEdit(m)} className="btn-secondary text-xs py-1.5 px-2.5">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(m.rapat_id, m.judul)}
                          disabled={deletingId === m.rapat_id}
                          className="px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs transition-all font-semibold"
                          title="Hapus Jadwal Rapat"
                        >
                          {deletingId === m.rapat_id ? "..." : "Hapus"}
                        </button>
                      </>
                    )}
                    {!isStaf && (
                      <button onClick={() => handleOpenAttendance(m)} className="btn-secondary text-xs py-1.5 px-2.5">
                        Absensi
                      </button>
                    )}
                    <Link href={`/dashboard/meetings/${m.rapat_id}`} className="btn-primary text-xs py-1.5 px-2.5">
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roster / Attendance Modal */}
      {selectedMeeting !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-semibold border-b border-[var(--border)] pb-2 flex-shrink-0">
              📋 Absensi: {selectedMeeting.judul}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {attendanceList.length === 0 ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Memuat daftar anggota...</div>
              ) : (
                attendanceList.map((a) => (
                  <div key={a.user_nis} className="p-3 rounded-lg border border-[var(--border)] flex items-center justify-between bg-[var(--bg-primary)]">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{a.user_nama}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">NIS: {a.user_nis}</p>
                    </div>
                    <div className="flex gap-1">
                      {["hadir", "izin", "sakit", "alfa"].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateAttendanceStatus(a.user_nis, status)}
                          className={`text-[9px] py-1 px-2 font-bold rounded-lg border capitalize transition-all ${
                            a.status === status
                              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                              : "border-[var(--border)] text-[var(--text-muted)] hover:text-white"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] flex-shrink-0">
              <button onClick={() => setSelectedMeeting(null)} className="btn-secondary text-xs">
                Batal
              </button>
              <button onClick={handleSaveAttendance} disabled={savingAttendance} className="btn-primary text-xs">
                {savingAttendance ? "Menyimpan..." : "Simpan Absensi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notulensi Modal */}
      {notulensiMeeting !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-semibold border-b border-[var(--border)] pb-2 flex-shrink-0 flex items-center justify-between">
              <span>✍️ Notulensi Rapat</span>
              <div className="flex items-center gap-2">
                {autoSaveStatus === "saving" && (
                  <span className="text-[10px] text-[var(--text-muted)]">Menyimpan...</span>
                )}
                {autoSaveStatus === "saved" && (
                  <span className="text-[10px] text-emerald-400">✓ Tersimpan</span>
                )}
                <span className={`badge ${notulensiStatus === "Final" ? "badge-success" : "badge-warning"} text-xs`}>
                  Status: {notulensiStatus}
                </span>
              </div>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3">
              <p className="text-sm font-medium">{notulensiMeeting.judul}</p>
              <textarea
                rows={8}
                value={notulensiIsi}
                onChange={(e) => handleNotulensiIsiChange(e.target.value, notulensiMeeting, notulensiAttachments)}
                disabled={notulensiStatus === "Final" || isStaf}
                className="input-field text-sm resize-none font-mono"
                placeholder="Tulis ringkasan hasil rapat di sini..."
                required
              ></textarea>

              {/* Upload File / Foto */}
              {notulensiStatus !== "Final" && !isStaf && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Lampiran (File, Foto, Dokumen)
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] cursor-pointer hover:border-[var(--accent)]/60 hover:text-[var(--accent)] transition-all ${uploadingFile ? "opacity-50 pointer-events-none" : ""}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {uploadingFile ? "Mengunggah..." : "Klik untuk unggah file / foto"}
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      className="hidden"
                      onChange={handleUploadFile}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>
              )}

              {/* Daftar Lampiran */}
              {notulensiAttachments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Lampiran ({notulensiAttachments.length})</p>
                  {notulensiAttachments.map((att, idx) => {
                    const isImage = att.tipe.startsWith("image/");
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                        {isImage ? (
                          <img src={att.url} alt={att.nama} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded bg-[var(--bg-secondary)] text-lg">
                            📄
                          </div>
                        )}
                        <a
                          href={att.url}
                          download={att.nama}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-0 text-xs text-[var(--accent)] hover:underline truncate"
                        >
                          {att.nama}
                        </a>
                        {notulensiStatus !== "Final" && !isStaf && (
                          <button
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition-all flex-shrink-0"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] flex-shrink-0">
              <button onClick={() => setNotulensiMeeting(null)} className="btn-secondary text-xs">Tutup</button>
              {notulensiStatus !== "Final" && !isStaf && (
                <>
                  <Link href={`/dashboard/meetings/${notulensiMeeting.rapat_id}`} className="btn-secondary text-xs">
                    Detail Lengkap
                  </Link>
                  <button onClick={handleSaveNotulensi} disabled={savingNotulensi} className="btn-secondary text-xs">
                    {savingNotulensi ? "Menyimpan..." : "💾 Simpan Notulensi & Lampiran"}
                  </button>
                  {user?.group_name === "Sekretaris" && user?.level === 1 && (
                    <button onClick={handleFinalisasiNotulensi} disabled={savingNotulensi} className="btn-primary text-xs">
                      Finalisasi (QC)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">📅 Jadwalkan Rapat Baru</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Judul Rapat</label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Rapat Koordinasi Program Kerja Bidang 9"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Lokasi</label>
                <input
                  type="text"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  placeholder="Contoh: Ruang OSIS atau Lapangan Basket"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Agenda Pembahasan</label>
                <textarea
                  rows={2}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Contoh: Pemilihan panitia classmeeting"
                  className="input-field resize-none"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="input-field text-sm font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Divisi (Opsional)</label>
                  <select
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                  >
                    <option value="">Organisasi (Semua)</option>
                    {divisions.map((d) => (
                      <option key={d.division_id} value={d.division_id}>{d.division_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Proker (Opsional)</label>
                  <select
                    value={prokerId}
                    onChange={(e) => setProkerId(e.target.value)}
                    className="input-field bg-[var(--bg-primary)]"
                  >
                    <option value="">— Pilih Proker —</option>
                    {prokers.map((p) => (
                      <option key={p.proker_id} value={p.proker_id}>{p.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                  ⚠️ {submitError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => { setShowModal(false); setSubmitError(""); }} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Menjadwalkan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">✏️ Edit Rapat</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Judul Rapat</label>
                <input type="text" value={editJudul} onChange={(e) => setEditJudul(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Lokasi</label>
                <input type="text" value={editLokasi} onChange={(e) => setEditLokasi(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Agenda Pembahasan</label>
                <textarea rows={2} value={editAgenda} onChange={(e) => setEditAgenda(e.target.value)} className="input-field resize-none" required></textarea>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Tanggal & Waktu</label>
                <input type="datetime-local" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)} className="input-field text-sm font-mono" required />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setEditingMeeting(null)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={savingEdit} className="btn-primary text-xs">
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
