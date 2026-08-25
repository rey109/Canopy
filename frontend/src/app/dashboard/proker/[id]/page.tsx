"use client";

import { useEffect, useState, use } from "react";
import { api, type ProkerDetail, type TaskDetail, type TransaksiDetail, type DokumenDetail, type PresensiDetail, type UserDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProkerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const prokerId = Number(id);
  const { user } = useAuth();

  const [proker, setProker] = useState<ProkerDetail | null>(null);
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [transactions, setTransactions] = useState<TransaksiDetail[]>([]);
  const [documents, setDocuments] = useState<DokumenDetail[]>([]);
  const [attendance, setAttendance] = useState<PresensiDetail[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [pengajuanProker, setPengajuanProker] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "finance" | "docs" | "presensi">("overview");

  // Overview Note Form (Pembina only)
  const [coachingNote, setCoachingNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [notesList, setNotesList] = useState<{ catatan_id: number; dibuat_oleh: string; isi: string; tanggal: string }[]>([]);

  // Task creation Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskScope, setTaskScope] = useState("Individual");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const fetchDetailData = async () => {
    try {
      const [pRes, tRes, txRes, dRes, uRes, nRes, pjRes] = await Promise.allSettled([
        api.getProker(prokerId),
        api.listTasks(),
        api.listTransactions(),
        api.listDokumen(),
        api.listUsers(),
        api.listCatatanPembinaan(prokerId),
        api.listPengajuan().catch(() => ({ pengajuan: [] as any[] })),
      ]);

      if (pRes.status === "fulfilled") setProker(pRes.value);
      if (tRes.status === "fulfilled") {
        setTasks(tRes.value.tasks.filter(t => t.proker_id === prokerId) || []);
      }
      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.transaksi.filter(t => t.proker_id === prokerId) || []);
      }
      if (dRes.status === "fulfilled") {
        setDocuments(dRes.value.dokumen.filter(d => d.proker_id === prokerId) || []);
      }
      if (uRes.status === "fulfilled") {
        setUsers(uRes.value.users || []);
      }
      if (nRes.status === "fulfilled") {
        setNotesList(nRes.value.catatan || []);
      }
      if (pjRes.status === "fulfilled") {
        const pjList = (pjRes.value as any).pengajuan || [];
        setPengajuanProker(pjList.filter((p: any) => p.proker_id === prokerId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailData();
  }, [prokerId, user]);

  const handleAddCoachingNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachingNote.trim()) return;
    setSavingNote(true);
    try {
      await api.createCatatanPembinaan(prokerId, coachingNote);
      setCoachingNote("");
      // reload notes
      const notes = await api.listCatatanPembinaan(prokerId);
      setNotesList(notes.catatan || []);
      alert("Catatan pembinaan berhasil ditambahkan!");
    } catch (err: any) {
      alert("Gagal menambahkan catatan: " + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      await api.createTask({
        proker_id: prokerId,
        judul: taskTitle,
        deskripsi: taskDesc,
        deadline: new Date(taskDeadline).toISOString(),
        scope: taskScope,
        assigned_to: taskAssignedTo || undefined,
      });
      setTaskTitle("");
      setTaskDesc("");
      setTaskDeadline("");
      setTaskScope("Individual");
      setTaskAssignedTo("");
      // reload tasks
      const tRes = await api.listTasks();
      setTasks(tRes.tasks.filter((t: TaskDetail) => t.proker_id === prokerId) || []);
      alert("Tugas berhasil ditambahkan!");
    } catch (err: any) {
      alert("Gagal membuat tugas: " + err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="glass-card p-12 text-center animate-pulse">
        <p className="text-[var(--text-muted)]">Memuat detail program kerja...</p>
      </div>
    );
  }

  if (!proker) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[var(--text-muted)]">Program kerja tidak ditemukan.</p>
        <Link href="/dashboard/proker" className="btn-primary mt-4 inline-block">Kembali</Link>
      </div>
    );
  }

  const isPembina = user?.group_name === "Pembina";
  const isKetuaBidang = user?.group_name === "Kepala Divisi";
  const canManageTask = isKetuaBidang && user?.division_id === proker.division_id;

  // Hitung pemakaian budget proker
  const totalTerpakai = transactions.filter(t => t.status === "Disetujui" && t.jenis === "Keluar").reduce((sum, t) => sum + t.nominal, 0);
  const budgetPct = proker.anggaran_disetujui > 0 ? (totalTerpakai / proker.anggaran_disetujui) * 100 : 0;
  const budgetAlarm = budgetPct >= 100 ? "badge-danger" : budgetPct >= 80 ? "badge-warning" : "badge-success";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/proker" className="text-xs text-[var(--accent)] hover:underline">← Program Kerja</Link>
            {proker.division_id && (
              <span className="badge badge-info text-[10px]">Bidang {proker.division_id}</span>
            )}
            <span className="badge badge-success">{proker.status}</span>
          </div>
          <h1 className="text-2xl font-bold">{proker.nama}</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Mulai: {new Date(proker.tanggal_mulai).toLocaleDateString("id-ID")} — Selesai: {new Date(proker.tanggal_selesai).toLocaleDateString("id-ID")}
          </p>
        </div>

        {/* Budget Progress Indicator */}
        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">Anggaran Terpakai</span>
            <span className={`badge ${budgetAlarm} text-[10px]`}>{budgetPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
            <div className="bg-[var(--accent)] h-full transition-all" style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>{formatCurrency(totalTerpakai)}</span>
            <span>Limit: {formatCurrency(proker.anggaran_disetujui)}</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {(["overview", "tasks", "finance", "docs", "presensi"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-all capitalize whitespace-nowrap ${
              activeTab === tab
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab === "docs" ? "Dokumen" : tab}
          </button>
        ))}
      </div>

      {/* Tab Content: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold mb-3">Deskripsi Kegiatan</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{proker.deskripsi}</p>
            </div>

            {/* Catatan Pembinaan */}
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                📢 Catatan Pembinaan
                <span className="badge badge-neutral text-xs">{notesList.length}</span>
              </h2>

              {isPembina && (
                <form onSubmit={handleAddCoachingNote} className="space-y-2">
                  <textarea
                    rows={3}
                    value={coachingNote}
                    onChange={(e) => setCoachingNote(e.target.value)}
                    placeholder="Tulis catatan pembinaan/arahan untuk proker ini..."
                    className="input-field text-sm resize-none"
                    required
                  ></textarea>
                  <button type="submit" disabled={savingNote} className="btn-primary text-xs self-end">
                    {savingNote ? "Menyimpan..." : "Kirim Catatan"}
                  </button>
                </form>
              )}

              {notesList.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">Belum ada catatan pembinaan.</p>
              ) : (
                <div className="space-y-3">
                  {notesList.map((n) => (
                    <div key={n.catatan_id} className="p-3 bg-[var(--bg-primary)] rounded border border-[var(--border)]">
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{n.isi}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-2">Oleh: {n.dibuat_oleh} • {new Date(n.tanggal).toLocaleString("id-ID")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="glass-card p-6 h-fit space-y-4">
            <h2 className="text-base font-semibold">Detail Informasi</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Penanggung Jawab (PJ)</p>
                <p className="font-medium mt-0.5">{proker.penanggung_jawab || "Belum ditunjuk"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Dibuat Oleh</p>
                <p className="font-medium mt-0.5">{proker.dibuat_oleh}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Anggaran Disetujui</p>
                <p className="font-bold mt-0.5 text-emerald-400">{formatCurrency(proker.anggaran_disetujui)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === "tasks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 space-y-4">
            <h2 className="text-base font-semibold">Tugas Program Kerja</h2>
            {tasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-12">Belum ada tugas dibuat.</p>
            ) : (
              <div className="space-y-3Staf">
                {tasks.map(t => (
                  <div key={t.task_id} className="p-3 bg-[var(--bg-primary)] rounded border border-[var(--border)] flex justify-between items-center gap-3">
                    <div>
                      <p className="font-semibold text-sm">{t.judul}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Assigned: {t.assigned_to || "General/Tersedia"}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Deadline: {new Date(t.deadline).toLocaleDateString("id-ID")}</p>
                    </div>
                    <span className={`badge ${t.status === "Selesai" ? "badge-success" : t.status === "Ditawarkan" ? "badge-warning" : "badge-info"}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Task */}
          {canManageTask && (
            <div className="glass-card p-6 h-fit space-y-4">
              <h2 className="text-base font-semibold">✨ Buat Tugas Baru</h2>
              <form onSubmit={handleCreateTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Judul Tugas</label>
                  <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Contoh: Cetak baliho acara" className="input-field text-xs" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Deskripsi Tugas</label>
                  <textarea rows={3} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Tulis instruksi lengkap..." className="input-field text-xs resize-none" required></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Scope</label>
                    <select value={taskScope} onChange={(e) => setTaskScope(e.target.value)} className="input-field text-xs bg-[var(--bg-primary)]">
                      <option value="Individual">Individual</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Deadline</label>
                    <input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} className="input-field text-xs" required />
                  </div>
                </div>
                {taskScope === "Individual" && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Assigned To (Siswa NIS)</label>
                    <select value={taskAssignedTo} onChange={(e) => setTaskAssignedTo(e.target.value)} className="input-field text-xs bg-[var(--bg-primary)]" required>
                      <option value="">Pilih Penerima...</option>
                      {users.filter(u => u.division_id === proker.division_id).map(u => (
                        <option key={u.nis} value={u.nis}>{u.nama}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="submit" disabled={creatingTask} className="btn-primary text-xs w-full justify-center mt-2">
                  {creatingTask ? "Menyimpan..." : "Buat Tugas"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab: Finance */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Keuangan Proker Summary */}
          {proker && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-base font-semibold">Keuangan Proker</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-primary)] p-3 rounded">
                  <p className="text-xs text-[var(--text-muted)]">Total Anggaran</p>
                  <p className="font-bold text-blue-400">{formatCurrency(proker.anggaran_disetujui)}</p>
                </div>
                <div className="bg-[var(--bg-primary)] p-3 rounded">
                  <p className="text-xs text-[var(--text-muted)]">Total Pengeluaran</p>
                  <p className="font-bold text-red-400">{formatCurrency(transactions.filter(t=>t.jenis==="Keluar" && (t.status==="Disetujui"||t.status==="Terverifikasi")).reduce((s,t)=>s+t.nominal,0))}</p>
                </div>
                <div className="bg-[var(--bg-primary)] p-3 rounded">
                  <p className="text-xs text-[var(--text-muted)]">Total Pemasukan</p>
                  <p className="font-bold text-emerald-400">{formatCurrency(transactions.filter(t=>t.jenis==="Masuk" && (t.status==="Disetujui"||t.status==="Terverifikasi")).reduce((s,t)=>s+t.nominal,0))}</p>
                </div>
                <div className="bg-[var(--bg-primary)] p-3 rounded">
                  <p className="text-xs text-[var(--text-muted)]">Sisa Anggaran</p>
                  <p className="font-bold text-[var(--text-primary)]">{formatCurrency(proker.anggaran_disetujui - transactions.filter(t=>t.jenis==="Keluar" && (t.status==="Disetujui"||t.status==="Terverifikasi")).reduce((s,t)=>s+t.nominal,0) + transactions.filter(t=>t.jenis==="Masuk" && (t.status==="Disetujui"||t.status==="Terverifikasi")).reduce((s,t)=>s+t.nominal,0))}</p>
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">Data keuangan proker menggunakan relasi database yang sama dengan Buku Kas.</div>
            </div>
          )}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-base font-semibold">Pengajuan Dana Proker</h2>
            {pengajuanProker.length === 0 ? <p className="text-xs text-[var(--text-muted)] text-center py-4">Belum ada pengajuan dana untuk proker ini.</p> : (
              <div className="space-y-2">
                {pengajuanProker.map((p:any)=>(
                  <div key={p.pengajuan_id} className="p-3 bg-[var(--bg-primary)] rounded border text-xs flex justify-between">
                    <span>{p.nama_pengajuan} - {formatCurrency(p.nominal)} - <span className="badge text-[10px]">{p.status}</span></span>
                    <span>SEKBID {p.division_id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-base font-semibold">Riwayat Transaksi Anggaran</h2>
            {transactions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-12">Belum ada catatan pengeluaran/pemasukan proker ini.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Deskripsi</th>
                      <th>Sekbid</th>
                      <th>Kategori</th>
                      <th>Jenis</th>
                      <th>Nominal</th>
                      <th>Status</th>
                      <th>Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.transaksi_id}>
                        <td>{new Date(t.tanggal).toLocaleDateString("id-ID")}</td>
                        <td>{t.deskripsi}</td>
                        <td className="text-xs">{t.division_id ? `SEKBID ${t.division_id}` : "-"}</td>
                        <td>{t.kategori_nama || "Lain-lain"}</td>
                        <td>
                          <span className={`badge ${t.jenis === "Masuk" ? "badge-success" : "badge-danger"}`}>{t.jenis}</span>
                        </td>
                        <td className={`font-semibold ${t.jenis === "Masuk" ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(t.nominal)}
                        </td>
                        <td>{t.status}</td>
                        <td className="text-xs">{t.bukti_url ? <a href={t.bukti_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Lihat</a> : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Docs */}
      {activeTab === "docs" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-base font-semibold">Dokumen Persetujuan (Proposal / LPJ)</h2>
          {documents.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-12">Belum ada dokumen yang diajukan.</p>
          ) : (
            <div className="space-y-3">
              {documents.map(d => (
                <div key={d.dokumen_id} className="p-4 bg-[var(--bg-primary)] rounded border border-[var(--border)] flex justify-between items-center gap-4">
                  <div>
                    <span className="badge badge-info text-[10px]">{d.jenis_nama}</span>
                    <p className="font-semibold text-sm mt-1">Status: <span className="text-[var(--accent)]">{d.status}</span></p>
                    <p className="text-xs text-[var(--text-muted)]">Versi: {d.versi} | Diunggah: {d.diunggah_oleh}</p>
                  </div>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">Lihat File</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Presensi */}
      {activeTab === "presensi" && (
        <div className="glass-card p-6 text-center text-[var(--text-muted)]">
          <p className="text-sm">Rekap absensi kegiatan hari-H program kerja dapat diakses melalui modul presensi rapat/kegiatan.</p>
        </div>
      )}
    </div>
  );
}
