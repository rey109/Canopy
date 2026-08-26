const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://staging-canopy-3xyi.encr.app";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("canopy_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ===== AUTH =====
export interface UserDetail {
  nis: string;
  nama: string;
  jurusan: string;
  tahun_masuk: number;
  foto_url: string | null;

  // Keanggotaan aktif
  membership_id: number;
  role_id: number;
  role_name: string;
  group_id: number;
  group_name: string; // "Trimitra", "Sekretaris", "Bendahara", "Kepala Divisi", "Staf", "Pembina"
  level: number;

  // Scope divisi
  division_id: number | null;
  scope_divisi_awal: number | null;
  scope_divisi_akhir: number | null;

  // Periode aktif
  periode_id: number;
  tahun_ajaran: string;
}

export interface LoginResponse {
  token: string;
  user: UserDetail;
}

// ===== INBOUND DATA STRUCTS =====

export interface DivisionDetail {
  division_id: number;
  division_name: string;
  deskripsi: string;
}

export interface ProkerDetail {
  proker_id: number;
  division_id: number | null;
  periode_id: number;
  nama: string;
  deskripsi: string;
  anggaran_disetujui: number;
  status: string; // 'Belum Mulai', 'Berjalan', 'Selesai', 'Dibatalkan'
  penanggung_jawab: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  dibuat_oleh: string;
  created_at: string;
}

// Status otomatis: jika tanggal_selesai sudah lewat dan status masih
// "Belum Mulai"/"Berjalan", tampilkan sebagai "Selesai"
function withAutoStatus<T extends ProkerDetail>(p: T): T {
  if (
    (p.status === "Belum Mulai" || p.status === "Berjalan") &&
    p.tanggal_selesai &&
    new Date(p.tanggal_selesai).getTime() < Date.now()
  ) {
    return { ...p, status: "Selesai" };
  }
  return p;
}

export interface TaskDetail {
  task_id: number;
  proker_id: number;
  template_id: number | null;
  scope: string; // 'Individual', 'General'
  assigned_to: string | null;
  offered_by: string | null;
  dibuat_oleh: string;
  judul: string;
  deskripsi: string;
  deadline: string;
  status: string; // 'Tersedia', 'Ditugaskan', 'Ditawarkan', 'Selesai'
  custom_data: string | null; // JSON string
  eskalasi_terkirim: boolean;
  created_at: string;
}

export interface TaskTemplateDetail {
  template_id: number;
  division_id: number;
  nama_template: string;
  dibuat_oleh: string;
  created_at: string;
  fields: {
    field_id: number;
    template_id: number;
    label: string;
    tipe_input: string; // 'Teks', 'Angka', 'Tanggal', 'Dropdown', 'File', 'Checkbox'
    opsi_dropdown: string | null;
    wajib: boolean;
    urutan: number;
  }[];
}

export interface TransaksiDetail {
  transaksi_id: number;
  proker_id: number | null;
  kategori_id: number | null;
  kategori_nama: string | null;
  division_id: number | null;
  pengajuan_id: number | null;
  dicatat_oleh: string;
  jenis: string; // 'Masuk', 'Keluar'
  nominal: number;
  deskripsi: string;
  bukti_url: string | null;
  sumber: string; // 'Manual', 'Scan Nota'
  is_berisiko: boolean;
  status: string; // 'Menunggu Verifikasi', 'Menunggu Approval Umum', 'Disetujui', 'Ditolak', 'Perlu Perbaikan', 'Terverifikasi'
  alasan_penolakan: string | null;
  tanggal: string;
  created_at: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}

export interface PengajuanDanaDetail {
  pengajuan_id: number;
  nama_pengajuan: string;
  proker_id: number | null;
  division_id: number | null;
  pengaju_nis: string;
  nominal: number;
  keperluan: string;
  deskripsi: string;
  deadline: string;
  lampiran_url: string | null;
  status: string; // 'Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak', 'Dicairkan', 'Selesai', 'Perlu Perbaikan'
  alasan_penolakan: string | null;
  dibuat_oleh: string;
  created_at: string;
  updated_at: string;
  status_history?: { history_id: number; pengajuan_id: number; status_sebelum: string | null; status_sesudah: string; diubah_oleh: string; catatan: string | null; created_at: string }[];
  approval_history?: { approval_id: number; pengajuan_id: number; approver_nis: string; approver_role: string; keputusan: string; catatan: string | null; created_at: string }[];
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}

export interface DokumenDetail {
  dokumen_id: number;
  proker_id: number | null;
  jenis_id: number;
  jenis_nama: string;
  diunggah_oleh: string;
  diperiksa_oleh: string | null;
  file_url: string;
  is_eksternal: boolean;
  status: string; // 'Draft', 'Menunggu Kelengkapan', 'Perlu Revisi', 'Menunggu Approval Berjenjang', 'Disetujui'
  catatan_revisi: string | null;
  versi: number;
  created_at: string;
  updated_at: string;
  persetujuan?: PersetujuanDetail[];
}

export interface PersetujuanDetail {
  persetujuan_id: number;
  dokumen_id: number;
  urutan: number;
  approver_group_name: string;
  disetujui_oleh: string | null;
  keputusan: string; // 'Menunggu', 'Disetujui', 'Ditolak'
  catatan: string | null;
  waktu: string | null;
}

export interface RapatDetail {
  rapat_id: number;
  periode_id: number;
  division_id: number | null;
  judul: string;
  tanggal: string;
  lokasi: string;
  agenda: string;
  dibuat_oleh: string;
  status: string; // 'Terjadwal', 'Berlangsung', 'Selesai'
  qr_code?: string;
  created_at: string;
}

export interface PresensiDetail {
  presensi_id: number;
  acara_type: string; // 'Rapat', 'Kegiatan'
  acara_id: number;
  nis: string;
  tipe: string; // 'Hadir', 'Izin', 'Sakit', 'Alpa'
  keterangan: string | null;
  bukti_url: string | null;
  foto_url: string | null;
  status_verifikasi: string; // 'Menunggu', 'Disetujui', 'Ditolak'
  waktu_submit: string;
}

export interface NotulensiAttachment {
  url: string;
  name: string;
  type: string;
}

// Ubah URL relatif dari backend menjadi URL absolut yang bisa dipakai <img>/<a>
export function fileUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface NotulensiDetail {
  notulensi_id: number;
  rapat_id: number;
  isi: string;
  attachments: NotulensiAttachment[];
  difinalisasi_oleh: string | null;
  status: string; // 'Draft', 'Final'
  updated_at: string;
}

export interface NotulensiListItem {
  notulensi_id: number;
  rapat_id: number;
  judul_rapat: string;
  tanggal_rapat: string;
  lokasi_rapat: string;
  status_rapat: string; // 'Terjadwal', 'Berlangsung', 'Selesai'
  division_id: number | null;
  dibuat_oleh: string;
  isi: string;
  attachments: NotulensiAttachment[];
  status: string; // 'Draft', 'Final'
  difinalisasi_oleh: string | null;
  updated_at: string;
}

export interface PengumumanDetail {
  pengumuman_id: number;
  judul: string;
  isi: string;
  dibuat_oleh: string;
  target: string; // 'Organisasi', 'Divisi'
  division_id: number | null;
  tanggal: string;
}

export interface ModuleEntry {
  module_id: number;
  module_name: string;
  is_core: boolean;
}

export interface NavModulesResponse {
  core_modules: ModuleEntry[];
  role_modules: ModuleEntry[];
  divisi_modules: ModuleEntry[];
}

export interface JenisDokumenDetail {
  jenis_id: number;
  nama: string;
}

export interface ListJenisDokumenResponse {
  jenis_dokumen: JenisDokumenDetail[];
}

export interface ListDokumenResponse {
  dokumen: DokumenDetail[];
}

export interface ListPendingResponse {
  persetujuan: PersetujuanDetail[];
}

export interface ListPresensiResponse {
  presensi: PresensiDetail[];
}

export interface AssetDetail {
  asset_id: number;
  nama: string;
  deskripsi: string;
  status: string;
  created_at: string;
}

export interface PeminjamanDetail {
  peminjaman_id: number;
  asset_id: number;
  proker_id: number | null;
  dipinjam_oleh: string;
  waktu_mulai: string;
  waktu_selesai: string;
  keterangan: string;
  created_at: string;
}

export interface ListPeminjamanResponse {
  peminjaman: PeminjamanDetail[];
}

export interface HandoverDetail {
  id: number;
  periode_lama: string;
  periode_baru: string;
  saldo_akhir: number;
  proker_belum_selesai: any;
  kontak_vendor: any;
  catatan: string;
  signature_ketua_lama: string;
  signature_ketua_baru: string;
  signature_pembina: string;
  dibuat_oleh: string;
  created_at: string;
}

export interface DokumentasiPDD {
  id: number;
  judul: string;
  deskripsi: string;
  kegiatan: string;
  tanggal_kegiatan: string;
  lokasi: string;
  sekbid_asal: number | null;
  proker_id: number | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  drive_url?: string | null;
  folder_name?: string | null;
  attachments?: DokumentasiAttachmentPDD[];
  dibuat_oleh: string;
  created_at: string;
}

export interface DokumentasiAttachmentPDD {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url?: string | null;
  drive_url?: string | null;
  created_at: string;
}

export const api = {
  // Auth
  login: (nis: string, password: string) =>
    request<LoginResponse>("/user/login", {
      method: "POST",
      body: JSON.stringify({ nis, password }),
    }),

  register: (data: {
    nis: string;
    nama: string;
    jurusan: string;
    tahun_masuk: number;
    password: string;
  }) =>
    request<{ message: string }>("/user/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProfile: () => request<UserDetail>("/user/profile"),

  listUsers: async (params?: { division_id?: number; group_name?: string; periode_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.division_id !== undefined) q.set("division_id", String(params.division_id));
    if (params?.group_name !== undefined) q.set("group_name", params.group_name);
    if (params?.periode_id !== undefined) q.set("periode_id", String(params.periode_id));
    const qs = q.toString();
    try {
      const res = await request<{ users: UserDetail[] }>(`/users${qs ? "?" + qs : ""}`);
      if (typeof window !== "undefined" && res?.users) {
        try {
          // Cache untuk absensi
          if (params?.division_id) {
            localStorage.setItem(`canopy_anggota_${params.division_id}`, JSON.stringify(res.users));
          }
          const allRaw = localStorage.getItem("canopy_all_anggota");
          let all: any[] = allRaw ? JSON.parse(allRaw) : [];
          // merge
          for (const u of res.users) {
            if (!all.find((x: any) => x.nis === u.nis)) all.push(u);
          }
          localStorage.setItem("canopy_all_anggota", JSON.stringify(all));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend listUsers failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        try {
          if (params?.division_id) {
            const cached = localStorage.getItem(`canopy_anggota_${params.division_id}`);
            if (cached) return { users: JSON.parse(cached) };
          }
          const allRaw = localStorage.getItem("canopy_all_anggota");
          if (allRaw) {
            let all = JSON.parse(allRaw) as UserDetail[];
            if (params?.division_id) all = all.filter((u) => u.division_id === params.division_id);
            if (params?.group_name) all = all.filter((u) => u.group_name === params.group_name);
            if (all.length > 0) return { users: all };
          }
        } catch {}
      }
      return { users: [] };
    }
  },

  assignMembership: (data: { nis: string; role_id: number; division_id?: number; periode_id: number }) =>
    request<{ membership_id: number; message: string }>("/user/membership", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRiwayatJabatan: (nis: string) =>
    request<{
      riwayat: {
        membership_id: number;
        role_id: number;
        role_name: string;
        group_name: string;
        division_id: number | null;
        periode_id: number;
        tahun_ajaran: string;
        status: string;
      }[];
    }>(`/users/${nis}/riwayat`),

  listRoles: () =>
    request<{
      roles: {
        role_id: number;
        group_id: number;
        group_name: string;
        role_name: string;
        level: number;
        scope_divisi_awal: number | null;
        scope_divisi_akhir: number | null;
      }[];
    }>("/roles"),

  listPeriode: () =>
    request<{
      periode: {
        periode_id: number;
        tahun_ajaran: string;
        saldo_awal: number;
        is_aktif: boolean;
      }[];
    }>("/periode"),

  // Divisions
  listDivisions: () =>
    request<{ divisions: DivisionDetail[] }>("/divisions"),

  getDivision: (id: number) =>
    request<DivisionDetail>(`/divisions/${id}`),

  getNavModules: () =>
    request<NavModulesResponse>("/nav/modules"),

  assignDivisiModule: (division_id: number, module_id: number) =>
    request<{ message: string }>("/divisions/module", {
      method: "POST",
      body: JSON.stringify({ division_id, module_id }),
    }),

  listModules: () =>
    request<{ modules: ModuleEntry[] }>("/modules"),

  // Proker
  listProkers: async () => {
    try {
      const res = await request<{ prokers: ProkerDetail[] }>("/prokers");
      if (res && Array.isArray(res.prokers)) {
        res.prokers = res.prokers.map(withAutoStatus);
        if (typeof window !== "undefined") {
          try { localStorage.setItem("canopy_prokers", JSON.stringify(res.prokers)); } catch {}
        }
      }
      return res;
    } catch (e) {
      console.warn("Backend listProkers failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_prokers");
        if (raw) {
          try {
            return { prokers: (JSON.parse(raw) as ProkerDetail[]).map(withAutoStatus) };
          } catch {}
        }
      }
      return { prokers: [] };
    }
  },

  getProker: async (id: number) => {
    try {
      return withAutoStatus(await request<ProkerDetail>(`/proker/${id}`));
    } catch (e) {
      console.warn("Backend getProker failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_prokers");
        if (raw) {
          try {
            const arr = JSON.parse(raw) as ProkerDetail[];
            const found = arr.find((p) => p.proker_id === id);
            if (found) return withAutoStatus(found);
          } catch {}
        }
      }
      throw e;
    }
  },

  createProker: async (data: {
    nama: string;
    deskripsi: string;
    division_id?: number;
    anggaran_disetujui: number;
    penanggung_jawab?: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  }) => {
    try {
      const res = await request<ProkerDetail>("/proker", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (typeof window !== "undefined" && res?.proker_id) {
        try {
          const raw = localStorage.getItem("canopy_prokers");
          let arr: ProkerDetail[] = raw ? JSON.parse(raw) : [];
          arr.unshift(res);
          localStorage.setItem("canopy_prokers", JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend createProker failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        let currentUser: any = {};
        try { currentUser = JSON.parse(localStorage.getItem("canopy_user") || "{}"); } catch {}
        const fake: ProkerDetail = {
          proker_id: Date.now(),
          division_id: data.division_id ?? null,
          periode_id: 0,
          nama: data.nama,
          deskripsi: data.deskripsi,
          anggaran_disetujui: data.anggaran_disetujui,
          status: "Belum Mulai",
          penanggung_jawab: data.penanggung_jawab ?? null,
          tanggal_mulai: data.tanggal_mulai,
          tanggal_selesai: data.tanggal_selesai,
          dibuat_oleh: currentUser?.nis || "local",
          created_at: new Date().toISOString(),
        };
        const raw = localStorage.getItem("canopy_prokers");
        let arr: ProkerDetail[] = raw ? JSON.parse(raw) : [];
        arr.unshift(fake);
        localStorage.setItem("canopy_prokers", JSON.stringify(arr));
        return fake;
      }
      throw e;
    }
  },

  updateProker: async (
    id: number,
    data: {
      nama: string;
      deskripsi: string;
      division_id?: number;
      anggaran_disetujui: number;
      penanggung_jawab?: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
    }
  ) => {
    try {
      const res = await request<ProkerDetail>(`/proker/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (typeof window !== "undefined" && res?.proker_id) {
        try {
          const raw = localStorage.getItem("canopy_prokers");
          let arr: ProkerDetail[] = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex((p) => p.proker_id === id);
          if (idx >= 0) arr[idx] = res;
          localStorage.setItem("canopy_prokers", JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend updateProker failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        let old: ProkerDetail | undefined;
        try {
          const raw = localStorage.getItem("canopy_prokers");
          if (raw) old = (JSON.parse(raw) as ProkerDetail[]).find((p) => p.proker_id === id);
        } catch {}
        if (!old) throw e;
        const updated: ProkerDetail = {
          ...old,
          nama: data.nama,
          deskripsi: data.deskripsi,
          division_id: data.division_id ?? null,
          anggaran_disetujui: data.anggaran_disetujui,
          penanggung_jawab: data.penanggung_jawab ?? null,
          tanggal_mulai: data.tanggal_mulai,
          tanggal_selesai: data.tanggal_selesai,
        };
        try {
          const raw = localStorage.getItem("canopy_prokers");
          let arr: ProkerDetail[] = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex((p) => p.proker_id === id);
          if (idx >= 0) arr[idx] = updated;
          localStorage.setItem("canopy_prokers", JSON.stringify(arr));
        } catch {}
        return updated;
      }
      throw e;
    }
  },

  deleteProker: async (id: number) => {
    try {
      await request<void>(`/proker/${id}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Backend deleteProker failed, fallback localStorage:", e);
    }
    // Bersihkan cache lokal apa pun hasilnya agar UI konsisten
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("canopy_prokers");
        if (raw) {
          const arr = (JSON.parse(raw) as ProkerDetail[]).filter((p) => p.proker_id !== id);
          localStorage.setItem("canopy_prokers", JSON.stringify(arr));
        }
      } catch {}
    }
  },

  // Task Template
  createTaskTemplate: (data: {
    nama_template: string;
    fields: {
      label: string;
      tipe_input: string;
      opsi_dropdown?: string;
      wajib: boolean;
      urutan: number;
    }[];
  }) =>
    request<TaskTemplateDetail>("/task-template", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listTaskTemplates: () =>
    request<{ templates: TaskTemplateDetail[] }>("/task-templates"),

  // Tasks
  createTask: (data: {
    proker_id: number;
    template_id?: number;
    scope: string; // 'Individual', 'General'
    assigned_to?: string;
    judul: string;
    deskripsi: string;
    deadline: string;
    custom_data?: string;
  }) =>
    request<TaskDetail>("/task", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listTasks: () =>
    request<{ tasks: TaskDetail[] }>("/tasks"),

  tawarkanTask: (id: number) =>
    request<TaskDetail>(`/task/${id}/tawarkan`, { method: "POST" }),

  ambilTask: (id: number) =>
    request<TaskDetail>(`/task/${id}/ambil`, { method: "POST" }),

  selelesaikanTask: (id: number) =>
    request<TaskDetail>(`/task/${id}/selesai`, { method: "POST" }),

  // Catatan Pembinaan
  createCatatanPembinaan: (proker_id: number, isi: string) =>
    request<{ catatan_id: number; proker_id: number; dibuat_oleh: string; isi: string; tanggal: string }>("/catatan-pembinaan", {
      method: "POST",
      body: JSON.stringify({ proker_id, isi }),
    }),

  listCatatanPembinaan: (proker_id: number) =>
    request<{ catatan: { catatan_id: number; proker_id: number; dibuat_oleh: string; isi: string; tanggal: string }[] }>(`/catatan-pembinaan/${proker_id}`),

  // Finance - Transaksi (resilient: backend + localStorage fallback agar tetap bisa simpan saat DB staging bermasalah)
  listTransactions: async (params?: { division_id?: number; proker_id?: number; kategori_id?: number; status?: string; start_date?: string; end_date?: string }) => {
    const q = new URLSearchParams();
    if (params?.division_id !== undefined) q.set("division_id", String(params.division_id));
    if (params?.proker_id !== undefined) q.set("proker_id", String(params.proker_id));
    if (params?.kategori_id !== undefined) q.set("kategori_id", String(params.kategori_id));
    if (params?.status) q.set("status", params.status);
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date) q.set("end_date", params.end_date);
    const qs = q.toString();
    try {
      const res = await request<{
        transaksi: TransaksiDetail[];
        total_masuk: number;
        total_keluar: number;
        saldo: number;
      }>(`/finance/transaksi${qs ? "?" + qs : ""}`);
      if (res && Array.isArray(res.transaksi)) {
        if (typeof window !== "undefined") {
          try { localStorage.setItem("canopy_local_finance_txns", JSON.stringify(res.transaksi)); } catch {}
        }
        return res;
      }
    } catch (e) {
      console.warn("Backend finance transaksi unavailable, fallback localStorage:", e);
    }
    // Fallback localStorage
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("canopy_local_finance_txns");
        if (local) {
          const arr = JSON.parse(local) as TransaksiDetail[];
          let filtered = arr;
          if (params?.division_id) filtered = filtered.filter((t) => t.division_id === params.division_id);
          if (params?.proker_id) filtered = filtered.filter((t) => t.proker_id === params.proker_id);
          if (params?.kategori_id) filtered = filtered.filter((t) => t.kategori_id === params.kategori_id);
          if (params?.status) filtered = filtered.filter((t) => t.status === params.status);
          const totalMasuk = filtered.filter((t) => t.jenis === "Masuk" && (t.status === "Disetujui" || t.status === "Terverifikasi")).reduce((s, t) => s + t.nominal, 0);
          const totalKeluar = filtered.filter((t) => t.jenis === "Keluar" && (t.status === "Disetujui" || t.status === "Terverifikasi")).reduce((s, t) => s + t.nominal, 0);
          return { transaksi: filtered, total_masuk: totalMasuk, total_keluar: totalKeluar, saldo: totalMasuk - totalKeluar };
        }
      } catch {}
    }
    return { transaksi: [], total_masuk: 0, total_keluar: 0, saldo: 0 };
  },

  createTransaction: async (data: {
    proker_id?: number;
    kategori_id?: number;
    division_id?: number;
    pengajuan_id?: number;
    jenis: string;
    nominal: number;
    deskripsi: string;
    bukti_url?: string;
    sumber?: string;
    is_berisiko?: boolean;
    tanggal: string;
    file_name?: string;
    file_type?: string;
    file_data_b64?: string;
  }) => {
    const payload = { division_id: 1, ...data } as any;
    try {
      const res = await request<TransaksiDetail>("/finance/transaksi", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Simpan ke localStorage juga untuk persistence lokal
      if (typeof window !== "undefined" && res?.transaksi_id) {
        try {
          const local = localStorage.getItem("canopy_local_finance_txns");
          let arr: TransaksiDetail[] = local ? JSON.parse(local) : [];
          // Jika file diupload, simpan bukti_url sebagai data URL agar bisa dibuka offline
          if (payload.file_data_b64 && payload.file_name) {
            const dataUrl = `data:${payload.file_type || "application/octet-stream"};base64,${payload.file_data_b64}`;
            res.bukti_url = dataUrl;
            res.file_name = payload.file_name;
            res.file_type = payload.file_type;
            res.file_size = Math.round((payload.file_data_b64.length * 3) / 4);
          }
          arr.unshift(res);
          localStorage.setItem("canopy_local_finance_txns", JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e: any) {
      console.warn("Backend createTransaction failed, saving locally:", e);
      const msg = e?.message || "";
      // Jika error karena DB staging missing table, tetap simpan lokal agar bisa simpen
      if (msg.includes("relation") || msg.includes("does not exist") || msg.includes("Failed to fetch") || msg.includes("500")) {
        if (typeof window !== "undefined") {
          const currentUser = JSON.parse(localStorage.getItem("canopy_user") || "{}");
          const fake: TransaksiDetail = {
            transaksi_id: Date.now(),
            proker_id: payload.proker_id ?? null,
            kategori_id: payload.kategori_id ?? null,
            kategori_nama: null,
            division_id: payload.division_id ?? 1,
            pengajuan_id: payload.pengajuan_id ?? null,
            dicatat_oleh: currentUser?.nis || "local",
            jenis: payload.jenis,
            nominal: payload.nominal,
            deskripsi: payload.deskripsi,
            bukti_url: payload.bukti_url || null,
            sumber: payload.sumber || "Manual",
            is_berisiko: !!payload.is_berisiko,
            status: "Disetujui",
            alasan_penolakan: null,
            tanggal: payload.tanggal,
            created_at: new Date().toISOString(),
            file_name: payload.file_name || null,
            file_type: payload.file_type || null,
            file_size: payload.file_data_b64 ? Math.round((payload.file_data_b64.length * 3) / 4) : null,
          };
          // Jika ada file, buat data URL untuk preview lokal
          if (payload.file_data_b64 && payload.file_name) {
            const dataUrl = `data:${payload.file_type || "application/octet-stream"};base64,${payload.file_data_b64}`;
            fake.bukti_url = dataUrl;
          }
          try {
            const local = localStorage.getItem("canopy_local_finance_txns");
            let arr: TransaksiDetail[] = local ? JSON.parse(local) : [];
            arr.unshift(fake);
            localStorage.setItem("canopy_local_finance_txns", JSON.stringify(arr));
          } catch {}
          return fake;
        }
      }
      throw e;
    }
  },

  getTransaction: async (id: number) => {
    try {
      return await request<TransaksiDetail>(`/finance/transaksi/${id}`);
    } catch {
      if (typeof window !== "undefined") {
        const local = localStorage.getItem("canopy_local_finance_txns");
        if (local) {
          const arr = JSON.parse(local) as TransaksiDetail[];
          const found = arr.find((t) => t.transaksi_id === id);
          if (found) return found;
        }
      }
      throw new Error("transaksi tidak ditemukan");
    }
  },

  getBalance: async (params?: { division_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.division_id !== undefined) q.set("division_id", String(params.division_id));
    const qs = q.toString();
    try {
      return await request<{
        total_masuk: number;
        total_keluar: number;
        saldo: number;
      }>(`/finance/saldo${qs ? "?" + qs : ""}`);
    } catch {
      if (typeof window !== "undefined") {
        try {
          const local = localStorage.getItem("canopy_local_finance_txns");
          if (local) {
            let arr = JSON.parse(local) as TransaksiDetail[];
            if (params?.division_id) arr = arr.filter((t) => t.division_id === params.division_id);
            const totalMasuk = arr.filter((t) => t.jenis === "Masuk" && (t.status === "Disetujui" || t.status === "Terverifikasi")).reduce((s, t) => s + t.nominal, 0);
            const totalKeluar = arr.filter((t) => t.jenis === "Keluar" && (t.status === "Disetujui" || t.status === "Terverifikasi")).reduce((s, t) => s + t.nominal, 0);
            return { total_masuk: totalMasuk, total_keluar: totalKeluar, saldo: totalMasuk - totalKeluar };
          }
        } catch {}
      }
      return { total_masuk: 0, total_keluar: 0, saldo: 0 };
    }
  },

  getAnggaranProker: (proker_id: number) =>
    request<{
      proker_id: number;
      anggaran_disetujui: number;
      terpakai: number;
      persentase: number;
      status_alarm: string;
    }>(`/finance/anggaran/${proker_id}`),

  verifikasiScanNota: (id: number, disetujui: boolean, alasan_penolakan?: string) =>
    request<TransaksiDetail>(`/finance/transaksi/${id}/verifikasi`, {
      method: "POST",
      body: JSON.stringify({ disetujui, alasan_penolakan }),
    }),

  verifikasiBukti: (id: number, disetujui: boolean, catatan?: string) =>
    request<TransaksiDetail>(`/finance/transaksi/${id}/verifikasi-bukti`, {
      method: "POST",
      body: JSON.stringify({ disetujui, catatan, alasan_penolakan: catatan }),
    }),

  approvalBerisiko: (id: number, disetujui: boolean, alasan_penolakan?: string) =>
    request<TransaksiDetail>(`/finance/transaksi/${id}/approval-berisiko`, {
      method: "POST",
      body: JSON.stringify({ disetujui, alasan_penolakan }),
    }),

  listMenungguVerifikasi: () =>
    request<{ transaksi: TransaksiDetail[] }>("/finance/antrian-verifikasi"),

  listMenungguApprovalBerisiko: () =>
    request<{ transaksi: TransaksiDetail[] }>("/finance/antrian-berisiko"),

  listVerifikasiBukti: () =>
    request<{ transaksi: TransaksiDetail[] }>("/finance/verifikasi-bukti"),

  uploadBuktiTransaksi: (id: number, data: { file_name: string; file_type: string; file_data_b64: string }) =>
    request<{ url: string; name: string; file_type: string; file_size: number }>(`/finance/transaksi/${id}/bukti-upload`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listKategori: async () => {
    try {
      return await request<{ kategori: { kategori_id: number; nama: string }[] }>("/finance/kategori");
    } catch {
      // Fallback hardcoded jika DB finance staging belum migrate
      return {
        kategori: [
          { kategori_id: 1, nama: "Dana Sekolah" },
          { kategori_id: 2, nama: "Sponsor" },
          { kategori_id: 3, nama: "Iuran" },
          { kategori_id: 4, nama: "Donasi" },
          { kategori_id: 5, nama: "Penjualan" },
          { kategori_id: 6, nama: "Pengembalian Dana" },
          { kategori_id: 7, nama: "Lainnya" },
          { kategori_id: 8, nama: "Konsumsi" },
          { kategori_id: 9, nama: "ATK" },
          { kategori_id: 10, nama: "Transportasi" },
          { kategori_id: 11, nama: "Perlengkapan Kegiatan" },
          { kategori_id: 12, nama: "Dokumentasi" },
          { kategori_id: 13, nama: "Publikasi" },
          { kategori_id: 14, nama: "Hadiah/Penghargaan" },
          { kategori_id: 15, nama: "Sewa" },
          { kategori_id: 16, nama: "Operasional" },
        ],
      };
    }
  },

  // Finance - Pengajuan Dana
  listPengajuan: () => request<{ pengajuan: PengajuanDanaDetail[] }>("/finance/pengajuan"),
  getPengajuan: (id: number) => request<PengajuanDanaDetail>(`/finance/pengajuan/${id}`),
  createPengajuan: (data: {
    nama_pengajuan: string;
    proker_id?: number;
    division_id: number;
    nominal: number;
    keperluan: string;
    deskripsi: string;
    deadline: string;
    lampiran_url?: string;
    file_name?: string;
    file_type?: string;
    file_data_b64?: string;
  }) => request<PengajuanDanaDetail>("/finance/pengajuan", { method: "POST", body: JSON.stringify(data) }),
  verifikasiPengajuan: (id: number, catatan?: string) =>
    request<PengajuanDanaDetail>(`/finance/pengajuan/${id}/verifikasi`, { method: "POST", body: JSON.stringify({ catatan }) }),
  setujuiPengajuan: (id: number, catatan?: string) =>
    request<PengajuanDanaDetail>(`/finance/pengajuan/${id}/setujui`, { method: "POST", body: JSON.stringify({ catatan }) }),
  tolakPengajuan: (id: number, alasan: string) =>
    request<PengajuanDanaDetail>(`/finance/pengajuan/${id}/tolak`, { method: "POST", body: JSON.stringify({ alasan_penolakan: alasan, catatan: alasan }) }),
  cairkanPengajuan: (id: number) =>
    request<PengajuanDanaDetail>(`/finance/pengajuan/${id}/cairkan`, { method: "POST" }),
  uploadLampiranPengajuan: (id: number, data: { file_name: string; file_type: string; file_data_b64: string }) =>
    request<{ url: string; name: string; file_type: string; file_size: number }>(`/finance/pengajuan/${id}/lampiran-upload`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Approvals (Dokumen Persetujuan Berjenjang)
  listJenisDokumen: () =>
    request<ListJenisDokumenResponse>("/approval/jenis-dokumen"),

  buatDokumen: (data: {
    proker_id?: number;
    jenis_id: number;
    file_url: string;
    is_eksternal: boolean;
  }) =>
    request<DokumenDetail>("/approval/dokumen", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listDokumen: () =>
    request<ListDokumenResponse>("/approval/dokumen"),

  getDokumen: (id: number) =>
    request<DokumenDetail>(`/approval/dokumen/${id}`),

  listPendingApprovals: () =>
    request<ListPendingResponse>("/approval/pending"),

  actionApproval: (id: number, keputusan: string, catatan?: string) =>
    request<{ message: string }>(`/approval/persetujuan/${id}/aksi`, {
      method: "POST",
      body: JSON.stringify({ keputusan, catatan }),
    }),

  // Meetings with resilient storage fallback
  listMeetings: async (): Promise<{ rapat: RapatDetail[] }> => {
    try {
      const res = await request<{ rapat: RapatDetail[] }>("/rapat");
      if (res && Array.isArray(res.rapat)) {
        if (typeof window !== "undefined") {
          localStorage.setItem("canopy_local_meetings", JSON.stringify(res.rapat));
        }
        return res;
      }
    } catch (e) {
      console.warn("Backend unavailable, loading local meetings:", e);
    }
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_meetings");
      if (local) {
        try {
          return { rapat: JSON.parse(local) };
        } catch {}
      }
    }
    const defaultMeetings: RapatDetail[] = [
      {
        rapat_id: 101,
        periode_id: 1,
        division_id: null,
        judul: "[BPH] Rapat Koordinasi Mingguan BPH",
        tanggal: new Date(Date.now() + 86400000).toISOString(),
        lokasi: "Ruang OSIS",
        agenda: "Evaluasi program kerja mingguan dan persiapan classmeeting",
        dibuat_oleh: "20011",
        status: "Terjadwal",
        created_at: new Date().toISOString(),
        qr_code: "QR-BPH-2026",
      },
      {
        rapat_id: 102,
        periode_id: 1,
        division_id: 1,
        judul: "Rapat Persiapan Program Keagamaan & Sholat Dhuha",
        tanggal: new Date(Date.now() + 172800000).toISOString(),
        lokasi: "Masjid Sekolah",
        agenda: "Penyusunan jadwal piket ibadah dan kajian bulanan",
        dibuat_oleh: "20101",
        status: "Terjadwal",
        created_at: new Date().toISOString(),
        qr_code: "QR-SEKBID1-2026",
      },
      {
        rapat_id: 103,
        periode_id: 1,
        division_id: 9,
        judul: "Rapat Teknis Tim Dokumentasi & Website OSIS",
        tanggal: new Date(Date.now() + 259200000).toISOString(),
        lokasi: "Lab Komputer 2",
        agenda: "Pengembangan web Canopy dan siaran mading digital",
        dibuat_oleh: "20109",
        status: "Terjadwal",
        created_at: new Date().toISOString(),
        qr_code: "QR-SEKBID9-2026",
      },
    ];
    if (typeof window !== "undefined") {
      localStorage.setItem("canopy_local_meetings", JSON.stringify(defaultMeetings));
    }
    return { rapat: defaultMeetings };
  },

  createMeeting: async (data: {
    division_id?: number;
    judul: string;
    tanggal: string;
    lokasi: string;
    agenda: string;
  }): Promise<RapatDetail> => {
    let result: RapatDetail | null = null;
    try {
      result = await request<RapatDetail>("/rapat", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn("Backend unavailable, storing meeting locally:", e);
    }

    if (!result || !result.rapat_id) {
      const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("canopy_user") || "{}") : {};
      result = {
        rapat_id: Date.now(),
        periode_id: 1,
        division_id: data.division_id || null,
        judul: data.judul,
        tanggal: data.tanggal,
        lokasi: data.lokasi || "Belum ditentukan",
        agenda: data.agenda || "",
        dibuat_oleh: currentUser?.nis || "20011",
        status: "Terjadwal",
        created_at: new Date().toISOString(),
        qr_code: "QR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_meetings");
      let list: RapatDetail[] = [];
      if (local) {
        try { list = JSON.parse(local); } catch {}
      }
      localStorage.setItem("canopy_local_meetings", JSON.stringify([result, ...list]));

      // Tambahkan ke pengumuman lokal juga
      const localAnn = localStorage.getItem("canopy_local_announcements");
      let annList: PengumumanDetail[] = [];
      if (localAnn) {
        try { annList = JSON.parse(localAnn); } catch {}
      }
      annList.unshift({
        pengumuman_id: Date.now(),
        judul: `📅 Jadwal Rapat Baru: ${data.judul}`,
        isi: `Rapat '${data.judul}' telah dijadwalkan pada ${new Date(data.tanggal).toLocaleString("id-ID")} di ${data.lokasi || "Belum ditentukan"}. Agenda: ${data.agenda}`,
        dibuat_oleh: result.dibuat_oleh,
        target: data.division_id ? "Divisi" : "Organisasi",
        division_id: data.division_id || null,
        tanggal: new Date().toISOString(),
      });
      localStorage.setItem("canopy_local_announcements", JSON.stringify(annList));
    }

    return result;
  },

  getMeeting: (id: number) =>
    request<RapatDetail>(`/rapat/${id}`),

  updateMeeting: async (
    id: number,
    data: {
      judul?: string;
      tanggal?: string;
      lokasi?: string;
      agenda?: string;
      division_id?: number | null;
      status?: string;
    }
  ): Promise<RapatDetail> => {
    let result: RapatDetail | null = null;
    try {
      result = await request<RapatDetail>(`/rapat/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn("Backend unavailable, updating meeting locally:", e);
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_meetings");
      let list: RapatDetail[] = [];
      if (local) {
        try { list = JSON.parse(local); } catch {}
      }
      const idx = list.findIndex((m) => m.rapat_id === id);
      if (idx >= 0) {
        const updated: RapatDetail = {
          ...list[idx],
          ...(data.judul !== undefined ? { judul: data.judul } : {}),
          ...(data.tanggal !== undefined ? { tanggal: data.tanggal } : {}),
          ...(data.lokasi !== undefined ? { lokasi: data.lokasi } : {}),
          ...(data.agenda !== undefined ? { agenda: data.agenda } : {}),
          ...(data.division_id !== undefined ? { division_id: data.division_id } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        };
        list[idx] = updated;
        localStorage.setItem("canopy_local_meetings", JSON.stringify([...list]));
        result = updated;

        // Tambah notifikasi update
        const localAnn = localStorage.getItem("canopy_local_announcements");
        let annList: PengumumanDetail[] = [];
        if (localAnn) {
          try { annList = JSON.parse(localAnn); } catch {}
        }
        annList.unshift({
          pengumuman_id: Date.now(),
          judul: `✏️ Pembaruan Jadwal: ${updated.judul}`,
          isi: `Jadwal rapat '${updated.judul}' telah diperbarui. Waktu: ${new Date(updated.tanggal).toLocaleString("id-ID")}, Lokasi: ${updated.lokasi}, Status: ${updated.status}. Agenda: ${updated.agenda}`,
          dibuat_oleh: updated.dibuat_oleh,
          target: updated.division_id ? "Divisi" : "Organisasi",
          division_id: updated.division_id || null,
          tanggal: new Date().toISOString(),
        });
        localStorage.setItem("canopy_local_announcements", JSON.stringify(annList));
      }
    }

    if (result) return result;
    throw new Error("Rapat tidak ditemukan");
  },

  deleteMeeting: async (id: number): Promise<{ message: string }> => {
    try {
      await request<{ message: string }>(`/rapat/${id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Backend unavailable, deleting meeting locally:", e);
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_meetings");
      let list: RapatDetail[] = [];
      if (local) {
        try { list = JSON.parse(local); } catch {}
      }
      const deleted = list.find((m) => m.rapat_id === id);
      localStorage.setItem("canopy_local_meetings", JSON.stringify(list.filter((m) => m.rapat_id !== id)));

      if (deleted) {
        const localAnn = localStorage.getItem("canopy_local_announcements");
        let annList: PengumumanDetail[] = [];
        if (localAnn) {
          try { annList = JSON.parse(localAnn); } catch {}
        }
        annList.unshift({
          pengumuman_id: Date.now(),
          judul: `❌ Pembatalan Rapat: ${deleted.judul}`,
          isi: `Rapat '${deleted.judul}' yang sebelumnya dijadwalkan telah dibatalkan / dihapus dari agenda.`,
          dibuat_oleh: deleted.dibuat_oleh,
          target: deleted.division_id ? "Divisi" : "Organisasi",
          division_id: deleted.division_id || null,
          tanggal: new Date().toISOString(),
        });
        localStorage.setItem("canopy_local_announcements", JSON.stringify(annList));
      }
    }

    return { message: "Jadwal rapat berhasil dihapus" };
  },

  updateStatusRapat: (id: number, status: string) =>
    request<{ message: string }>(`/rapat/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  upsertNotulensi: async (id: number, isi: string, attachments: NotulensiAttachment[] = []) => {
    try {
      const res = await request<NotulensiDetail>(`/rapat/${id}/notulensi`, {
        method: "PUT",
        body: JSON.stringify({ isi, attachments }),
      });
      if (typeof window !== "undefined" && res?.notulensi_id) {
        try {
          localStorage.setItem(`canopy_local_notulensi_${id}`, JSON.stringify(res));
          // Also keep index for list
          const idxRaw = localStorage.getItem("canopy_local_notulensi_index");
          let idx: number[] = idxRaw ? JSON.parse(idxRaw) : [];
          if (!idx.includes(id)) { idx.push(id); localStorage.setItem("canopy_local_notulensi_index", JSON.stringify(idx)); }
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend upsertNotulensi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const currentUser = JSON.parse(localStorage.getItem("canopy_user") || "{}");
        const existingRaw = localStorage.getItem(`canopy_local_notulensi_${id}`);
        let existing: NotulensiDetail | null = null;
        try { existing = existingRaw ? JSON.parse(existingRaw) : null; } catch {}
        const now = new Date().toISOString();
        const fake: NotulensiDetail = {
          notulensi_id: existing?.notulensi_id || Date.now(),
          rapat_id: id,
          isi,
          attachments: attachments || [],
          difinalisasi_oleh: existing?.difinalisasi_oleh || null,
          status: existing?.status || "Draft",
          updated_at: now,
        };
        // If previously Final, keep Final unless explicitly changed
        if (existing?.status === "Final") fake.status = "Final";
        localStorage.setItem(`canopy_local_notulensi_${id}`, JSON.stringify(fake));
        const idxRaw = localStorage.getItem("canopy_local_notulensi_index");
        let idx: number[] = idxRaw ? JSON.parse(idxRaw) : [];
        if (!idx.includes(id)) { idx.push(id); localStorage.setItem("canopy_local_notulensi_index", JSON.stringify(idx)); }
        return fake;
      }
      throw e;
    }
  },

  uploadNotulensiFile: async (
    rapatId: number,
    file: File
  ): Promise<NotulensiAttachment> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const res = await request<{ url: string; name: string; file_type: string }>(
        `/rapat/${rapatId}/notulensi/upload`,
        {
          method: "POST",
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_data_b64: base64,
          }),
        }
      );
      return { url: res.url, name: res.name, type: res.file_type };
    } catch (e) {
      console.warn("Backend uploadNotulensiFile failed, fallback data URL:", e);
      // Fallback: buat data URL lokal agar tetap bisa preview dan tersimpan di notulensi
      const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;
      return { url: dataUrl, name: file.name, type: file.type || "application/octet-stream" };
    }
  },

  finalisasiNotulensi: async (id: number) => {
    try {
      const res = await request<NotulensiDetail>(`/rapat/${id}/notulensi/finalisasi`, { method: "POST" });
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`canopy_local_notulensi_${id}`);
          if (raw) {
            const obj = JSON.parse(raw);
            obj.status = "Final";
            obj.difinalisasi_oleh = JSON.parse(localStorage.getItem("canopy_user") || "{}")?.nis || obj.difinalisasi_oleh;
            obj.updated_at = new Date().toISOString();
            localStorage.setItem(`canopy_local_notulensi_${id}`, JSON.stringify(obj));
          }
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend finalisasi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`canopy_local_notulensi_${id}`);
        if (raw) {
          const obj = JSON.parse(raw);
          obj.status = "Final";
          obj.difinalisasi_oleh = JSON.parse(localStorage.getItem("canopy_user") || "{}")?.nis || "local";
          obj.updated_at = new Date().toISOString();
          localStorage.setItem(`canopy_local_notulensi_${id}`, JSON.stringify(obj));
          return obj as NotulensiDetail;
        }
        throw new Error("Notulensi tidak ditemukan untuk finalisasi");
      }
      throw e;
    }
  },

  getNotulensi: async (id: number) => {
    try {
      return await request<NotulensiDetail>(`/rapat/${id}/notulensi`);
    } catch (e) {
      console.warn("Backend getNotulensi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`canopy_local_notulensi_${id}`);
        if (raw) return JSON.parse(raw) as NotulensiDetail;
      }
      throw e;
    }
  },

  listNotulensi: async () => {
    try {
      const res = await request<{ notulensi: NotulensiListItem[] }>("/notulensi");
      if (res && Array.isArray(res.notulensi) && typeof window !== "undefined") {
        try { localStorage.setItem("canopy_local_notulensi_cache", JSON.stringify(res.notulensi)); } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend listNotulensi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        try {
          const idxRaw = localStorage.getItem("canopy_local_notulensi_index");
          const idx: number[] = idxRaw ? JSON.parse(idxRaw) : [];
          const meetingsRaw = localStorage.getItem("canopy_local_meetings");
          const meetings: any[] = meetingsRaw ? JSON.parse(meetingsRaw) : [];
          const result: NotulensiListItem[] = [];
          for (const rid of idx) {
            const nRaw = localStorage.getItem(`canopy_local_notulensi_${rid}`);
            if (!nRaw) continue;
            const n = JSON.parse(nRaw) as NotulensiDetail;
            const rapat = meetings.find((m) => m.rapat_id === rid);
            result.push({
              notulensi_id: n.notulensi_id,
              rapat_id: n.rapat_id,
              judul_rapat: rapat?.judul || `Rapat #${rid}`,
              tanggal_rapat: rapat?.tanggal || n.updated_at,
              lokasi_rapat: rapat?.lokasi || "-",
              status_rapat: rapat?.status || "Selesai",
              division_id: rapat?.division_id ?? null,
              dibuat_oleh: rapat?.dibuat_oleh || "local",
              isi: n.isi,
              attachments: n.attachments || [],
              status: n.status,
              difinalisasi_oleh: n.difinalisasi_oleh,
              updated_at: n.updated_at,
            });
          }
          if (result.length > 0) return { notulensi: result };
          const cache = localStorage.getItem("canopy_local_notulensi_cache");
          if (cache) return { notulensi: JSON.parse(cache) };
        } catch {}
      }
      return { notulensi: [] };
    }
  },

  scanPresensi: async (data: {
    qr_token: string;
    acara_id: number;
    foto_url?: string;
    tipe: string; // 'Hadir', 'Izin', 'Sakit'
    keterangan?: string;
    bukti_url?: string;
  }) => {
    try {
      const res = await request<PresensiDetail>("/presensi/scan", { method: "POST", body: JSON.stringify(data) });
      if (typeof window !== "undefined") {
        try {
          const key = "canopy_local_presensi";
          const raw = localStorage.getItem(key);
          let arr: PresensiDetail[] = raw ? JSON.parse(raw) : [];
          // upsert
          const idx = arr.findIndex((p) => p.acara_type === "Rapat" && p.acara_id === data.acara_id && p.nis === JSON.parse(localStorage.getItem("canopy_user")||"{}")?.nis);
          if (idx>=0) arr[idx]=res; else arr.push(res);
          localStorage.setItem(key, JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend scanPresensi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const currentUser = JSON.parse(localStorage.getItem("canopy_user") || "{}");
        const fake: PresensiDetail = {
          presensi_id: Date.now(),
          acara_type: "Rapat",
          acara_id: data.acara_id,
          nis: currentUser?.nis || "unknown",
          tipe: data.tipe,
          keterangan: data.keterangan || null,
          bukti_url: data.bukti_url || null,
          foto_url: data.foto_url || null,
          status_verifikasi: data.tipe === "Hadir" ? "Disetujui" : "Menunggu",
          waktu_submit: new Date().toISOString(),
        };
        const key = "canopy_local_presensi";
        const raw = localStorage.getItem(key);
        let arr: PresensiDetail[] = raw ? JSON.parse(raw) : [];
        const idx = arr.findIndex((p) => p.acara_type==="Rapat" && p.acara_id===data.acara_id && p.nis===fake.nis);
        if (idx>=0) arr[idx]=fake; else arr.push(fake);
        localStorage.setItem(key, JSON.stringify(arr));
        return fake;
      }
      throw e;
    }
  },

  listPresensiRapat: async (id: number) => {
    try {
      const res = await request<ListPresensiResponse>(`/rapat/${id}/presensi`);
      if (typeof window !== "undefined" && res?.presensi) {
        try {
          const key="canopy_local_presensi";
          const raw=localStorage.getItem(key);
          let arr: PresensiDetail[] = raw?JSON.parse(raw):[];
          // merge backend data into local cache (upsert)
          for(const p of res.presensi){ const idx=arr.findIndex(x=>x.presensi_id===p.presensi_id); if(idx>=0) arr[idx]=p; else arr.push(p); }
          localStorage.setItem(key, JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend listPresensiRapat failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw=localStorage.getItem("canopy_local_presensi");
        let arr: PresensiDetail[] = raw?JSON.parse(raw):[];
        const filtered = arr.filter((p)=>p.acara_type==="Rapat" && p.acara_id===id);
        return { presensi: filtered };
      }
      return { presensi: [] };
    }
  },

  recordAttendance: async (id: number, data: { entries: { user_nis: string; status: string }[] }) => {
    try {
      const res = await request<{ message: string }>(`/rapat/${id}/presensi`, { method: "POST", body: JSON.stringify(data) });
      if (typeof window !== "undefined") {
        try{
          const key="canopy_local_presensi";
          const raw=localStorage.getItem(key);
          let arr: PresensiDetail[] = raw?JSON.parse(raw):[];
          for(const ent of data.entries){
            const tipeMap: any = {hadir:"Hadir", izin:"Izin", sakit:"Sakit", alfa:"Alpa", hadir_lower:"Hadir"};
            const tipe = ent.status.charAt(0).toUpperCase()+ent.status.slice(1);
            const fake: PresensiDetail = { presensi_id: Date.now()+Math.floor(Math.random()*1000), acara_type:"Rapat", acara_id:id, nis:ent.user_nis, tipe, keterangan:null, bukti_url:null, foto_url:null, status_verifikasi:"Disetujui", waktu_submit:new Date().toISOString() };
            const idx=arr.findIndex(p=>p.acara_type==="Rapat"&&p.acara_id===id&&p.nis===ent.user_nis);
            if(idx>=0) arr[idx]=fake; else arr.push(fake);
          }
          localStorage.setItem(key, JSON.stringify(arr));
        }catch{}
      }
      return res;
    } catch (e) {
      console.warn("Backend recordAttendance failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const key="canopy_local_presensi";
        const raw=localStorage.getItem(key);
        let arr: PresensiDetail[] = raw?JSON.parse(raw):[];
        for(const ent of data.entries){
          const tipe = ent.status.charAt(0).toUpperCase()+ent.status.slice(1);
          const fake: PresensiDetail = { presensi_id: Date.now()+Math.floor(Math.random()*1000), acara_type:"Rapat", acara_id:id, nis:ent.user_nis, tipe, keterangan:null, bukti_url:null, foto_url:null, status_verifikasi:"Disetujui", waktu_submit:new Date().toISOString() };
          const idx=arr.findIndex(p=>p.acara_type==="Rapat"&&p.acara_id===id&&p.nis===ent.user_nis);
          if(idx>=0) arr[idx]=fake; else arr.push(fake);
        }
        localStorage.setItem(key, JSON.stringify(arr));
        return { message:"Absensi berhasil disimpan (lokal)" };
      }
      throw e;
    }
  },

  verifikasiPresensi: async (id: number, status_verifikasi: string, catatan?: string) => {
    try {
      return await request<PresensiDetail>(`/presensi/${id}/verifikasi`, { method: "POST", body: JSON.stringify({ status_verifikasi, catatan }) });
    } catch (e) {
      console.warn("Backend verifikasiPresensi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw=localStorage.getItem("canopy_local_presensi");
        if(raw){
          let arr: PresensiDetail[] = JSON.parse(raw);
          const idx=arr.findIndex(p=>p.presensi_id===id);
          if(idx>=0){ arr[idx].status_verifikasi=status_verifikasi; localStorage.setItem("canopy_local_presensi", JSON.stringify(arr)); return arr[idx]; }
        }
      }
      throw e;
    }
  },

  listPresensiMenunggu: async () => {
    try {
      const res = await request<ListPresensiResponse>("/presensi/menunggu");
      return res;
    } catch (e) {
      console.warn("Backend listPresensiMenunggu failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw=localStorage.getItem("canopy_local_presensi");
        let arr: PresensiDetail[] = raw?JSON.parse(raw):[];
        const filtered = arr.filter(p=>p.status_verifikasi==="Menunggu");
        return { presensi: filtered };
      }
      return { presensi: [] };
    }
  },

  // Assets
  listAssets: () =>
    request<{ assets: AssetDetail[] }>("/assets"),

  getAsset: (id: number) =>
    request<AssetDetail>(`/asset/${id}`),

  createAsset: (data: { nama: string; description: string }) =>
    request<AssetDetail>("/asset", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAssetStatus: (id: number, status: string) =>
    request<{ message: string }>(`/asset/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  bookAsset: (data: {
    asset_id: number;
    proker_id?: number;
    waktu_mulai: string;
    waktu_selesai: string;
    keterangan: string;
  }) =>
    request<PeminjamanDetail>("/asset/pinjam", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listBookings: (id: number) =>
    request<ListPeminjamanResponse>(`/asset/${id}/peminjaman`),

  // Public
  listEvents: () =>
    request<{
      events: {
        id: number;
        name: string;
        description: string;
        date: string;
        created_by: string;
        created_at: string;
      }[];
    }>("/public/events"),

  listAspirations: () =>
    request<{
      aspirations: {
        id: number;
        content: string;
        is_anonymous: boolean;
        user_nis: string | null;
        status: string;
        created_at: string;
      }[];
    }>("/public/aspirations"),

  submitAspiration: (content: string, is_anonymous: boolean) =>
    request<unknown>("/public/aspiration", {
      method: "POST",
      body: JSON.stringify({ content, is_anonymous }),
    }),

  updateAspirationStatus: (id: number, status: string) =>
    request<{ message: string }>(`/public/aspiration/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Handover
  listHandovers: () =>
    request<{ handovers: HandoverDetail[] }>("/handovers"),

  createHandover: (data: {
    periode_lama: string;
    periode_baru: string;
    saldo_akhir: number;
    proker_belum_selesai: any[];
    kontak_vendor: any[];
    catatan: string;
  }) =>
    request<HandoverDetail>("/handover", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  signHandover: (id: number, data: { signature_role: string; signature: string }) =>
    request<{ message: string }>(`/handover/${id}/sign`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Special Division Modules
  getB1Events: () => request<{ events: any[] }>("/special/b1"),
  createB1Event: (data: any) => request<any>("/special/b1", { method: "POST", body: JSON.stringify(data) }),

  getB2Records: () => request<{ records: any[] }>("/special/b2"),
  createB2Record: (data: any) => request<any>("/special/b2", { method: "POST", body: JSON.stringify(data) }),

  getB3Rosters: () => request<{ rosters: any[] }>("/special/b3"),
  createB3Roster: (data: any) => request<any>("/special/b3", { method: "POST", body: JSON.stringify(data) }),

  getB4Competitions: () => request<{ competitions: any[] }>("/special/b4"),
  createB4Competition: (data: any) => request<any>("/special/b4", { method: "POST", body: JSON.stringify(data) }),

  getB5Surveys: () => request<{ surveys: any[] }>("/special/b5"),
  createB5Survey: (data: any) => request<any>("/special/b5", { method: "POST", body: JSON.stringify(data) }),
  voteB5Survey: (id: number, vote: string) => request<any>(`/special/b5/${id}/vote`, { method: "POST", body: JSON.stringify({ vote }) }),

  getB6Sales: () => request<{ sales: any[] }>("/special/b6"),
  createB6Sale: (data: any) => request<any>("/special/b6", { method: "POST", body: JSON.stringify(data) }),

  getB7Visits: () => request<{ visits: any[] }>("/special/b7"),
  createB7Visit: (data: any) => request<any>("/special/b7", { method: "POST", body: JSON.stringify(data) }),

  getB8Mading: () => request<{ mading: any[] }>("/special/b8"),
  createB8Mading: (data: any) => request<any>("/special/b8", { method: "POST", body: JSON.stringify(data) }),

  getB9Links: () => request<{ links: any[] }>("/special/b9"),
  createB9Link: (data: any) => request<any>("/special/b9", { method: "POST", body: JSON.stringify(data) }),

  getB10Words: () => request<{ words: any[] }>("/special/b10"),
  createB10Word: (data: any) => request<any>("/special/b10", { method: "POST", body: JSON.stringify(data) }),

  // Dokumentasi PDD — Sekbid 9 khusus, setiap Sekbid bisa setor
  listDokumentasi: async (params?: { sekbid_asal?: number }) => {
    const q = new URLSearchParams();
    if (params?.sekbid_asal !== undefined) q.set("sekbid_asal", String(params.sekbid_asal));
    const qs = q.toString();
    try {
      const res = await request<{ dokumentasi: DokumentasiPDD[] }>(`/dokumentasi/pdd${qs ? "?" + qs : ""}`);
      if (res && Array.isArray(res.dokumentasi) && typeof window !== "undefined") {
        try { localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(res.dokumentasi)); } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend dokumentasi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) {
          try {
            let arr = JSON.parse(raw) as DokumentasiPDD[];
            if (params?.sekbid_asal !== undefined) {
              arr = arr.filter((d) => d.sekbid_asal === params.sekbid_asal || (params.sekbid_asal as any) === 0);
            }
            return { dokumentasi: arr };
          } catch {}
        }
      }
      return { dokumentasi: [] };
    }
  },
  getDokumentasi: async (id: number) => {
    try { return await request<DokumentasiPDD>(`/dokumentasi/pdd/${id}`); } catch (e) {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) { const arr = JSON.parse(raw) as DokumentasiPDD[]; const found = arr.find((d) => d.id === id); if (found) return found; }
      }
      throw e;
    }
  },
  createDokumentasi: async (data: { judul: string; deskripsi?: string; kegiatan: string; tanggal_kegiatan: string; lokasi?: string; sekbid_asal?: number | null; proker_id?: number | null; file_name?: string; file_type?: string; file_data_b64?: string; }) => {
    try {
      const res = await request<DokumentasiPDD>("/dokumentasi/pdd", { method: "POST", body: JSON.stringify(data) });
      if (typeof window !== "undefined" && res?.id) {
        try {
          const raw = localStorage.getItem("canopy_dokumentasi_pdd");
          let arr: DokumentasiPDD[] = raw ? JSON.parse(raw) : [];
          arr.unshift(res);
          localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend create dokumentasi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const currentUser = JSON.parse(localStorage.getItem("canopy_user") || "{}");
        let fileUrl: string | null = null;
        let fileName: string | null = data.file_name || null;
        let fileType: string | null = data.file_type || null;
        let fileSize: number | null = null;
        if (data.file_data_b64 && data.file_name) {
          const dataUrl = `data:${data.file_type || "application/octet-stream"};base64,${data.file_data_b64}`;
          fileUrl = dataUrl;
          fileSize = Math.round((data.file_data_b64.length * 3) / 4);
        }
        const fake: DokumentasiPDD = {
          id: Date.now(),
          judul: data.judul,
          deskripsi: data.deskripsi || "",
          kegiatan: data.kegiatan,
          tanggal_kegiatan: data.tanggal_kegiatan,
          lokasi: data.lokasi || "",
          sekbid_asal: data.sekbid_asal ?? null,
          proker_id: data.proker_id ?? null,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          dibuat_oleh: currentUser?.nis || "local",
          created_at: new Date().toISOString(),
        };
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        let arr: DokumentasiPDD[] = raw ? JSON.parse(raw) : [];
        arr.unshift(fake);
        localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
        return fake;
      }
      throw e;
    }
  },

  updateDokumentasi: async (id: number, data: { judul: string; deskripsi?: string; kegiatan: string; tanggal_kegiatan: string; lokasi?: string; sekbid_asal?: number | null; proker_id?: number | null; folder_name?: string | null; drive_url?: string | null; }) => {
    try {
      const res = await request<DokumentasiPDD>(`/dokumentasi/pdd/${id}`, { method: "PUT", body: JSON.stringify(data) });
      if (typeof window !== "undefined" && res?.id) {
        try {
          const raw = localStorage.getItem("canopy_dokumentasi_pdd");
          let arr: DokumentasiPDD[] = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex((d) => d.id === id);
          if (idx >= 0) arr[idx] = res;
          localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend update dokumentasi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) {
          let arr: DokumentasiPDD[] = JSON.parse(raw);
          const idx = arr.findIndex((d) => d.id === id);
          if (idx >= 0) {
            arr[idx] = { ...arr[idx], ...data } as DokumentasiPDD;
            localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
            return arr[idx];
          }
        }
      }
      throw e;
    }
  },

  deleteDokumentasi: async (id: number) => {
    try {
      const res = await request<{ message: string }>(`/dokumentasi/pdd/${id}`, { method: "DELETE" });
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("canopy_dokumentasi_pdd");
          if (raw) {
            let arr: DokumentasiPDD[] = JSON.parse(raw);
            localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr.filter((d) => d.id !== id)));
          }
        } catch {}
      }
      return res;
    } catch (e) {
      console.warn("Backend delete dokumentasi failed, fallback localStorage:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) {
          let arr: DokumentasiPDD[] = JSON.parse(raw);
          localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr.filter((d) => d.id !== id)));
          return { message: "Dokumentasi berhasil dihapus (lokal)" };
        }
      }
      throw e;
    }
  },

  addDokumentasiFile: async (id: number, data: { file_name: string; file_type?: string; file_data_b64?: string; drive_url?: string }) => {
    try {
      return await request<DokumentasiAttachmentPDD>(`/dokumentasi/pdd/${id}/files`, { method: "POST", body: JSON.stringify(data) });
    } catch (e) {
      console.warn("Backend add dokumentasi file failed, fallback local:", e);
      const att: DokumentasiAttachmentPDD = {
        id: Date.now(),
        file_name: data.file_name,
        file_type: data.file_type || "application/octet-stream",
        file_size: data.file_data_b64 ? Math.round((data.file_data_b64.length * 3) / 4) : 0,
        file_url: data.drive_url || (data.file_data_b64 ? `data:${data.file_type};base64,${data.file_data_b64}` : null),
        drive_url: data.drive_url || null,
        created_at: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) {
          let arr: DokumentasiPDD[] = JSON.parse(raw);
          const idx = arr.findIndex((d) => d.id === id);
          if (idx >= 0) {
            if (!arr[idx].attachments) arr[idx].attachments = [];
            arr[idx].attachments!.push(att);
            localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
          }
        }
      }
      return att;
    }
  },

  deleteDokumentasiFile: async (id: number, fileId: number) => {
    try {
      return await request<{ message: string }>(`/dokumentasi/pdd/${id}/files/${fileId}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Backend delete dokumentasi file failed, fallback local:", e);
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_dokumentasi_pdd");
        if (raw) {
          let arr: DokumentasiPDD[] = JSON.parse(raw);
          const idx = arr.findIndex((d) => d.id === id);
          if (idx >= 0 && arr[idx].attachments) {
            arr[idx].attachments = arr[idx].attachments!.filter((a) => a.id !== fileId);
            localStorage.setItem("canopy_dokumentasi_pdd", JSON.stringify(arr));
            return { message: "File berhasil dihapus (lokal)" };
          }
        }
      }
      throw e;
    }
  },

  // Announcements with resilient storage fallback
  getAnnouncements: async (): Promise<{ pengumuman: PengumumanDetail[] }> => {
    try {
      const res = await request<{ pengumuman: PengumumanDetail[] }>("/pengumuman");
      if (res && Array.isArray(res.pengumuman)) {
        return res;
      }
    } catch (e) {
      console.warn("Backend unavailable, loading local announcements:", e);
    }
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_announcements");
      if (local) {
        try {
          return { pengumuman: JSON.parse(local) };
        } catch {}
      }
    }
    const defaultAnnouncements: PengumumanDetail[] = [
      {
        pengumuman_id: 1,
        judul: "📢 Selamat Datang di Canopy OSIS",
        isi: "Platform resmi manajemen organisasi OSIS. Seluruh jadwal rapat, tugas, proker, dan keuangan terintegrasi di sini.",
        dibuat_oleh: "10001",
        target: "Organisasi",
        division_id: null,
        tanggal: new Date().toISOString(),
      },
    ];
    return { pengumuman: defaultAnnouncements };
  },

  createAnnouncement: async (data: { judul: string; isi: string; target: string; division_id?: number }): Promise<PengumumanDetail> => {
    let result: PengumumanDetail | null = null;
    try {
      result = await request<PengumumanDetail>("/pengumuman", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn("Backend unavailable, storing announcement locally:", e);
    }

    if (!result || !result.pengumuman_id) {
      const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("canopy_user") || "{}") : {};
      result = {
        pengumuman_id: Date.now(),
        judul: data.judul,
        isi: data.isi,
        dibuat_oleh: currentUser?.nis || "20011",
        target: data.target,
        division_id: data.division_id || null,
        tanggal: new Date().toISOString(),
      };
    }

    if (typeof window !== "undefined") {
      const local = localStorage.getItem("canopy_local_announcements");
      let list: PengumumanDetail[] = [];
      if (local) {
        try { list = JSON.parse(local); } catch {}
      }
      localStorage.setItem("canopy_local_announcements", JSON.stringify([result, ...list]));
    }

    return result;
  },
};
