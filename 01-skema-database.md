# Skema Database — Canopy

Dokumen ini merangkum seluruh tabel yang sudah dirancang untuk sistem Canopy (platform manajemen OSIS SMKN 1 Cibinong). Tabel yang ditandai *(draf awal)* belum dibahas detail dan perlu difinalisasi lebih lanjut.

## 1. Identitas & Struktur Organisasi

```
USERS
  nis            PK
  nama           string
  jurusan        string      -- mis. SIJA, diperbarui tiap tahun ajaran
  tahun_masuk    int         -- tahun ajaran masuk sekolah, basis "1 angkatan atas-bawah"
  foto_url       string, nullable

ROLE_GROUPS
  group_id       PK
  group_name     string      -- Trimitra, Sekretaris, Bendahara, Kepala Divisi, Staf, Pembina

ROLES
  role_id             PK
  group_id            FK -> ROLE_GROUPS
  role_name           string    -- "Ketua Trimitra", "Sekretaris 1", "Bendahara Umum", dst
  level               int       -- hierarki dalam satu grup (1 = tertinggi)
  scope_divisi_awal   int, nullable  -- FK -> DIVISIONS.division_id, batas bawah scope
  scope_divisi_akhir  int, nullable  -- FK -> DIVISIONS.division_id, batas atas scope
                                     -- null,null = scope organisasi penuh

DIVISIONS
  division_id     PK
  division_name   string    -- 10 Seksi Bidang

PERIODE
  periode_id      PK
  tahun_ajaran    string    -- "2025/2026"
  saldo_awal      decimal   -- diisi otomatis dari carry-over periode sebelumnya

KEPENGURUSAN
  membership_id   PK
  nis             FK -> USERS
  role_id         FK -> ROLES
  division_id     FK -> DIVISIONS, nullable   -- null untuk role scope organisasi (Trimitra, BPH Umum)
  periode_id      FK -> PERIODE
  status          enum (Aktif, Nonaktif)
```

**Kenapa `KEPENGURUSAN` terpisah dari `USERS`:** satu siswa bisa punya role berbeda tiap periode (tahun ini Staf, tahun depan Ketua Divisi). Kalau role ditaruh langsung di `USERS`, riwayat jabatan lama hilang — padahal modul Arsip & Serah Terima butuh riwayat ini.

## 2. Navigasi & Hak Akses Modul

```
MODULES
  module_id     PK
  module_name   string    -- Home, Task, Program Kerja, Rapat, Keuangan, Sekretariat, dll
  is_core       boolean   -- true = tampil untuk semua role (nav utama)

ROLE_GROUP_MODULES
  id                  PK
  group_id            FK -> ROLE_GROUPS
  module_id           FK -> MODULES

DIVISI_MODULES
  id                  PK
  division_id         FK -> DIVISIONS
  module_id           FK -> MODULES     -- modul tambahan spesifik 1 divisi (di luar baseline)
```

## 3. Program Kerja & Task

```
PROGRAM_KERJA
  proker_id            PK
  division_id          FK -> DIVISIONS, nullable   -- null kalau proker organisasi/lintas divisi
  periode_id           FK -> PERIODE
  nama                 string
  deskripsi            text
  anggaran_disetujui   decimal
  status               enum (Belum Mulai, Berjalan, Selesai, Dibatalkan)
  penanggung_jawab     FK -> USERS
  tanggal_mulai        date
  tanggal_selesai      date

TASK_TEMPLATE
  template_id     PK
  division_id     FK -> DIVISIONS
  nama_template   string    -- "Log Prestasi Lomba", "Produk Bazaar", dll, dibuat sendiri oleh Kepala Divisi

TEMPLATE_FIELD
  field_id        PK
  template_id     FK -> TASK_TEMPLATE
  label           string
  tipe_input      enum (Teks, Angka, Tanggal, Dropdown, File, Checkbox)
  opsi_dropdown   text, nullable
  wajib           boolean

TASKS
  task_id             PK
  proker_id           FK -> PROGRAM_KERJA
  template_id         FK -> TASK_TEMPLATE, nullable
  scope               enum (Individual, General)
  assigned_to         FK -> USERS, nullable
  offered_by          FK -> USERS, nullable
  title               string
  deadline            date
  status              enum (Tersedia, Ditugaskan, Ditawarkan, Selesai)
  custom_data         JSON, nullable    -- diisi sesuai TEMPLATE_FIELD
  eskalasi_terkirim   boolean

CATATAN_PEMBINAAN
  catatan_id    PK
  proker_id     FK -> PROGRAM_KERJA
  dibuat_oleh   FK -> USERS       -- Pembina
  isi           text
  tanggal       timestamp
```

## 4. Keuangan

```
KATEGORI_TRANSAKSI
  kategori_id   PK
  nama          string    -- Konsumsi, Transportasi, Perlengkapan, Sewa Tempat, dll

TRANSAKSI
  transaksi_id      PK
  proker_id         FK -> PROGRAM_KERJA
  kategori_id       FK -> KATEGORI_TRANSAKSI
  dicatat_oleh      FK -> USERS
  jenis             enum (Masuk, Keluar)
  nominal           decimal
  bukti_url         string
  sumber            enum (Manual, Scan Nota)
  is_berisiko       boolean
  status            enum (Menunggu Verifikasi, Menunggu Approval Umum, Disetujui, Ditolak)
  alasan_penolakan  text, nullable
  tanggal           date
  created_at        timestamp
```

## 5. Dokumen & Persetujuan Berjenjang

```
JENIS_DOKUMEN
  jenis_id   PK
  nama       string    -- Proposal Kegiatan, Surat Tugas, Surat Keluar, LPJ

ALUR_PERSETUJUAN_TEMPLATE
  template_id        PK
  jenis_id           FK -> JENIS_DOKUMEN
  urutan             int
  approver_group_id  FK -> ROLE_GROUPS

DOKUMEN
  dokumen_id        PK
  proker_id         FK -> PROGRAM_KERJA, nullable
  jenis_id          FK -> JENIS_DOKUMEN
  diunggah_oleh     FK -> USERS
  diperiksa_oleh    FK -> USERS, nullable
  file_url          string
  is_eksternal      boolean
  status            enum (Draft, Menunggu Kelengkapan, Perlu Revisi, Menunggu Approval Berjenjang, Disetujui)
  catatan_revisi    text, nullable
  versi             int

PERSETUJUAN
  persetujuan_id      PK
  dokumen_id          FK -> DOKUMEN
  urutan              int
  approver_group_id   FK -> ROLE_GROUPS
  disetujui_oleh      FK -> USERS, nullable
  keputusan           enum (Menunggu, Disetujui, Ditolak)
  catatan             text, nullable
  waktu               timestamp, nullable
```
Saat `DOKUMEN` baru dibuat, sistem copy baris `ALUR_PERSETUJUAN_TEMPLATE` sesuai `jenis_id` jadi baris `PERSETUJUAN`. `DOKUMEN.status` berubah otomatis mengikuti progres baris-baris ini.

## 6. Presensi

```
PRESENSI
  presensi_id        PK
  acara_type         enum (Rapat, Kegiatan)
  acara_id           int       -- FK ke RAPAT atau PROGRAM_KERJA tergantung acara_type
  nis                FK -> USERS
  tipe               enum (Hadir, Izin, Sakit, Alpa)
  keterangan         text, nullable
  bukti_url          string, nullable
  foto_url           string, nullable    -- selfie saat scan QR Masuk, anti titip-absen
  status_verifikasi  enum (Menunggu, Disetujui, Ditolak)
  waktu_submit       timestamp
```

## 7. Notulensi & Pengumuman *(draf awal — belum dibahas detail)*

```
RAPAT
  rapat_id       PK
  periode_id     FK -> PERIODE
  division_id    FK -> DIVISIONS, nullable   -- null = rapat organisasi (semua divisi diundang)
  judul          string
  tanggal        datetime
  lokasi         string
  agenda         text
  dibuat_oleh    FK -> USERS
  status         enum (Terjadwal, Berlangsung, Selesai)
  qr_code        string    -- token unik buat presensi

NOTULENSI
  notulensi_id   PK
  rapat_id       FK -> RAPAT
  isi            text
  difinalisasi_oleh  FK -> USERS, nullable
  status         enum (Draft, Final)

PENGUMUMAN
  pengumuman_id   PK
  judul           string
  isi             text
  dibuat_oleh     FK -> USERS
  target          enum (Organisasi, Divisi)
  division_id     FK -> DIVISIONS, nullable
  tanggal         datetime
```

## 8. Belum dirancang di sesi ini
- **Aset & Inventaris** (modul dari proposal, belum dibahas)
- **Serah Terima Kepengurusan** (mekanisme detail transisi periode, di luar carry-over saldo)
- **Struktur & Keanggotaan** sisi publik, **Landing Page**, **Katalog Event**, **Portal Aspirasi**
- Role **Pembina** — belum dirancang wewenangnya secara spesifik
