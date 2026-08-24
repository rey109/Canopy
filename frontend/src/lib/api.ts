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
  dicatat_oleh: string;
  jenis: string; // 'Masuk', 'Keluar'
  nominal: number;
  deskripsi: string;
  bukti_url: string | null;
  sumber: string; // 'Manual', 'Scan Nota'
  is_berisiko: boolean;
  status: string; // 'Menunggu Verifikasi', 'Menunggu Approval Umum', 'Disetujui', 'Ditolak'
  alasan_penolakan: string | null;
  tanggal: string;
  created_at: string;
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

  listUsers: (params?: { division_id?: number; group_name?: string; periode_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.division_id !== undefined) q.set("division_id", String(params.division_id));
    if (params?.group_name !== undefined) q.set("group_name", params.group_name);
    if (params?.periode_id !== undefined) q.set("periode_id", String(params.periode_id));
    const qs = q.toString();
    return request<{ users: UserDetail[] }>(`/users${qs ? "?" + qs : ""}`);
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
  listProkers: () =>
    request<{ prokers: ProkerDetail[] }>("/prokers"),

  getProker: (id: number) =>
    request<ProkerDetail>(`/proker/${id}`),

  createProker: (data: {
    nama: string;
    deskripsi: string;
    division_id?: number;
    anggaran_disetujui: number;
    penanggung_jawab?: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  }) =>
    request<ProkerDetail>("/proker", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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

  // Finance
  listTransactions: () =>
    request<{
      transaksi: TransaksiDetail[];
      total_masuk: number;
      total_keluar: number;
      saldo: number;
    }>("/finance/transaksi"),

  createTransaction: (data: {
    proker_id?: number;
    kategori_id?: number;
    jenis: string; // 'Masuk', 'Keluar'
    nominal: number;
    deskripsi: string;
    bukti_url?: string;
    sumber?: string; // 'Manual', 'Scan Nota'
    is_berisiko?: boolean;
    tanggal: string;
  }) =>
    request<TransaksiDetail>("/finance/transaksi", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBalance: () =>
    request<{
      total_masuk: number;
      total_keluar: number;
      saldo: number;
    }>("/finance/saldo"),

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

  approvalBerisiko: (id: number, disetujui: boolean, alasan_penolakan?: string) =>
    request<TransaksiDetail>(`/finance/transaksi/${id}/approval-berisiko`, {
      method: "POST",
      body: JSON.stringify({ disetujui, alasan_penolakan }),
    }),

  listMenungguVerifikasi: () =>
    request<{ transaksi: TransaksiDetail[] }>("/finance/antrian-verifikasi"),

  listMenungguApprovalBerisiko: () =>
    request<{ transaksi: TransaksiDetail[] }>("/finance/antrian-berisiko"),

  listKategori: () =>
    request<{ kategori: { kategori_id: number; nama: string }[] }>("/finance/kategori"),

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

  upsertNotulensi: (id: number, isi: string, attachments: NotulensiAttachment[] = []) =>
    request<NotulensiDetail>(`/rapat/${id}/notulensi`, {
      method: "PUT",
      body: JSON.stringify({ isi, attachments }),
    }),

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
  },

  finalisasiNotulensi: (id: number) =>
    request<NotulensiDetail>(`/rapat/${id}/notulensi/finalisasi`, {
      method: "POST",
    }),

  getNotulensi: (id: number) =>
    request<NotulensiDetail>(`/rapat/${id}/notulensi`),

  listNotulensi: () =>
    request<{ notulensi: NotulensiListItem[] }>("/notulensi"),

  scanPresensi: (data: {
    qr_token: string;
    acara_id: number;
    foto_url?: string;
    tipe: string; // 'Hadir', 'Izin', 'Sakit'
    keterangan?: string;
    bukti_url?: string;
  }) =>
    request<PresensiDetail>("/presensi/scan", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listPresensiRapat: (id: number) =>
    request<ListPresensiResponse>(`/rapat/${id}/presensi`),

  recordAttendance: (id: number, data: { entries: { user_nis: string; status: string }[] }) =>
    request<{ message: string }>(`/rapat/${id}/presensi`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifikasiPresensi: (id: number, status_verifikasi: string, catatan?: string) =>
    request<PresensiDetail>(`/presensi/${id}/verifikasi`, {
      method: "POST",
      body: JSON.stringify({ status_verifikasi, catatan }),
    }),

  listPresensiMenunggu: () =>
    request<ListPresensiResponse>("/presensi/menunggu"),

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
