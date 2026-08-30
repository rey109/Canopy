"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";
import TopBar from "@/components/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, wajibGantiPassword, passwordChanged, logout } = useAuth();
  const router = useRouter();
  const [passwordBaru, setPasswordBaru] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    if (passwordBaru.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (passwordBaru !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak sama.");
      return;
    }
    setSubmittingPassword(true);
    try {
      await api.changePassword(passwordBaru);
      passwordChanged();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Gagal memperbarui password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (wajibGantiPassword) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)] sm:flex sm:items-center sm:justify-center">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Keamanan akun</p>
          <h1 className="mt-2 text-2xl font-bold">Ganti password awal</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Buat password baru sebelum menggunakan Canopy.</p>
          <form className="mt-6 space-y-4" onSubmit={handlePasswordChange}>
            <label className="block text-sm font-medium">Password baru<input className="input-field mt-2" type="password" autoComplete="new-password" value={passwordBaru} onChange={(event) => setPasswordBaru(event.target.value)} required /></label>
            <label className="block text-sm font-medium">Konfirmasi password<input className="input-field mt-2" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
            {passwordError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{passwordError}</p>}
            <button className="btn-primary w-full justify-center" type="submit" disabled={submittingPassword}>{submittingPassword ? "Menyimpan..." : "Simpan password"}</button>
          </form>
          <button className="mt-4 w-full text-sm text-[var(--text-secondary)] underline underline-offset-4" onClick={logout}>Keluar</button>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Mobile Top Bar */}
        <TopBar />

        <main className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto min-h-full max-w-7xl px-4 py-5 sm:px-5 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
