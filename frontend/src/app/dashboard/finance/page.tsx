"use client";

import { useEffect, useState } from "react";
import { api, fileUrl, type TransaksiDetail, type ProkerDetail, type PengajuanDanaDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SEKBID_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

const KATEGORI_MASUK = ["Dana Sekolah", "Sponsor", "Iuran", "Donasi", "Penjualan", "Pengembalian Dana", "Lainnya", "Lainnya (Masuk)"];
const KATEGORI_KELUAR = ["Konsumsi", "ATK", "Transportasi", "Perlengkapan Kegiatan", "Dokumentasi", "Publikasi", "Hadiah/Penghargaan", "Hadiah & Piala", "Sewa", "Operasional", "Lainnya", "Lainnya (Keluar)"];

export default function FinancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"kas" | "pengajuan" | "verifikasi" | "persetujuan">("kas");

  // Data
  const [txns, setTxns] = useState<TransaksiDetail[]>([]);
  const [filteredTxns, setFilteredTxns] = useState<TransaksiDetail[]>([]);
  const [prokers, setProkers] = useState<ProkerDetail[]>([]);
  const [kategoriList, setKategoriList] = useState<{ kategori_id: number; nama: string }[]>([]);
  const [pengajuanList, setPengajuanList] = useState<PengajuanDanaDetail[]>([]);
  const [verifikasiList, setVerifikasiList] = useState<TransaksiDetail[]>([]);
  const [pendingVerifikasi, setPendingVerifikasi] = useState<TransaksiDetail[]>([]);
  const [berisikoList, setBerisikoList] = useState<TransaksiDetail[]>([]);

  const [balance, setBalance] = useState({ total_masuk: 0, total_keluar: 0, saldo: 0, menunggu: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters
  const [filterSekbid, setFilterSekbid] = useState<string>("semua");
  const [filterProker, setFilterProker] = useState<string>("semua");
  const [filterKategori, setFilterKategori] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");

  // Modals
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showPengajuanModal, setShowPengajuanModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<TransaksiDetail | null>(null);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanDanaDetail | null>(null);

  // Txn Form
  const [txnDate, setTxnDate] = useState("");
  const [txnJenis, setTxnJenis] = useState("Keluar");
  const [txnSekbid, setTxnSekbid] = useState("");
  const [txnKategori, setTxnKategori] = useState("");
  const [txnNominal, setTxnNominal] = useState("");
  const [txnDeskripsi, setTxnDeskripsi] = useState("");
  const [txnProker, setTxnProker] = useState("");
  const [txnSumber, setTxnSumber] = useState("Manual");
  const [txnBerisiko, setTxnBerisiko] = useState(false);
  const [txnBuktiLink, setTxnBuktiLink] = useState("");
  const [txnFile, setTxnFile] = useState<File | null>(null);
  const [txnFileB64, setTxnFileB64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pengajuan Form
  const [pjNama, setPjNama] = useState("");
  const [pjSekbid, setPjSekbid] = useState("");
  const [pjProker, setPjProker] = useState("");
  const [pjNominal, setPjNominal] = useState("");
  const [pjKeperluan, setPjKeperluan] = useState("");
  const [pjDeskripsi, setPjDeskripsi] = useState("");
  const [pjDeadline, setPjDeadline] = useState("");
  const [pjFile, setPjFile] = useState<File | null>(null);
  const [pjFileB64, setPjFileB64] = useState<string | null>(null);
  const [pjSubmitting, setPjSubmitting] = useState(false);

  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [txs, cats, prs, pjs, bal] = await Promise.allSettled([
        api.listTransactions(),
        api.listKategori(),
        api.listProkers(),
        api.listPengajuan().catch(() => ({ pengajuan: [] as PengajuanDanaDetail[] })),
        api.getBalance().catch(() => ({ total_masuk: 0, total_keluar: 0, saldo: 0 })),
      ]);

      if (txs.status === "fulfilled") {
        const list = txs.value.transaksi || [];
        setTxns(list);
        // hitung menunggu tindakan
        const menunggu = list.filter((t) => t.status === "Menunggu Verifikasi" || t.status === "Menunggu Approval Umum" || t.status === "Perlu Perbaikan").length;
        setBalance({
          total_masuk: txs.value.total_masuk,
          total_keluar: txs.value.total_keluar,
          saldo: txs.value.saldo,
          menunggu,
        });
      } else {
        setErrorMsg("Gagal memuat transaksi: " + (txs.reason as Error)?.message);
      }

      if (cats.status === "fulfilled") setKategoriList(cats.value.kategori || []);
      if (prs.status === "fulfilled") setProkers(prs.value.prokers || []);
      if (pjs.status === "fulfilled") setPengajuanList((pjs.value as any).pengajuan || []);

      if (bal.status === "fulfilled") {
        setBalance((prev) => ({
          total_masuk: (bal.value as any).total_masuk ?? prev.total_masuk,
          total_keluar: (bal.value as any).total_keluar ?? prev.total_keluar,
          saldo: (bal.value as any).saldo ?? prev.saldo,
          menunggu: prev.menunggu,
        }));
      }

      const gName = user?.group_name;
      if (gName === "Bendahara" || gName === "Trimitra") {
        const [verif, risk, vb] = await Promise.allSettled([
          api.listMenungguVerifikasi(),
          api.listMenungguApprovalBerisiko(),
          api.listVerifikasiBukti().catch(() => ({ transaksi: [] as TransaksiDetail[] })),
        ]);
        if (verif.status === "fulfilled") setPendingVerifikasi(verif.value.transaksi || []);
        if (risk.status === "fulfilled") setBerisikoList(risk.value.transaksi || []);
        if (vb.status === "fulfilled") setVerifikasiList((vb.value as any).transaksi || []);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Gagal memuat data keuangan: " + (e?.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  // Filter logic
  useEffect(() => {
    let filtered = [...txns];
    if (filterSekbid !== "semua") {
      filtered = filtered.filter((t) => String(t.division_id) === filterSekbid);
    }
    if (filterProker !== "semua") {
      filtered = filtered.filter((t) => String(t.proker_id) === filterProker);
    }
    if (filterKategori !== "semua") {
      filtered = filtered.filter((t) => String(t.kategori_id) === filterKategori);
    }
    if (filterStatus !== "semua") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }
    if (filterStart) {
      const sd = new Date(filterStart).getTime();
      filtered = filtered.filter((t) => new Date(t.tanggal).getTime() >= sd);
    }
    if (filterEnd) {
      const ed = new Date(filterEnd).getTime() + 86400000 - 1;
      filtered = filtered.filter((t) => new Date(t.tanggal).getTime() <= ed);
    }
    setFilteredTxns(filtered);
  }, [txns, filterSekbid, filterProker, filterKategori, filterStatus, filterStart, filterEnd]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const kategoriOptionsForJenis = (jenis: string) => {
    const allowed = jenis === "Masuk" ? KATEGORI_MASUK : KATEGORI_KELUAR;
    // Jika kategoriList dari API ada, filter sesuai jenis
    if (kategoriList.length > 0) {
      const fromBackend = kategoriList.filter((c) => allowed.includes(c.nama) || allowed.some((a) => c.nama.toLowerCase().includes(a.toLowerCase().split(" ")[0])));
      if (fromBackend.length > 0) return fromBackend;
      // Jika API mengembalikan kategori tapi tidak match filter, kembalikan semua dari API agar tetap ada pilihan
      return kategoriList;
    }
    // Fallback hardcoded jika API gagal/empty: buat synthetic options agar dropdown tetap bisa dipilih
    return allowed.map((nama, idx) => ({ kategori_id: 900 + idx, nama }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "txn" | "pj") => {
    const f = e.target.files?.[0] || null;
    if (type === "txn") {
      setTxnFile(f);
      if (f) {
        if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|pdf)$/i)) {
          alert("Format bukti harus JPG, JPEG, PNG, atau PDF");
          setTxnFile(null);
          e.target.value = "";
          return;
        }
        if (f.size > 10 * 1024 * 1024) {
          alert("Ukuran file maksimal 10 MB");
          setTxnFile(null);
          e.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(",")[1];
          setTxnFileB64(b64);
        };
        reader.readAsDataURL(f);
      } else {
        setTxnFileB64(null);
      }
    } else {
      setPjFile(f);
      if (f) {
        if (f.size > 10 * 1024 * 1024) {
          alert("Ukuran file maksimal 10 MB");
          setPjFile(null);
          e.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(",")[1];
          setPjFileB64(b64);
        };
        reader.readAsDataURL(f);
      } else {
        setPjFileB64(null);
      }
    }
  };

  const handleCreateTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnSekbid) {
      alert("Sekbid wajib dipilih (1-10)");
      return;
    }
    if (!txnDate || !txnNominal || !txnDeskripsi) {
      alert("Tanggal, Jumlah, dan Deskripsi wajib diisi");
      return;
    }
    // Kategori opsional: jangan blokir transaksi jika kosong
    // Jika kategori fallback synthetic (900+), jangan kirim kategori_id agar backend tidak error (kategori kosong/null diperbolehkan)
    let kategoriIdToSend: number | undefined = undefined;
    if (txnKategori) {
      const num = Number(txnKategori);
      // synthetic fallback id 900+ tidak ada di DB, perlakukan sebagai null (Lainnya teks sudah di deskripsi)
      if (num < 900) kategoriIdToSend = num;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        division_id: Number(txnSekbid),
        kategori_id: kategoriIdToSend,
        jenis: txnJenis,
        nominal: Number(txnNominal),
        deskripsi: txnDeskripsi,
        proker_id: txnProker ? Number(txnProker) : undefined,
        sumber: txnSumber,
        is_berisiko: txnBerisiko,
        tanggal: new Date(txnDate).toISOString(),
        bukti_url: txnBuktiLink || undefined,
      };
      if (txnFile && txnFileB64) {
        payload.file_name = txnFile.name;
        payload.file_type = txnFile.type || "application/octet-stream";
        payload.file_data_b64 = txnFileB64;
      }
      const res = await api.createTransaction(payload);
      // Success: bukti tersimpan atomic
      setShowTxnModal(false);
      setTxnDate(""); setTxnJenis("Keluar"); setTxnSekbid(""); setTxnKategori(""); setTxnNominal(""); setTxnDeskripsi(""); setTxnProker(""); setTxnBuktiLink(""); setTxnBerisiko(false); setTxnSumber("Manual"); setTxnFile(null); setTxnFileB64(null);
      alert(`Transaksi berhasil disimpan! ID: ${res.transaksi_id} | Sekbid: SEKBID ${res.division_id} | Status: ${res.status}`);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      let msg = err?.message || "Gagal menyimpan transaksi";
      if (msg.includes("Failed to fetch")) msg = "Gagal menyimpan transaksi. Server tidak dapat dihubungi. Periksa koneksi atau CORS.";
      if (msg.includes("Please select")) msg = "Sekbid/Kategori wajib dipilih";
      alert("Gagal menyimpan transaksi: " + msg + "\n\nDetail teknis: " + (err?.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePengajuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pjSekbid) { alert("Sekbid wajib dipilih"); return; }
    if (!pjNama || !pjNominal || !pjKeperluan || !pjDeadline) { alert("Lengkapi semua field wajib"); return; }
    setPjSubmitting(true);
    try {
      const payload: any = {
        nama_pengajuan: pjNama,
        division_id: Number(pjSekbid),
        proker_id: pjProker ? Number(pjProker) : undefined,
        nominal: Number(pjNominal),
        keperluan: pjKeperluan,
        deskripsi: pjDeskripsi,
        deadline: new Date(pjDeadline).toISOString(),
      };
      if (pjFile && pjFileB64) {
        payload.file_name = pjFile.name;
        payload.file_type = pjFile.type || "application/octet-stream";
        payload.file_data_b64 = pjFileB64;
      }
      const res = await api.createPengajuan(payload);
      setShowPengajuanModal(false);
      setPjNama(""); setPjSekbid(""); setPjProker(""); setPjNominal(""); setPjKeperluan(""); setPjDeskripsi(""); setPjDeadline(""); setPjFile(null); setPjFileB64(null);
      alert(`Pengajuan berhasil dibuat! ID: ${res.pengajuan_id} | Status: ${res.status}`);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      alert("Gagal membuat pengajuan: " + (err?.message || "Unknown"));
    } finally {
      setPjSubmitting(false);
    }
  };

  const handleVerifikasiBukti = async (id: number, approve: boolean) => {
    setActionLoading(true);
    try {
      await api.verifikasiBukti(id, approve, actionNote || undefined);
      setActionNote("");
      fetchAll();
      alert(approve ? "Bukti terverifikasi" : "Bukti ditandai Perlu Perbaikan");
    } catch (e: any) { alert("Gagal verifikasi: " + e.message); } finally { setActionLoading(false); }
  };
  const handleApprovalBerisiko = async (id: number, approve: boolean) => {
    setActionLoading(true);
    try {
      await api.approvalBerisiko(id, approve, actionNote || undefined);
      setActionNote("");
      fetchAll();
      alert(approve ? "Approval berhasil" : "Ditolak");
    } catch (e: any) { alert("Gagal approval: " + e.message); } finally { setActionLoading(false); }
  };
  const handlePengajuanAction = async (id: number, action: "verifikasi" | "setujui" | "tolak" | "cairkan") => {
    setActionLoading(true);
    try {
      if (action === "verifikasi") await api.verifikasiPengajuan(id, actionNote);
      if (action === "setujui") await api.setujuiPengajuan(id, actionNote);
      if (action === "tolak") {
        if (!actionNote.trim()) { alert("Alasan penolakan wajib diisi"); setActionLoading(false); return; }
        await api.tolakPengajuan(id, actionNote);
      }
      if (action === "cairkan") await api.cairkanPengajuan(id);
      setActionNote("");
      fetchAll();
      alert(`Aksi ${action} berhasil`);
      if (selectedPengajuan?.pengajuan_id === id) {
        const updated = await api.getPengajuan(id);
        setSelectedPengajuan(updated);
      }
    } catch (e: any) { alert("Gagal: " + e.message); } finally { setActionLoading(false); }
  };

  // Running saldo for Buku Kas table
  const computeRunningSaldo = (list: TransaksiDetail[]) => {
    const sorted = [...list].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    let saldo = 0;
    return sorted.map((t) => {
      if (t.status === "Disetujui" || t.status === "Terverifikasi") {
        if (t.jenis === "Masuk") saldo += t.nominal;
        else saldo -= t.nominal;
      }
      return { ...t, runningSaldo: saldo };
    });
  };
  const bukuKasRows = computeRunningSaldo(filteredTxns);

  const gName = user?.group_name;
  const isBendahara = gName === "Bendahara";
  const isTrimitra = gName === "Trimitra";
  const canWrite = isBendahara || isTrimitra || gName === "Kepala Divisi" || gName === "Staf";
  const isBendaharaUmum = isBendahara && user?.level === 1;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Keuangan & Kas</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Kelola keuangan organisasi per SEKBID 1–10</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "kas" && canWrite && (
            <button onClick={() => setShowTxnModal(true)} className="btn-primary">
              + Catat Transaksi
            </button>
          )}
          {activeTab === "pengajuan" && (
            <button onClick={() => setShowPengajuanModal(true)} className="btn-primary">
              + Ajukan Dana
            </button>
          )}
          <button onClick={fetchAll} className="btn-secondary text-xs">Refresh</button>
        </div>
      </div>

      {errorMsg && <div className="bg-[rgba(239,68,68,0.1)] text-[var(--danger)] px-4 py-3 rounded-lg text-sm">{errorMsg}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 stagger-children">
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Total Pemasukan</p>
          {loading ? <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" /> : <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(balance.total_masuk)}</p>}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Total Pengeluaran</p>
          {loading ? <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" /> : <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(balance.total_keluar)}</p>}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Saldo Saat Ini</p>
          {loading ? <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" /> : <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(balance.saldo)}</p>}
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-[var(--text-muted)] font-semibold uppercase">Menunggu Tindakan</p>
          {loading ? <div className="h-6 w-24 bg-[var(--border)] rounded animate-pulse mt-1" /> : <p className="text-xl font-bold text-amber-400 mt-1">{balance.menunggu}</p>}
          <p className="text-[10px] text-[var(--text-muted)]">Verifikasi + Approval</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)]">Sekbid</label>
          <select value={filterSekbid} onChange={(e) => setFilterSekbid(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm py-2 px-3">
            <option value="semua">Semua Sekbid</option>
            {SEKBID_OPTIONS.map((n) => <option key={n} value={String(n)}>SEKBID {n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Proker</label>
          <select value={filterProker} onChange={(e) => setFilterProker(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm py-2 px-3">
            <option value="semua">Semua Proker</option>
            {prokers.map((p) => <option key={p.proker_id} value={String(p.proker_id)}>{p.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Kategori</label>
          <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm py-2 px-3">
            <option value="semua">Semua Kategori</option>
            {kategoriList.map((c) => <option key={c.kategori_id} value={String(c.kategori_id)}>{c.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm py-2 px-3">
            <option value="semua">Semua Status</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Menunggu Approval Umum">Menunggu Approval Umum</option>
            <option value="Perlu Perbaikan">Perlu Perbaikan</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Dari Tanggal</label>
          <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Sampai Tanggal</label>
          <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilterSekbid("semua"); setFilterProker("semua"); setFilterKategori("semua"); setFilterStatus("semua"); setFilterStart(""); setFilterEnd(""); }} className="btn-secondary text-xs py-2">Reset</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {[
          { id: "kas", label: "Buku Kas", count: filteredTxns.length },
          { id: "pengajuan", label: "Pengajuan Dana", count: pengajuanList.length },
          { id: "verifikasi", label: "Verifikasi Bukti", count: verifikasiList.length },
          { id: "persetujuan", label: "Persetujuan", count: pendingVerifikasi.length + berisikoList.length + pengajuanList.filter(p=>p.status==="Menunggu Verifikasi"||p.status==="Diproses").length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 border-b-2 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
          >
            {t.label} {t.count > 0 && <span className="badge badge-warning text-[10px]">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab: Buku Kas */}
      {activeTab === "kas" && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Buku Kas - Riwayat Transaksi</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse"><div className="h-10 w-full bg-[var(--border)] rounded" /><div className="h-10 w-full bg-[var(--border)] rounded" /></div>
          ) : bukuKasRows.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">Belum ada transaksi. Filter: {filterSekbid !== "semua" ? `SEKBID ${filterSekbid}` : "Semua Sekbid"}</div>
          ) : (
            <div className="table-container overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)]">
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">Jenis</th>
                    <th className="text-left p-2">Keterangan</th>
                    <th className="text-left p-2">Sekbid</th>
                    <th className="text-left p-2">Proker</th>
                    <th className="text-left p-2">Kategori</th>
                    <th className="text-right p-2">Pemasukan</th>
                    <th className="text-right p-2">Pengeluaran</th>
                    <th className="text-right p-2">Saldo</th>
                    <th className="text-left p-2">Sumber</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {bukuKasRows.map((t) => (
                    <tr key={t.transaksi_id} className="border-t border-[var(--border)] hover:bg-[var(--bg-primary)] cursor-pointer" onClick={() => setSelectedTxn(t)}>
                      <td className="p-2 text-xs">{new Date(t.tanggal).toLocaleDateString("id-ID")}</td>
                      <td className="p-2"><span className={`badge ${t.jenis === "Masuk" ? "badge-success" : "badge-danger"} text-[10px]`}>{t.jenis}</span></td>
                      <td className="p-2 max-w-[150px] truncate" title={t.deskripsi}>{t.deskripsi}</td>
                      <td className="p-2 text-xs font-medium">{t.division_id ? `SEKBID ${t.division_id}` : "-"}</td>
                      <td className="p-2 text-xs">{t.proker_id ? prokers.find((p) => p.proker_id === t.proker_id)?.nama || `#${t.proker_id}` : "-"}</td>
                      <td className="p-2 text-xs">{t.kategori_nama || "-"}</td>
                      <td className="p-2 text-right text-emerald-400 font-medium">{t.jenis === "Masuk" ? formatCurrency(t.nominal) : "-"}</td>
                      <td className="p-2 text-right text-red-400 font-medium">{t.jenis === "Keluar" ? formatCurrency(t.nominal) : "-"}</td>
                      <td className="p-2 text-right font-bold text-xs">{formatCurrency((t as any).runningSaldo)}</td>
                      <td className="p-2 text-xs">{t.sumber}</td>
                      <td className="p-2"><span className={`badge text-[10px] ${t.status === "Disetujui" ? "badge-success" : t.status === "Ditolak" ? "badge-danger" : "badge-warning"}`}>{t.status}</span></td>
                      <td className="p-2 text-xs">
                        {t.bukti_url ? <a href={fileUrl(t.bukti_url)} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="text-[var(--accent)] hover:underline">Lihat</a> : "—"}
                        {t.file_name && <span className="text-[10px] block text-[var(--text-muted)]">{t.file_name} ({t.file_size ? Math.round(t.file_size!/1024) + "KB" : ""})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pengajuan Dana */}
      {activeTab === "pengajuan" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Pengajuan Dana</h2>
          {pengajuanList.length === 0 ? <p className="text-sm text-[var(--text-muted)] py-8 text-center">Belum ada pengajuan dana.</p> : (
            <div className="space-y-3">
              {pengajuanList.map((p) => (
                <div key={p.pengajuan_id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)]" onClick={() => setSelectedPengajuan(p)}>
                  <div>
                    <p className="font-semibold text-sm">{p.nama_pengajuan} <span className="text-xs text-[var(--text-muted)]">#{p.pengajuan_id}</span></p>
                    <p className="text-xs text-[var(--text-muted)]">Sekbid: {p.division_id ? `SEKBID ${p.division_id}` : "-"} | Proker: {p.proker_id ? prokers.find(x=>x.proker_id===p.proker_id)?.nama || p.proker_id : "-"} | Nominal: {formatCurrency(p.nominal)}</p>
                    <p className="text-xs text-[var(--text-muted)]">Keperluan: {p.keperluan} | Deadline: {new Date(p.deadline).toLocaleDateString("id-ID")}</p>
                    <p className="text-xs">Pengaju: {p.pengaju_nis} | Status: <span className={`badge text-[10px] ${p.status==="Disetujui"?"badge-success":p.status==="Ditolak"?"badge-danger":"badge-warning"}`}>{p.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    {p.lampiran_url && <a href={fileUrl(p.lampiran_url)} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="btn-secondary text-xs py-1 px-2">Lampiran</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Verifikasi Bukti */}
      {activeTab === "verifikasi" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Verifikasi Bukti</h2>
          <p className="text-xs text-[var(--text-muted)]">Transaksi dengan bukti yang perlu diperiksa Bendahara.</p>
          {verifikasiList.length === 0 ? <p className="text-sm text-[var(--text-muted)] py-8 text-center">Tidak ada bukti menunggu verifikasi.</p> : (
            <div className="space-y-3">
              {verifikasiList.map((t) => (
                <div key={t.transaksi_id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col sm:flex-row justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{t.deskripsi} <span className="text-xs">- {formatCurrency(t.nominal)} | SEKBID {t.division_id}</span></p>
                    <p className="text-xs text-[var(--text-muted)]">Proker: {t.proker_id ? prokers.find(p=>p.proker_id===t.proker_id)?.nama : "-"} | Status: {t.status} | Sekbid: SEKBID {t.division_id}</p>
                    {t.bukti_url && <a href={fileUrl(t.bukti_url)} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">Buka Bukti: {t.file_name || t.bukti_url}</a>}
                    {t.file_size && <span className="text-[10px] text-[var(--text-muted)]"> ({Math.round(t.file_size/1024)} KB)</span>}
                  </div>
                  <div className="flex gap-2 items-start">
                    <button onClick={() => handleVerifikasiBukti(t.transaksi_id, true)} disabled={actionLoading} className="btn-primary text-xs py-1.5 px-3">Terverifikasi</button>
                    <button onClick={() => { const note = prompt("Catatan perbaikan:"); if(note!==null){ setActionNote(note); handleVerifikasiBukti(t.transaksi_id, false); }}} className="btn-danger text-xs py-1.5 px-3">Perlu Perbaikan</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4">
            <h3 className="font-semibold text-sm mb-2">Antrian Scan Nota (Menunggu Verifikasi)</h3>
            {pendingVerifikasi.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Tidak ada.</p> : (
              <div className="space-y-2">
                {pendingVerifikasi.map((t)=>(
                  <div key={t.transaksi_id} className="p-3 border rounded flex justify-between">
                    <span className="text-xs">{t.deskripsi} - {formatCurrency(t.nominal)}</span>
                    <div className="flex gap-2">
                      <button onClick={()=>handleVerifikasiBukti(t.transaksi_id,true)} className="btn-primary text-xs">Lolos</button>
                      <button onClick={()=>handleVerifikasiBukti(t.transaksi_id,false)} className="btn-danger text-xs">Tolak</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Persetujuan */}
      {activeTab === "persetujuan" && (
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Persetujuan</h2>
          {/* Pengajuan persetujuan */}
          <div>
            <h3 className="font-medium text-sm mb-2">Pengajuan Dana Menunggu Persetujuan</h3>
            {pengajuanList.filter(p=>p.status==="Menunggu Verifikasi"||p.status==="Diproses").length===0 ? <p className="text-xs text-[var(--text-muted)]">Tidak ada.</p> : (
              <div className="space-y-2">
                {pengajuanList.filter(p=>p.status==="Menunggu Verifikasi"||p.status==="Diproses").map((p)=>(
                  <div key={p.pengajuan_id} className="p-3 border border-[var(--border)] rounded flex flex-col sm:flex-row justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{p.nama_pengajuan} - {formatCurrency(p.nominal)} | SEKBID {p.division_id} | {p.status}</p>
                      <p className="text-xs text-[var(--text-muted)]">{p.keperluan}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {p.status==="Menunggu Verifikasi" && <button onClick={()=>handlePengajuanAction(p.pengajuan_id,"verifikasi")} disabled={actionLoading} className="btn-secondary text-xs">Verifikasi</button>}
                      <button onClick={()=>handlePengajuanAction(p.pengajuan_id,"setujui")} disabled={actionLoading} className="btn-primary text-xs">Setujui</button>
                      <button onClick={()=>{ const a=prompt("Alasan penolakan:"); if(a) {setActionNote(a); handlePengajuanAction(p.pengajuan_id,"tolak");}}} className="btn-danger text-xs">Tolak</button>
                      {p.status==="Disetujui" && <button onClick={()=>handlePengajuanAction(p.pengajuan_id,"cairkan")} className="btn-primary text-xs">Cairkan</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Disetujui ready to cairkan */}
            {pengajuanList.filter(p=>p.status==="Disetujui").length>0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold">Disetujui (Siap Cairkan)</h4>
                {pengajuanList.filter(p=>p.status==="Disetujui").map((p)=>(
                  <div key={p.pengajuan_id} className="p-3 border rounded flex justify-between mt-2">
                    <span className="text-xs">{p.nama_pengajuan} - {formatCurrency(p.nominal)}</span>
                    <button onClick={()=>handlePengajuanAction(p.pengajuan_id,"cairkan")} className="btn-primary text-xs">Cairkan → Buat Transaksi</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Approval Berisiko */}
          <div>
            <h3 className="font-medium text-sm mb-2">Approval Transaksi Berisiko {(isBendaharaUmum||isTrimitra) ? "" : "(Hanya Bendahara Umum)"}</h3>
            {berisikoList.length===0 ? <p className="text-xs text-[var(--text-muted)]">Tidak ada transaksi berisiko.</p> : (
              <div className="space-y-2">
                {berisikoList.map((t)=>(
                  <div key={t.transaksi_id} className="p-3 border rounded flex justify-between">
                    <span className="text-xs">{t.deskripsi} - {formatCurrency(t.nominal)} | SEKBID {t.division_id}</span>
                    <div className="flex gap-2">
                      <button onClick={()=>handleApprovalBerisiko(t.transaksi_id,true)} disabled={!isBendaharaUmum && !isTrimitra} className="btn-primary text-xs">Approve</button>
                      <button onClick={()=>{ const a=prompt("Alasan:"); if(a){setActionNote(a); handleApprovalBerisiko(t.transaksi_id,false);}}} disabled={!isBendaharaUmum && !isTrimitra} className="btn-danger text-xs">Tolak</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Transaksi Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setSelectedTxn(null)}>
          <div className="glass-card p-6 w-full max-w-lg space-y-3" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Detail Transaksi #{selectedTxn.transaksi_id}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Tanggal</span><span>{new Date(selectedTxn.tanggal).toLocaleDateString("id-ID")} {new Date(selectedTxn.tanggal).toLocaleTimeString("id-ID")}</span>
              <span className="text-[var(--text-muted)]">Jenis</span><span>{selectedTxn.jenis}</span>
              <span className="text-[var(--text-muted)]">Nominal</span><span className="font-bold">{formatCurrency(selectedTxn.nominal)}</span>
              <span className="text-[var(--text-muted)]">Sekbid</span><span>{selectedTxn.division_id ? `SEKBID ${selectedTxn.division_id}` : "-"}</span>
              <span className="text-[var(--text-muted)]">Proker</span><span>{selectedTxn.proker_id ? prokers.find(p=>p.proker_id===selectedTxn.proker_id)?.nama || selectedTxn.proker_id : "-"}</span>
              <span className="text-[var(--text-muted)]">Kategori</span><span>{selectedTxn.kategori_nama || "-"}</span>
              <span className="text-[var(--text-muted)]">Sumber</span><span>{selectedTxn.sumber}</span>
              <span className="text-[var(--text-muted)]">Deskripsi</span><span>{selectedTxn.deskripsi}</span>
              <span className="text-[var(--text-muted)]">Pengaju</span><span>{selectedTxn.dicatat_oleh}</span>
              <span className="text-[var(--text-muted)]">Status</span><span className="badge text-xs">{selectedTxn.status}</span>
              {selectedTxn.alasan_penolakan && (<><span className="text-[var(--text-muted)]">Alasan/Catatan</span><span className="text-red-400">{selectedTxn.alasan_penolakan}</span></>)}
              {selectedTxn.pengajuan_id && (<><span className="text-[var(--text-muted)]">Pengajuan ID</span><span>#{selectedTxn.pengajuan_id}</span></>)}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium">Bukti Pembayaran</p>
              {selectedTxn.bukti_url ? (
                <div className="mt-2">
                  <a href={fileUrl(selectedTxn.bukti_url)} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline text-sm">Buka Bukti: {selectedTxn.file_name || selectedTxn.bukti_url}</a>
                  <p className="text-xs text-[var(--text-muted)]">File: {selectedTxn.file_name || "-"} | Tipe: {selectedTxn.file_type || "-"} | Size: {selectedTxn.file_size ? `${Math.round(selectedTxn.file_size/1024)} KB` : "-"} | Upload: {new Date(selectedTxn.created_at).toLocaleString("id-ID")}</p>
                  {selectedTxn.file_type?.startsWith("image/") && <img src={fileUrl(selectedTxn.bukti_url)} alt="bukti" className="mt-2 max-h-64 rounded border" />}
                </div>
              ) : <p className="text-xs text-[var(--text-muted)]">Tidak ada bukti.</p>}
            </div>
            <div className="flex justify-end"><button onClick={()=>setSelectedTxn(null)} className="btn-secondary text-xs">Tutup</button></div>
          </div>
        </div>
      )}

      {/* Detail Pengajuan Modal */}
      {selectedPengajuan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setSelectedPengajuan(null)}>
          <div className="glass-card p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Detail Pengajuan #{selectedPengajuan.pengajuan_id}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Nama</span><span>{selectedPengajuan.nama_pengajuan}</span>
              <span className="text-[var(--text-muted)]">Pengaju</span><span>{selectedPengajuan.pengaju_nis}</span>
              <span className="text-[var(--text-muted)]">Sekbid</span><span>SEKBID {selectedPengajuan.division_id}</span>
              <span className="text-[var(--text-muted)]">Proker</span><span>{selectedPengajuan.proker_id ? prokers.find(p=>p.proker_id===selectedPengajuan.proker_id)?.nama : "-"}</span>
              <span className="text-[var(--text-muted)]">Nominal</span><span className="font-bold">{formatCurrency(selectedPengajuan.nominal)}</span>
              <span className="text-[var(--text-muted)]">Keperluan</span><span>{selectedPengajuan.keperluan}</span>
              <span className="text-[var(--text-muted)]">Deskripsi</span><span>{selectedPengajuan.deskripsi}</span>
              <span className="text-[var(--text-muted)]">Deadline</span><span>{new Date(selectedPengajuan.deadline).toLocaleDateString("id-ID")}</span>
              <span className="text-[var(--text-muted)]">Waktu Pengajuan</span><span>{new Date(selectedPengajuan.created_at).toLocaleString("id-ID")}</span>
              <span className="text-[var(--text-muted)]">Status</span><span className="badge text-xs">{selectedPengajuan.status}</span>
              {selectedPengajuan.alasan_penolakan && <><span className="text-[var(--text-muted)]">Alasan Ditolak</span><span className="text-red-400 text-xs">{selectedPengajuan.alasan_penolakan}</span></>}
            </div>
            {selectedPengajuan.lampiran_url && <div className="text-sm"><a href={fileUrl(selectedPengajuan.lampiran_url)} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Lihat Lampiran: {selectedPengajuan.file_name || selectedPengajuan.lampiran_url}</a> <span className="text-xs text-[var(--text-muted)]">{selectedPengajuan.file_size ? `(${Math.round(selectedPengajuan.file_size!/1024)}KB)` : ""}</span></div>}
            {selectedPengajuan.status_history && selectedPengajuan.status_history.length > 0 && (
              <div>
                <p className="font-medium text-sm">Riwayat Status</p>
                <ul className="text-xs space-y-1">
                  {selectedPengajuan.status_history.map((h)=>(
                    <li key={h.history_id} className="border-l-2 border-[var(--border)] pl-2">{h.status_sebelum || "-"} → {h.status_sesudah} oleh {h.diubah_oleh} ({new Date(h.created_at).toLocaleString("id-ID")}) {h.catatan && `- ${h.catatan}`}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedPengajuan.approval_history && selectedPengajuan.approval_history.length > 0 && (
              <div>
                <p className="font-medium text-sm">Riwayat Approval</p>
                <ul className="text-xs space-y-1">
                  {selectedPengajuan.approval_history.map((a)=>(
                    <li key={a.approval_id} className="border-l-2 border-[var(--border)] pl-2">{a.keputusan} oleh {a.approver_nis} ({a.approver_role}) - {a.catatan || "-"} ({new Date(a.created_at).toLocaleString("id-ID")})</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {(selectedPengajuan.status==="Menunggu Verifikasi") && <button onClick={()=>handlePengajuanAction(selectedPengajuan.pengajuan_id,"verifikasi")} className="btn-secondary text-xs">Verifikasi</button>}
              {(selectedPengajuan.status==="Menunggu Verifikasi"||selectedPengajuan.status==="Diproses") && <><button onClick={()=>handlePengajuanAction(selectedPengajuan.pengajuan_id,"setujui")} className="btn-primary text-xs">Setujui</button><button onClick={()=>{ const a=prompt("Alasan:"); if(a) {setActionNote(a); handlePengajuanAction(selectedPengajuan.pengajuan_id,"tolak");}}} className="btn-danger text-xs">Tolak</button></>}
              {selectedPengajuan.status==="Disetujui" && <button onClick={()=>handlePengajuanAction(selectedPengajuan.pengajuan_id,"cairkan")} className="btn-primary text-xs">Cairkan & Buat Transaksi</button>}
              <button onClick={()=>setSelectedPengajuan(null)} className="btn-secondary text-xs ml-auto">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Transaksi */}
      {showTxnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-xl space-y-4 max-h-[95vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">Catat Transaksi Baru</h3>
            <form onSubmit={handleCreateTxn} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal *</label>
                  <input type="date" value={txnDate} onChange={(e)=>setTxnDate(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe *</label>
                  <select value={txnJenis} onChange={(e)=>{setTxnJenis(e.target.value); setTxnKategori("");}} className="input-field bg-[var(--bg-primary)]" required>
                    <option value="Keluar">Keluar (Pengeluaran)</option>
                    <option value="Masuk">Masuk (Penerimaan)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah (Rp) *</label>
                  <input type="number" value={txnNominal} onChange={(e)=>setTxnNominal(e.target.value)} placeholder="50000" className="input-field" required min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sekbid *</label>
                  <select value={txnSekbid} onChange={(e)=>setTxnSekbid(e.target.value)} className="input-field bg-[var(--bg-primary)]" required>
                    <option value="">Pilih Sekbid...</option>
                    {SEKBID_OPTIONS.map((n)=><option key={n} value={String(n)}>SEKBID {n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori <span className="text-[var(--text-muted)] font-normal">(Opsional)</span></label>
                  <select value={txnKategori} onChange={(e)=>setTxnKategori(e.target.value)} className="input-field bg-[var(--bg-primary)]">
                    <option value="">— Tanpa Kategori / Lainnya —</option>
                    {kategoriOptionsForJenis(txnJenis).map((c)=><option key={c.kategori_id} value={String(c.kategori_id)}>{c.nama}</option>)}
                  </select>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Kosong = Lainnya. Jika Kategori gagal dimuat, pilihan fallback tetap tersedia dan transaksi tetap dapat disimpan.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proker <span className="text-[var(--text-muted)] font-normal">(Opsional)</span></label>
                  <select value={txnProker} onChange={(e)=>setTxnProker(e.target.value)} className="input-field bg-[var(--bg-primary)]">
                    <option value="">— Tanpa Proker —</option>
                    {prokers.map((p)=><option key={p.proker_id} value={String(p.proker_id)}>{p.nama} (SEKBID {p.division_id || "-"})</option>)}
                  </select>
                  {prokers.length===0 && <p className="text-[10px] text-[var(--text-muted)] mt-1">Tidak ada proker tersedia — transaksi tetap dapat dibuat.</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sumber Input</label>
                  <select value={txnSumber} onChange={(e)=>setTxnSumber(e.target.value)} className="input-field bg-[var(--bg-primary)]">
                    <option value="Manual">Manual</option>
                    <option value="Scan Nota">Scan Nota</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="chkRisk2" checked={txnBerisiko} onChange={(e)=>setTxnBerisiko(e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="chkRisk2" className="text-sm">Tandai sebagai Transaksi Berisiko</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi *</label>
                <input type="text" value={txnDeskripsi} onChange={(e)=>setTxnDeskripsi(e.target.value)} placeholder="Pembelian alat kegiatan" className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bukti Pembayaran <span className="text-[var(--text-muted)] font-normal">(JPG, JPEG, PNG, PDF, max 10MB)</span></label>
                <div className="border border-dashed border-[var(--border)] rounded-lg p-3 bg-[var(--bg-primary)]">
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e)=>handleFileChange(e,"txn")} className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-[var(--accent)] file:text-white file:text-xs hover:file:opacity-90" />
                  {txnFile ? (
                    <div className="mt-3 p-2 bg-[var(--bg-secondary)] rounded text-xs space-y-1">
                      <p className="font-medium truncate">{txnFile.name}</p>
                      <p className="text-[var(--text-muted)]">{(txnFile.size/1024).toFixed(1)} KB • {txnFile.type || "unknown"}</p>
                      <p className="text-emerald-400 font-medium">✓ Siap disimpan</p>
                      {txnFileB64 && <p className="text-[10px] text-[var(--text-muted)]">Siap diunggah ke server — akan dikirim bersama transaksi.</p>}
                      {!txnFileB64 && <p className="text-amber-400 text-[10px]">Memproses file...</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-2">Belum ada file dipilih. Foto nota akan dikirim ke backend dan disimpan di storage/server dengan metadata transaction_id.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link Bukti (Opsional jika tidak upload file)</label>
                <input type="url" value={txnBuktiLink} onChange={(e)=>setTxnBuktiLink(e.target.value)} placeholder="https://..." className="input-field" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowTxnModal(false)} className="btn-secondary text-xs">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">{submitting ? "Menyimpan..." : "Simpan Transaksi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajukan Dana */}
      {showPengajuanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-xl space-y-4 max-h-[95vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">Ajukan Dana</h3>
            <form onSubmit={handleCreatePengajuan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Pengajuan *</label>
                <input type="text" value={pjNama} onChange={(e)=>setPjNama(e.target.value)} placeholder="Pembelian Perlengkapan Kegiatan" className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sekbid *</label>
                  <select value={pjSekbid} onChange={(e)=>setPjSekbid(e.target.value)} className="input-field bg-[var(--bg-primary)]" required>
                    <option value="">Pilih Sekbid...</option>
                    {SEKBID_OPTIONS.map((n)=><option key={n} value={String(n)}>SEKBID {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proker</label>
                  <select value={pjProker} onChange={(e)=>setPjProker(e.target.value)} className="input-field bg-[var(--bg-primary)]">
                    <option value="">Pilih Proker</option>
                    {prokers.map((p)=><option key={p.proker_id} value={String(p.proker_id)}>{p.nama}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nominal Dana *</label>
                  <input type="number" value={pjNominal} onChange={(e)=>setPjNominal(e.target.value)} placeholder="500000" className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal Dibutuhkan *</label>
                  <input type="date" value={pjDeadline} onChange={(e)=>setPjDeadline(e.target.value)} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keperluan *</label>
                <input type="text" value={pjKeperluan} onChange={(e)=>setPjKeperluan(e.target.value)} placeholder="Pembelian perlengkapan" className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea value={pjDeskripsi} onChange={(e)=>setPjDeskripsi(e.target.value)} placeholder="Detail keperluan dana" className="input-field text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lampiran / Proposal (JPG, PNG, PDF)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e)=>handleFileChange(e,"pj")} className="input-field text-sm" />
                {pjFile && <p className="text-xs text-[var(--text-muted)] mt-1">{pjFile.name} - {(pjFile.size/1024).toFixed(1)} KB</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowPengajuanModal(false)} className="btn-secondary text-xs">Batal</button>
                <button type="submit" disabled={pjSubmitting} className="btn-primary text-xs">{pjSubmitting ? "Mengajukan..." : "Ajukan Dana"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
