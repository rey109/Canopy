"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export interface DisplayEvent {
  id: number | string;
  title: string;
  date: string;
  time: string;
  location: string;
  sekbid: string;
  status: "bulan_ini" | "mendatang" | "selesai";
  statusLabel: string;
  statusBadge: string;
  desc: string;
}

export default function LandingPage() {
  const { user } = useAuth();

  // Mobile Menu Navigation Toggle State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Calendar Filter Tab State
  const [calendarFilter, setCalendarFilter] = useState<"semua" | "bulan_ini" | "mendatang" | "selesai">("semua");

  // Executive Core Board (Exact Database Seed)
  const executiveBoard = [
    { role: "Pembina", name: "Budi Hartono, M.Pd.", nis: "10001", dept: "Pendidikan", avatarBg: "from-amber-500 to-orange-600" },
    { role: "Ketua", name: "Reyza Fauzi", nis: "20001", dept: "SIJA 2023", avatarBg: "from-blue-600 to-indigo-600" },
    { role: "Wakil Ketua 1", name: "Aditya Pratama", nis: "20002", dept: "TKJ 2023", avatarBg: "from-indigo-600 to-purple-600" },
    { role: "Wakil Ketua 2", name: "Nadira Kusuma", nis: "20003", dept: "RPL 2023", avatarBg: "from-purple-600 to-pink-600" },
    { role: "Sekretaris Umum", name: "Siti Aminah", nis: "20011", dept: "RPL 2024", avatarBg: "from-cyan-600 to-blue-600" },
    { role: "Sekretaris 1", name: "Dian Permata", nis: "20012", dept: "AKL 2024", avatarBg: "from-teal-600 to-cyan-600" },
    { role: "Bendahara Umum", name: "Larasati Dewi", nis: "20021", dept: "AKL 2024", avatarBg: "from-emerald-600 to-teal-600" },
    { role: "Bendahara 1", name: "Hendra Saputra", nis: "20022", dept: "SIJA 2024", avatarBg: "from-green-600 to-emerald-600" },
  ];

  // 10 Sekbid (Exact Database Seed)
  const sekbidList = [
    { num: 1, name: "Pembinaan Keimanan & Ketaqwaan YME", coordinator: "Ahmad Syarif", nis: "20101", dept: "TKJ", focus: "Spiritualitas, Hari Besar Agama, Toleransi Beragama", icon: "🕌" },
    { num: 2, name: "Pembinaan Budi Pekerti Luhur & Akhlak", coordinator: "Bagus Prasetyo", nis: "20102", dept: "RPL", focus: "Tata Krama, Ketertiban, Kegiatan Sosial & Amal", icon: "🌱" },
    { num: 3, name: "Pembinaan Kepribadian & Bela Negara", coordinator: "Chandra Wijaya", nis: "20103", dept: "SIJA", focus: "Wawasan Kebangsaan, Upacara, Pramuka & Paskibra", icon: "🇮🇩" },
    { num: 4, name: "Pembinaan Prestasi Akademik, Seni, Olahraga", coordinator: "Dina Mariana", nis: "20104", dept: "MM", focus: "Lomba Akademik, Pentas Seni, Classmeeting", icon: "🏆" },
    { num: 5, name: "Demokrasi, HAM, Lingkungan Hidup", coordinator: "Eko Sulistyo", nis: "20105", dept: "TKJ", focus: "Pemilihan Ketua, Forum Aspirasi, Kebersihan", icon: "⚖️" },
    { num: 6, name: "Pembinaan Kreativitas & Kewirausahaan", coordinator: "Fitri Handayani", nis: "20106", dept: "AKL", focus: "Koperasi Sekolah, Bazaar Wirausaha Siswa", icon: "💡" },
    { num: 7, name: "Pembinaan Jasmani, Kesehatan & Gizi", coordinator: "Gilang Ramadhan", nis: "20107", dept: "RPL", focus: "UKS, PMR, Penyuluhan Kesehatan & Olahraga", icon: "🏃" },
    { num: 8, name: "Pembinaan Sastra & Budaya", coordinator: "Hana Pertiwi", nis: "20108", dept: "SIJA", focus: "Mading Digital, Penerbitan Sastra, Pentas Budaya", icon: "🎭" },
    { num: 9, name: "Pembinaan Teknologi Informasi & Komunikasi", coordinator: "Irvan Maulana", nis: "20109", dept: "SIJA", focus: "Website Canopy, Dokumentasi Multimedia, Medsos", icon: "💻" },
    { num: 10, name: "Pembinaan Komunikasi Bahasa Asing", coordinator: "Julia Lestari", nis: "20110", dept: "RPL", focus: "English Club, Debat Bahasa Asing, Foreign Workshop", icon: "🌐" },
  ];

  // Default Calendar Events (Matching exact August 2026 active dashboard view)
  const defaultEvents: DisplayEvent[] = [
    {
      id: "bph-1",
      title: "[BPH] Rapat Koordinasi Mingguan BPH",
      date: "31 Agustus 2026",
      time: "12:40 - 12:40 WIB",
      location: "Ruang OSIS",
      sekbid: "BPH & Pembina",
      status: "bulan_ini",
      statusLabel: "Bulan Ini",
      statusBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      desc: "Evaluasi program kerja mingguan dan persiapan classmeeting."
    },
    {
      id: 2,
      title: "Pekan Olahraga & Seni (Porseni) Antar Kelas",
      date: "12 - 16 Oktober 2026",
      time: "07:30 - 15:30 WIB",
      location: "Lapangan Utama & Lapangan Olahraga",
      sekbid: "Sekbid 4 & Sekbid 7",
      status: "mendatang",
      statusLabel: "Mendatang",
      statusBadge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      desc: "Turnamen olahraga antar kelas yang mencakup futsal, basket, bulutangkis, dan pentas seni bakat siswa."
    },
    {
      id: 3,
      title: "Sosialisasi & Peluncuran Website Canopy Digital",
      date: "24 Oktober 2026",
      time: "09:00 - 12:00 WIB",
      location: "Lab Komputer & Live Stream",
      sekbid: "Sekbid 9 (TIK)",
      status: "mendatang",
      statusLabel: "Mendatang",
      statusBadge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      desc: "Pengenalan fitur alur LPJ digital, presensi rapat QR, dan transparansi kas bagi seluruh perwakilan kelas."
    },
    {
      id: 4,
      title: "Bazaar Kewirausahaan & Produk Inovasi Siswa",
      date: "15 Agustus 2026",
      time: "Selesai",
      location: "Selasar Gedung Utama",
      sekbid: "Sekbid 6 (Kewirausahaan)",
      status: "selesai",
      statusLabel: "Selesai",
      statusBadge: "bg-slate-700/60 text-slate-400 border-slate-600",
      desc: "Pameran produk wirausaha mandiri hasil karya kreatif siswa antar kelas."
    }
  ];

  const [events, setEvents] = useState<DisplayEvent[]>(defaultEvents);

  // Synchronize calendar events with localStorage (canopy_agendas) and month categorization
  useEffect(() => {
    function parseIndonesianDate(dateStr: string): string {
      if (!dateStr) return "31 Agustus 2026";
      if (dateStr.includes("Agustus") || dateStr.includes("Oktober") || dateStr.includes("Juli")) return dateStr;
      
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${day} ${monthNames[monthNum - 1]} ${year}`;
        }
      }
      return dateStr;
    }

    function calculateStatus(startDateStr: string): { status: "bulan_ini" | "mendatang" | "selesai"; statusLabel: string; statusBadge: string } {
      const monthStr = startDateStr ? startDateStr.slice(0, 7) : "2026-08";
      if (monthStr === "2026-08" || startDateStr.includes("Agustus")) {
        return {
          status: "bulan_ini",
          statusLabel: "Bulan Ini",
          statusBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        };
      } else if (monthStr > "2026-08" || startDateStr.includes("Oktober") || startDateStr.includes("September")) {
        return {
          status: "mendatang",
          statusLabel: "Mendatang",
          statusBadge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        };
      } else {
        return {
          status: "selesai",
          statusLabel: "Selesai",
          statusBadge: "bg-slate-700/60 text-slate-400 border-slate-600",
        };
      }
    }

    function loadSyncedEvents() {
      if (typeof window !== "undefined") {
        const storedAgendas = localStorage.getItem("canopy_agendas");
        if (storedAgendas) {
          try {
            const parsed = JSON.parse(storedAgendas);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped: DisplayEvent[] = parsed.map((a: any) => {
                const rawDate = a.startDate || "2026-08-31";
                const { status, statusLabel, statusBadge } = calculateStatus(rawDate);
                const displayDate = parseIndonesianDate(rawDate);
                const displayTime = a.startTime ? `${a.startTime} - ${a.endTime || a.startTime} WIB` : "12:40 - 12:40 WIB";

                return {
                  id: a.id,
                  title: a.title,
                  date: displayDate,
                  time: displayTime,
                  location: a.location || "Ruang OSIS",
                  sekbid: a.targetAudience || "BPH & Pembina",
                  status,
                  statusLabel,
                  statusBadge,
                  desc: a.description || "Evaluasi program kerja mingguan dan persiapan classmeeting",
                };
              });
              setEvents(mapped);
              return;
            }
          } catch {}
        }
      }
      setEvents(defaultEvents);
    }

    loadSyncedEvents();
    window.addEventListener("storage", loadSyncedEvents);
    return () => window.removeEventListener("storage", loadSyncedEvents);
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (calendarFilter === "semua") return true;
    return ev.status === calendarFilter;
  });

  // Proker Achievements Breakdown
  const prokerHighlights = [
    {
      title: "Digitalisasi Portal Kepengurusan Canopy",
      sekbid: "Sekbid 9 • TIK (Irvan Maulana)",
      progress: 100,
      status: "Tercapai 100%",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      desc: "Integrasi sistem manajemen proker, presensi rapat QR, transparansi kas, dan penyimpanan LPJ online."
    },
    {
      title: "Bazaar Ekonomi Kreatif Siswa",
      sekbid: "Sekbid 6 • Kewirausahaan (Fitri Handayani)",
      progress: 100,
      status: "Tercapai 100%",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      desc: "Memfasilitasi stand UMKM siswa dengan total omset melampaui target alokasi anggaran."
    },
    {
      title: "Pekan Olahraga & Seni Antar Kelas",
      sekbid: "Sekbid 4 (Dina) & Sekbid 7 (Gilang)",
      progress: 75,
      status: "Dalam Pelaksanaan (75%)",
      badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      desc: "Jadwal dan venue pertandingan telah terkonfirmasi, memasuki tahap persiapan teknis."
    },
    {
      title: "Pelatihan Kepemimpinan Organisasi",
      sekbid: "Sekbid 2 (Bagus) & Sekbid 3 (Chandra)",
      progress: 90,
      status: "Persiapan Akhir (90%)",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      desc: "Pengesahan pemateri dari Pembina serta penyelesaian draf susunan acara."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden">
      
      {/* ANIMATED AMBIENT BACKGROUND GLOW ORBS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[800px] pointer-events-none overflow-hidden -z-0">
        <div className="absolute -top-40 left-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-blue-600/15 rounded-full blur-[100px] sm:blur-[140px] animate-pulse transition-all duration-1000" />
        <div className="absolute top-40 right-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-[90px] sm:blur-[130px] animate-pulse transition-all duration-1000 delay-500" />
      </div>

      {/* FULLY RESPONSIVE MOBILE & DESKTOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl border-b border-slate-800/80 shadow-xl shadow-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight group-hover:text-blue-400 transition-colors">
                Canopy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <a href="#profil" className="text-xs lg:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 px-3.5 py-2 rounded-xl transition-all">
              Profil Organisasi
            </a>
            <a href="#struktur" className="text-xs lg:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 px-3.5 py-2 rounded-xl transition-all">
              Struktur Kepengurusan
            </a>
            <a href="#kalender" className="text-xs lg:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 px-3.5 py-2 rounded-xl transition-all">
              Kalender Kegiatan
            </a>
            <a href="#pencapaian" className="text-xs lg:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 px-3.5 py-2 rounded-xl transition-all">
              Pencapaian Proker
            </a>
          </nav>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Slide-Down Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0f172a] border-b border-slate-800 px-4 pt-2 pb-6 space-y-2 animate-fade-in">
            <a
              href="#profil"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 px-4 py-2.5 rounded-xl transition-all"
            >
              Profil Organisasi
            </a>
            <a
              href="#struktur"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 px-4 py-2.5 rounded-xl transition-all"
            >
              Struktur Kepengurusan
            </a>
            <a
              href="#kalender"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 px-4 py-2.5 rounded-xl transition-all"
            >
              Kalender Kegiatan
            </a>
            <a
              href="#pencapaian"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 px-4 py-2.5 rounded-xl transition-all"
            >
              Pencapaian Proker
            </a>
            <div className="pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                Masuk Portal Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-14 pb-16 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
        
        {/* Animated Hero Title with Shimmer Beam Effect */}
        <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.2] sm:leading-[1.15] max-w-4xl mx-auto">
          Membangun Organisasi Siswa yang <span className="animate-text-shimmer">Inovatif, Transparan & Berdampak.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal opacity-90 animate-fade-in delay-100">
          Pusat informasi resmi profil kepengurusan, kalender agenda kegiatan sekolah, serta ringkasan ketercapaian program kerja.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 animate-fade-in delay-200">
          <Link
            href="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Masuk Portal Login
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </Link>

          <a
            href="#kalender"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-500 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Lihat Kalender Kegiatan
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </a>
        </div>
      </section>

      {/* PROFIL ORGANISASI */}
      <section id="profil" className="py-16 sm:py-24 bg-slate-900/60 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Profil Organisasi
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
              Wadah aspirasi, kepemimpinan, dan pengembangan potensi seluruh siswa secara terstruktur dan profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch mb-10 sm:mb-12">
            {/* Visi Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1e293b]/80 border border-slate-700/70 shadow-xl hover:border-blue-500/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-110 transition-transform">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="12 8 8 16 16 16" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5">Visi Organisasi</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Menjadikan organisasi sebagai wadah kepemimpinan siswa yang adaptif, berintegritas tinggi, berwawasan luas, serta mampu menciptakan lingkungan sekolah yang kondusif, kreatif, dan berprestasi.
                </p>
              </div>
            </div>

            {/* Misi Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#1e293b]/80 border border-slate-700/70 shadow-xl hover:border-emerald-500/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2.5">Misi Organisasi</h3>
                <ul className="text-xs sm:text-sm text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Menyelenggarakan program kerja sekbid yang realistis, efisien, dan bermanfaat bagi siswa.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Membangun transparansi pengelolaan kas dan pencatatan notulensi kegiatan secara terbuka.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Menampung serta menindaklanjuti aspirasi siswa secara cepat dan responsif.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Core Values Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300">
              <span className="text-2xl sm:text-3xl mb-2.5 block transform group-hover:scale-110 transition-transform">🤝</span>
              <h4 className="text-sm sm:text-base font-bold text-white">Integritas & Kolaborasi</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">Mengedepankan kerja sama antar 10 Sekbid dalam setiap pelaksanaan event.</p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300">
              <span className="text-2xl sm:text-3xl mb-2.5 block transform group-hover:scale-110 transition-transform">📊</span>
              <h4 className="text-sm sm:text-base font-bold text-white">Transparansi Data</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">Pencatatan status proker, anggaran kas, dan presensi rapat secara akuntabel.</p>
            </div>
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300">
              <span className="text-2xl sm:text-3xl mb-2.5 block transform group-hover:scale-110 transition-transform">🎯</span>
              <h4 className="text-sm sm:text-base font-bold text-white">Fokus Ketercapaian</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">Memastikan setiap kegiatan memiliki KPI dan pertanggungjawaban rapi.</p>
            </div>
          </div>

        </div>
      </section>

      {/* STRUKTUR KEPENGURUSAN AKTIFF */}
      <section id="struktur" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Struktur Kepengurusan Aktif
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
            Susunan Pengurus Harian dan 10 Seksi Bidang (Sekbid) terdaftar.
          </p>
        </div>

        {/* Executive Board Grid */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 sm:mb-8 text-center">Pengurus Harian & Pembina</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {executiveBoard.map((person, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[#1e293b]/70 border border-slate-700/60 hover:border-blue-500/50 hover:-translate-y-1.5 transition-all duration-300 text-center group shadow-lg"
              >
                <div className={`w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-br ${person.avatarBg} flex items-center justify-center text-white font-extrabold text-lg sm:text-xl mx-auto mb-3.5 shadow-lg group-hover:scale-110 group-hover:rotate-2 transition-all duration-300`}>
                  {person.name.charAt(0)}
                </div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">{person.role}</span>
                <h4 className="text-sm sm:text-base font-bold text-white mb-0.5 group-hover:text-blue-300 transition-colors">{person.name}</h4>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium">NIS: {person.nis} • {person.dept}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 10 Sekbid Grid */}
        <div>
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 sm:mb-8 text-center">Koordinator 10 Seksi Bidang (Sekbid)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
            {sekbidList.map((s) => (
              <div
                key={s.num}
                className="p-4 sm:p-5.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                    <span className="text-xl sm:text-2xl group-hover:scale-125 transition-transform duration-300">{s.icon}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      Sekbid {s.num}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug mb-1 group-hover:text-blue-300 transition-colors">{s.name}</h4>
                  <p className="text-[11px] text-slate-400 mb-2">Koord: <span className="text-slate-200 font-medium">{s.coordinator} ({s.nis})</span></p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">{s.focus}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KALENDER KEGIATAN */}
      <section id="kalender" className="py-16 sm:py-24 bg-slate-900/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Kalender Agenda Kegiatan
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
              Jadwal lengkap pelaksanaan event, rapat pleno, dan agenda kepengurusan.
            </p>
          </div>

          {/* Event Filter Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: "semua", label: "Semua Kegiatan" },
              { id: "bulan_ini", label: "Bulan Ini" },
              { id: "mendatang", label: "Mendatang" },
              { id: "selesai", label: "Selesai" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCalendarFilter(tab.id as any)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  calendarFilter === tab.id
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
                    : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Events List Timeline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#1e293b]/70 border border-slate-700/60 hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${ev.statusBadge}`}>
                      {ev.statusLabel}
                    </span>
                    <span className="text-xs text-blue-400 font-semibold">{ev.sekbid}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">{ev.title}</h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{ev.desc}</p>
                </div>

                <div className="sm:text-right flex-shrink-0 bg-slate-900/70 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-white flex items-center sm:justify-end gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {ev.date}
                  </p>
                  <p className="text-[11px] text-slate-400">{ev.time}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{ev.location}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* RINGKASAN PENCAPAIAN PROGRAM KERJA */}
      <section id="pencapaian" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Ringkasan Pencapaian Program Kerja
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
            Ketercapaian indikator kinerja utama (KPI) seluruh program kerja.
          </p>
        </div>

        {/* Progress Overview Card */}
        <div className="bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-900 rounded-3xl border border-slate-700/80 p-6 sm:p-10 mb-10 sm:mb-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 hover:border-slate-600 transition-all">
          <div className="space-y-2.5 text-center md:text-left">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
              Status Kinerja Organisasi
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white">78% Program Kerja Terlaksana Sangat Baik</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Dari total 28 rencana program kerja yang disusun oleh 10 Sekbid, sebanyak 18 proker telah selesai diselenggarakan beserta kelengkapan LPJ.
            </p>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto flex-shrink-0">
            <div className="p-3.5 sm:p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center hover:scale-105 transition-transform">
              <p className="text-xl sm:text-3xl font-extrabold text-blue-400">28</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">Total Proker</p>
            </div>
            <div className="p-3.5 sm:p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center hover:scale-105 transition-transform">
              <p className="text-xl sm:text-3xl font-extrabold text-emerald-400">18</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">Selesai + LPJ</p>
            </div>
            <div className="p-3.5 sm:p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center hover:scale-105 transition-transform">
              <p className="text-xl sm:text-3xl font-extrabold text-amber-400">6</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">Berjalan</p>
            </div>
            <div className="p-3.5 sm:p-4.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center hover:scale-105 transition-transform">
              <p className="text-xl sm:text-3xl font-extrabold text-purple-400">4</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">Perencanaan</p>
            </div>
          </div>
        </div>

        {/* Proker Highlights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {prokerHighlights.map((ph, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 space-y-3.5 sm:space-y-4 shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs text-blue-400 font-semibold">{ph.sekbid}</span>
                  <h4 className="text-sm sm:text-base font-bold text-white mt-1">{ph.title}</h4>
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${ph.badgeClass}`}>
                  {ph.status}
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Progres Penyelesaian</span>
                  <span className="font-bold text-white">{ph.progress}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 sm:h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${ph.progress}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">{ph.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm text-white">Canopy Platform</p>
              <p className="text-[11px] text-slate-400">Profil, Kepengurusan, Agenda & Pencapaian Proker</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-400 flex-wrap justify-center">
            <a href="#profil" className="hover:text-blue-400 transition-colors">Profil</a>
            <a href="#struktur" className="hover:text-blue-400 transition-colors">Struktur</a>
            <a href="#kalender" className="hover:text-blue-400 transition-colors">Kalender</a>
            <a href="#pencapaian" className="hover:text-blue-400 transition-colors">Pencapaian</a>
            <Link href="/login" className="hover:text-blue-400 transition-colors font-semibold">Masuk Portal</Link>
          </div>

          <div className="text-[11px] text-slate-500 text-center md:text-right">
            <p>© {new Date().getFullYear()} Canopy. Hak cipta dilindungi undang-undang.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
