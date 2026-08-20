"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const divisions = [
  { id: 1, name: "Keagamaan & Ketaqwaan", icon: "🕌", gradient: "from-amber-500 to-yellow-500" },
  { id: 2, name: "Budi Pekerti & Akhlak", icon: "🤝", gradient: "from-rose-500 to-pink-500" },
  { id: 3, name: "Bela Negara & Paskibra", icon: "🇮🇩", gradient: "from-red-600 to-orange-500" },
  { id: 4, name: "Prestasi, Seni & Olahraga", icon: "🏆", gradient: "from-blue-500 to-indigo-500" },
  { id: 5, name: "Demokrasi & Lingkungan", icon: "🌱", gradient: "from-emerald-500 to-teal-500" },
  { id: 6, name: "Kewirausahaan & Koperasi", icon: "🛒", gradient: "from-orange-500 to-amber-500" },
  { id: 7, name: "Kesehatan & UKS", icon: "🏥", gradient: "from-green-500 to-emerald-500" },
  { id: 8, name: "Sastra & Budaya", icon: "📝", gradient: "from-purple-500 to-violet-500" },
  { id: 9, name: "Teknologi & Informasi", icon: "💻", gradient: "from-cyan-500 to-blue-500" },
  { id: 10, name: "Bahasa Asing", icon: "🌐", gradient: "from-pink-500 to-fuchsia-500" },
];

export default function TeamPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isAnggotaAtauKetua = user?.group_name === "Staf" || user?.group_name === "Kepala Divisi";
  const isTrimitra = user?.group_name === "Trimitra";

  useEffect(() => {
    // If Anggota or Ketua Bidang, redirect straight to their own division page
    if (isAnggotaAtauKetua && user?.division_id) {
      router.replace(`/dashboard/team/${user.division_id}`);
    }
  }, [isAnggotaAtauKetua, user, router]);

  if (isAnggotaAtauKetua) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)] animate-pulse">Mengalihkan ke halaman divisi Anda...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Struktur Organisasi</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Pantau dan kelola seluruh divisi dan bidang dalam organisasi.
          </p>
        </div>
        {isTrimitra && (
          <button className="btn-primary text-xs" onClick={() => alert("Fitur kelola struktur (tambah/hapus anggota) dalam pengembangan.")}>
            Kelola Struktur
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {divisions.map((d) => {
          return (
            <Link
              key={d.id}
              href={`/dashboard/team/${d.id}`}
              className="glass-card p-5 flex items-start gap-4 transition-all hover:translate-y-[-2px] hover:shadow-lg group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${d.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
                {d.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors">
                    Bidang {d.id}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{d.name}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
