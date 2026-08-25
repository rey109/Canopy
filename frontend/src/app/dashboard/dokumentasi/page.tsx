"use client";

import { useEffect, useState } from "react";
import { api, fileUrl, type DokumentasiPDD, type ProkerDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SEKBID_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function DokumentasiPDDPage() {
  const { user } = useAuth();
  const [list, setList] = useState<DokumentasiPDD[]>([]);
  const [filtered, setFiltered] = useState<DokumentasiPDD[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSekbid, setFilterSekbid] = useState<string>("semua");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "folder">("grid");

  // Form create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [judul, setJudul] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [sekbidAsal, setSekbidAsal] = useState<string>("semua");
  const [prokerId, setProkerId] = useState<string>("");
  const [deskripsi, setDeskripsi] = useState("");
  const [folderName, setFolderName] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileB64s, setFileB64s] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<DokumentasiPDD | null>(null);

  // Add file ke folder (multi foto/link)
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [addB64s, setAddB64s] = useState<string[]>([]);
  const [addDrive, setAddDrive] = useState("");
  const [addingToId, setAddingToId] = useState<number | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);

  const isPDD = user?.division_id === 9 || user?.group_name === "Trimitra" || user?.group_name === "Pembina";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dRes, pRes] = await Promise.allSettled([api.listDokumentasi(), api.listProkers()]);
      if (dRes.status === "fulfilled") setList(dRes.value.dokumentasi || []);
      if (pRes.status === "fulfilled") setProkers(pRes.value.prokers || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    let f = [...list];
    if (filterSekbid !== "semua") {
      if (filterSekbid === "null") f = f.filter((d) => d.sekbid_asal === null);
      else f = f.filter((d) => String(d.sekbid_asal) === filterSekbid);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter((d) => `${d.judul} ${d.kegiatan} ${d.deskripsi} ${d.lokasi} ${d.folder_name || ""}`.toLowerCase().includes(q));
    }
    setFiltered(f);
  }, [list, filterSekbid, search]);

  const resetForm = () => {
    setEditingId(null); setJudul(""); setKegiatan(""); setTanggal(""); setLokasi(""); setSekbidAsal("semua"); setProkerId(""); setDeskripsi(""); setFolderName(""); setDriveUrl(""); setFiles([]); setFileB64s([]);
  };

  const handleFilesMulti = (e: React.ChangeEvent<HTMLInputElement>, target: "form" | "add") => {
    const fs = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of fs) {
      if (f.size > 10 * 1024 * 1024) { alert(`${f.name} melebihi 10 MB, dilewati`); continue; }
      valid.push(f);
    }
    if (target === "form") {
      setFiles(valid);
      Promise.all(valid.map((f) => new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      }))).then(setFileB64s).catch(() => setFileB64s([]));
    } else {
      setAddFiles(valid);
      Promise.all(valid.map((f) => new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      }))).then(setAddB64s).catch(() => setAddB64s([]));
    }
  };

  const openEdit = (d: DokumentasiPDD) => {
    setEditingId(d.id);
    setJudul(d.judul);
    setKegiatan(d.kegiatan);
    setTanggal(new Date(d.tanggal_kegiatan).toISOString().slice(0,10));
    setLokasi(d.lokasi || "");
    setSekbidAsal(d.sekbid_asal ? String(d.sekbid_asal) : "semua");
    setProkerId(d.proker_id ? String(d.proker_id) : "");
    setDeskripsi(d.deskripsi || "");
    setFolderName(d.folder_name || "");
    setDriveUrl(d.drive_url || "");
    setShowModal(true);
    setSelected(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !kegiatan.trim() || !tanggal) { alert("Judul, Kegiatan, Tanggal wajib diisi"); return; }
    setSubmitting(true);
    try {
      const base: any = {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        kegiatan: kegiatan.trim(),
        tanggal_kegiatan: new Date(tanggal).toISOString(),
        lokasi: lokasi.trim(),
        sekbid_asal: sekbidAsal === "semua" ? null : Number(sekbidAsal),
        proker_id: prokerId ? Number(prokerId) : null,
        folder_name: folderName.trim() || null,
        drive_url: driveUrl.trim() || null,
      };
      if (editingId) {
        const updated = await api.updateDokumentasi(editingId, base);
        setList((prev)=>prev.map((d)=>d.id===updated.id?{...d,...updated}:d));
        alert(`Dokumentasi "${updated.judul}" berhasil diperbarui!`);
      } else {
        if (files.length > 0 && fileB64s.length > 0) {
          base.file_name = files[0].name;
          base.file_type = files[0].type || "application/octet-stream";
          base.file_data_b64 = fileB64s[0];
        }
        const res = await api.createDokumentasi(base);
        // Upload sisa file sebagai attachments
        for (let i = 1; i < files.length; i++) {
          try {
            await api.addDokumentasiFile(res.id, { file_name: files[i].name, file_type: files[i].type || "application/octet-stream", file_data_b64: fileB64s[i] });
          } catch {}
        }
        setList((prev)=>[res, ...prev]);
        alert(`Dokumentasi "${res.judul}" berhasil disimpan ke PDD!`);
      }
      setShowModal(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      alert("Gagal menyimpan dokumentasi: " + (err.message || "Unknown"));
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (d: DokumentasiPDD) => {
    if (!confirm(`Hapus dokumentasi "${d.judul}"? Semua foto di folder ikut terhapus.`)) return;
    try {
      await api.deleteDokumentasi(d.id);
      setList((prev)=>prev.filter((x)=>x.id!==d.id));
      setSelected(null);
      alert("Dokumentasi dihapus.");
    } catch (e:any) { alert("Gagal hapus: "+(e.message||"")); }
  };

  const handleAddFiles = async () => {
    if (!selected || addingToId !== selected.id) return;
    setAddingBusy(true);
    try {
      for (let i=0;i<addFiles.length;i++) {
        await api.addDokumentasiFile(selected.id, { file_name: addFiles[i].name, file_type: addFiles[i].type || "application/octet-stream", file_data_b64: addB64s[i] });
      }
      if (addDrive.trim()) {
        await api.addDokumentasiFile(selected.id, { file_name: "Link Google Drive", file_type: "text/uri-list", drive_url: addDrive.trim() });
      }
      setAddFiles([]); setAddB64s([]); setAddDrive("");
      const fresh = await api.getDokumentasi(selected.id);
      setSelected(fresh);
      fetchAll();
      alert("File/link berhasil ditambahkan ke folder!");
    } catch (e:any) { alert("Gagal tambah file: "+(e.message||"")); } finally { setAddingBusy(false); }
  };

  const handleDeleteAttachment = async (docId: number, attId: number) => {
    if (!confirm("Hapus file ini dari folder?")) return;
    try {
      await api.deleteDokumentasiFile(docId, attId);
      const fresh = await api.getDokumentasi(docId);
      setSelected(fresh);
      fetchAll();
    } catch (e:any) { alert("Gagal hapus file: "+(e.message||"")); }
  };

  // Group by folder untuk view mode folder
  const folders = filtered.reduce<Record<string, DokumentasiPDD[]>>((acc, d) => {
    const key = d.folder_name || "(Tanpa Folder)";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dokumentasi PDD</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Arsip pusat dokumentasi kegiatan. Setiap Sekbid bisa setor langsung — pilih Sekbid asal atau Semua. Bisa buat folder, upload banyak foto/video, atau tempel link Google Drive.
          </p>
          {isPDD && <span className="badge badge-success text-[10px] mt-2">Anda PDD / Trimitra / Pembina — kelola semua dokumentasi</span>}
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary text-sm">+ Tambah Dokumentasi</button>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-[var(--text-muted)]">Filter Sekbid Asal</label>
          <select value={filterSekbid} onChange={(e) => setFilterSekbid(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm">
            <option value="semua">Semua Sekbid</option>
            {SEKBID_OPTIONS.map((n) => <option key={n} value={String(n)}>SEKBID {n}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-[var(--text-muted)]">Cari</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul/kegiatan/folder..." className="input-field text-sm" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Tampilan</label>
          <select value={viewMode} onChange={(e)=>setViewMode(e.target.value as any)} className="input-field bg-[var(--bg-primary)] text-sm">
            <option value="grid">Grid</option>
            <option value="folder">Per Folder</option>
          </select>
        </div>
        <button onClick={fetchAll} className="btn-secondary text-xs">Refresh</button>
        <span className="text-xs text-[var(--text-muted)]">{filtered.length} item</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map((i)=><div key={i} className="glass-card p-5 animate-pulse h-32 bg-[var(--border)] rounded" />)}
        </div>
      ) : filtered.length===0 ? (
        <div className="glass-card p-12 text-center text-[var(--text-muted)]">
          <p className="text-2xl">📸</p>
          <p className="font-semibold mt-2">Belum ada dokumentasi</p>
          <p className="text-xs mt-1">Tambahkan kegiatan pertama — bisa upload banyak foto sekaligus atau link Drive.</p>
          <button onClick={()=>{resetForm();setShowModal(true);}} className="btn-primary text-xs mt-4">Tambah Dokumentasi</button>
        </div>
      ) : viewMode === "folder" ? (
        <div className="space-y-4">
          {Object.entries(folders).map(([folder, items]) => (
            <div key={folder} className="glass-card p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm">📁 {folder} <span className="badge badge-info text-[10px] ml-1">{items.length} dokumen</span></h3>
                <span className="text-xs text-[var(--text-muted)]">{new Date(items[0].tanggal_kegiatan).toLocaleDateString("id-ID")}</span>
              </div>
              <div className="space-y-2">
                {items.map((d)=>(
                  <div key={d.id} className="p-3 rounded border border-[var(--border)] bg-[var(--bg-primary)] cursor-pointer hover:border-[var(--accent)]/50" onClick={()=>setSelected(d)}>
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.judul}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{d.kegiatan} • {d.sekbid_asal ? `SEKBID ${d.sekbid_asal}` : "Umum"} • {(d.attachments?.length || 0)} file</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={(e)=>{e.stopPropagation();openEdit(d);}} className="btn-secondary text-[10px] py-1 px-2">Edit</button>
                        <button onClick={(e)=>{e.stopPropagation();handleDelete(d);}} className="btn-danger text-[10px] py-1 px-2">Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {filtered.map((d)=>(
            <div key={d.id} className="glass-card p-5 hover:border-[var(--accent)]/40 transition-all border cursor-pointer" onClick={()=>setSelected(d)}>
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="badge badge-info text-[10px]">{d.sekbid_asal ? `SEKBID ${d.sekbid_asal}` : "Umum"}{(d.attachments?.length||0)>0 && ` • 📁 ${(d.attachments?.length||0)+1} file`}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{new Date(d.tanggal_kegiatan).toLocaleDateString("id-ID")}</span>
              </div>
              {d.folder_name && <p className="text-[10px] text-[var(--accent)] mb-1">📁 {d.folder_name}</p>}
              <h3 className="font-bold text-sm line-clamp-2">{d.judul}</h3>
              <p className="text-xs text-[var(--accent)] mt-1">🎬 {d.kegiatan} • 📍 {d.lokasi || "-"}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{d.deskripsi || "Tidak ada deskripsi"}</p>
              <div className="mt-3">
                {(() => {
                  const firstAtt = d.attachments?.[0];
                  const previewUrl = firstAtt?.file_url || d.file_url;
                  const previewType = firstAtt?.file_type || d.file_type;
                  const previewName = firstAtt?.file_name || d.file_name;
                  if (!previewUrl) return null;
                  if (previewType?.startsWith("image/")) return <img src={previewUrl.startsWith("data:")?previewUrl:fileUrl(previewUrl)} alt={previewName||""} className="w-full h-32 object-cover rounded border" />;
                  if (previewType?.startsWith("video/")) return <video src={previewUrl.startsWith("data:")?previewUrl:fileUrl(previewUrl)} controls className="w-full h-32 rounded border" />;
                  return <a href={previewUrl.startsWith("http")?previewUrl:fileUrl(previewUrl)} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="text-xs text-[var(--accent)] hover:underline">📄 {previewName}</a>;
                })()}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)]">Oleh {d.dibuat_oleh}{d.drive_url ? " • 🔗 ada link" : ""}</span>
                <div className="flex gap-1" onClick={(e)=>e.stopPropagation()}>
                  <button onClick={()=>openEdit(d)} className="btn-secondary text-[10px] py-1 px-2">Edit</button>
                  <button onClick={()=>handleDelete(d)} className="btn-danger text-[10px] py-1 px-2">Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal dengan folder multi-file */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setSelected(null)}>
          <div className="glass-card p-6 w-full max-w-xl space-y-4 max-h-[88vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg pr-2">{selected.judul}</h3>
                {selected.folder_name && <p className="text-xs text-[var(--accent)]">📁 {selected.folder_name}</p>}
              </div>
              <button onClick={()=>setSelected(null)} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>🎬 {selected.kegiatan} • 📍 {selected.lokasi} • 🗓️ {new Date(selected.tanggal_kegiatan).toLocaleDateString("id-ID")}</p>
              <p>Asal: {selected.sekbid_asal ? `SEKBID ${selected.sekbid_asal}` : "Semua Sekbid (Umum)"} • Oleh {selected.dibuat_oleh}</p>
            </div>
            <p className="text-sm whitespace-pre-line p-3 bg-[var(--bg-primary)] rounded border">{selected.deskripsi || "Tidak ada deskripsi"}</p>

            {/* File utama */}
            {selected.file_url && (
              <div>
                <p className="text-xs font-semibold mb-2">Foto Utama</p>
                {selected.file_type?.startsWith("image/") ? <img src={selected.file_url.startsWith("data:")?selected.file_url:fileUrl(selected.file_url)} alt="" className="w-full rounded border" /> :
                 selected.file_type?.startsWith("video/") ? <video src={selected.file_url.startsWith("data:")?selected.file_url:fileUrl(selected.file_url)} controls className="w-full rounded border" /> :
                 <a href={selected.file_url.startsWith("http")?selected.file_url:fileUrl(selected.file_url)} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent)] hover:underline">📥 {selected.file_name}</a>}
              </div>
            )}

            {/* Link Drive utama */}
            {selected.drive_url && (
              <a href={selected.drive_url} target="_blank" rel="noreferrer" className="block p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/20 transition-all">
                🔗 Buka Link Google Drive
              </a>
            )}

            {/* Attachments folder */}
            {(selected.attachments?.length || 0) > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2">📁 Isi Folder ({selected.attachments!.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selected.attachments!.map((att)=>(
                    <div key={att.id} className="relative group rounded border overflow-hidden bg-[var(--bg-primary)]">
                      <a href={att.drive_url || (att.file_url && !att.file_url.startsWith("data:") ? fileUrl(att.file_url) : att.file_url || "#")} target="_blank" rel="noreferrer" className="block">
                        {att.file_type?.startsWith("image/") && att.file_url ? (
                          <img src={att.file_url.startsWith("data:")?att.file_url:fileUrl(att.file_url)} alt={att.file_name} className="w-full h-24 object-cover" />
                        ) : att.file_type?.startsWith("video/") && att.file_url ? (
                          <video src={att.file_url.startsWith("data:")?att.file_url:fileUrl(att.file_url)} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-2xl">{att.drive_url?"🔗":"📄"}</div>
                        )}
                        <p className="text-[10px] px-2 py-1.5 truncate text-[var(--accent)]">{att.file_name}</p>
                      </a>
                      <button onClick={()=>handleDeleteAttachment(selected.id, att.id)} className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded opacity-80 hover:opacity-100">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tambah file/link ke folder */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold">➕ Tambah Foto/File/Link ke Folder</p>
              <input type="file" multiple accept="image/*,video/*,.pdf" onChange={(e)=>handleFilesMulti(e,"add")} className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[var(--accent)] file:text-white" />
              {addFiles.length > 0 && <p className="text-[10px] text-emerald-400">✓ {addFiles.length} file siap diunggah</p>}
              <input type="url" value={addDrive} onChange={(e)=>setAddDrive(e.target.value)} placeholder="Atau paste link Google Drive..." className="input-field text-xs" />
              <button onClick={handleAddFiles} disabled={addingBusy || (addFiles.length===0 && !addDrive.trim())} className="btn-primary text-xs w-full justify-center">
                {addingBusy ? "Menambahkan..." : "Tambahkan ke Folder"}
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <button onClick={()=>openEdit(selected)} className="btn-secondary text-xs flex-1 justify-center">✏️ Edit Data</button>
              <button onClick={()=>handleDelete(selected)} className="btn-danger text-xs flex-1 justify-center">🗑️ Hapus Dokumentasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">{editingId ? "Edit Dokumentasi" : "Tambah Dokumentasi ke PDD"}</h3>
            <p className="text-xs text-[var(--text-muted)]">Isi data kegiatan, buat nama folder untuk mengelompokkan foto/video, atau tempel link Google Drive.</p>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Judul Dokumentasi *</label>
                <input type="text" value={judul} onChange={(e)=>setJudul(e.target.value)} placeholder="Dokumentasi Lomba 17 Agustus" className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nama Kegiatan *</label>
                <input type="text" value={kegiatan} onChange={(e)=>setKegiatan(e.target.value)} placeholder="Lomba Panjat Pinang" className="input-field text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tanggal Kegiatan *</label>
                  <input type="date" value={tanggal} onChange={(e)=>setTanggal(e.target.value)} className="input-field text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Lokasi</label>
                  <input type="text" value={lokasi} onChange={(e)=>setLokasi(e.target.value)} placeholder="Lapangan Sekolah" className="input-field text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Sekbid Asal *</label>
                  <select value={sekbidAsal} onChange={(e)=>setSekbidAsal(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm">
                    <option value="semua">Semua Sekbid (Umum)</option>
                    {SEKBID_OPTIONS.map((n)=><option key={n} value={String(n)}>SEKBID {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nama Folder</label>
                  <input type="text" value={folderName} onChange={(e)=>setFolderName(e.target.value)} placeholder="Contoh: Classmeeting 2026" className="input-field text-sm" />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Foto-video lain bisa ditambahkan ke folder ini setelah disimpan.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Proker (opsional)</label>
                <select value={prokerId} onChange={(e)=>setProkerId(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm">
                  <option value="">Tanpa Proker</option>
                  {prokers.map((p)=><option key={p.proker_id} value={String(p.proker_id)}>{p.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Deskripsi</label>
                <textarea value={deskripsi} onChange={(e)=>setDeskripsi(e.target.value)} placeholder="Ringkasan kegiatan, hasil, peserta..." className="input-field text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Link Google Drive (opsional)</label>
                <input type="url" value={driveUrl} onChange={(e)=>setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." className="input-field text-sm" />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-xs font-medium mb-1">Upload Foto/Video/PDF (bisa lebih dari satu, masing-masing max 10MB)</label>
                  <input type="file" multiple accept="image/*,video/*,.pdf" onChange={(e)=>handleFilesMulti(e,"form")} className="block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-[var(--accent)] file:text-white" />
                  {files.length > 0 && <p className="text-xs text-emerald-400 mt-1">✓ {files.length} file siap diunggah ({files.map(f=>f.name).join(", ").slice(0,60)}...)</p>}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary text-xs">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">{submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan ke PDD"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
