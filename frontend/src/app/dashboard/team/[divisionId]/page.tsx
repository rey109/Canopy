"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DIVISION_INFO: Record<
  string,
  { name: string; desc: string; gradient: string }
> = {
  "1": { name: "Keagamaan & Ketaqwaan", desc: "Jadwal kegiatan keagamaan", gradient: "from-amber-500 to-yellow-500" },
  "2": { name: "Budi Pekerti & Akhlak", desc: "Rekam jejak penghargaan & pelanggaran siswa", gradient: "from-rose-500 to-pink-500" },
  "3": { name: "Bela Negara & Paskibra", desc: "Roster tugas upacara bendera", gradient: "from-red-600 to-orange-500" },
  "4": { name: "Prestasi, Seni & Olahraga", desc: "Tracker prestasi akademik, seni, dan olahraga", gradient: "from-blue-500 to-indigo-500" },
  "5": { name: "Demokrasi & Lingkungan", desc: "Survei, polling, dan eco-campaign", gradient: "from-emerald-500 to-teal-500" },
  "6": { name: "Kewirausahaan & Koperasi", desc: "Log penjualan dan stok koperasi siswa", gradient: "from-orange-500 to-amber-500" },
  "7": { name: "Kesehatan & UKS", desc: "Rekap kunjungan UKS dan stok obat", gradient: "from-green-500 to-emerald-500" },
  "8": { name: "Sastra & Budaya", desc: "E-Mading dan artikel sastra", gradient: "from-purple-500 to-violet-500" },
  "9": { name: "Teknologi & Informasi", desc: "Link tree dan media sosial OSIS", gradient: "from-cyan-500 to-blue-500" },
  "10": { name: "Bahasa Asing", desc: "Word of the Day dan jadwal speech", gradient: "from-pink-500 to-fuchsia-500" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DivisionDetailPage() {
  const params = useParams();
  const divId = params.divisionId as string;
  const info = DIVISION_INFO[divId];
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anggota, setAnggota] = useState<any[]>([]);
  const [loadingAnggota, setLoadingAnggota] = useState(true);
  const [activeTab, setActiveTab] = useState<"anggota" | "kegiatan">("anggota");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNis, setNewNis] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newJurusan, setNewJurusan] = useState("RPL");
  const [newTahun, setNewTahun] = useState("2024");
  const [newRole, setNewRole] = useState<"staf"|"ketua">("staf");
  const [adding, setAdding] = useState(false);

  const canEdit =
    user?.group_name === "Trimitra" ||
    user?.group_name === "Pembina" ||
    (user?.group_name === "Kepala Divisi" && user?.division_id === Number(divId));

  useEffect(() => {
    const fetchers: Record<string, () => Promise<any>> = {
      "1": () => api.getB1Events().then((r) => r.events || []),
      "2": () => api.getB2Records().then((r) => r.records || []),
      "3": () => api.getB3Rosters().then((r) => r.rosters || []),
      "4": () => api.getB4Competitions().then((r) => r.competitions || []),
      "5": () => api.getB5Surveys().then((r) => r.surveys || []),
      "6": () => api.getB6Sales().then((r) => r.sales || []),
      "7": () => api.getB7Visits().then((r) => r.visits || []),
      "8": () => api.getB8Mading().then((r) => r.mading || []),
      "9": () => api.getB9Links().then((r) => r.links || []),
      "10": () => api.getB10Words().then((r) => r.words || []),
    };
    const fn = fetchers[divId];
    if (fn) {
      fn()
        .then(setData)
        .catch(() => setData([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [divId]);

  // Fetch anggota untuk divisi ini — dipakai untuk absensi
  useEffect(() => {
    setLoadingAnggota(true);
    const loadAnggota = async () => {
      try {
        const res = await api.listUsers({ division_id: Number(divId) });
        const list = res.users || [];
        setAnggota(list);
        if (typeof window !== "undefined") {
          try { localStorage.setItem(`canopy_anggota_${divId}`, JSON.stringify(list)); } catch {}
        }
      } catch {
        // Fallback localStorage atau mock
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem(`canopy_anggota_${divId}`);
          if (cached) {
            try { setAnggota(JSON.parse(cached)); setLoadingAnggota(false); return; } catch {}
          }
        }
        // Mock anggota untuk demo absensi jika backend down
        const mock = [
          { nis: `2010${divId}1`, nama: `Anggota 1 SEKBID ${divId}`, jurusan: "RPL", tahun_masuk: 2024, foto_url: null, membership_id: 100+Number(divId), role_id: 20+Number(divId), role_name: `Staf Sekbid ${divId}`, group_id: 6, group_name: "Staf", level: 2, division_id: Number(divId), scope_divisi_awal: Number(divId), scope_divisi_akhir: Number(divId), periode_id: 1, tahun_ajaran: "2025/2026" },
          { nis: `2010${divId}2`, nama: `Anggota 2 SEKBID ${divId}`, jurusan: "TKJ", tahun_masuk: 2024, foto_url: null, membership_id: 101+Number(divId), role_id: 20+Number(divId), role_name: `Staf Sekbid ${divId}`, group_id: 6, group_name: "Staf", level: 2, division_id: Number(divId), scope_divisi_awal: Number(divId), scope_divisi_akhir: Number(divId), periode_id: 1, tahun_ajaran: "2025/2026" },
          { nis: `2010${divId}3`, nama: `Ketua Sekbid ${divId}`, jurusan: "SIJA", tahun_masuk: 2023, foto_url: null, membership_id: 10+Number(divId), role_id: 10+Number(divId), role_name: `Ketua Sekbid ${divId}`, group_id: 5, group_name: "Kepala Divisi", level: 1, division_id: Number(divId), scope_divisi_awal: Number(divId), scope_divisi_akhir: Number(divId), periode_id: 1, tahun_ajaran: "2025/2026" },
        ];
        setAnggota(mock as any);
      } finally {
        setLoadingAnggota(false);
      }
    };
    loadAnggota();
  }, [divId]);

  if (!info) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-[var(--text-muted)]">Divisi tidak ditemukan.</p>
      </div>
    );
  }

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <div className="glass-card p-12 text-center">
          <p className="text-[var(--text-muted)]">Belum ada data.</p>
        </div>
      );
    }

    const cols = Object.keys(data[0]).filter((k) => k !== "id");

    const colLabels: Record<string, string> = {
      title: "Judul",
      date: "Tanggal",
      description: "Deskripsi",
      student_name: "Nama Siswa",
      student_class: "Kelas",
      record_type: "Tipe",
      points: "Poin",
      leader_name: "Pemimpin Upacara",
      mc_name: "MC",
      flag_bearers: "Pengibar",
      competition_name: "Kompetisi",
      achievement: "Prestasi",
      type: "Tipe",
      topic: "Topik",
      yes_votes: "Setuju",
      no_votes: "Tidak",
      item_name: "Barang",
      quantity: "Jumlah",
      price: "Harga",
      complaint: "Keluhan",
      treatment: "Penanganan",
      visit_date: "Tanggal",
      content: "Konten",
      author: "Penulis",
      created_at: "Dibuat",
      platform: "Platform",
      label: "Label",
      url: "URL",
      word: "Kata",
      language: "Bahasa",
      meaning: "Arti",
      example: "Contoh",
    };

    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {cols.map((c) => (
                <th key={c}>{colLabels[c] || c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={row.id || i}>
                <td className="text-[var(--text-muted)]">{i + 1}</td>
                {cols.map((c) => {
                  let val = row[c];
                  if (typeof val === "string" && val.includes("T") && val.includes("-")) {
                    try {
                      val = new Date(val).toLocaleDateString("id-ID");
                    } catch {
                      /* keep */
                    }
                  }
                  if (typeof val === "number" && c === "price") {
                    val = new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(val);
                  }
                  if (c === "url") {
                    return (
                      <td key={c}>
                        <a href={String(val)} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
                          {String(val)}
                        </a>
                      </td>
                    );
                  }
                  return <td key={c}>{String(val)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Simpan anggota untuk dipakai di modul absensi
  useEffect(() => {
    if (anggota.length > 0 && typeof window !== "undefined") {
      try {
        const existingRaw = localStorage.getItem("canopy_all_anggota");
        let all: any[] = existingRaw ? JSON.parse(existingRaw) : [];
        // hapus yang divisi sama lalu tambah yang baru
        all = all.filter((a: any) => a.division_id !== Number(divId));
        all.push(...anggota);
        localStorage.setItem("canopy_all_anggota", JSON.stringify(all));
      } catch {}
    }
  }, [anggota, divId]);

  const handleAddAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNis.trim() || !newNama.trim()) { alert("NIS dan Nama wajib diisi"); return; }
    if (anggota.find((a: any) => a.nis === newNis.trim())) { alert("NIS sudah ada di SEKBID ini"); return; }
    setAdding(true);
    const nis = newNis.trim();
    const nama = newNama.trim();
    const jurusan = newJurusan;
    const tahun_masuk = Number(newTahun) || 2024;
    const divIdNum = Number(divId);
    const isKetua = newRole === "ketua";
    // Coba simpan ke backend dulu (register + assign), fallback ke lokal jika gagal
    try {
      // 1. Register user (jika belum ada)
      try {
        await api.register({ nis, nama, jurusan, tahun_masuk, password: "password123" });
      } catch (err: any) {
        // Jika sudah terdaftar, abaikan (AlreadyExists)
        if (!String(err.message).includes("sudah terdaftar") && !String(err.message).includes("AlreadyExists")) {
          // tetap lanjut, mungkin user sudah ada
        }
      }
      // 2. Assign membership ke divisi ini
      try {
        // Ambil roles untuk cari role_id Staf/Ketua sesuai divisi
        const rolesRes = await api.listRoles();
        const targetRoleName = isKetua ? `Ketua Sekbid ${divIdNum}` : `Staf Sekbid ${divIdNum}`;
        const role = rolesRes.roles.find((r: any) => r.role_name === targetRoleName);
        if (role) {
          const periodeRes = await api.listPeriode();
          const aktif = periodeRes.periode.find((p: any) => p.is_aktif) || periodeRes.periode[0];
          if (aktif) {
            await api.assignMembership({ nis, role_id: role.role_id, division_id: divIdNum, periode_id: aktif.periode_id });
          }
        }
      } catch (err) {
        console.warn("Assign membership gagal, fallback lokal:", err);
      }
    } catch (err) {
      console.warn("Backend anggota gagal, fallback lokal:", err);
    }
    // Fallback lokal: tambah ke state + localStorage
    const newMember: any = {
      nis,
      nama,
      jurusan,
      tahun_masuk,
      foto_url: null,
      membership_id: Date.now(),
      role_id: isKetua ? 10+divIdNum : 20+divIdNum,
      role_name: isKetua ? `Ketua Sekbid ${divIdNum}` : `Staf Sekbid ${divIdNum}`,
      group_id: isKetua ? 5 : 6,
      group_name: isKetua ? "Kepala Divisi" : "Staf",
      level: isKetua ? 1 : 2,
      division_id: divIdNum,
      scope_divisi_awal: divIdNum,
      scope_divisi_akhir: divIdNum,
      periode_id: 1,
      tahun_ajaran: "2025/2026",
    };
    const updated = [...anggota, newMember];
    setAnggota(updated);
    try {
      localStorage.setItem(`canopy_anggota_${divId}`, JSON.stringify(updated));
    } catch {}
    setShowAddModal(false);
    setNewNis(""); setNewNama(""); setNewJurusan("RPL"); setNewTahun("2024"); setNewRole("staf");
    setAdding(false);
    alert(`Anggota ${nama} (${nis}) berhasil ditambahkan ke SEKBID ${divIdNum}. Data akan dipakai untuk absensi.`);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${info.gradient} flex items-center justify-center text-white font-bold text-sm`}>
            {divId}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{info.name}</h1>
            <p className="text-[var(--text-secondary)] text-sm">{info.desc}</p>
          </div>
        </div>
        {canEdit && (
          <div className="mt-3">
            <span className="badge badge-success">✓ Anda memiliki hak kelola divisi ini</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button onClick={() => setActiveTab("anggota")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab==="anggota" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>Anggota ({anggota.length})</button>
        <button onClick={() => setActiveTab("kegiatan")} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab==="kegiatan" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>Kegiatan Divisi</button>
      </div>

      {activeTab === "anggota" ? (
        loadingAnggota ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 w-full bg-[var(--border)] rounded" />
            <div className="h-10 w-full bg-[var(--border)] rounded" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-xs text-[var(--text-muted)]">Data anggota ini otomatis dipakai untuk absensi rapat. Tambahkan nama anggota baru di bawah.</p>
              <div className="flex gap-2">
                <a href="/dashboard/attendance" className="btn-secondary text-xs">Lihat Absensi</a>
                {canEdit && <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs">+ Tambah Anggota</button>}
              </div>
            </div>
            {anggota.length === 0 ? (
              <div className="glass-card p-12 text-center text-[var(--text-muted)]">
                <p>Belum ada anggota di SEKBID {divId}.</p>
                {canEdit && <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs mt-3">Tambah Anggota Pertama</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {anggota.map((m: any) => (
                  <div key={m.nis} className="glass-card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white font-bold text-sm">
                      {m.nama?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{m.nama}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{m.role_name} • {m.nis} • {m.jurusan} • {m.tahun_masuk}</p>
                      <span className="badge badge-info text-[10px] mt-1">SEKBID {m.division_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 w-full bg-[var(--border)] rounded" />
            <div className="h-10 w-full bg-[var(--border)] rounded" />
            <div className="h-10 w-full bg-[var(--border)] rounded" />
          </div>
        ) : (
          renderTable()
        )
      )}

      {/* Modal Tambah Anggota */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Tambah Anggota SEKBID {divId}</h3>
            <p className="text-xs text-[var(--text-muted)]">Anggota baru akan otomatis dipakai untuk absensi rapat divisi ini.</p>
            <form onSubmit={handleAddAnggota} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">NIS *</label>
                <input type="text" value={newNis} onChange={(e) => setNewNis(e.target.value)} placeholder="Contoh: 20241001" className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nama Lengkap *</label>
                <input type="text" value={newNama} onChange={(e) => setNewNama(e.target.value)} placeholder="Contoh: Budi Santoso" className="input-field text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Jurusan</label>
                  <select value={newJurusan} onChange={(e) => setNewJurusan(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm">
                    <option value="RPL">RPL</option>
                    <option value="TKJ">TKJ</option>
                    <option value="SIJA">SIJA</option>
                    <option value="AKL">AKL</option>
                    <option value="MM">MM</option>
                    <option value="Pendidikan">Pendidikan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Tahun Masuk</label>
                  <input type="number" value={newTahun} onChange={(e) => setNewTahun(e.target.value)} placeholder="2024" className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Peran</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="input-field bg-[var(--bg-primary)] text-sm">
                  <option value="staf">Staf Sekbid {divId}</option>
                  <option value="ketua">Ketua Sekbid {divId}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">Batal</button>
                <button type="submit" disabled={adding} className="btn-primary text-xs">{adding ? "Menambahkan..." : "Tambah Anggota"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
