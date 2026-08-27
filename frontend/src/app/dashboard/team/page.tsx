"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, UserDetail, DivisionDetail } from "@/lib/api";
import { canManageDivision, canViewDivision } from "@/lib/division-access";

export type UIUserDetail = UserDetail & { division_name?: string };

const DEFAULT_DIVISIONS: DivisionDetail[] = [
  { division_id: 1, division_name: "Seksi Bidang 1 - Keagamaan", deskripsi: "" },
  { division_id: 2, division_name: "Seksi Bidang 2 - Budi Pekerti", deskripsi: "" },
  { division_id: 3, division_name: "Seksi Bidang 3 - Bela Negara", deskripsi: "" },
  { division_id: 4, division_name: "Seksi Bidang 4 - Prestasi/Seni", deskripsi: "" },
  { division_id: 5, division_name: "Seksi Bidang 5 - Demokrasi", deskripsi: "" },
  { division_id: 6, division_name: "Seksi Bidang 6 - Kewirausahaan", deskripsi: "" },
  { division_id: 7, division_name: "Seksi Bidang 7 - Kesehatan/UKS", deskripsi: "" },
  { division_id: 8, division_name: "Seksi Bidang 8 - Sastra/Budaya", deskripsi: "" },
  { division_id: 9, division_name: "Seksi Bidang 9 - TIK", deskripsi: "" },
  { division_id: 10, division_name: "Seksi Bidang 10 - Bahasa Asing", deskripsi: "" },
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
  const [members, setMembers] = useState<UIUserDetail[]>([]);
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

  // Access Control: ONLY Sekretariat can add or delete members
  const gName = (user?.group_name || "").toLowerCase();
  const rName = (user?.role_name || "").toLowerCase();

  const canEditMembers = user?.group_name === "Trimitra";
  const visibleDivisionIds = DEFAULT_DIVISIONS.map((division) => division.division_id).filter((id) => canViewDivision(user, id));
  const isSekbid = user?.group_name === "Staf" || user?.group_name === "Kepala Divisi";
  const isPrivilegedFilter = ["Trimitra", "Pembina", "Sekretaris", "Bendahara"].includes(user?.group_name || "");
  const userDivisionName = DEFAULT_DIVISIONS.find(d => d.division_id === user?.division_id)?.division_name || `Sekbid ${user?.division_id || "-"}`;

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
    try {
      const usersRes = await api.listUsers().catch(() => null);
      if (usersRes?.users && usersRes.users.length > 0) {
        loadedMembers = usersRes.users.map((u: UIUserDetail) => {
          const matchedDiv = divs.find((d) => d.division_id === u.division_id);
          return {
            ...u,
            division_name: matchedDiv?.division_name || u.group_name || "Sekretariat Utama",
          };
        });
      }
    } catch (e) {}

    setMembers(loadedMembers);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSwalAlert = (title: string, message: string, type: "success" | "delete" = "success") => {
    setSwalToast({ title, message, type });
    setTimeout(() => {
      setSwalToast(null);
    }, 1200);
  };

  // Handler to Create Member
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditMembers) {
      alert("Hanya Sekretariat yang memiliki akses untuk menambahkan anggota baru.");
      return;
    }
    if (!newNama.trim()) return;

    setIsLoading(true);

    const nisToUse = newNis.trim() || `20${Math.floor(1000 + Math.random() * 9000)}`;
    const selDiv = divisionsList.find((d) => String(d.division_id) === newDivisiId);
    const selRole = rolesList.find((r) => String(r.role_id) === newRoleId) || rolesList[0] || { role_id: 6, role_name: "Anggota" };

    const createdMember: UIUserDetail = {
      nis: nisToUse,
      nama: newNama.trim(),
      jurusan: "PPLG",
      tahun_masuk: newAngkatan || 2026,
      foto_url: null,
      membership_id: Date.now(),
      role_id: selRole.role_id,
      role_name: selRole.role_name,
      group_id: 1,
      group_name: selDiv ? selDiv.division_name : "Sekretariat",
      level: 1,
      division_id: selDiv ? selDiv.division_id : 3,
      scope_divisi_awal: null,
      scope_divisi_akhir: null,
      periode_id: activePeriodeId || 1,
      tahun_ajaran: "2025/2026",
      division_name: selDiv ? selDiv.division_name : "Seksi Bidang 1 - Keagamaan"
    };

    void api.register({ nis: nisToUse, nama: createdMember.nama, jurusan: createdMember.jurusan, tahun_masuk: createdMember.tahun_masuk, password: nisToUse }).then(() => api.assignMembership({ nis: nisToUse, role_id: selRole.role_id, division_id: createdMember.division_id || undefined, periode_id: activePeriodeId || 1 })).then(() => fetchData()).catch((error: unknown) => alert(error instanceof Error ? error.message : "Gagal menyimpan anggota."));

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
    if (!canEditMembers) {
      alert("Hanya Sekretariat yang memiliki akses untuk menghapus anggota.");
      return;
    }
    alert("Penghapusan anggota harus dilakukan melalui endpoint administrasi backend.");
    setMemberToDelete(null);
    showSwalAlert("Berhasil Dihapus!", "Data anggota telah dihapus.", "delete");
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    const cleanName = name.replace(/\([^)]*\)/g, "").trim();
    const parts = cleanName.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return cleanName.slice(0, 2).toUpperCase();
  };

  // Role Badge Styling
  const getRoleBadgeStyle = () => {
    return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  };

  // Sekbid tidak pakai filter Divisi — selalu divisinya sendiri

  // Filter & Sort Logic — Sekbid hanya divisinya, privileged bisa semua
  const filteredMembers = members
    .filter((m) => {
      const matchScope = isSekbid
        ? m.division_id === user?.division_id
        : (m.division_id == null || visibleDivisionIds.includes(m.division_id));
      const matchName =
        searchName === "" ||
        m.nama.toLowerCase().includes(searchName.toLowerCase()) ||
        m.nis.includes(searchName);

      const divName = (m.division_name || "").toLowerCase().trim();
      const selDivNorm = selectedDivisi.toLowerCase().trim();
      const matchDivisi = isSekbid
        ? true // Sekbid pakai toggle Divisiku/Semua, bukan filter per-Sekbid
        : selectedDivisi === "All" ||
          divName === selDivNorm ||
          divName.startsWith(selDivNorm + " ") ||
          divName.startsWith(selDivNorm + " -");

      const matchAngkatan =
        selectedAngkatan === "All" || m.tahun_masuk === parseInt(selectedAngkatan, 10);

      const roleName = (m.role_name || m.group_name || "").toLowerCase().trim();
      const selRoleNorm = selectedRole.toLowerCase().trim();
      const matchRole =
        selectedRole === "All" || roleName === selRoleNorm;

      return matchScope && matchName && matchDivisi && matchAngkatan && matchRole;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }));

  // Role-specific display
  const isPembinaRole = user?.group_name === "Pembina";
  const isTrimitraRole = user?.group_name === "Trimitra";
  const isBphRole = ["Sekretaris","Bendahara"].includes(user?.group_name || "");
  const displayTitle = isSekbid
    ? `Tim ${userDivisionName}`
    : isBphRole
      ? "Anggota BPH & Organisasi"
      : isTrimitraRole
        ? "Anggota Organisasi — Trimitra"
        : isPembinaRole
          ? "Anggota Organisasi — Pembina (Read-only)"
          : "Anggota Organisasi";
  const displaySubtitle = isSekbid
    ? `Menampilkan anggota ${userDivisionName} — tim inti divisimu. ${filteredMembers.length} anggota.`
    : isPembinaRole
      ? "Pemantauan seluruh anggota organisasi — mode baca."
      : undefined;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans pb-12">
      {/* 1. TOP HEADER BAR: TITLE & CREATE NEW BUTTON (ONLY VISIBLE TO SEKRETARIAT) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            {displayTitle}
          </h1>
          {displaySubtitle && <p className="text-xs text-slate-400 mt-1">{displaySubtitle}</p>}
        </div>

        {canEditMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Tambah Anggota</span>
          </button>
        )}
      </div>

      {/* 2. TOP FILTER BANNER CARD */}
      <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-rose-400/90">
          Filter Anggota
        </h2>

        {/* FILTERS — tampil beda per role */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSekbid ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}>
          {/* FILTER 1: Anggota (Search Box) — selalu ada */}
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
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* FILTER 2: Divisi — hanya Trimitra/BPH/Pembina */}
          {!isSekbid && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Divisi
              </label>
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">Semua Divisi</option>
                {DEFAULT_DIVISIONS.map(d => (
                  <option key={d.division_id} value={d.division_name.split(" - ")[0]}>{d.division_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Info card untuk Sekbid sebagai pengganti filter Divisi */}
          {isSekbid && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Divisiku</label>
              <div className="w-full bg-slate-800/50 border border-blue-500/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">{userDivisionName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Aktif</span>
              </div>
              <p className="text-[10px] text-slate-500">Fokus tim divisimu • {filteredMembers.length} anggota</p>
            </div>
          )}

          {/* FILTER 3: Angkatan */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Angkatan
            </label>
            <select
              value={selectedAngkatan}
              onChange={(e) => setSelectedAngkatan(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
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
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
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

        <p className="text-[11px] text-slate-500 italic pt-1">
           *Data telah ditampilkan sesuai dengan filter, scope, dan jabatan aktif Anda
        </p>
      </div>

      {/* 3. MAIN TABLE DATA LIST */}
      <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
                <th className="p-4 pl-6">Nama Anggota</th>
                {!isSekbid && <th className="p-4">Divisi</th>}
                <th className="p-4">Angkatan</th>
                <th className="p-4 text-center pr-6">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={isSekbid ? 3 : 4} className="p-12 text-center text-slate-500 text-xs italic">
                    {isSekbid ? `Belum ada anggota di ${userDivisionName}.` : "Tidak ada data anggota ditemukan."}
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

                    {/* Column 2: Divisi — hanya untuk Trimitra/BPH/Pembina */}
                    {!isSekbid && <td className="p-4 text-slate-300 font-medium">
                      {m.division_name || m.group_name || "-"}
                    </td>}

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

                      {/* ONLY SHOW DELETE BUTTON FOR SEKRETARIAT */}
                      {canEditMembers && (
                        <button
                          onClick={() => setMemberToDelete(m)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 text-xs p-1.5 transition-all cursor-pointer"
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

      {/* 4. FORM MODAL: TAMBAH ANGGOTA BARU (SEKRETARIAT ONLY) */}
      {canEditMembers && isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8 animate-modal-pop">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>➕ Tambah Anggota Baru</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    NIS <span className="text-slate-500">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={newNis}
                    onChange={(e) => setNewNis(e.target.value)}
                    placeholder="Auto 20xxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Anggota <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Masukkan nama..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Divisi / Sekbid <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={newDivisiId}
                  onChange={(e) => setNewDivisiId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Divisi / Sekbid...</option>
                  {divisionsList.map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Angkatan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newAngkatan}
                    onChange={(e) => setNewAngkatan(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih Role...</option>
                    {rolesList.map((r) => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.role_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {isLoading ? "Menyimpan..." : "Simpan Anggota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRMATION MODAL: HAPUS ANGGOTA (SEKRETARIAT ONLY) */}
      {canEditMembers && memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-modal-backdrop">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">Hapus Anggota Ini?</h3>
              <p className="text-xs text-slate-400 font-medium">
                Apakah Anda yakin ingin menghapus &quot;<span className="font-bold text-slate-200">{memberToDelete.nama}</span>&quot; dari daftar anggota?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteMember(memberToDelete.nis)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SWEETALERT TOAST NOTIFICATION */}
      {swalToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 pointer-events-none animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center max-w-xs w-full space-y-2 pointer-events-auto">
            {swalToast.type === "success" ? (
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                ✓
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                ✕
              </div>
            )}
            <h3 className="text-sm font-bold text-slate-100">{swalToast.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{swalToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
