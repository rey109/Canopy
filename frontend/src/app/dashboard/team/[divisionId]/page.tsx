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

  const canEdit =
    user?.role === "Trimitra" ||
    user?.role === "Pembina" ||
    (user?.role === "Ketua Bidang" && user?.division_id === Number(divId));

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

  return (
    <div className="animate-fade-in">
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

      {/* Content */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 w-full bg-[var(--border)] rounded" />
          <div className="h-10 w-full bg-[var(--border)] rounded" />
          <div className="h-10 w-full bg-[var(--border)] rounded" />
        </div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
