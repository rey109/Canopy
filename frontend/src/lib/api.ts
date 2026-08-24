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
  proker_id: number | null;
  judul: string;
  tanggal: string;
  lokasi: string;
  agenda: string;
  dibuat_oleh: string;
  status: string; // 'Terjadwal', 'Berlangsung', 'Selesai', 'Dibatalkan'
  qr_code?: string;
  created_at: string;
}

export interface DokumentasiDetail {
  dok_id: number;
  rapat_id: number;
  file_url: string;
  nama_file: string;
  tipe_file: string;
  ukuran: number;
  diunggah_oleh: string;
  keterangan: string;
  created_at: string;
}

export interface AddDokumentasiPayload {
  file_url: string; // URL eksternal ATAU data-URL base64 (disimpan persistent di DB)
  nama_file: string;
  tipe_file: string;
  ukuran: number;
  keterangan?: string;
}

export interface NotulensiListItem {
  notulensi_id: number;
  rapat_id: number;
  judul_rapat: string;
  tanggal_rapat: string;
  division_id: number | null;
  proker_id: number | null;
  notulis: string;
  status: string;
  updated_at: string;
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
  nama: string;
  tipe: string;
}

export interface NotulensiDetail {
  notulensi_id: number;
  rapat_id: number;
  isi: string;
  tempat: string;
  pimpinan_rapat: string;
  notulis: string;
  peserta: string;
  agenda_pembahasan: string;
  hasil_pembahasan: string;
  keputusan_rapat: string;
  tindak_lanjut: string;
  pic: string;
  deadline_tl: string | null;
  catatan_tambahan: string;
  attachments: NotulensiAttachment[];
  difinalisasi_oleh: string | null;
  status: string; // 'Draft', 'Final'
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

  // Meetings
  listMeetings: () =>
    request<{ rapat: RapatDetail[] }>("/rapat"),

  createMeeting: (data: {
    division_id?: number;
    proker_id?: number;
    judul: string;
    tanggal: string;
    lokasi: string;
    agenda: string;
  }) =>
    request<RapatDetail>("/rapat", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMeeting: (id: number) =>
    request<RapatDetail>(`/rapat/${id}`),

  updateMeeting: (id: number, data: {
    judul?: string;
    tanggal?: string;
    lokasi?: string;
    agenda?: string;
    division_id?: number | null;
    proker_id?: number | null;
    status?: string;
  }) =>
    request<RapatDetail>(`/rapat/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteMeeting: (id: number) =>
    request<{ message: string }>(`/rapat/${id}`, {
      method: "DELETE",
    }),

  lookupRapatByQR: (qr_token: string) =>
    request<RapatDetail>(`/lookup-qr?qr_token=${encodeURIComponent(qr_token)}`),

  updateStatusRapat: (id: number, status: string) =>
    request<{ message: string }>(`/rapat/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  upsertNotulensi: (
    id: number,
    dataOrIsi: Partial<{
      isi: string;
      tempat: string;
      pimpinan_rapat: string;
      notulis: string;
      peserta: string;
      agenda_pembahasan: string;
      hasil_pembahasan: string;
      keputusan_rapat: string;
      tindak_lanjut: string;
      pic: string;
      deadline_tl?: string;
      catatan_tambahan: string;
      attachments: NotulensiAttachment[];
    }> | string,
    attachments: NotulensiAttachment[] = []
  ) => {
    const payload =
      typeof dataOrIsi === "string"
        ? { isi: dataOrIsi, attachments }
        : { ...dataOrIsi, attachments: dataOrIsi.attachments ?? attachments };
    return request<NotulensiDetail>(`/rapat/${id}/notulensi`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  finalisasiNotulensi: (id: number) =>
    request<NotulensiDetail>(`/rapat/${id}/notulensi/finalisasi`, {
      method: "POST",
    }),

  getNotulensi: (id: number) =>
    request<NotulensiDetail>(`/rapat/${id}/notulensi`),

  listAllNotulensi: () =>
    request<{ notulensi: NotulensiListItem[] }>("/notulensi"),

  addDokumentasi: (id: number, data: AddDokumentasiPayload) =>
    request<DokumentasiDetail>(`/rapat/${id}/dokumentasi`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Upload banyak dokumentasi sekaligus — atomik di backend (satu gagal = semua batal)
  addBatchDokumentasi: (id: number, files: AddDokumentasiPayload[]) =>
    request<{ dokumentasi: DokumentasiDetail[] }>(`/rapat/${id}/dokumentasi/batch`, {
      method: "POST",
      body: JSON.stringify({ files }),
    }),

  listDokumentasi: (id: number) =>
    request<{ dokumentasi: DokumentasiDetail[] }>(`/rapat/${id}/dokumentasi`),

  deleteDokumentasi: (dok_id: number) =>
    request<{ message: string }>(`/rapat/dokumentasi/${dok_id}`, {
      method: "DELETE",
    }),

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

  // Announcements (Wrapper ke meeting.ListPengumuman / meeting.BuatPengumuman)
  getAnnouncements: () =>
    request<{ pengumuman: PengumumanDetail[] }>("/pengumuman"),

  createAnnouncement: (data: { judul: string; isi: string; target: string; division_id?: number }) =>
    request<PengumumanDetail>("/pengumuman", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
