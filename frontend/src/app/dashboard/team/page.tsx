"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tim Divisi & Seksi Bidang</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Pilih divisi untuk melihat modul khusus dan data spesifik divisi tersebut
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {divisions.map((d) => {
          const isMyDivision = user?.division_id === d.id;
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
                  {isMyDivision && (
                    <span className="badge badge-success text-[10px]">Divisi Anda</span>
                  )}
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
