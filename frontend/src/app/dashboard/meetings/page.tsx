"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Meeting {
  id: number;
  title: string;
  schedule: string;
  division_id: number | null;
  proker_id: number | null;
  minutes: string;
  qc_status: string;
  created_by: string;
}

interface AttendanceEntry {
  user_nis: string;
  status: string;
}

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for creating meeting
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [prokerId, setProkerId] = useState("");

  // Attendance management state
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const fetchMeetings = () => {
    setLoading(true);
    api
      .listMeetings()
      .then((res) => setMeetings(res.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMeeting({
        title,
        schedule: new Date(schedule).toISOString(),
        division_id: divisionId ? Number(divisionId) : undefined,
        proker_id: prokerId ? Number(prokerId) : undefined,
      });
      setShowModal(false);
      setTitle("");
      setSchedule("");
      setDivisionId("");
      setProkerId("");
      fetchMeetings();
    } catch (err: any) {
      alert("Gagal menjadwalkan rapat: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAttendance = async (m: Meeting) => {
    setSelectedMeeting(m);
    setAttendanceList([]);
    try {
      // Fetch users list
      const uRes = await api.listUsers();
      // Fetch current attendance list
      const aRes = await api.getAttendance(m.id).catch(() => ({ attendance: [] }));

      const current = aRes.attendance || [];
      const populated = (uRes.users || []).map((usr) => {
        const att = current.find((a: any) => a.user_nis === usr.nis);
        return {
          user_nis: usr.nis,
          status: att ? att.status : "alfa",
        };
      });
      setAttendanceList(populated);
    } catch {
      alert("Gagal mengambil data absensi.");
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    setSavingAttendance(true);
    try {
      const entries = attendanceList.map((a) => ({
        user_nis: a.user_nis,
        status: a.status,
      }));
      await api.recordAttendance(selectedMeeting.id, { entries });
      alert("Kehadiran rapat berhasil disimpan!");
      setSelectedMeeting(null);
    } catch (err: any) {
      alert("Gagal menyimpan kehadiran: " + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const updateAttendanceStatus = (nis: string, status: string) => {
    setAttendanceList((prev) =>
      prev.map((a) => (a.user_nis === nis ? { ...a, status } : a))
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rapat & Kegiatan</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Jadwalkan rapat divisi atau organisasi, rekam notulensi, dan catat kehadiran
          </p>
        </div>
        {user?.role !== "Anggota" && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Jadwalkan Rapat
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
      ) : meetings.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada rapat terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {meetings.map((m) => (
            <div key={m.id} className="glass-card p-5 flex flex-col justify-between hover:translate-y-[-1px] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge ${m.qc_status === "Approved" ? "badge-success" : "badge-warning"}`}>
                    QC: {m.qc_status}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(m.schedule).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{m.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4">
                  {m.minutes || "Notulensi rapat belum ditulis."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 mt-auto">
                <span className="text-xs text-[var(--text-muted)]">Oleh: {m.created_by}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenAttendance(m)} className="btn-secondary text-xs py-1.5 px-3">
                    Kehadiran
                  </button>
                  <button className="btn-primary text-xs py-1.5 px-3">Notulensi</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roster / Attendance Modal */}
      {selectedMeeting !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-semibold border-b border-[var(--border)] pb-2 flex-shrink-0">
              📋 Kehadiran: {selectedMeeting.title}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {attendanceList.length === 0 ? (
                <div className="text-center py-4 text-[var(--text-muted)]">Memuat daftar anggota...</div>
              ) : (
                attendanceList.map((a) => (
                  <div key={a.user_nis} className="p-3 rounded-lg border border-[var(--border)] flex items-center justify-between bg-[var(--bg-primary)]">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">NIS: {a.user_nis}</span>
                    <div className="flex gap-1.5">
                      {["hadir", "izin", "alfa"].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateAttendanceStatus(a.user_nis, status)}
                          className={`text-[10px] py-1 px-2.5 font-bold rounded-lg border capitalize transition-all ${
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Rapat Koordinasi Program Kerja Bidang 9"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ID Divisi (Opsional)</label>
                  <input
                    type="number"
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                    placeholder="Contoh: 9"
                    className="input-field"
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

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-xs">
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
