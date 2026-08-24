"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// Member Data TypeScript Interface
export interface MemberData {
  id: number | string;
  nis: string;
  nama: string;
  divisiName: string;
  angkatan: number; // 2024, 2025, 2026
  roleName: string; // Trimitra, Kepala Divisi, Sekretaris, Bendahara, Staf, Pembina
}

// Initial Data
const initialMembersData: MemberData[] = [
  {
    id: 1,
    nis: "20251001",
    nama: "Reyhan Prasetya Utama",
    divisiName: "BPH (Badan Pengurus Harian)",
    angkatan: 2025,
    roleName: "Ketua Trimitra",
  },
  {
    id: 2,
    nis: "20251002",
    nama: "Ahmad Syauqi M.",
    divisiName: "Divisi 1 - Keagamaan",
    angkatan: 2025,
    roleName: "Kepala Divisi",
  },
  {
    id: 3,
    nis: "20251003",
    nama: "Siti Rahma Azzahra",
    divisiName: "BPH (Badan Pengurus Harian)",
    angkatan: 2025,
    roleName: "Sekretaris",
  },
  {
    id: 4,
    nis: "20251004",
    nama: "Ahmad Rizky Pratama",
    divisiName: "BPH (Badan Pengurus Harian)",
    angkatan: 2025,
    roleName: "Bendahara",
  },
  {
    id: 5,
    nis: "20251005",
    nama: "Rian Febrian",
    divisiName: "Divisi 3 - Kepemimpinan & Kebangsaan",
    angkatan: 2025,
    roleName: "Kepala Divisi",
  },
  {
    id: 6,
    nis: "20251006",
    nama: "Dewi Lestari",
    divisiName: "Divisi 7 - Kesehatan & Olahraga",
    angkatan: 2025,
    roleName: "Kepala Divisi",
  },
  {
    id: 7,
    nis: "20251007",
    nama: "Fikri Ardiansyah",
    divisiName: "Divisi 9 - Teknologi & Informasi",
    angkatan: 2025,
    roleName: "Kepala Divisi",
  },
  {
    id: 8,
    nis: "20251008",
    nama: "Nadia Putri Ramadhani",
    divisiName: "Divisi 10 - Bahasa Asing",
    angkatan: 2025,
    roleName: "Kepala Divisi",
  },
  {
    id: 9,
    nis: "20261009",
    nama: "Dion Syahputra",
    divisiName: "Divisi 9 - Teknologi & Informasi",
    angkatan: 2026,
    roleName: "Staf",
  },
  {
    id: 10,
    nis: "20261010",
    nama: "Clarissa Valery",
    divisiName: "Divisi 10 - Bahasa Asing",
    angkatan: 2026,
    roleName: "Staf",
  },
  {
    id: 11,
    nis: "20241011",
    nama: "Maya Anggraini",
    divisiName: "BPH (Badan Pengurus Harian)",
    angkatan: 2024,
    roleName: "Ketua Trimitra",
  },
  {
    id: 12,
    nis: "19850101",
    nama: "Budi Santoso, S.Pd.",
    divisiName: "BPH (Badan Pengurus Harian)",
    angkatan: 2024,
    roleName: "Pembina",
  },
];

export default function MemberPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberData[]>([]);

  // Filter States: Anggota (Search), Divisi, Angkatan, Role
  const [searchName, setSearchName] = useState<string>("");
  const [selectedDivisi, setSelectedDivisi] = useState<string>("All");
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>("All");
  const [selectedRole, setSelectedRole] = useState<string>("All");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberData | null>(null);

  // Form Fields for Add Member
  const [newNama, setNewNama] = useState<string>("");
  const [newDivisiName, setNewDivisiName] = useState<string>("Divisi 1 - Keagamaan");
  const [newAngkatan, setNewAngkatan] = useState<number>(2026);
  const [newRoleName, setNewRoleName] = useState<string>("Staf");

  // SweetAlert style Toast State
  const [swalToast, setSwalToast] = useState<{ title: string; message: string; type?: "success" | "delete" } | null>(null);

  // Load members strictly from localStorage or initial dummy with robust normalization
  useEffect(() => {
    try {
      const saved = localStorage.getItem("canopy_members_data");
      if (saved !== null) {
        const parsed: any[] = JSON.parse(saved);
        const normalized: MemberData[] = parsed.map((m, idx) => ({
          id: m.id || idx + 1,
          nis: m.nis || `2025${1000 + idx}`,
          nama: m.nama || "Anggota",
          divisiName: m.divisiName || m.divisi_name || "Divisi 1 - Keagamaan",
          angkatan: Number(m.angkatan) || 2025,
          roleName: m.roleName || m.jabatan || m.groupName || m.role_name || "Staf",
        }));
        setMembers(normalized);
        localStorage.setItem("canopy_members_data", JSON.stringify(normalized));
      } else {
        setMembers(initialMembersData);
        localStorage.setItem("canopy_members_data", JSON.stringify(initialMembersData));
      }
    } catch (e) {
      console.error("Failed to load member data", e);
      setMembers(initialMembersData);
    }
  }, []);

  // Save helper to persist members data
  const saveMembersData = (newList: MemberData[]) => {
    setMembers(newList);
    try {
      localStorage.setItem("canopy_members_data", JSON.stringify(newList));
    } catch (e) {
      console.error("Failed to save member data to localStorage", e);
    }
  };

  // Toast alert trigger
  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setSwalToast({ title, message, type });
    setTimeout(() => {
      setSwalToast(null);
    }, 2800);
  };

  // Handler to Create Member
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const created: MemberData = {
      id: Date.now(),
      nis: `2026${Math.floor(1000 + Math.random() * 9000)}`,
      nama: newNama.trim(),
      divisiName: newDivisiName,
      angkatan: newAngkatan,
      roleName: newRoleName,
    };

    const updatedList = [created, ...members];
    saveMembersData(updatedList);
    setIsAddModalOpen(false);

    // Reset Form
    setNewNama("");

    showSwalAlert("Berhasil Ditambahkan!", "Anggota baru telah berhasil ditambahkan.", "success");
  };

  // Handler to Delete Member
  const handleDeleteMember = (id: number | string) => {
    const updatedList = members.filter((m) => m.id !== id);
    saveMembersData(updatedList);
    setMemberToDelete(null);
    showSwalAlert("Berhasil Dihapus!", "Data anggota telah dihapus.", "delete");
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Role Badge Styling (Uniform theme styling for all roles)
  const getRoleBadgeStyle = () => {
    return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  };

  // Filter Logic (Search Name, Divisi, Angkatan, Role)
  const filteredMembers = members.filter((m) => {
    const roleText = m.roleName || "Staf";

    const matchName =
      searchName === "" ||
      m.nama.toLowerCase().includes(searchName.toLowerCase()) ||
      m.nis.includes(searchName);

    const matchDivisi =
      selectedDivisi === "All" ||
      m.divisiName.toLowerCase().includes(selectedDivisi.toLowerCase()) ||
      (selectedDivisi === "BPH" && m.divisiName.includes("BPH"));

    const matchAngkatan =
      selectedAngkatan === "All" || m.angkatan === parseInt(selectedAngkatan, 10);

    const matchRole =
      selectedRole === "All" ||
      roleText.toLowerCase().includes(selectedRole.toLowerCase());

    return matchName && matchDivisi && matchAngkatan && matchRole;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans pb-12">
      {/* 1. TOP HEADER BAR: TITLE & CREATE NEW BUTTON */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
          Anggota
        </h1>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Tambah Anggota</span>
        </button>
      </div>

      {/* 2. TOP FILTER BANNER CARD (EXACT LAYOUT AS IN REFERENCE IMAGE) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-rose-400/90">
          Filter Anggota
        </h2>

        {/* 4 FILTERS HORIZONTAL GRID: Anggota (Search), Divisi, Angkatan, Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* FILTER 1: Anggota (Search Box) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Anggota
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Cari nama anggota..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FILTER 2: Divisi */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Divisi
            </label>
            <select
              value={selectedDivisi}
              onChange={(e) => setSelectedDivisi(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">Semua Divisi</option>
              <option value="BPH">BPH (Badan Pengurus Harian)</option>
              <option value="Divisi 1">Divisi 1 - Keagamaan</option>
              <option value="Divisi 2">Divisi 2 - Budi Pekerti</option>
              <option value="Divisi 3">Divisi 3 - Kepemimpinan</option>
              <option value="Divisi 4">Divisi 4 - Prestasi</option>
              <option value="Divisi 5">Divisi 5 - Demokrasi</option>
              <option value="Divisi 6">Divisi 6 - Kewirausahaan</option>
              <option value="Divisi 7">Divisi 7 - Kesehatan</option>
              <option value="Divisi 8">Divisi 8 - Sastra & Budaya</option>
              <option value="Divisi 9">Divisi 9 - Teknologi</option>
              <option value="Divisi 10">Divisi 10 - Bahasa Asing</option>
            </select>
          </div>

          {/* FILTER 3: Angkatan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Angkatan
            </label>
            <select
              value={selectedAngkatan}
              onChange={(e) => setSelectedAngkatan(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">Semua Angkatan</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* FILTER 4: Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="All">Semua Role</option>
              <option value="Ketua Trimitra">Ketua Trimitra</option>
              <option value="Kepala Divisi">Kepala Divisi</option>
              <option value="Sekretaris">Sekretaris</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Staf">Staf</option>
              <option value="Pembina">Pembina</option>
            </select>
          </div>
        </div>

        {/* Footnote Helper Text */}
        <p className="text-[11px] text-slate-500 italic pt-1">
          *Data telah ditampilkan sesuai dengan filter yang Anda pilih
        </p>
      </div>

      {/* 3. MAIN TABLE DATA LIST (EXACT COLUMNS: Nama Anggota, Divisi, Angkatan, Role) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
                <th className="p-4 pl-6">Nama Anggota</th>
                <th className="p-4">Divisi</th>
                <th className="p-4">Angkatan</th>
                <th className="p-4 text-center pr-6">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 text-xs italic">
                    Tidak ada data anggota ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const roleTitle = m.roleName || "Staf";
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Column 1: Nama Anggota */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0">
                            {getInitials(m.nama)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors block">
                              {m.nama}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              NIS: {m.nis}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Divisi */}
                      <td className="p-4 text-slate-300 font-medium">
                        {m.divisiName}
                      </td>

                      {/* Column 3: Angkatan */}
                      <td className="p-4 font-mono text-slate-400">
                        {m.angkatan}
                      </td>

                      {/* Column 4: Role (Pill Badge with exact user role text) */}
                      <td className="p-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${getRoleBadgeStyle(
                              roleTitle
                            )}`}
                          >
                            {roleTitle}
                          </span>

                          <button
                            onClick={() => setMemberToDelete(m)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 text-xs p-1 transition-all"
                            title="Hapus Anggota"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. FORM MODAL: TAMBAH ANGGOTA BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8 animate-modal-pop">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>➕ Tambah Anggota Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
              {/* Nama Anggota */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Anggota <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Masukkan nama lengkap anggota..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              {/* Divisi */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Divisi
                </label>
                <select
                  value={newDivisiName}
                  onChange={(e) => setNewDivisiName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="Divisi 1 - Keagamaan">Divisi 1 - Keagamaan</option>
                  <option value="Divisi 2 - Budi Pekerti">Divisi 2 - Budi Pekerti</option>
                  <option value="Divisi 3 - Kepemimpinan & Kebangsaan">Divisi 3 - Kepemimpinan</option>
                  <option value="Divisi 4 - Prestasi & Akademik">Divisi 4 - Prestasi</option>
                  <option value="Divisi 5 - Demokrasi & Hak Asasi">Divisi 5 - Demokrasi</option>
                  <option value="Divisi 6 - Kewirausahaan & Ekonomi">Divisi 6 - Kewirausahaan</option>
                  <option value="Divisi 7 - Kesehatan & Olahraga">Divisi 7 - Kesehatan</option>
                  <option value="Divisi 8 - Sastra & Budaya">Divisi 8 - Sastra & Budaya</option>
                  <option value="Divisi 9 - Teknologi & Informasi">Divisi 9 - Teknologi</option>
                  <option value="Divisi 10 - Bahasa Asing">Divisi 10 - Bahasa Asing</option>
                  <option value="BPH (Badan Pengurus Harian)">BPH (Badan Pengurus Harian)</option>
                </select>
              </div>

              {/* Angkatan & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Angkatan
                  </label>
                  <select
                    value={newAngkatan}
                    onChange={(e) => setNewAngkatan(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="Staf">Staf</option>
                    <option value="Kepala Divisi">Kepala Divisi</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Ketua Trimitra">Ketua Trimitra</option>
                    <option value="Pembina">Pembina</option>
                  </select>
                </div>
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRMATION MODAL: HAPUS ANGGOTA */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Hapus Anggota Ini?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <p className="font-semibold text-slate-200">{memberToDelete.nama}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{memberToDelete.divisiName} • {memberToDelete.roleName}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteMember(memberToDelete.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all"
              >
                Ya, Hapus
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
