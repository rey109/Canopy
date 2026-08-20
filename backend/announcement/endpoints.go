package announcement

// Catatan: Modul pengumuman (PENGUMUMAN) telah dipindahkan ke service `meeting`
// dengan tabel `pengumuman` yang mengikuti skema baru (01-skema-database.md).
//
// Endpoint aktif:
//   GET  /pengumuman        → meeting.ListPengumuman
//   POST /pengumuman        → meeting.BuatPengumuman
//
// Service ini (announcement) dipertahankan agar tidak break existing encore.app config,
// namun tidak mendefinisikan endpoint baru. Semua logika ada di package meeting.
