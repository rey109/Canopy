import type { UserDetail } from "@/lib/api";

export type DivisionCapability = {
  division: number;
  name: string;
  focus: string;
  fields: { key: string; label: string; type?: "text" | "number" | "date" | "url" }[];
};

export const divisionCapabilities: Record<number, DivisionCapability> = {
  1: { division: 1, name: "Keimanan & Ketaqwaan", focus: "Jadwal kegiatan keagamaan", fields: [{ key: "title", label: "Nama kegiatan" }, { key: "date", label: "Tanggal", type: "date" }, { key: "description", label: "Deskripsi" }] },
  2: { division: 2, name: "Budi Pekerti & Akhlak", focus: "Rekam penghargaan dan pelanggaran siswa", fields: [{ key: "student_name", label: "Nama siswa" }, { key: "student_class", label: "Kelas" }, { key: "record_type", label: "Tipe catatan" }, { key: "points", label: "Poin", type: "number" }, { key: "description", label: "Keterangan" }] },
  3: { division: 3, name: "Kepribadian & Bela Negara", focus: "Roster tugas upacara", fields: [{ key: "date", label: "Tanggal", type: "date" }, { key: "leader_name", label: "Pemimpin upacara" }, { key: "mc_name", label: "MC" }, { key: "flag_bearers", label: "Pengibar" }] },
  4: { division: 4, name: "Prestasi, Seni & Olahraga", focus: "Log prestasi siswa", fields: [{ key: "student_name", label: "Nama siswa" }, { key: "competition_name", label: "Nama kompetisi" }, { key: "achievement", label: "Pencapaian" }, { key: "type", label: "Bidang" }] },
  5: { division: 5, name: "Demokrasi & Lingkungan", focus: "Survei dan polling kegiatan", fields: [{ key: "topic", label: "Topik survei" }] },
  6: { division: 6, name: "Kreativitas & Kewirausahaan", focus: "Penjualan dan stok koperasi", fields: [{ key: "item_name", label: "Nama barang" }, { key: "quantity", label: "Jumlah", type: "number" }, { key: "price", label: "Harga", type: "number" }, { key: "type", label: "Tipe transaksi" }] },
  7: { division: 7, name: "Kesehatan & Gizi", focus: "Rekap kunjungan UKS", fields: [{ key: "student_name", label: "Nama siswa" }, { key: "complaint", label: "Keluhan" }, { key: "treatment", label: "Penanganan" }] },
  8: { division: 8, name: "Sastra & Budaya", focus: "E-Mading dan artikel", fields: [{ key: "title", label: "Judul" }, { key: "content", label: "Konten" }, { key: "author", label: "Penulis" }] },
  9: { division: 9, name: "Teknologi Informasi & Komunikasi", focus: "Link tree dan media sosial OSIS", fields: [{ key: "platform", label: "Platform" }, { key: "label", label: "Label tautan" }, { key: "url", label: "URL", type: "url" }] },
  10: { division: 10, name: "Komunikasi Bahasa Asing", focus: "Word of the Day dan materi bahasa", fields: [{ key: "word", label: "Kata" }, { key: "language", label: "Bahasa" }, { key: "meaning", label: "Arti" }, { key: "example", label: "Contoh kalimat" }] },
};

export function canManageDivision(user: UserDetail | null, division: number) {
  if (!user) return false;
  if (user.group_name === "Pembina") return false;
  if (user.group_name === "Trimitra") return true;
  return user.group_name === "Kepala Divisi" && user.division_id === division;
}

export function canViewDivision(user: UserDetail | null, division: number) {
  if (!user) return false;
  if (user.scope_divisi_awal == null && user.scope_divisi_akhir == null) return true;
  return division >= (user.scope_divisi_awal || 0) && division <= (user.scope_divisi_akhir || 0);
}
