# Spesifikasi Alur Kerja — Canopy

## 1. Alur Task (Individual / General / Offer / Eskalasi)

1. Task dibuat oleh Kepala Divisi (atau otomatis dari Program Kerja), scope **Individual** (langsung assigned) atau **General** (status Tersedia, siapa saja di role_group terkait bisa ambil).
2. Kalau pemegang Task Individual berhalangan → tap "Tawarkan" → `offered_by` diisi, `assigned_to` dikosongkan, status jadi **Ditawarkan** → notifikasi ke role_group yang sama.
3. Anggota lain di role_group tap "Ambil" → `assigned_to` keisi, status balik **Ditugaskan**.
4. Kalau sampai H-24 jam deadline masih **Ditawarkan** tanpa ada yang ambil → job terjadwal kirim notifikasi eskalasi ke role_group **satu level di atas** (mis. task Bendahara yang mangkrak → notif ke Bendahara Umum + Trimitra terkait). Field `eskalasi_terkirim` mencegah notifikasi dobel.
5. Task bisa pakai `TASK_TEMPLATE` custom (dibuat sendiri oleh Kepala Divisi) — field-fieldnya disimpan di `custom_data` (JSON) sesuai definisi `TEMPLATE_FIELD`. Ini yang bikin satu sistem Task cukup nampung kebutuhan proker apa pun (log prestasi, katalog produk bazaar, galeri karya, dll) tanpa modul terpisah per bidang.

## 2. Alur Keuangan

**Input manual:** Bendahara (Umum/1/2) buka Keuangan → Catat Transaksi → pilih proker, kategori, nominal → status langsung **Disetujui** kalau bukan berisiko.

**Input via scan nota:** Siapa pun (bukan cuma Bendahara) tap Scan di Home → foto nota → OCR baca nominal & tanggal → user pilih proker terkait → masuk `TRANSAKSI` dengan `sumber = Scan Nota`, status **Menunggu Verifikasi** → muncul di antrian Bendahara untuk dicek manual (karena OCR bisa salah baca) sebelum lanjut ke logika berisiko.

**Approval berisiko:**
```
jika transaksi.is_berisiko:
    hanya Bendahara Umum (level 1) yang bisa approve → status "Menunggu Approval Umum"
else:
    Bendahara mana pun (Umum/1/2) bisa proses langsung → status "Disetujui"
```
Kalau ditolak, wajib isi `alasan_penolakan`.

**Anggaran & alarm:**
```
persentase_terpakai = SUM(transaksi keluar disetujui, proker=X) / proker.anggaran_disetujui
>= 80%  → badge kuning "Mendekati batas anggaran"
>= 100% → badge merah + notifikasi ke Bendahara & Ketua Divisi terkait
```

**Reminder verifikasi nota nunggak:** job terjadwal, transaksi `sumber=Scan Nota` & `status=Menunggu Verifikasi` yang sudah ≥3 hari (ambang bisa diatur) → notif ke role_group Bendahara.

**Saldo carry-over:** saat proses Serah Terima Kepengurusan, sistem hitung saldo akhir periode lama (`SUM(Masuk) - SUM(Keluar)` semua transaksi disetujui) → otomatis isi `PERIODE.saldo_awal` periode baru.

**Export laporan:** endpoint backend query `TRANSAKSI` (filter proker/periode/kategori) → generate PDF/Excel, dipakai sebagai lampiran LPJ.

## 3. Alur Dokumen & Approval Berjenjang

1. Dokumen baru dibuat dengan `jenis_id` tertentu → sistem otomatis copy baris `ALUR_PERSETUJUAN_TEMPLATE` sesuai jenis itu jadi baris-baris `PERSETUJUAN` (urutan bisa beda-beda tiap jenis dokumen, diatur lewat data, bukan hardcode).
2. Tahap 1 biasanya Sekretaris (grup, semua level) — cek kelengkapan administratif.
3. Kalau `is_eksternal = true`, tahap berikut naik ke Sekretaris Umum (verifikasi format resmi), lalu tahap-tahap lanjutan sesuai template jenis dokumennya (bisa sampai Trimitra dan/atau Pembina).
4. `DOKUMEN.status` mengikuti progres seluruh baris `PERSETUJUAN`: semua Disetujui → dokumen Disetujui; ada satu Ditolak → dokumen perlu revisi (naik `versi`, isi `catatan_revisi`).

## 4. Alur Presensi

**Dua jenis QR di tiap acara (Rapat/Kegiatan):**
- **QR Masuk** → scan → langsung `tipe=Hadir`, `status_verifikasi=Disetujui` otomatis (real-time).
- **QR Izin/Sakit** → scan → buka form isi alasan + upload bukti → `status_verifikasi=Menunggu` → diverifikasi Sekretaris (masuk antrian di sub-tab Presensi).
- Tidak ada scan sama sekali sampai acara selesai → sistem generate `tipe=Alpa` otomatis.

**Kriteria notifikasi:**
```
SELECT nis, COUNT(*) FROM PRESENSI WHERE tipe='Alpa' AND periode_id=aktif
GROUP BY nis HAVING COUNT(*) >= ambang_batas
```
Begitu ke-hit → notifikasi otomatis ke Ketua Divisi anggota tsb (dan BPH kalau makin parah). Ambang batas disarankan jadi setting yang bisa diatur admin, bukan hardcode.

## 5. Hal yang masih perlu ditentukan sebelum implementasi
- Wewenang & modul spesifik role **Pembina**
- Detail modul **Aset & Sarana**
- Detail proses **Serah Terima Kepengurusan** (di luar carry-over saldo)
- Angka ambang batas: transaksi "berisiko", hari reminder nota, jumlah alpa sebelum notifikasi
- Isi sisi publik (Landing Page, Katalog Event, Portal Aspirasi)
