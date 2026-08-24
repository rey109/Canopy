"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

// Slides content with custom SVG illustrations matching user requirement
const slides = [
  {
    id: 1,
    title: "Welcome!",
    subtitle: "Kelola seluruh program kerja, tugas, dan kegiatan OSIS dengan rapi, efisien, dan terstruktur dalam satu platform.",
    illustration: (
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* Decorative background glow */}
          <circle cx="100" cy="100" r="75" fill="#3b82f6" opacity="0.15" />
          <path d="M40 140 C 60 180, 140 180, 160 140" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.4" />
          
          {/* 3D Clipboard base */}
          <rect x="55" y="45" width="90" height="120" rx="14" fill="#2563eb" />
          <rect x="62" y="55" width="76" height="100" rx="10" fill="#ffffff" />
          
          {/* Clipboard clip top */}
          <rect x="80" y="36" width="40" height="18" rx="5" fill="#1e40af" />
          <rect x="88" y="32" width="24" height="10" rx="3" fill="#93c5fd" />
          
          {/* Checkboxes & Lines */}
          {/* Row 1 */}
          <rect x="72" y="70" width="18" height="18" rx="4" fill="#3b82f6" />
          <path d="M76 79 L80 83 L86 75" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="96" y="74" width="34" height="4" rx="2" fill="#fb923c" />
          <rect x="96" y="81" width="24" height="4" rx="2" fill="#cbd5e1" />
          
          {/* Row 2 */}
          <rect x="72" y="96" width="18" height="18" rx="4" fill="#3b82f6" />
          <path d="M76 105 L80 109 L86 101" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="96" y="100" width="34" height="4" rx="2" fill="#fb923c" />
          <rect x="96" y="107" width="20" height="4" rx="2" fill="#cbd5e1" />

          {/* Row 3 */}
          <rect x="72" y="122" width="18" height="18" rx="4" stroke="#94a3b8" strokeWidth="2" fill="none" />
          <rect x="96" y="126" width="30" height="4" rx="2" fill="#cbd5e1" />
          
          {/* Floating Pen */}
          <g transform="translate(115, 75) rotate(-35)">
            <rect x="0" y="0" width="12" height="60" rx="3" fill="#f97316" />
            <polygon points="0,60 12,60 6,72" fill="#fdba74" />
            <polygon points="4,68 8,68 6,74" fill="#1e293b" />
            <rect x="0" y="8" width="12" height="10" fill="#ea580c" />
            <circle cx="6" cy="4" r="2" fill="#ffffff" />
          </g>
        </svg>
      </div>
    ),
  },
  {
    id: 2,
    title: "Rapat & Notulensi",
    subtitle: "Catat hasil rapat, daftar presensi pengurus, dan kelola dokumen kepengurusan secara terintegrasi.",
    illustration: (
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* Background glow */}
          <circle cx="100" cy="100" r="75" fill="#3b82f6" opacity="0.15" />
          
          {/* Blue Clipboard */}
          <rect x="50" y="40" width="100" height="130" rx="12" fill="#2563eb" />
          <rect x="58" y="52" width="84" height="108" rx="8" fill="#fffbeb" />
          
          {/* Top Yellow Clip Header */}
          <rect x="75" y="32" width="50" height="20" rx="6" fill="#eab308" />
          <circle cx="100" cy="42" r="5" fill="#ffffff" />
          
          {/* List items with avatars */}
          {/* Item 1 */}
          <circle cx="72" cy="74" r="6" fill="#2563eb" />
          <path d="M68 85 C68 80, 76 80, 76 85" stroke="#2563eb" strokeWidth="2" fill="none" />
          <rect x="85" y="74" width="30" height="4" rx="2" fill="#94a3b8" />
          <rect x="123" y="70" width="12" height="12" rx="3" stroke="#2563eb" strokeWidth="2" fill="none" />

          {/* Item 2 */}
          <circle cx="72" cy="98" r="6" fill="#2563eb" />
          <path d="M68 109 C68 104, 76 104, 76 109" stroke="#2563eb" strokeWidth="2" fill="none" />
          <rect x="85" y="98" width="30" height="4" rx="2" fill="#94a3b8" />
          <rect x="123" y="94" width="12" height="12" rx="3" fill="#ef4444" />
          <path d="M126 97 L132 103 M132 97 L126 103" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Item 3 */}
          <circle cx="72" cy="122" r="6" fill="#2563eb" />
          <path d="M68 133 C68 128, 76 128, 76 133" stroke="#2563eb" strokeWidth="2" fill="none" />
          <rect x="85" y="122" width="30" height="4" rx="2" fill="#94a3b8" />
          <rect x="123" y="118" width="12" height="12" rx="3" stroke="#2563eb" strokeWidth="2" fill="none" />

          {/* Item 4 */}
          <circle cx="72" cy="146" r="6" fill="#2563eb" />
          <rect x="85" y="146" width="30" height="4" rx="2" fill="#94a3b8" />
          <rect x="123" y="142" width="12" height="12" rx="3" stroke="#2563eb" strokeWidth="2" fill="none" />
        </svg>
      </div>
    ),
  },
  {
    id: 3,
    title: "Target & Evaluasi",
    subtitle: "Pantau ketercapaian target program kerja dan tingkat efisiensi kinerja setiap divisi secara real-time.",
    illustration: (
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* Background glow */}
          <circle cx="100" cy="100" r="75" fill="#3b82f6" opacity="0.15" />
          
          {/* Concentric Target Rings */}
          <circle cx="100" cy="100" r="65" stroke="#1d4ed8" strokeWidth="12" fill="none" />
          <circle cx="100" cy="100" r="45" stroke="#ffffff" strokeWidth="10" fill="none" />
          <circle cx="100" cy="100" r="30" stroke="#1d4ed8" strokeWidth="10" fill="none" />
          <circle cx="100" cy="100" r="14" fill="#1d4ed8" />
          <circle cx="100" cy="100" r="6" fill="#ffffff" />
          
          {/* Arrow hitting Bullseye */}
          <g transform="translate(100, 100) rotate(-45)">
            <line x1="0" y1="0" x2="70" y2="0" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
            <polygon points="0,-4 0,4 -10,0" fill="#1e293b" />
            {/* Arrow Fletching */}
            <path d="M 60 -8 L 72 -14 L 66 0 L 72 14 L 60 8 L 64 0 Z" fill="#2563eb" />
          </g>
        </svg>
      </div>
    ),
  },
];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  
  const [nis, setNis] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Carousel active index state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Automatic slide transition every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(nis, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal. Silakan periksa kredensial Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] relative overflow-hidden font-sans select-none">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Card Container */}
      <div className="w-full max-w-4xl min-h-[560px] bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700/60 overflow-hidden flex flex-col md:flex-row relative z-10">
        
        {/* LEFT SIDE: Brand & Carousel Slider (Default Dark/Brand Theme) */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e1b4b] p-8 md:p-10 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-slate-700/40 overflow-hidden">
          
          {/* Top Brand Header */}
          <div className="flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg text-white tracking-wide">Upteamist</h2>
              <p className="text-[11px] text-slate-400">Canopy OSIS Platform</p>
            </div>
          </div>

          {/* Middle Content: Smooth Sliding Track */}
          <div className="my-auto py-6 overflow-hidden w-full relative">
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((slide, index) => {
                const isActive = currentSlide === index;
                return (
                  <div
                    key={slide.id}
                    className={`w-full flex-shrink-0 flex flex-col items-center text-center px-2 transition-all duration-700 ${
                      isActive ? "opacity-100 scale-100" : "opacity-20 scale-95 pointer-events-none"
                    }`}
                  >
                    {/* Floating Illustration Container */}
                    <div
                      className={`transform transition-all duration-700 ${
                        isActive ? "translate-y-0" : "translate-y-6"
                      }`}
                    >
                      {slide.illustration}
                    </div>

                    {/* Smooth Fade & Slide Text Content */}
                    <div
                      className={`mt-6 space-y-2 min-h-[85px] transform transition-all duration-700 delay-100 ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                        {slide.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed font-normal">
                        {slide.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Dot Navigation Indicators */}
          <div className="flex items-center justify-center gap-2 pt-2 z-10">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`transition-all duration-500 rounded-full cursor-pointer ${
                  currentSlide === index
                    ? "w-8 h-2.5 bg-blue-500 shadow-md shadow-blue-500/50"
                    : "w-2.5 h-2.5 bg-slate-600 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Clean White Login Form */}
        <div className="w-full md:w-1/2 bg-white text-slate-800 p-8 md:p-12 flex flex-col justify-center">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#2563eb] tracking-tight">
              Log In
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Silakan masukkan kredensial Anda untuk mengakses dashboard OSIS.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 select-text">
            {/* NIS / Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Username / NIS
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Username / NIS"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all font-medium pr-10"
                  required
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all font-medium pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Remember Password Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span>Remeber password</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
