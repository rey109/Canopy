# Referensi Layout & UI — Canopy

## 1. Prinsip Umum

Satu struktur navigasi, dua bentuk tampilan tergantung lebar layar (breakpoint disarankan ±768px):

- **Mobile:** bottom nav bar
- **Desktop:** sidebar kiri + avatar dropdown kanan atas

Inspirasi pola: Discord (nav channel tetap vs panel member yang bisa di-toggle) dan Notion (sidebar page list, item favorit selalu terlihat). Referensi tambahan: dashboard admin bergaya sidebar+topbar (search, notifikasi, avatar kanan atas) seperti pola umum SaaS dashboard.

## 2. Layout Mobile — Bottom Nav

```
┌─────────────────────────────┐
│                               │
│         Konten Halaman       │
│                               │
├───────────────────────────────┤
│  Home  Task  Proker  [Mod]  Menu │   ← 5 ikon tetap, slot ke-4 dinamis
└───────────────────────────────┘
```
Tap "Menu" → drawer naik dari bawah, isi: Info, Member, Profile, Setting (+ Rapat kalau slot ke-4 lagi dipakai modul role).

## 3. Layout Desktop — Sidebar + Avatar Dropdown

```
┌────────────┬──────────────────────────────┐
│  CANOPY    │              🔔  [Avatar ▾]   │
│  ▸ Home    │  ┌─────────────────────────┐  │
│    Task    │  │                         │  │
│    Proker  │  │      Konten Halaman     │  │
│    Rapat   │  │                         │  │
│  [Modul]   │  └─────────────────────────┘  │
└────────────┴──────────────────────────────┘
```
Klik avatar → dropdown kecil di kanan atas, isi sama seperti drawer Menu mobile (Info, Member, Profile, Setting).

## 4. Contoh Isi Halaman Home

- Ringkasan proker & task yang jadi tanggung jawab user
- Jadwal rapat terdekat
- Tombol **Scan** (2 mode: QR presensi / foto nota) — tampil untuk semua role
- Notifikasi pending (approval menunggu, task ditawarkan, dsb — sesuai role)

## 5. Contoh Isi Halaman Modul Role-Spesifik

**Keuangan (Bendahara):** ringkasan saldo real-time di atas, lalu tab Catat Transaksi / Laporan / Verifikasi Nota (badge jumlah antrian) — Bendahara Umum dapat tab tambahan Approval Berisiko.

**Sekretariat (Sekretaris):** segmented control Dokumen / Notulensi / Pengumuman / Presensi. Tab Dokumen tampil sebagai list dengan status badge (Draft/Menunggu Kelengkapan/dst) dan progress bar tahap approval berjenjang.

**Divisiku (Kepala Divisi):** dashboard progres proker divisi (progress bar per proker dihitung dari % task selesai), list Anggota Divisi dengan rekap presensi, dan tombol "Buat Task Template" untuk custom field.

**Organisasi (Trimitra):** dashboard agregat seluruh divisi (bukan cuma divisinya) — grafik progres semua proker, rekap presensi organisasi, saldo kas total, antrian Approval Pusat.

## 6. Konsistensi Visual
- Badge warna dipakai konsisten: kuning = perlu perhatian/mendekati batas, merah = melebihi batas/ditolak, hijau = disetujui/selesai.
- Modul role-spesifik selalu ditandai visual beda (warna aksen) di nav supaya kelihatan "ini bagian khusus wewenangmu", beda dari 4 nav dasar yang sama untuk semua orang.

## 7. Halaman Home

Dibagi 4 bagian:

| Bagian | Isi | Sumber data |
|---|---|---|
| Header | Sapaan, role/divisi aktif, tombol Scan (2 mode: QR presensi + selfie verifikasi, scan nota) | `KEPENGURUSAN` aktif |
| Rundown hari ini | Rapat hari ini, jumlah task jatuh tempo | `RAPAT`, `TASKS` filter deadline hari ini |
| Perlu perhatianmu | Notifikasi actionable (task ditawarkan, approval menunggu, dsb) — isinya dinamis per role, bagian inilah yang bikin Home terasa personal walau strukturnya sama untuk semua orang | `TASKS` status Ditawarkan, `PERSETUJUAN` status Menunggu milik user |
| Kartu ringkasan role (opsional) | Cuma muncul untuk role dengan modul khusus — Kepala Divisi: progres proker + kehadiran divisi; Bendahara: saldo kas; Sekretaris: antrian dokumen; Trimitra: ringkasan organisasi | Agregat dari modul masing-masing |

## 8. Halaman Daftar Program Kerja

Isi list-nya (bukan halaman detail satu proker — itu bagian 9) berbeda cakupan per role, strukturnya sama:

| Role | Proker yang muncul | Aksi |
|---|---|---|
| Staf | Proker yang dia terlibat (ada task assigned) | Buka detail, update task miliknya |
| Kepala Divisi | Semua proker divisinya | Create/edit proker, assign PJ & anggaran, approve tingkat divisi |
| Wakil Ketua 1/2 | Proker kelompoknya (Sekbid 1–5/6–10) full akses, kelompok lain read-only | Approval tahap Trimitra untuk proker kelompoknya |
| Trimitra (Ketua) | Semua proker organisasi | Approval final org-wide |
| Pembina | Semua proker organisasi | Read-only + tulis Catatan Pembinaan per proker |

```
list_proker(user):
  jika group == "Staf":            WHERE proker_id IN (SELECT proker_id FROM TASKS WHERE assigned_to=user.nis)
  jika group == "Kepala Divisi":   WHERE division_id = user.division_id
  jika group == "Trimitra" & level 2 (Wakil): WHERE division.division_id BETWEEN scope_awal AND scope_akhir
  jika scope penuh (Ketua/Pembina/Umum BPH): semua, tanpa filter
```

## 9. Halaman Detail Program Kerja

**Header:** nama proker, divisi & penanggung jawab, status badge (Belum Mulai/Berjalan/Selesai/Dibatalkan), progress bar task (% task selesai), progress bar anggaran (total transaksi disetujui vs `anggaran_disetujui`, badge kuning ≥80%, merah ≥100%).

**5 sub-tab dalam satu halaman:**

| Tab | Isi | Akses |
|---|---|---|
| Overview | Deskripsi, timeline (`tanggal_mulai`–`tanggal_selesai`), tim terlibat | Semua yang terlibat |
| Task | List task proker ini (filter status), tombol "Buat Task" | Kepala Divisi create/assign; Staf lihat & update task miliknya |
| Keuangan | Riwayat `TRANSAKSI` proker ini, breakdown per kategori | Bendahara full akses; Kepala Divisi read-only |
| Dokumen | Proposal/LPJ proker ini + status approval berjenjang | Sekretaris kelola; lainnya lihat status |
| Presensi | Rekap kehadiran acara/kegiatan hari-H proker ini | Sekretaris + Kepala Divisi |
| *(khusus Pembina)* | Bisa tulis Catatan Pembinaan langsung di tab Overview | Pembina saja |

## 11. Halaman Rapat

**List Rapat** — filter Mendatang/Selesai, badge status presensi diri sendiri di tiap kartu. Scope: user cuma lihat rapat yang dia diundang; Trimitra/Sekretaris Umum bisa lihat semua rapat organisasi.

**Detail Rapat** — 3 sub-tab:

| Tab | Isi | Bisa edit |
|---|---|---|
| Peserta & Presensi | List peserta + status realtime (Hadir/Izin menunggu/Belum scan/Alpa) | Sekretaris verifikasi Izin/Sakit |
| Agenda | Poin yang dibahas | Pembuat rapat |
| Notulensi | Catatan hasil rapat, status Draft/Final | Sekretaris finalisasi |

Kotak QR Presensi (2 mode: Masuk / Izin-Sakit) ditampilkan cuma untuk pembuat rapat, dipasang di layar/proyektor saat rapat berlangsung.

## 12. Halaman Profile

3 bagian:

| Bagian | Isi | Sumber data |
|---|---|---|
| Header | Foto, nama, NIS, angkatan, jurusan, badge jabatan+periode aktif | `USERS` + `KEPENGURUSAN` (periode aktif) |
| Statistik | Kehadiran %, jumlah task selesai, proker aktif | Agregat `PRESENSI`, `TASKS` |
| Riwayat Jabatan | List jabatan tiap periode kepengurusan, terbaru dulu | `KEPENGURUSAN` semua periode |

## 13. Belum dirancang
- Desain visual/branding penuh (warna, tipografi) — baru pola struktural
