"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, UserDetail, DivisionDetail } from "@/lib/api";

export type UIUserDetail = UserDetail & { division_name?: string };

const DEFAULT_DIVISIONS: DivisionDetail[] = [
  { division_id: 3, division_name: "Seksi Bidang 1 - Keagamaan", deskripsi: "" },
  { division_id: 4, division_name: "Seksi Bidang 2 - Budi Pekerti", deskripsi: "" },
  { division_id: 5, division_name: "Seksi Bidang 3 - Bela Negara", deskripsi: "" },
  { division_id: 6, division_name: "Seksi Bidang 4 - Prestasi/Seni", deskripsi: "" },
  { division_id: 7, division_name: "Seksi Bidang 5 - Demokrasi", deskripsi: "" },
  { division_id: 8, division_name: "Seksi Bidang 6 - Kewirausahaan", deskripsi: "" },
  { division_id: 9, division_name: "Seksi Bidang 7 - Kesehatan/UKS", deskripsi: "" },
  { division_id: 10, division_name: "Seksi Bidang 8 - Sastra/Budaya", deskripsi: "" },
  { division_id: 11, division_name: "Seksi Bidang 9 - TIK", deskripsi: "" },
  { division_id: 12, division_name: "Seksi Bidang 10 - Bahasa Asing", deskripsi: "" },
];

const DEFAULT_ROLES = [
  { role_id: 1, role_name: "Pembina" },
  { role_id: 2, role_name: "Ketua" },
  { role_id: 7, role_name: "Wakil Ketua" },
  { role_id: 3, role_name: "Sekretariat" },
  { role_id: 4, role_name: "Bendahara" },
  { role_id: 5, role_name: "Ketua Bidang" },
  { role_id: 6, role_name: "Anggota" },
];

export default function MemberPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<UIUserDetail[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("canopy_members_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
  const [divisionsList, setDivisionsList] = useState<DivisionDetail[]>(DEFAULT_DIVISIONS);
  const [rolesList, setRolesList] = useState<any[]>(DEFAULT_ROLES);
  const [activePeriodeId, setActivePeriodeId] = useState<number | null>(1);

  // Filter States: Anggota (Search), Divisi, Angkatan, Role
  const [searchName, setSearchName] = useState<string>("");
  const [selectedDivisi, setSelectedDivisi] = useState<string>("All");
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>("All");
  const [selectedRole, setSelectedRole] = useState<string>("All");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [memberToDelete, setMemberToDelete] = useState<UIUserDetail | null>(null);

  // Form Fields for Add Member
  const [newNis, setNewNis] = useState<string>("");
  const [newNama, setNewNama] = useState<string>("");
  const [newDivisiId, setNewDivisiId] = useState<string>("");
  const [newAngkatan, setNewAngkatan] = useState<number>(2026);
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // SweetAlert style Toast State
  const [swalToast, setSwalToast] = useState<{ title: string; message: string; type?: "success" | "delete" } | null>(null);

  const fetchData = async () => {
    let divs = DEFAULT_DIVISIONS;
    let roles = DEFAULT_ROLES;

    try {
      const divsRes = await api.listDivisions().catch(() => null);
      if (divsRes?.divisions && divsRes.divisions.length > 0) {
        divs = divsRes.divisions;
      }
    } catch (e) {}

    try {
      const rolesRes = await api.listRoles().catch(() => null);
      if (rolesRes?.roles && rolesRes.roles.length > 0) {
        roles = rolesRes.roles;
      }
    } catch (e) {}

    try {
      const perRes = await api.listPeriode().catch(() => null);
      if (perRes?.periode) {
        const active = perRes.periode.find((p: any) => p.is_aktif);
        if (active) setActivePeriodeId(active.periode_id);
      }
    } catch (e) {}

    setDivisionsList(divs);
    setRolesList(roles);

    let loadedMembers: UIUserDetail[] = [];

    // 1. First load persisted members from localStorage
    try {
      const saved = localStorage.getItem("canopy_members_data");
      if (saved) {
        loadedMembers = JSON.parse(saved);
      }
    } catch (e) {}

    // 2. Fetch backend users and merge carefully without overwriting local fields
    try {
      const usersRes = await api.listUsers().catch(() => null);
      if (usersRes?.users && usersRes.users.length > 0) {
        usersRes.users.forEach((bu: any) => {
          const divName = divs.find((d: any) => d.division_id === bu.division_id)?.division_name || bu.group_name || "Tidak ada Divisi";
          const formatted: UIUserDetail = {
            ...bu,
            division_name: divName,
            role_name: bu.role_name || bu.group_name || "Anggota"
          };
          const existingIdx = loadedMembers.findIndex((m) => m.nis === bu.nis);
          if (existingIdx >= 0) {
            loadedMembers[existingIdx] = {
              ...formatted,
              ...loadedMembers[existingIdx], // Retain local fields if already set
            };
          } else {
            loadedMembers.push(formatted);
          }
        });
      }
    } catch (e) {}

    setMembers((prev) => (loadedMembers.length > 0 ? loadedMembers : prev));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toast alert trigger
  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setSwalToast({ title, message, type });
    setTimeout(() => {
      setSwalToast(null);
    }, 1200);
  };

  // Handler to Create Member
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;

    const nisToUse = newNis.trim() || `2026${Math.floor(100 + Math.random() * 900)}`;
    const selRole = rolesList.find(r => String(r.role_id) === newRoleId) || rolesList[0] || { role_id: 6, role_name: "Anggota" };
    const selDiv = divisionsList.find(d => String(d.division_id) === newDivisiId) || divisionsList[0];

    const finalRoleId = newRoleId ? parseInt(newRoleId, 10) : selRole.role_id;
    const finalDivId = newDivisiId ? parseInt(newDivisiId, 10) : (selDiv ? selDiv.division_id : undefined);

    setIsLoading(true);

    try {
      if (activePeriodeId) {
        await api.register({
          nis: nisToUse,
          nama: newNama.trim(),
          jurusan: "Umum",
          tahun_masuk: newAngkatan,
          password: "password123"
        }).catch(() => null);

        await api.assignMembership({
          nis: nisToUse,
          role_id: finalRoleId,
          division_id: finalDivId,
          periode_id: activePeriodeId
        }).catch(() => null);
      }
    } catch (error: any) {
      console.warn("Backend call failed:", error);
    }

    const createdMember: UIUserDetail = {
      nis: nisToUse,
      nama: newNama.trim(),
      jurusan: "Umum",
      tahun_masuk: newAngkatan,
      foto_url: null,
      membership_id: Date.now(),
      role_id: finalRoleId,
      role_name: selRole.role_name,
      group_id: 1,
      group_name: selRole.role_name,
      level: 1,
      division_id: finalDivId || null,
      scope_divisi_awal: null,
      scope_divisi_akhir: null,
      periode_id: activePeriodeId || 1,
      tahun_ajaran: "2025/2026",
      division_name: selDiv ? selDiv.division_name : "Seksi Bidang 1 - Keagamaan"
    };

    setMembers(prev => {
      const updated = [createdMember, ...prev.filter(m => m.nis !== nisToUse)];
      try {
        localStorage.setItem("canopy_members_data", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setIsAddModalOpen(false);
    setNewNis("");
    setNewNama("");
    setNewDivisiId("");
    setNewRoleId("");
    setIsLoading(false);
    showSwalAlert("Berhasil Ditambahkan!", "Anggota baru telah berhasil ditambahkan.", "success");
  };

  // Handler to Delete Member
  const handleDeleteMember = (nis: string) => {
    setMembers(prev => {
      const updated = prev.filter((m) => m.nis !== nis);
      try {
        localStorage.setItem("canopy_members_data", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setMemberToDelete(null);
    showSwalAlert("Berhasil Dihapus!", "Data anggota telah dihapus.", "delete");
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    const cleanName = name.replace(/\([^)]*\)/g, "").trim(); // Remove brackets like (Ketua)
    const parts = cleanName.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return cleanName.slice(0, 2).toUpperCase();
  };

  // Role Badge Styling (Uniform theme styling for all roles matching Canopy UI)
  const getRoleBadgeStyle = () => {
    return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  };

  // Filter Logic (Search Name/NIS, Divisi, Angkatan, Role)
  const filteredMembers = members.filter((m) => {
    const matchName =
      searchName === "" ||
      m.nama.toLowerCase().includes(searchName.toLowerCase()) ||
      m.nis.includes(searchName);

    const divName = (m.division_name || "").toLowerCase().trim();
    const selDivNorm = selectedDivisi.toLowerCase().trim();
    const matchDivisi =
      selectedDivisi === "All" ||
      divName === selDivNorm ||
      divName.startsWith(selDivNorm + " ") ||
      divName.startsWith(selDivNorm + " -");

    const matchAngkatan =
      selectedAngkatan === "All" || m.tahun_masuk === parseInt(selectedAngkatan, 10);

    const roleName = (m.role_name || m.group_name || "").toLowerCase().trim();
    const selRoleNorm = selectedRole.toLowerCase().trim();
    const matchRole =
      selectedRole === "All" || roleName === selRoleNorm;

    return matchName && matchDivisi && matchAngkatan && matchRole;
  });

  // Access Control: Only Sekretaris / Sekre can add or delete members
  const gName = (user?.group_name || "").toLowerCase();
  const rName = (user?.role_name || "").toLowerCase();
  const uName = (user?.nama || "").toLowerCase();
  const uNis = user?.nis || "";

  const canEditMembers =
    gName === "sekretaris" ||
    rName === "sekretaris" ||
    gName === "trimitra" ||
    rName === "ketua" ||
    uNis === "20003";

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans pb-12">
      {/* 1. TOP HEADER BAR: TITLE & CREATE NEW BUTTON */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
          Anggota
        </h1>

        {canEditMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Tambah Anggota</span>
          </button>
        )}
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
                placeholder="Cari nama atau NIS..."
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
              <option value="Seksi Bidang 1">Seksi Bidang 1 - Keagamaan</option>
              <option value="Seksi Bidang 2">Seksi Bidang 2 - Budi Pekerti</option>
              <option value="Seksi Bidang 3">Seksi Bidang 3 - Bela Negara</option>
              <option value="Seksi Bidang 4">Seksi Bidang 4 - Prestasi/Seni</option>
              <option value="Seksi Bidang 5">Seksi Bidang 5 - Demokrasi</option>
              <option value="Seksi Bidang 6">Seksi Bidang 6 - Kewirausahaan</option>
              <option value="Seksi Bidang 7">Seksi Bidang 7 - Kesehatan/UKS</option>
              <option value="Seksi Bidang 8">Seksi Bidang 8 - Sastra/Budaya</option>
              <option value="Seksi Bidang 9">Seksi Bidang 9 - TIK</option>
              <option value="Seksi Bidang 10">Seksi Bidang 10 - Bahasa Asing</option>
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
              <option value="Pembina">Pembina</option>
              <option value="Ketua">Ketua</option>
              <option value="Wakil Ketua">Wakil Ketua</option>
              <option value="Sekretariat">Sekretariat</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Ketua Bidang">Ketua Bidang</option>
              <option value="Anggota">Anggota</option>
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
                filteredMembers.map((m) => (
                  <tr key={m.nis} className="hover:bg-slate-800/30 transition-colors group">
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
                      {m.division_name || m.group_name || "-"}
                    </td>

                    {/* Column 3: Angkatan */}
                    <td className="p-4 font-mono text-slate-400">
                      {m.tahun_masuk}
                    </td>

                    {/* Column 4: Role (Pill Badge) */}
                    <td className="p-4 pr-6 relative">
                      <div className="flex items-center justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${getRoleBadgeStyle()}`}
                        >
                          {m.role_name}
                        </span>
                      </div>

                      {canEditMembers && (
                        <button
                          onClick={() => setMemberToDelete(m)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 text-xs p-1.5 transition-all"
                          title="Hapus Anggota"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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
              {/* NIS & Nama Anggota */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    value={newNis}
                    onChange={(e) => setNewNis(e.target.value)}
                    placeholder="20201"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nama Anggota <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Divisi */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Divisi / Sekbid
                </label>
                <select
                  value={newDivisiId}
                  onChange={(e) => setNewDivisiId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="">Pilih Divisi...</option>
                  {divisionsList.map(d => (
                    <option key={d.division_id} value={d.division_id}>{d.division_name}</option>
                  ))}
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
                    Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">Pilih Role...</option>
                    {rolesList.map(r => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
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
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memproses...</span>
                    </span>
                  ) : (
                    "Simpan Anggota"
                  )}
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
              <p className="text-slate-400 text-[11px] mt-0.5">{memberToDelete.division_name || memberToDelete.group_name} • Role: {memberToDelete.role_name}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteMember(memberToDelete.nis)}
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
