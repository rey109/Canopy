# Role, Permission & Navigasi — Canopy

## 1. Prinsip Navigasi

**Mobile:** Bottom nav 5 slot tetap (Home, Task, Program Kerja, Rapat, Menu) — slot ke-4 dinamis: diganti modul utama role (Keuangan/Sekretariat/dst) kalau role itu punya, Rapat pindah ke drawer Menu. Drawer Menu isi generik: Info, Member, Profile, Setting.

**Desktop:** Sidebar kiri 4 nav utama (sama polanya kayak mobile, slot ke-4 dinamis) + avatar kanan atas yang buka dropdown (isi sama seperti drawer Menu mobile: Info, Member, Profile, Setting).

Kedua bentuk ini representasi dari struktur data yang sama (`MODULES`, `ROLE_GROUP_MODULES`), cuma beda tampilan sesuai breakpoint layar.

## 2. Daftar Role

| Role | Group | Level | Scope Divisi | Modul Tambahan (slot dinamis) |
|---|---|---|---|---|
| Pembina | Pembina | 1 | semua | Read-only ke semua proker organisasi + tulis Catatan Pembinaan per proker |
| Ketua Trimitra | Trimitra | 1 | semua | Organisasi (Approval Pusat, Struktur & Keanggotaan, Ringkasan Organisasi) |
| Wakil Ketua 1 | Trimitra | 2 | Sekbid 1–5 | Organisasi (scope Sekbid 1–5) |
| Wakil Ketua 2 | Trimitra | 2 | Sekbid 6–10 | Organisasi (scope Sekbid 6–10) |
| Sekretaris Umum | Sekretaris | 1 | semua | Sekretariat (Dokumen, Notulensi, Pengumuman, Presensi — semua divisi) |
| Sekretaris 1 | Sekretaris | 2 | Sekbid 1–5 | Sekretariat (scope Sekbid 1–5) |
| Sekretaris 2 | Sekretaris | 2 | Sekbid 6–10 | Sekretariat (scope Sekbid 6–10) |
| Bendahara Umum | Bendahara | 1 | semua | Keuangan (approve transaksi berisiko, laporan penuh) |
| Bendahara 1 | Bendahara | 2 | Sekbid 1–5 | Keuangan (transaksi harian, fokus Sekbid 1–5) |
| Bendahara 2 | Bendahara | 2 | Sekbid 6–10 | Keuangan (transaksi harian, fokus Sekbid 6–10) |
| Ketua Divisi (×10) | Kepala Divisi | 1 | 1 divisi spesifik | Divisiku (Program Kerja Divisi, Anggota Divisi, Approval) + modul custom lewat Task Template |
| Staf (×10 divisi) | Staf | 2 | 1 divisi spesifik | — (baseline saja) |

## 3. Baseline Nav Utama (semua role)

| Page | Isi |
|---|---|
| Home | Ringkasan proker/task/rapat pribadi + tombol Scan (QR presensi / scan nota) |
| Task | Daftar tugas pribadi (Individual/General), bisa offer & eskalasi |
| Program Kerja | Proker yang diikuti user |
| Rapat | Jadwal & notulensi (pindah ke drawer kalau slot dinamis dipakai modul lain) |

## 4. Drawer Menu / Dropdown Avatar (semua role)

| Item | Isi |
|---|---|
| Info | Feed pengumuman divisi + organisasi |
| Member | Daftar anggota (Staf: 1 angkatan atas-bawah; Kepala Divisi: seluruh anggota divisinya; Trimitra/BPH Umum: seluruh organisasi) |
| Profile | Data diri + histori jabatan antar periode |
| Setting | Preferensi akun |

## 5. Sub-tab Modul per Role

**Keuangan (Bendahara):** Catat Transaksi · Laporan (filter proker/periode) · Verifikasi Scan Nota (antrian OCR) · (khusus Umum) Approval Berisiko

**Sekretariat (Sekretaris):** Dokumen (+ alur approval berjenjang per jenis dokumen) · Notulensi · Pengumuman · Presensi (rekap & verifikasi Izin/Sakit)

**Divisiku (Kepala Divisi):** Program Kerja Divisi · Anggota Divisi · Approval tingkat divisi · pengaturan Task Template

**Organisasi (Trimitra):** Approval Pusat (tahap akhir rantai `PERSETUJUAN`) · Struktur & Keanggotaan (kelola `KEPENGURUSAN`) · Ringkasan Organisasi (agregat semua divisi)

## 6. Logika Resolusi Akses (pseudocode)

```
saat login:
  role = ambil dari KEPENGURUSAN WHERE nis=user AND periode_id=periode_aktif
  group = role.group_id

  nav_dasar = MODULES WHERE is_core = true
  nav_tambahan = MODULES JOIN ROLE_GROUP_MODULES WHERE group_id = role.group_id
  nav_divisi = MODULES JOIN DIVISI_MODULES WHERE division_id = role.division_id (jika ada)

  tampilkan nav_dasar + nav_tambahan + nav_divisi

cek akses data (contoh Keuangan):
  bisa_approve_berisiko = role.group == "Bendahara" AND role.level == 1
  bisa_proses_transaksi = role.group == "Bendahara"
  data_terlihat = TRANSAKSI WHERE division.division_id BETWEEN role.scope_divisi_awal AND role.scope_divisi_akhir
                  OR role.scope_divisi_awal IS NULL
```
