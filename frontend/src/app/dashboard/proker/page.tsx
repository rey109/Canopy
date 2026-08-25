"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { canCreateProker, canMutate, getRoleGroup } from "@/lib/role-access";

// TypeScript Interfaces for Trimitra Proker Management
export interface Milestone {
  id: number;
  name: string;
  done: boolean;
}

export interface PembinaanNote {
  id: number | string;
  author: string;
  role: string;
  date: string;
  text: string;
}

export interface ProkerData {
  id: number;
  nama: string;
  divisiId: number;
  divisiName: string;
  ketuaDivisi: string;
  status: "Belum Dimulai" | "Berjalan" | "Evaluasi LPJ" | "Selesai";
  progress: number; // 0 - 100
  lpjStatus: "Belum Mengajukan" | "Draft LPJ" | "Menunggu Persetujuan Trimitra" | "Disetujui" | "Perlu Revisi";
  anggaran: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  deskripsi: string;
  milestones: Milestone[];
  catatanPembinaan: PembinaanNote[];
}

// Initial Proker Data starts empty per user request
const initialProkerData: ProkerData[] = [];

export default function ProkerPage() {
  const { user } = useAuth();
  const [prokerList, setProkerList] = useState<ProkerData[]>([]);
  const [selectedDivisi, setSelectedDivisi] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProker, setSelectedProker] = useState<ProkerData | null>(null);

  // Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [prokerToDelete, setProkerToDelete] = useState<ProkerData | null>(null);

  // Form Fields State for Creating Proker
  const [newNama, setNewNama] = useState<string>("");
  const [newDivisiName, setNewDivisiName] = useState<string>("Divisi 1 - Keagamaan");
  const [newKetuaDivisi, setNewKetuaDivisi] = useState<string>("");
  const [newAnggaran, setNewAnggaran] = useState<string>("");
  const [newTanggalMulai, setNewTanggalMulai] = useState<string>("2026-09-01");
  const [newTanggalSelesai, setNewTanggalSelesai] = useState<string>("2026-09-15");
  const [newDeskripsi, setNewDeskripsi] = useState<string>("");

  // New feedback note form state
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [swalToast, setSwalToast] = useState<{ title: string; message: string; type?: "success" | "delete" } | null>(null);

  const loadProkers = async () => {
    try {
      const response = await api.listProkers();
      setProkerList(response.prokers.map((proker) => ({
        id: proker.proker_id,
        nama: proker.nama,
        divisiId: proker.division_id || 0,
        divisiName: proker.division_id ? `Sekbid ${proker.division_id}` : "Organisasi",
        ketuaDivisi: proker.penanggung_jawab || "Belum ditentukan",
        status: proker.status === "Belum Mulai" ? "Belum Dimulai" : proker.status as ProkerData["status"],
        progress: 0,
        lpjStatus: "Belum Mengajukan",
        anggaran: proker.anggaran_disetujui,
        tanggalMulai: proker.tanggal_mulai,
        tanggalSelesai: proker.tanggal_selesai,
        deskripsi: proker.deskripsi,
        milestones: [],
        catatanPembinaan: [],
      })));
    } catch {
      setProkerList([]);
    }
  };

  useEffect(() => { void loadProkers(); }, [user]);

  const saveProkerList = (newList: ProkerData[]) => {
    setProkerList(newList);
  };

  // Toast alert trigger (SweetAlert style)
  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setSwalToast({ title, message, type });
    setTimeout(() => {
      setSwalToast(null);
    }, 2800);
  };

  // Handler to Create New Proker
  const handleCreateProker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    // Extract division ID from string
    const matchDivId = newDivisiName.match(/\d+/);
    const divId = matchDivId ? parseInt(matchDivId[0], 10) : 0;

    const created: ProkerData = {
      id: Date.now(),
      nama: newNama.trim(),
      divisiId: divId,
      divisiName: newDivisiName,
      ketuaDivisi: newKetuaDivisi.trim() || `${user?.nama || "User"} (Kadiv ${divId || "BPH"})`,
      status: "Belum Dimulai",
      progress: 0,
      lpjStatus: "Belum Mengajukan",
      anggaran: Number(newAnggaran) || 1500000,
      tanggalMulai: newTanggalMulai || "2026-09-01",
      tanggalSelesai: newTanggalSelesai || "2026-09-15",
      deskripsi: newDeskripsi.trim() || "Program kerja organisasi OSIS.",
      milestones: [
        { id: 1, name: "Penyusunan Proposal & Perizinan", done: false },
        { id: 2, name: "Persiapan Tempat & Perlengkapan", done: false },
        { id: 3, name: "Pelaksanaan Event Utama", done: false },
        { id: 4, name: "Penyusunan LPJ Final", done: false },
      ],
      catatanPembinaan: [],
    };

    void api.createProker({
      nama: created.nama,
      deskripsi: created.deskripsi,
      division_id: created.divisiId || undefined,
      anggaran_disetujui: created.anggaran,
      penanggung_jawab: created.ketuaDivisi,
      tanggal_mulai: created.tanggalMulai,
      tanggal_selesai: created.tanggalSelesai,
    }).then(() => loadProkers()).catch((error: unknown) => alert(error instanceof Error ? error.message : "Gagal membuat program kerja."));
    setIsAddModalOpen(false);

    // Reset Form
    setNewNama("");
    setNewKetuaDivisi("");
    setNewAnggaran("");
    setNewDeskripsi("");

    showSwalAlert("Berhasil Ditambahkan!", "Program kerja baru telah berhasil dibuat dan disimpan.", "success");
  };

  // Handler to Delete Proker
  const handleDeleteProker = (id: number) => {
    void api.updateProkerStatus(id, "Dibatalkan").then(() => loadProkers()).catch((error: unknown) => alert(error instanceof Error ? error.message : "Gagal membatalkan program kerja."));
    setSelectedProker(null);
    setProkerToDelete(null);
    showSwalAlert("Berhasil Dihapus!", "Program kerja telah dihapus dari sistem.", "delete");
  };

  // Handler to submit Catatan Pembinaan by Ketua Trimitra
  const handleAddCatatanPembinaan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProker || !feedbackInput.trim()) return;

    const newNote: PembinaanNote = {
      id: Date.now(),
      author: user?.nama || "Reyhan Prasetya",
      role: "Ketua Trimitra",
      date: new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: feedbackInput.trim(),
    };

    const updatedProker: ProkerData = {
      ...selectedProker,
      catatanPembinaan: [newNote, ...selectedProker.catatanPembinaan],
    };

    const updatedList = prokerList.map((p) =>
      p.id === selectedProker.id ? updatedProker : p
    );

    saveProkerList(updatedList);
    setSelectedProker(updatedProker);
    setFeedbackInput("");
    showSwalAlert("Catatan Pembinaan Terkirim!", "Feedback dan arahan khusus telah berhasil disampaikan kepada Ketua Divisi.", "success");
  };

  const roleGroup = getRoleGroup(user);
  const canManageProker = canCreateProker(user);
  const canProvideCoaching = roleGroup === "Trimitra" || roleGroup === "Pembina";
  const isReadOnly = !canMutate(user);

  // Filtered List Logic
  const filteredProkers = prokerList.filter((p) => {
    const withinScope = user?.scope_divisi_awal == null || p.divisiId >= (user.scope_divisi_awal || 0) && p.divisiId <= (user.scope_divisi_akhir || 0);
    const involved = roleGroup === "Staf" ? p.milestones.some((milestone) => milestone.name.toLowerCase().includes((user?.nama || "").toLowerCase())) : true;
    const matchDivisi =
      selectedDivisi === "All" ||
      p.divisiName.toLowerCase().includes(selectedDivisi.toLowerCase()) ||
      (selectedDivisi === "BPH" && p.divisiName.includes("BPH"));

    const matchStatus =
      selectedStatus === "All" || p.status === selectedStatus;

    const matchSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.divisiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ketuaDivisi.toLowerCase().includes(searchQuery.toLowerCase());

    return withinScope && involved && matchDivisi && matchStatus && matchSearch;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Summary Metrics
  const totalProker = prokerList.length;
  const runningProker = prokerList.filter((p) => p.status === "Berjalan").length;
  const evalProker = prokerList.filter((p) => p.status === "Evaluasi LPJ").length;
  const totalAnggaran = prokerList.reduce((acc, curr) => acc + curr.anggaran, 0);

  return (
    <div className="space-y-8 animate-fade-in text-slate-100 font-sans pb-12">
      {/* 1. HEADER SECTION (ROLE: KETUA TRIMITRA + TAMBAH PROKER BUTTON) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-blue-400 uppercase">
             <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
             Scope {user?.scope_divisi_awal == null ? "Organisasi penuh" : `Divisi ${user?.division_id || user?.scope_divisi_awal}`} • Role: {user?.role_name || roleGroup}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-slate-50">
            Monitoring Program Kerja Organisasi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5 max-w-2xl">
             {isReadOnly ? "Lihat ringkasan program kerja yang relevan dengan keterlibatanmu." : "Kelola progres program kerja, task, anggaran, dan dokumen sesuai scope jabatanmu."}
          </p>
        </div>

         {/* Tombol Buat Proker Baru */}
         <div>
           {canManageProker && (
           <button
             onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span>
            <span>Buat Proker Baru</span>
           </button>
           )}
         </div>
       </div>


      {/* 2. SUMMARY METRICS (GRID 4 KOLOM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Proker</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              📋
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-100 mt-2">{totalProker}</p>
          <p className="text-[11px] text-slate-500 mt-1">Seluruh divisi 1-10 + BPH</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Sedang Berjalan</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              ⚡
            </div>
          </div>
          <p className="text-3xl font-extrabold text-cyan-400 mt-2">{runningProker}</p>
          <p className="text-[11px] text-slate-500 mt-1">Dalam tahap eksekusi lapangan</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluasi LPJ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              ⏳
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{evalProker}</p>
          <p className="text-[11px] text-slate-500 mt-1">Butuh verifikasi & persetujuan</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Anggaran</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              💰
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2 truncate">
            {formatCurrency(totalAnggaran)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Akumulasi anggaran disetujui</p>
        </div>
      </div>

      {/* 3. FILTER & SEARCH TOOLBAR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama proker, divisi, atau Kadiv..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Divisi Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Divisi:</span>
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Semua Divisi (1–10)</option>
                <option value="Divisi 1">Divisi 1 - Keagamaan</option>
                <option value="Divisi 2">Divisi 2 - Budi Pekerti & Karakter</option>
                <option value="Divisi 3">Divisi 3 - Kepemimpinan & Kebangsaan</option>
                <option value="Divisi 4">Divisi 4 - Prestasi & Akademik</option>
                <option value="Divisi 5">Divisi 5 - Demokrasi & Hak Asasi</option>
                <option value="Divisi 6">Divisi 6 - Kewirausahaan & Ekonomi</option>
                <option value="Divisi 7">Divisi 7 - Kesehatan & Olahraga</option>
                <option value="Divisi 8">Divisi 8 - Sastra & Budaya</option>
                <option value="Divisi 9">Divisi 9 - Teknologi & Informasi</option>
                <option value="Divisi 10">Divisi 10 - Bahasa Asing</option>
                <option value="BPH">BPH (Badan Pengurus Harian)</option>
              </select>
            </div>

            {/* Status Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl p-2 focus:outline-none focus:border-blue-500"
              >
                <option value="All">Semua Status</option>
                <option value="Belum Dimulai">Belum Dimulai</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Evaluasi LPJ">Evaluasi LPJ</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PROKER LIST (GRID SYSTEM) */}
      {filteredProkers.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="text-4xl">📂</div>
          <h3 className="text-base font-semibold text-slate-200">Belum Ada Program Kerja Terdaftar</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Klik tombol <strong>"+ Buat Proker Baru"</strong> di atas untuk membuat program kerja pertama organisasi Anda.
          </p>
           {canManageProker && (
             <button
               onClick={() => setIsAddModalOpen(true)}
               className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all inline-block mt-2"
             >
               + Buat Proker Baru
             </button>
           )}

        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProkers.map((p) => {
            const completedMilestones = p.milestones.filter((m) => m.done).length;
            const totalMilestones = p.milestones.length;

            return (
              <div
                key={p.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Divisi Badge & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {p.divisiName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Status Proker Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          p.status === "Berjalan"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : p.status === "Evaluasi LPJ"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : p.status === "Selesai"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Proker Title & Ketua Divisi */}
                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                      {p.nama}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>👤</span>
                      <span>PIC: <strong>{p.ketuaDivisi}</strong></span>
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {p.deskripsi}
                  </p>

                  {/* Progress Bar & Milestones */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Progres Kegiatan</span>
                      <span className="text-blue-400">{p.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Milestones: <strong>{completedMilestones}/{totalMilestones} Selesai</strong></span>
                      <span>LPJ: <strong className="text-slate-300">{p.lpjStatus}</strong></span>
                    </div>
                  </div>

                  {/* Footer Meta & Anggaran */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <div>
                      <span>Anggaran: </span>
                      <strong className="text-emerald-400 font-mono">{formatCurrency(p.anggaran)}</strong>
                    </div>
                    <div className="text-[11px]">
                      <span>🗓️ {p.tanggalMulai}</span>
                    </div>
                  </div>

                  {/* Catatan Pembinaan Badge Summary */}
                  {p.catatanPembinaan.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>💬</span>
                        <span>{p.catatanPembinaan.length} Catatan Pembinaan Trimitra</span>
                      </span>
                      <span className="font-mono text-[10px] text-amber-400">Aktif</span>
                    </div>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-4 mt-2 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedProker(p)}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <span>Detail & Pembinaan Trimitra</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. FORM MODAL: TAMBAH PROKER BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-modal-pop">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>✨ Buat Program Kerja Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProker} className="space-y-4 text-xs">
              {/* Nama Program Kerja */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Program Kerja <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Misal: Classmeeting Semester I / Canopy Fest..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Divisi & PIC Kadiv */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Divisi Penanggung Jawab</label>
                  <select
                    value={newDivisiName}
                    onChange={(e) => setNewDivisiName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="Divisi 1 - Keagamaan">Divisi 1 - Keagamaan</option>
                    <option value="Divisi 2 - Budi Pekerti & Karakter">Divisi 2 - Budi Pekerti</option>
                    <option value="Divisi 3 - Kepemimpinan & Kebangsaan">Divisi 3 - Kepemimpinan</option>
                    <option value="Divisi 4 - Prestasi & Akademik">Divisi 4 - Prestasi</option>
                    <option value="Divisi 5 - Demokrasi & Hak Asasi">Divisi 5 - Demokrasi</option>
                    <option value="Divisi 6 - Kewirausahaan & Ekonomi">Divisi 6 - Kewirausahaan</option>
                    <option value="Divisi 7 - Kesehatan & Olahraga">Divisi 7 - Kesehatan</option>
                    <option value="Divisi 8 - Sastra & Budaya">Divisi 8 - Sastra & Budaya</option>
                    <option value="Divisi 9 - Teknologi & Informasi">Divisi 9 - Teknologi</option>
                    <option value="Divisi 10 - Bahasa Asing">Divisi 10 - Bahasa Asing</option>
                    <option value="BPH (Badan Pengurus Harian)">BPH (Pengurus Harian)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Ketua Divisi / PIC</label>
                  <input
                    type="text"
                    value={newKetuaDivisi}
                    onChange={(e) => setNewKetuaDivisi(e.target.value)}
                    placeholder="Nama Ketua Divisi..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Anggaran & Linimasa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={newAnggaran}
                    onChange={(e) => setNewAnggaran(e.target.value)}
                    placeholder="1500000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mulai</label>
                  <input
                    type="date"
                    value={newTanggalMulai}
                    onChange={(e) => setNewTanggalMulai(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Selesai</label>
                  <input
                    type="date"
                    value={newTanggalSelesai}
                    onChange={(e) => setNewTanggalSelesai(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Deskripsi Lengkap Kegiatan</label>
                <textarea
                  rows={3}
                  value={newDeskripsi}
                  onChange={(e) => setNewDeskripsi(e.target.value)}
                  placeholder="Jelaskan tujuan, sasaran, dan hasil yang diharapkan..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none resize-none"
                ></textarea>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Simpan Program Kerja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INTERACTIVE DETAIL & CATATAN PEMBINAAN MODAL */}
      {selectedProker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-modal-pop max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                  {selectedProker.divisiName}
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-1">
                  {selectedProker.nama}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ketua Divisi / PIC: <strong className="text-slate-200">{selectedProker.ketuaDivisi}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedProker(null)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Proker Status & Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Status Proker</span>
                <span className="font-bold text-cyan-400 mt-0.5 block">{selectedProker.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Status LPJ</span>
                <span className="font-bold text-amber-400 mt-0.5 block">{selectedProker.lpjStatus}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Anggaran Disetujui</span>
                <span className="font-bold text-emerald-400 font-mono mt-0.5 block">
                  {formatCurrency(selectedProker.anggaran)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Linimasa</span>
                <span className="font-bold text-slate-300 mt-0.5 block text-[11px]">
                  {selectedProker.tanggalMulai}
                </span>
              </div>
            </div>

            {/* Proker Description */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-1">Deskripsi & Tujuan Program:</h4>
              <p className="text-xs text-slate-400 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedProker.deskripsi}
              </p>
            </div>

            {/* Milestones Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Checklist Milestone Proker:</span>
                <span className="text-blue-400 font-bold">{selectedProker.progress}% Selesai</span>
              </h4>
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                {selectedProker.milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                      m.done
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{m.done ? "✅" : "⏳"}</span>
                      <span className={m.done ? "line-through opacity-80" : ""}>{m.name}</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950">
                      {m.done ? "Selesai" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* INTERACTIVE SECTION: CATATAN PEMBINAAN / FEEDBACK TRIMITRA */}
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>💬 Catatan Pembinaan & Feedback Trimitra</span>
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {selectedProker.catatanPembinaan.length} Arahan
                </span>
              </div>

              {/* Form Input Catatan Baru */}
               {canProvideCoaching && (
               <form onSubmit={handleAddCatatanPembinaan} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">

                <label className="block text-xs font-semibold text-slate-300">
                  Tulis Arahan / Catatan Evaluasi untuk Ketua Divisi:
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Misal: Harap tindak lanjuti perizinan tempat H-3 dan laporkan rincian sisa kas ke Bendahara..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  required
                ></textarea>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                  >
                    <span>Kirim Catatan Pembinaan</span>
                    <span>➔</span>
                  </button>
                </div>
               </form>
               )}

               {/* Existing Feedback Notes Timeline */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedProker.catatanPembinaan.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                    Belum ada catatan pembinaan dari Trimitra untuk proker ini.
                  </div>
                ) : (
                  selectedProker.catatanPembinaan.map((note) => (
                    <div
                      key={note.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 shadow"
                    >
                      <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-400">{note.author}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {note.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{note.date}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-1">
                        "{note.text}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
               {canManageProker && (
                 <button
                   onClick={() => setProkerToDelete(selectedProker)}
                   className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                 >
                   🗑️ Hapus Proker
                 </button>
               )}

              <button
                onClick={() => setSelectedProker(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: HAPUS PROKER */}
      {prokerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Hapus Program Kerja Ini?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <p className="font-semibold text-slate-200">{prokerToDelete.nama}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{prokerToDelete.divisiName}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setProkerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteProker(prokerToDelete.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Ya, Hapus Proker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SWEETALERT STYLE POPUP ALERT */}
      {swalToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-modal-backdrop pointer-events-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-w-sm w-full space-y-3 animate-swal-pop pointer-events-auto">
            {swalToast.type === "delete" ? (
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 animate-swal-icon shadow-lg shadow-rose-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-swal-icon shadow-lg shadow-emerald-500/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <h3 className="text-base font-bold text-slate-100 mt-1">{swalToast.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{swalToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
