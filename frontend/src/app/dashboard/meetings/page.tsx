"use client";

import { useEffect, useRef, useState } from "react";
import { api, fileUrl, type RapatDetail, type UserDetail, type DivisionDetail, type ProkerDetail, type NotulensiAttachment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface AttendanceEntry {
  user_nis: string;
  user_nama: string;
  status: string; // 'hadir', 'izin', 'sakit', 'alfa'
}

// Opsi Target Role / Peserta secara terperinci
export const TARGET_ROLE_OPTIONS = [
  { value: "TRIMITRA", label: "👑 TRIMITRA (Ketua OSIS, Wakil 1 & 2)", group: "Pimpinan & Inti", divisionId: null, badgeColor: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  { value: "BPH", label: "🏛️ BPH (Trimitra, Sekretaris, Bendahara)", group: "Pimpinan & Inti", divisionId: null, badgeColor: "border-purple-500/40 text-purple-300 bg-purple-500/10" },
  { value: "SEMUA_SEKBID", label: "🌐 SEMUA SEKBID (Seluruh Pengurus 1-10 & Anggota)", group: "Organisasi Penuh", divisionId: null, badgeColor: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  { value: "SEKBID_1", label: "🏢 SEKBID 1: Pembinaan Keimanan & Ketaqwaan Terhadap Tuhan YME", group: "Seksi Bidang 1 s.d 10", divisionId: 1, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_2", label: "🏢 SEKBID 2: Pembinaan Budi Pekerti Luhur / Akhlak Mulia", group: "Seksi Bidang 1 s.d 10", divisionId: 2, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_3", label: "🏢 SEKBID 3: Pembinaan Wawasan Kebangsaan & Bela Negara", group: "Seksi Bidang 1 s.d 10", divisionId: 3, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_4", label: "🏢 SEKBID 4: Pembinaan Prestasi Akademik, Seni, & Olahraga", group: "Seksi Bidang 1 s.d 10", divisionId: 4, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_5", label: "🏢 SEKBID 5: Demokrasi, HAM, Politik, & Lingkungan Hidup", group: "Seksi Bidang 1 s.d 10", divisionId: 5, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_6", label: "🏢 SEKBID 6: Pembinaan Kreativitas, Keterampilan, Kewirausahaan", group: "Seksi Bidang 1 s.d 10", divisionId: 6, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_7", label: "🏢 SEKBID 7: Pembinaan Kualitas Jasmani, Kesehatan, & Gizi", group: "Seksi Bidang 1 s.d 10", divisionId: 7, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_8", label: "🏢 SEKBID 8: Pembinaan Sastra & Budaya", group: "Seksi Bidang 1 s.d 10", divisionId: 8, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_9", label: "🏢 SEKBID 9: Pembinaan Teknologi Informasi & Komunikasi (TIK)", group: "Seksi Bidang 1 s.d 10", divisionId: 9, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  { value: "SEKBID_10", label: "🏢 SEKBID 10: Pembinaan Komunikasi Bahasa Asing", group: "Seksi Bidang 1 s.d 10", divisionId: 10, badgeColor: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
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

  // Filter list
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Terjadwal" | "Berlangsung" | "Selesai">("Semua");
  const [filterTarget, setFilterTarget] = useState<string>("Semua");

  // Form State for creating meeting
  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [agenda, setAgenda] = useState("");
  const [targetAudience, setTargetAudience] = useState("SEMUA_SEKBID");

  // Form State for editing meeting
  const [editingMeeting, setEditingMeeting] = useState<RapatDetail | null>(null);
  const [editJudul, setEditJudul] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editLokasi, setEditLokasi] = useState("");
  const [editAgenda, setEditAgenda] = useState("");
  const [editTarget, setEditTarget] = useState("SEMUA_SEKBID");
  const [editStatus, setEditStatus] = useState("Terjadwal");
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

  // Format tanggal dan jam yang tahan banting (tidak akan pernah hilang/NaN)
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
        }) +
        " WIB"
      );
    } catch {
      return String(dateVal);
    }
  };

  // Helper untuk menentukan label & badge target rapat
  const getMeetingTargetInfo = (m: RapatDetail) => {
    if (m.division_id) {
      const found = TARGET_ROLE_OPTIONS.find((t) => t.divisionId === m.division_id);
      if (found) return { label: `SEKBID ${m.division_id}`, fullLabel: found.label, badgeClass: found.badgeColor };
      return { label: `SEKBID ${m.division_id}`, fullLabel: `Sekbid ${m.division_id}`, badgeClass: "border-blue-500/40 text-blue-300 bg-blue-500/10" };
    }
    const upTitle = (m.judul || "").toUpperCase();
    const upAgenda = (m.agenda || "").toUpperCase();
    if (upTitle.includes("TRIMITRA") || upAgenda.includes("TRIMITRA")) {
      return { label: "TRIMITRA", fullLabel: "👑 TRIMITRA (Ketua & Wakil)", badgeClass: "border-amber-500/40 text-amber-300 bg-amber-500/10" };
    }
    if (upTitle.includes("BPH") || upAgenda.includes("BPH")) {
      return { label: "BPH", fullLabel: "🏛️ BPH (Trimitra, Sekre, Bendum)", badgeClass: "border-purple-500/40 text-purple-300 bg-purple-500/10" };
    }
    return { label: "SEMUA SEKBID", fullLabel: "🌐 SEMUA SEKBID (Seluruh Pengurus)", badgeClass: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal) {
      alert("Harap pilih tanggal dan waktu rapat.");
      return;
    }
    setSubmitting(true);
    try {
      const selected = TARGET_ROLE_OPTIONS.find((t) => t.value === targetAudience);
      const divId = selected?.divisionId || undefined;

      let cleanJudul = judul.trim();
      if (targetAudience === "TRIMITRA" && !cleanJudul.toUpperCase().includes("TRIMITRA")) {
        cleanJudul = `[TRIMITRA] ${cleanJudul}`;
      } else if (targetAudience === "BPH" && !cleanJudul.toUpperCase().includes("BPH")) {
        cleanJudul = `[BPH] ${cleanJudul}`;
      }

      await api.createMeeting({
        judul: cleanJudul,
        tanggal: new Date(tanggal).toISOString(),
        lokasi,
        agenda,
        division_id: divId,
      });

      setShowModal(false);
      setJudul("");
      setTanggal("");
      setLokasi("");
      setAgenda("");
      setTargetAudience("SEMUA_SEKBID");
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal menjadwalkan rapat: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (m: RapatDetail) => {
    setEditingMeeting(m);
    setEditJudul(m.judul);

    if (m.tanggal) {
      try {
        const d = new Date(m.tanggal);
        if (!isNaN(d.getTime())) {
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setEditTanggal(localIso);
        } else {
          setEditTanggal("");
        }
      } catch {
        setEditTanggal("");
      }
    } else {
      setEditTanggal("");
    }

    setEditLokasi(m.lokasi || "");
    setEditAgenda(m.agenda || "");

    if (m.division_id) {
      setEditTarget(`SEKBID_${m.division_id}`);
    } else if (m.judul?.toUpperCase().includes("TRIMITRA")) {
      setEditTarget("TRIMITRA");
    } else if (m.judul?.toUpperCase().includes("BPH")) {
      setEditTarget("BPH");
    } else {
      setEditTarget("SEMUA_SEKBID");
    }

    setEditStatus(m.status || "Terjadwal");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;
    if (!editTanggal) {
      alert("Harap tentukan tanggal dan waktu rapat.");
      return;
    }
    setSavingEdit(true);
    try {
      const selected = TARGET_ROLE_OPTIONS.find((t) => t.value === editTarget);
      const divId = selected?.divisionId || null;

      await api.updateMeeting(editingMeeting.rapat_id, {
        judul: editJudul,
        tanggal: new Date(editTanggal).toISOString(),
        lokasi: editLokasi,
        agenda: editAgenda,
        division_id: divId,
        status: editStatus,
      });

      alert("Jadwal rapat berhasil diperbarui!");
      setEditingMeeting(null);
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal memperbarui jadwal rapat: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMeeting = async (id: number, title: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus jadwal rapat "${title}"?\n\nNotifikasi pembatalan rapat akan otomatis disiarkan ke seluruh peserta.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteMeeting(id);
      alert(`Jadwal rapat "${title}" berhasil dihapus.`);
      if (editingMeeting?.rapat_id === id) {
        setEditingMeeting(null);
      }
      fetchMeetingsData();
    } catch (err: any) {
      alert("Gagal menghapus rapat: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const canEditMeeting = (m: RapatDetail) => {
    if (!user) return false;
    const g = user.group_name;
    if (g === "Sekretaris" || g === "Trimitra" || g === "Pembina") return true;
    if (m.dibuat_oleh === user.nis) return true;
    if (g === "Kepala Divisi" && user.division_id && m.division_id === user.division_id) return true;
    return false;
  };

  const canGenerateQR = user?.group_name === "Sekretaris" || user?.group_name === "Trimitra";

  const handleGenerateQR = async (m: RapatDetail) => {
    try {
      const updated = await api.generateMeetingQR(m.rapat_id);
      setMeetings((current) => current.map((item) => item.rapat_id === m.rapat_id ? updated : item));
    } catch (err: any) {
      alert("Gagal membuat QR presensi: " + err.message);
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
        status: a.status === "hadir" ? "hadir" : a.status === "izin" ? "izin" : "alfa",
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

  // Kompres foto di browser agar upload ringan dan tidak melebihi batas server
  const compressImageFile = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
      );
      bitmap.close?.();
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return file;
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!notulensiMeeting || !e.target.files?.length) return;
    const original = e.target.files[0];
    if (original.size > 10 * 1024 * 1024) {
      alert("Ukuran file maksimal 10 MB.");
      e.target.value = "";
      return;
    }
    setUploadingFile(true);
    try {
      const file = await compressImageFile(original);
      const uploaded = await api.uploadNotulensiFile(notulensiMeeting.rapat_id, file);
      const att: NotulensiAttachment = { url: uploaded.url, name: uploaded.name, type: uploaded.type };
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
      await api.upsertNotulensi(notulensiMeeting.rapat_id, notulensiIsi, notulensiAttachments);
      alert("Notulensi berhasil disimpan sebagai Draft!");
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
    } catch (err: any) {
      alert("Gagal finalisasi notulensi: " + err.message);
    } finally {
      setSavingNotulensi(false);
    }
  };

  const isStaf = user?.group_name === "Staf";
  const isReadOnly = user?.group_name === "Pembina" || isStaf;
  const canCreateMeeting = !isStaf && user?.group_name !== "Pembina";
  const canFinalizeNotes = user?.group_name === "Sekretaris" || user?.group_name === "Trimitra";
  const canManageAttendance = user?.group_name === "Sekretaris" || user?.group_name === "Kepala Divisi";

  const filteredMeetings = meetings.filter((m) => {
    if (filterStatus !== "Semua" && m.status !== filterStatus) return false;
    if (filterTarget !== "Semua") {
      const targetInfo = getMeetingTargetInfo(m);
      if (filterTarget === "TRIMITRA" && targetInfo.label !== "TRIMITRA") return false;
      if (filterTarget === "BPH" && targetInfo.label !== "BPH") return false;
      if (filterTarget === "SEMUA_SEKBID" && targetInfo.label !== "SEMUA SEKBID") return false;
      if (filterTarget.startsWith("SEKBID_")) {
        const num = Number(filterTarget.replace("SEKBID_", ""));
        if (m.division_id !== num) return false;
      }
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapat & Kegiatan</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Manajemen agenda rapat, jadwal kegiatan, absensi QR, dan notulensi organisasi.
          </p>
        </div>
        {canCreateMeeting && (
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
          {(["Semua", "Terjadwal", "Berlangsung", "Selesai"] as const).map((status) => (
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
            <option value="TRIMITRA">👑 TRIMITRA</option>
            <option value="BPH">🏛️ BPH</option>
            <option value="SEMUA_SEKBID">🌐 SEMUA SEKBID</option>
            <optgroup label="Seksi Bidang 1 s.d 10">
              {Array.from({ length: 10 }).map((_, i) => (
                <option key={i + 1} value={`SEKBID_${i + 1}`}>
                  🏢 SEKBID {i + 1}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Daftar Kartu Rapat */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-[var(--border)] rounded" />
              <div className="h-6 w-3/4 bg-[var(--border)] rounded" />
              <div className="h-8 w-full bg-[var(--border)] rounded" />
            </div>
          ))}
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)] space-y-2">
          <p className="text-2xl">📅</p>
          <p className="font-semibold text-sm">Belum ada rapat dengan filter yang dipilih.</p>
          <p className="text-xs">Klik tombol "Jadwalkan Rapat" di kanan atas untuk membuat jadwal baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filteredMeetings.map((m) => {
            const targetInfo = getMeetingTargetInfo(m);
            return (
              <div key={m.rapat_id} className="glass-card p-5 flex flex-col justify-between hover:border-[var(--accent)]/40 transition-all border border-[var(--border)] shadow-lg">
                <div>
                  {/* Top Badges: Target Role & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold ${targetInfo.badgeClass}`}>
                      {targetInfo.fullLabel}
                    </span>
                    <span className={`badge text-[11px] font-bold ${m.status === "Selesai" ? "badge-success" : m.status === "Berlangsung" ? "badge-info" : "badge-neutral"}`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Judul Rapat */}
                  <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{m.judul}</h3>

                  {/* TANGGAL & WAKTU (Paling Jelas, Menonjol, dan Terformat Rapi) */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-cyan-300 font-semibold mb-3 bg-cyan-950/40 px-3 py-2 rounded-xl border border-cyan-500/30">
                    <span className="text-base">🗓️</span>
                    <span>{formatDateTime(m.tanggal)}</span>
                  </div>

                  {/* Lokasi & Agenda */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    <p className="text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="text-sm">📍</span>
                      <span className="font-semibold text-[var(--text-muted)]">Lokasi:</span>
                      <span className="text-white font-medium">{m.lokasi || "Belum ditentukan"}</span>
                    </p>
                    <p className="text-[var(--text-secondary)] flex items-start gap-1.5">
                      <span className="text-sm">📝</span>
                      <span className="font-semibold text-[var(--text-muted)] shrink-0">Agenda:</span>
                      <span className="text-[var(--text-secondary)] line-clamp-2">{m.agenda || "Tidak ada rincian agenda"}</span>
                    </p>
                  </div>

                   {/* QR Code Banner jika tersedia */}
                   {(m.qr_code || canGenerateQR) && (
                     <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] mb-4 flex items-center justify-between">

                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Token QR Presensi</p>
                        {m.qr_code ? (
                          <p className="text-xs font-mono font-bold text-[var(--accent)] select-all mt-0.5">{m.qr_code}</p>
                        ) : (
                          <button onClick={() => handleGenerateQR(m)} className="btn-primary text-xs py-1 px-2">Buat QR</button>
                        )}
                       </div>
                       {m.qr_code && <span className="text-xs px-2 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-semibold">Aktif</span>}

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
                     {canManageAttendance && <button onClick={() => handleOpenAttendance(m)} className="btn-secondary text-xs py-1.5 px-2.5">
                       Absensi
                     </button>}
                     {(canFinalizeNotes || user?.group_name !== "Staf") && <button onClick={() => handleOpenNotulensi(m)} className="btn-primary text-xs py-1.5 px-2.5">
                       Notulensi
                     </button>}
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
                    const isImage = att.type.startsWith("image/");
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                        {isImage ? (
                          <img src={fileUrl(att.url)} alt={att.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded bg-[var(--bg-secondary)] text-lg">
                            📄
                          </div>
                        )}
                        <a
                          href={fileUrl(att.url)}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-0 text-xs text-[var(--accent)] hover:underline truncate"
                        >
                          {att.name}
                        </a>
                        {notulensiStatus !== "Final" && canFinalizeNotes && (
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
                  <button onClick={handleSaveNotulensi} disabled={savingNotulensi} className="btn-secondary text-xs">
                    Simpan Draft
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
          <div className="glass-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">📅 Jadwalkan Rapat Baru</h3>
            <div className="p-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs text-[var(--accent)] flex items-center gap-2">
              <span>📢</span>
              <span>Notifikasi rapat otomatis akan disiarkan ke feed peserta yang dituju.</span>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Target Peserta / Role</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="input-field bg-[var(--bg-primary)] font-medium text-xs"
                >
                  <optgroup label="Tingkat Pimpinan & BPH">
                    <option value="TRIMITRA">👑 TRIMITRA (Ketua OSIS, Wakil 1 & 2)</option>
                    <option value="BPH">🏛️ BPH (Trimitra, Sekretaris, Bendahara)</option>
                  </optgroup>
                  <optgroup label="Tingkat Organisasi">
                    <option value="SEMUA_SEKBID">🌐 SEMUA SEKBID (Seluruh Pengurus 1-10 & Anggota)</option>
                  </optgroup>
                  <optgroup label="Seksi Bidang 1 s.d 10">
                    {TARGET_ROLE_OPTIONS.filter((t) => t.group === "Seksi Bidang 1 s.d 10").map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Judul Rapat</label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Rapat Koordinasi Program Kerja"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Lokasi Rapat</label>
                <input
                  type="text"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  placeholder="Contoh: Ruang OSIS atau Lab Komputer"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Agenda Pembahasan</label>
                <textarea
                  rows={2}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Contoh: Pemilihan panitia classmeeting dan timeline kegiatan"
                  className="input-field resize-none text-sm"
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

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? "Menjadwalkan..." : "Simpan & Siarkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">✏️ Edit Jadwal Rapat</h3>
              <span className="text-xs text-[var(--text-muted)] font-mono">#{editingMeeting.rapat_id}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
              <span>📢</span>
              <span>Perubahan jadwal akan otomatis dikirimkan sebagai notifikasi ke peserta.</span>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Target Peserta / Role</label>
                <select
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="input-field bg-[var(--bg-primary)] font-medium text-xs"
                >
                  <optgroup label="Tingkat Pimpinan & BPH">
                    <option value="TRIMITRA">👑 TRIMITRA (Ketua OSIS, Wakil 1 & 2)</option>
                    <option value="BPH">🏛️ BPH (Trimitra, Sekretaris, Bendahara)</option>
                  </optgroup>
                  <optgroup label="Tingkat Organisasi">
                    <option value="SEMUA_SEKBID">🌐 SEMUA SEKBID (Seluruh Pengurus 1-10 & Anggota)</option>
                  </optgroup>
                  <optgroup label="Seksi Bidang 1 s.d 10">
                    {TARGET_ROLE_OPTIONS.filter((t) => t.group === "Seksi Bidang 1 s.d 10").map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Judul Rapat</label>
                <input
                  type="text"
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Lokasi</label>
                <input
                  type="text"
                  value={editLokasi}
                  onChange={(e) => setEditLokasi(e.target.value)}
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Agenda Pembahasan</label>
                <textarea
                  rows={2}
                  value={editAgenda}
                  onChange={(e) => setEditAgenda(e.target.value)}
                  className="input-field resize-none text-sm"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Tanggal & Waktu</label>
                  <input
                    type="datetime-local"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="input-field text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Status Rapat</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input-field bg-[var(--bg-primary)] text-xs"
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => handleDeleteMeeting(editingMeeting.rapat_id, editingMeeting.judul)}
                  className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                >
                  Hapus Rapat
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingMeeting(null)} className="btn-secondary text-xs">
                    Batal
                  </button>
                  <button type="submit" disabled={savingEdit} className="btn-primary text-xs">
                    {savingEdit ? "Menyimpan..." : "Simpan & Siarkan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
