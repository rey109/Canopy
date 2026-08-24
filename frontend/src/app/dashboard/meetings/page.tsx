"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type RapatDetail, type UserDetail, type DivisionDetail, type ProkerDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import QRCode from "qrcode";

interface AttendanceEntry {
  user_nis: string;
  user_nama: string;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  Terjadwal: "badge-neutral",
  Berlangsung: "badge-info",
  Selesai: "badge-success",
  Dibatalkan: "badge-error",
};

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

  const [judul, setJudul] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [agenda, setAgenda] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [prokerId, setProkerId] = useState("");

  const [selectedMeeting, setSelectedMeeting] = useState<RapatDetail | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

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
      setSubmitError(err.message || "Gagal menjadwalkan rapat.");
    } finally {
      setSubmitting(false);
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

  const isStaf = user?.group_name === "Staf";

  const filteredMeetings = meetings.filter((m) => {
    if (filterStatus === "Semua") return true;
    return m.status === filterStatus;
  });

  const getDivisionName = (id: number | null) => {
    if (!id) return "Organisasi";
    return divisions.find((d) => d.division_id === id)?.division_name || `Divisi ${id}`;
  };

  const getProkerName = (id: number | null) => {
    if (!id) return null;
    return prokers.find((p) => p.proker_id === id)?.nama || null;
  };

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

      {/* Filter Rapat */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {(["Semua", "Terjadwal", "Berlangsung", "Selesai", "Dibatalkan"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${
              filterStatus === status
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {status}
          </button>
        ))}
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
            const prokerName = getProkerName(m.proker_id);
            return (
              <div key={m.rapat_id} className="glass-card p-5 flex flex-col justify-between hover:translate-y-[-1px] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge ${STATUS_BADGE[m.status] || "badge-neutral"}`}>
                      {m.status}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(m.tanggal).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{m.judul}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-0.5">📍 {m.lokasi || "—"}</p>
                  <p className="text-xs text-[var(--text-muted)] mb-1">🏛️ {getDivisionName(m.division_id)}</p>
                  {prokerName && (
                    <p className="text-xs text-[var(--accent)] mb-1">📋 {prokerName}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2">Agenda: {m.agenda || "—"}</p>

                  {m.qr_code && qrImages[m.rapat_id] && (
                    <div className="p-3 bg-[var(--bg-primary)] rounded border border-[var(--border)] mb-4 flex flex-col items-center">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase mb-2">QR Code Presensi — Pajang di Proyektor</p>
                      <img src={qrImages[m.rapat_id]} alt={`QR Rapat ${m.judul}`} className="w-48 h-48" />
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">Peserta scan QR ini untuk presensi Hadir/Izin/Sakit</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-auto">
                  <span className="text-xs text-[var(--text-muted)]">Dibuat: {m.dibuat_oleh}</span>
                  <div className="flex gap-2">
                    {!isStaf && (
                      <button onClick={() => handleOpenAttendance(m)} className="btn-secondary text-xs py-1.5 px-3">
                        Absensi
                      </button>
                    )}
                    <Link href={`/dashboard/meetings/${m.rapat_id}`} className="btn-primary text-xs py-1.5 px-3">
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance Modal */}
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
              <button onClick={() => setSelectedMeeting(null)} className="btn-secondary text-xs">Batal</button>
              <button onClick={handleSaveAttendance} disabled={savingAttendance} className="btn-primary text-xs">
                {savingAttendance ? "Menyimpan..." : "Simpan Absensi"}
              </button>
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="input-field"
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

              <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
}
