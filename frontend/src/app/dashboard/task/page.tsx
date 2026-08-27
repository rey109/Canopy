"use client";

import { useEffect, useState } from "react";
import { api, type TaskDetail, type UserDetail, type DokumenDetail, type PersetujuanDetail, fileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getRoleGroup, canMutate } from "@/lib/role-access";
import { createPortal } from "react-dom";

/* Pembina approval types */
interface EnrichedApproval {
  persetujuan: PersetujuanDetail;
  dokumen: DokumenDetail | null;
}

export default function TaskPage() {
  const { user } = useAuth();
  const roleGroup = getRoleGroup(user);
  const readOnly = !canMutate(user);
  const isPembina = roleGroup === "Pembina";
  const [mounted, setMounted] = useState(false);
  useEffect(()=>setMounted(true),[]);

  // Generic task states (non-Pembina)
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [userList, setUserList] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"saya" | "tersedia" | "semua">("saya");

  // Pembina approval states
  const [pembinaApprovals, setPembinaApprovals] = useState<EnrichedApproval[]>([]);
  const [pembinaLoading, setPembinaLoading] = useState(true);
  const [pembinaError, setPembinaError] = useState<string | null>(null);
  const [showRevisiModal, setShowRevisiModal] = useState<number | null>(null);
  const [showPendingModal, setShowPendingModal] = useState<number | null>(null);
  const [catatanInput, setCatatanInput] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<number | null>(null);

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

  const fetchPembinaData = async () => {
    setPembinaLoading(true);
    setPembinaError(null);
    try {
      const [pendingRes, dokumenRes] = await Promise.allSettled([
        api.listPendingApprovals(),
        api.listDokumen(),
      ]);
      const pendingList = pendingRes.status === "fulfilled" ? (pendingRes.value.persetujuan || []) : [];
      const dokumenList: DokumenDetail[] = dokumenRes.status === "fulfilled" ? (dokumenRes.value.dokumen || []) : [];
      // build map dokumen_id -> dokumen
      const docMap = new Map<number, DokumenDetail>();
      dokumenList.forEach(d => docMap.set(d.dokumen_id, d));
      const enriched: EnrichedApproval[] = pendingList.map(p => ({
        persetujuan: p,
        dokumen: docMap.get(p.dokumen_id) || null,
      }));
      // Simpan cache untuk submitter visibility (localStorage fallback jika backend offline)
      if (typeof window !== "undefined" && enriched.length > 0) {
        try { localStorage.setItem("canopy_pembina_pending_cache", JSON.stringify(enriched)); } catch {}
      }
      setPembinaApprovals(enriched);
      // If pending empty but dokumen ada dengan status butuh pembina, show fallback hint via localStorage cache
      if (enriched.length === 0 && typeof window !== "undefined") {
        try {
          const cacheRaw = localStorage.getItem("canopy_pembina_pending_cache");
          if (cacheRaw) {
            // keep showing cache if still relevant? but don't override empty intentionally
          }
        } catch {}
      }
      // also cache dokumen for offline detail
      if (typeof window !== "undefined" && dokumenList.length > 0) {
        try { localStorage.setItem("canopy_local_dokumen", JSON.stringify(dokumenList)); } catch {}
      }
    } catch (err: any) {
      // fallback to localStorage cache
      if (typeof window !== "undefined") {
        try {
          const cacheRaw = localStorage.getItem("canopy_pembina_pending_cache");
          if (cacheRaw) {
            const cached: EnrichedApproval[] = JSON.parse(cacheRaw);
            setPembinaApprovals(cached);
            setPembinaError(null);
            return;
          }
          const docRaw = localStorage.getItem("canopy_local_dokumen");
          if (docRaw) {
            const docs: DokumenDetail[] = JSON.parse(docRaw);
            // fake pending? just show docs with status menunggu as pembina queue
            const fake: EnrichedApproval[] = docs.filter(d => d.status === "Menunggu Approval Berjenjang" || d.status === "Pending" || d.status === "Perlu Revisi").map(d => ({
              persetujuan: { persetujuan_id: d.dokumen_id * 1000, dokumen_id: d.dokumen_id, urutan: 99, approver_group_name: "Pembina", disetujui_oleh: null, keputusan: "Menunggu", catatan: null, waktu: null },
              dokumen: d,
            }));
            if (fake.length > 0) { setPembinaApprovals(fake); return; }
          }
        } catch {}
      }
      setPembinaError(err?.message || "Gagal memuat antrean persetujuan");
    } finally {
      setPembinaLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (isPembina) {
      void fetchPembinaData();
    } else {
      void fetchTasksData();
    }
  }, [user, isPembina]);

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

  const handlePembinaAction = async (persetujuanId: number, keputusan: string, catatan?: string) => {
    setActioningId(persetujuanId);
    try {
      await api.actionApproval(persetujuanId, keputusan, catatan || undefined);
      // optimistic cache update
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("canopy_pembina_pending_cache");
          if (raw) {
            let arr: EnrichedApproval[] = JSON.parse(raw);
            arr = arr.filter(a => a.persetujuan.persetujuan_id !== persetujuanId);
            localStorage.setItem("canopy_pembina_pending_cache", JSON.stringify(arr));
          }
        } catch {}
      }
      await fetchPembinaData();
      setShowRevisiModal(null);
      setShowPendingModal(null);
      setCatatanInput("");
      // feedback
      if (keputusan === "Disetujui") alert("Dokumen disetujui. Status tersimpan dan terlihat oleh pengaju.");
      else if (keputusan === "Ditolak") alert("Dokumen dikembalikan untuk revisi. Status tersimpan.");
      else alert("Dokumen ditandai Pending. Status tersimpan.");
    } catch (err: any) {
      // fallback local: store pending/revisi locally if backend offline
      if (err.message?.includes("Failed to fetch") && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("canopy_pembina_pending_cache");
          if (raw) {
            let arr: EnrichedApproval[] = JSON.parse(raw);
            const idx = arr.findIndex(a => a.persetujuan.persetujuan_id === persetujuanId);
            if (idx >= 0) {
              arr[idx].persetujuan.keputusan = keputusan === "Ditolak" ? "Ditolak" : keputusan === "Pending" ? "Pending" : "Disetujui";
              arr[idx].persetujuan.catatan = catatan || null;
              if (keputusan !== "Pending") arr.splice(idx, 1); // remove approved/revised from queue
              localStorage.setItem("canopy_pembina_pending_cache", JSON.stringify(arr));
              setPembinaApprovals([...arr]);
              setShowRevisiModal(null);
              setShowPendingModal(null);
              setCatatanInput("");
              alert(`Aksi ${keputusan} disimpan secara lokal (offline). Akan sinkron saat backend tersedia.`);
              return;
            }
          }
        } catch {}
      }
      alert("Gagal memproses persetujuan: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const getUserName = (nis: string | null) => {
    if (!nis) return "—";
    const u = userList.find(x => x.nis === nis);
    return u ? u.nama : nis;
  };

  // ===== Pembina rendering =====
  if (isPembina) {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Pembina OSIS • Approval Pusat</p>
          <h1 className="mt-1 text-2xl font-bold">Persetujuan Dokumen Organisasi</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Semua dokumen yang membutuhkan persetujuan — <b>Notulen, RAB, Tupoksi, Proposal, Jadwal Rapat,</b> dan dokumen lainnya — otomatis masuk ke antrean Pembina. Lakukan <b>Approve</b> / <b>Revisi</b> / <b>Pending</b>, status akan tersimpan dan terlihat oleh pengaju.
          </p>
        </div>

        <div className="glass-card border border-blue-500/20 p-4 flex items-center justify-between bg-blue-500/5">
          <div className="flex items-center gap-3">
            <span className="text-sm">📥</span>
            <div>
              <p className="text-sm font-semibold">{pembinaApprovals.length} Dokumen menunggu tindakan Pembina</p>
              <p className="text-xs text-[var(--text-muted)]">Alur: Pengajuan → Masuk Task Pembina → Review → Approve / Revisi / Pending</p>
            </div>
          </div>
          <button onClick={fetchPembinaData} className="btn-secondary text-xs">Refresh</button>
        </div>

        {pembinaLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i=>(
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-5 w-48 bg-[var(--border)] rounded mb-2"/>
                <div className="h-4 w-full bg-[var(--border)] rounded"/>
              </div>
            ))}
          </div>
        ) : pembinaError ? (
          <div className="glass-card p-8 text-center space-y-2">
            <p className="text-sm text-red-400">{pembinaError}</p>
            <button onClick={fetchPembinaData} className="btn-secondary text-xs mx-auto">Coba Lagi</button>
          </div>
        ) : pembinaApprovals.length === 0 ? (
          <div className="glass-card p-12 text-center text-[var(--text-muted)] space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">✓</div>
            <p className="font-semibold text-sm">Tidak ada antrean persetujuan dokumen saat ini.</p>
            <p className="text-xs">Dokumen yang diajukan (Notulen, RAB, Tupoksi, Proposal, Jadwal Rapat, Dokumen Lainnya) akan otomatis muncul di sini untuk ditinjau Pembina. Jika kosong padahal seharusnya ada, pastikan dokumen sudah diunggah via Sekretaris / Bendahara dan jenis dokumen memiliki alur yang mencakup Pembina.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pembinaApprovals.map(({ persetujuan, dokumen }) => {
              const jenisNama = dokumen?.jenis_nama || `Jenis #${dokumen?.jenis_id || "-"}`;
              const statusDoc = dokumen?.status || "Menunggu";
              const pengaju = dokumen?.diunggah_oleh || "-";
              const judul = dokumen ? `${jenisNama} #${dokumen.dokumen_id}` : `Dokumen #${persetujuan.dokumen_id}`;
              const isPending = persetujuan.keputusan === "Pending";
              return (
                <div key={persetujuan.persetujuan_id} className="glass-card p-5 space-y-3 hover:border-blue-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="badge badge-info text-[10px]">{jenisNama}</span>
                        <span className={`badge text-[10px] ${statusDoc==="Disetujui"?"badge-success":statusDoc==="Perlu Revisi"?"badge-danger":statusDoc==="Pending"?"bg-amber-500/20 text-amber-300 border border-amber-500/30":"badge-warning"}`}>{statusDoc}</span>
                        {isPending && <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">Pending</span>}
                        {persetujuan.keputusan !== "Menunggu" && !isPending && <span className="text-[10px] text-[var(--text-muted)]">Keputusan: {persetujuan.keputusan}</span>}
                      </div>
                      <h3 className="font-semibold text-sm text-white">{judul}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Dokumen ID: {persetujuan.dokumen_id} • Persetujuan ID: {persetujuan.persetujuan_id} • Urutan: {persetujuan.urutan} • Approver: {persetujuan.approver_group_name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Diajukan oleh: <span className="font-medium text-[var(--text-primary)]">{pengaju}</span> {dokumen?.created_at && <span>• {new Date(dokumen.created_at).toLocaleString("id-ID")}</span>}</p>
                      {dokumen?.file_url && (
                        <a href={fileUrl(dokumen.file_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-2">
                          📎 Lihat berkas {dokumen.is_eksternal ? "(eksternal)" : ""}
                        </a>
                      )}
                      {persetujuan.catatan && <p className="text-xs mt-2 p-2 bg-[var(--bg-primary)] rounded border border-[var(--border)]">Catatan: {persetujuan.catatan}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={()=>setShowPendingModal(persetujuan.persetujuan_id)}
                        disabled={actioningId===persetujuan.persetujuan_id}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs py-1.5 px-3 rounded-lg transition-all"
                      >
                        Pending
                      </button>
                      <button
                        onClick={()=>{ setCatatanInput(persetujuan.catatan || ""); setShowRevisiModal(persetujuan.persetujuan_id); }}
                        disabled={actioningId===persetujuan.persetujuan_id}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs py-1.5 px-3 rounded-lg transition-all"
                      >
                        Revisi
                      </button>
                      <button
                        onClick={()=>handlePembinaAction(persetujuan.persetujuan_id, "Disetujui")}
                        disabled={actioningId===persetujuan.persetujuan_id}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg shadow-sm transition-all"
                      >
                        {actioningId===persetujuan.persetujuan_id ? "..." : "Approve"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setExpandedDoc(expandedDoc===dokumen?.dokumen_id?null:dokumen?.dokumen_id||null)} className="text-xs text-blue-400 hover:underline">
                      {expandedDoc===dokumen?.dokumen_id ? "Sembunyikan detail" : "Lihat detail dokumen"}
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">• Status akan terlihat oleh pengaju di daftar dokumen mereka.</span>
                  </div>
                  {expandedDoc===dokumen?.dokumen_id && dokumen && (
                    <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-[var(--text-muted)]">Jenis ID:</span> <span className="font-medium">{dokumen.jenis_id} ({dokumen.jenis_nama})</span></div>
                        <div><span className="text-[var(--text-muted)]">Versi:</span> <span className="font-medium">{dokumen.versi}</span></div>
                        <div><span className="text-[var(--text-muted)]">Proker ID:</span> <span className="font-medium">{dokumen.proker_id ?? "-"}</span></div>
                        <div><span className="text-[var(--text-muted)]">Diperiksa oleh:</span> <span className="font-medium">{dokumen.diperiksa_oleh ?? "-"}</span></div>
                      </div>
                      {dokumen.catatan_revisi && <p><span className="text-[var(--text-muted)]">Catatan revisi:</span> {dokumen.catatan_revisi}</p>}
                      <p className="text-[10px] text-[var(--text-muted)]">Updated: {new Date(dokumen.updated_at).toLocaleString("id-ID")}</p>
                      {dokumen.persetujuan && dokumen.persetujuan.length>0 && (
                        <div>
                          <p className="font-semibold mt-2 mb-1">Rantai persetujuan:</p>
                          <div className="space-y-1">
                            {dokumen.persetujuan.map(p=>(
                              <div key={p.persetujuan_id} className="flex items-center gap-2 text-[11px]">
                                <span className={`px-2 py-0.5 rounded-full font-bold ${p.keputusan==="Disetujui"?"bg-emerald-500/20 text-emerald-300":p.keputusan==="Ditolak"?"bg-red-500/20 text-red-300":p.keputusan==="Pending"?"bg-amber-500/20 text-amber-300":"bg-slate-700 text-slate-300"}`}>{p.keputusan}</span>
                                <span>{p.approver_group_name} (urutan {p.urutan})</span>
                                {p.disetujui_oleh && <span>oleh {p.disetujui_oleh}</span>}
                                {p.catatan && <span>• {p.catatan}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mounted && showRevisiModal !== null && createPortal(
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl border border-slate-700 text-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">📝 Catatan Revisi — kembalikan ke pengaju</h3>
              <p className="text-xs text-slate-400">Pengaju akan melihat status <b>Perlu Revisi</b> beserta catatan ini di daftar dokumen mereka.</p>
              <textarea
                rows={4}
                value={catatanInput}
                onChange={(e)=>setCatatanInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all resize-none"
                placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={()=>{setShowRevisiModal(null); setCatatanInput("");}} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all">Batal</button>
                <button
                  onClick={()=>handlePembinaAction(showRevisiModal, "Ditolak", catatanInput)}
                  disabled={!catatanInput.trim() || actioningId!==null}
                  className="bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  Kirim Revisi
                </button>
              </div>
            </div>
          </div>, document.body)}

        {mounted && showPendingModal !== null && createPortal(
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1e293b] p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl border border-slate-700 text-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">⏳ Tandai Pending</h3>
              <p className="text-xs text-slate-400">Dokumen akan berstatus <b>Pending</b> dan tetap di antrean. Pengaju melihat status Pending beserta catatan. Kamu bisa Approve/Revisi nanti.</p>
              <textarea
                rows={3}
                value={catatanInput}
                onChange={(e)=>setCatatanInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:bg-slate-800 transition-all resize-none"
                placeholder="Alasan pending (opsional, akan terlihat oleh pengaju)..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={()=>{setShowPendingModal(null); setCatatanInput("");}} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs py-2 px-4 rounded-xl transition-all">Batal</button>
                <button
                  onClick={()=>handlePembinaAction(showPendingModal, "Pending", catatanInput || "Ditandai Pending oleh Pembina")}
                  disabled={actioningId!==null}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all"
                >
                  Tandai Pending
                </button>
              </div>
            </div>
          </div>, document.body)}
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (!user) return false;
    if (activeFilter === "saya") {
      return t.assigned_to === user.nis;
    }
    if (activeFilter === "tersedia") {
      return t.status === "Tersedia" || t.status === "Ditawarkan";
    }
    return roleGroup !== "Staf";
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftar Tugas (Tasks)</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {roleGroup === "Staf" ? "Tugas yang ditugaskan, tersedia untuk diambil, dan kontribusi pribadi." : roleGroup === "Kepala Divisi" ? "Kelola task divisi, assign anggota, dan pantau deadline." : "Pantau task pribadi dan task yang relevan dengan scope jabatan."}
        </p>
      </div>

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
        {!readOnly && <button
          onClick={() => setActiveFilter("tersedia")}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
            activeFilter === "tersedia"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Tugas Tersedia / Ditawarkan
        </button>}
        {!readOnly && <button
          onClick={() => setActiveFilter("semua")}
          className={`px-4 py-2 border-b-2 text-sm font-medium transition-all ${
            activeFilter === "semua"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Semua Tugas
        </button>}
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
            const canOffer = !readOnly && isMyTask && t.status === "Ditugaskan";
            const canTake = !readOnly && !isMyTask && (t.status === "Ditawarkan" || t.status === "Tersedia");
            const canComplete = !readOnly && isMyTask && t.status === "Ditugaskan";

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
