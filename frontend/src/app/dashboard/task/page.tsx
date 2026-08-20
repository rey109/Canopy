"use client";

import { useEffect, useState } from "react";
import { api, type TaskDetail, type UserDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function TaskPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [userList, setUserList] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Filter tab
  const [activeFilter, setActiveFilter] = useState<"saya" | "tersedia" | "semua">("saya");

  const fetchTasksData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.allSettled([
        api.listTasks(),
        api.listUsers(),
      ]);

      if (tRes.status === "fulfilled") setTasks(tRes.value.tasks || []);
      if (uRes.status === "fulfilled") setUserList(uRes.value.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [user]);

  const handleTawarkan = async (id: number) => {
    setActioningId(id);
    try {
      await api.tawarkanTask(id);
      alert("Tugas berhasil ditawarkan ke anggota lain!");
      fetchTasksData();
    } catch (err: any) {
      alert("Gagal menawarkan tugas: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleAmbil = async (id: number) => {
    setActioningId(id);
    try {
      await api.ambilTask(id);
      alert("Tugas berhasil Anda ambil!");
      fetchTasksData();
    } catch (err: any) {
      alert("Gagal mengambil tugas: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleSelesaikan = async (id: number) => {
    setActioningId(id);
    try {
      await api.selelesaikanTask(id);
      alert("Tugas telah selesai!");
      fetchTasksData();
    } catch (err: any) {
      alert("Gagal menyelesaikan tugas: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const getUserName = (nis: string | null) => {
    if (!nis) return "—";
    const u = userList.find(x => x.nis === nis);
    return u ? u.nama : nis;
  };

  const filteredTasks = tasks.filter((t) => {
    if (!user) return false;
    if (activeFilter === "saya") {
      return t.assigned_to === user.nis;
    }
    if (activeFilter === "tersedia") {
      return t.status === "Tersedia" || t.status === "Ditawarkan";
    }
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftar Tugas (Tasks)</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Pantau tugas program kerja Anda, tawarkan, ambil tugas baru, dan laporkan kontribusi.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveFilter("saya")}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
            activeFilter === "saya"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Tugas Saya
        </button>
        <button
          onClick={() => setActiveFilter("tersedia")}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
            activeFilter === "tersedia"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Tugas Tersedia / Ditawarkan
        </button>
        <button
          onClick={() => setActiveFilter("semua")}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
            activeFilter === "semua"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Semua Tugas
        </button>
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
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)]">
          Tidak ada tugas dalam kategori ini.
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredTasks.map((t) => {
            const isMyTask = t.assigned_to === user?.nis;
            const canOffer = isMyTask && t.status === "Ditugaskan";
            const canTake = !isMyTask && (t.status === "Ditawarkan" || t.status === "Tersedia");
            const canComplete = isMyTask && t.status === "Ditugaskan";

            return (
              <div key={t.task_id} className="glass-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:translate-y-[-1px] transition-all">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="badge badge-info text-[9px] uppercase">{t.scope}</span>
                    <h3 className="font-semibold text-base">{t.judul}</h3>
                    <span className={`badge text-[10px] ${
                      t.status === "Selesai"
                        ? "badge-success"
                        : t.status === "Ditawarkan"
                        ? "badge-warning"
                        : t.status === "Tersedia"
                        ? "badge-neutral"
                        : "badge-info"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">{t.deskripsi}</p>
                  
                  {t.custom_data && (
                    <div className="p-2.5 bg-[var(--bg-primary)] rounded border border-[var(--border)] text-xs text-[var(--text-muted)] font-mono mb-2">
                      Custom Form Data: {t.custom_data}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                    <span>Deadline: <span className="font-medium text-[var(--text-primary)]">{new Date(t.deadline).toLocaleDateString("id-ID")}</span></span>
                    <span>•</span>
                    <span>Penerima: <span className="font-medium text-[var(--text-primary)]">{getUserName(t.assigned_to)}</span></span>
                    {t.offered_by && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--accent)] font-medium">Ditawarkan oleh: {getUserName(t.offered_by)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {canOffer && (
                    <button
                      onClick={() => handleTawarkan(t.task_id)}
                      disabled={actioningId !== null}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Tawarkan
                    </button>
                  )}
                  {canTake && (
                    <button
                      onClick={() => handleAmbil(t.task_id)}
                      disabled={actioningId !== null}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      Ambil Tugas
                    </button>
                  )}
                  {canComplete && (
                    <button
                      onClick={() => handleSelesaikan(t.task_id)}
                      disabled={actioningId !== null}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
