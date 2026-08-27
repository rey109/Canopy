"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { api, type PresensiDetail, type RapatDetail } from "@/lib/api";

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function AttendancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pribadi" | "rekap" | "gabungan" | "scan">("pribadi");
  const [presensiAll, setPresensiAll] = useState<PresensiDetail[]>([]);
  const [meetings, setMeetings] = useState<RapatDetail[]>([]);
  const [anggotaAll, setAnggotaAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDivisi, setFilterDivisi] = useState<string>("semua");
  const [filterBulan, setFilterBulan] = useState<string>(""); // "" = semua bulan
  const [filterTahun, setFilterTahun] = useState<string>(String(new Date().getFullYear()));
  const [scanRapatId, setScanRapatId] = useState<string>("");
  const [scanQr, setScanQr] = useState<string>("");
  const [scanTipe, setScanTipe] = useState<"Hadir"|"Izin"|"Sakit">("Hadir");
  const [scanKet, setScanKet] = useState<string>("");
  const [scanLoading, setScanLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const isPembina = user?.group_name === "Pembina";
  const fetchData = async () => {
    setLoading(true);
    try {
      const mRes = await api.listMeetings();
      setMeetings(mRes.rapat || []);
      // Load anggota untuk rekap gabungan (dipakai sekretaris)
      try {
        const uRes = await api.listUsers();
        if (uRes.users && uRes.users.length > 0) setAnggotaAll(uRes.users as any);
        else throw new Error("empty");
      } catch {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("canopy_all_anggota");
          if (raw) { try { setAnggotaAll(JSON.parse(raw)); } catch {} }
          else {
            // fallback mock 10 anggota jika belum ada
            const mock = Array.from({length:10}, (_,i)=>({ nis:`20200${i+1}`, nama:`Anggota ${i+1}`, jurusan:"RPL", division_id: (i%10)+1, role_name:"Staf", group_name:"Staf" }));
            setAnggotaAll(mock as any);
          }
        }
      }
      // Try to fetch presensi for each rapat (fallback will use localStorage)
      const all: PresensiDetail[] = [];
      // First try global localStorage
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("canopy_local_presensi");
        if (raw) {
          try { const arr = JSON.parse(raw) as PresensiDetail[]; all.push(...arr); } catch {}
        }
      }
      // Also try to fetch per rapat from backend (will merge)
      for (const r of (mRes.rapat || []).slice(0, 10)) {
        try {
          const pRes = await api.listPresensiRapat(r.rapat_id);
          for (const p of pRes.presensi || []) {
            if (!all.find((x) => x.presensi_id === p.presensi_id)) all.push(p);
          }
        } catch {}
      }
      // Also try menunggu list for pending
      try {
        const w = await api.listPresensiMenunggu();
        for (const p of w.presensi || []) if (!all.find((x)=>x.presensi_id===p.presensi_id)) all.push(p);
      } catch {}
      setPresensiAll(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // ===== Filter per bulan (Januari–Desember) =====
  const daftarTahun = (() => {
    const years = new Set<string>();
    for (const p of presensiAll) {
      const k = p.waktu_submit?.slice(0, 4);
      if (k && /^\d{4}$/.test(k)) years.add(k);
    }
    for (const m of meetings) {
      const k = m.tanggal?.slice(0, 4);
      if (k && /^\d{4}$/.test(k)) years.add(k);
    }
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort().reverse();
  })();

  const tahunAktif = daftarTahun.includes(filterTahun) ? filterTahun : daftarTahun[0];

  const labelPeriode = () =>
    !filterBulan ? "Semua Bulan" : `${NAMA_BULAN[Number(filterBulan) - 1]} ${tahunAktif}`;

  const dalamBulan = (tanggal?: string) =>
    !filterBulan || tanggal?.slice(0, 7) === `${tahunAktif}-${filterBulan}`;

  const presensiTersaring = presensiAll.filter((p) => dalamBulan(p.waktu_submit));
  const rapatTersaring = meetings.filter((m) => dalamBulan(m.tanggal));

  const BulanSelect = (
    <div className="flex gap-1">
      {daftarTahun.length > 1 && (
        <select value={tahunAktif} onChange={(e) => setFilterTahun(e.target.value)} className="input-field bg-[var(--bg-primary)] text-xs py-1.5">
          {daftarTahun.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="input-field bg-[var(--bg-primary)] text-xs py-1.5">
        <option value="">Semua Bulan</option>
        {NAMA_BULAN.map((nm, i) => <option key={nm} value={String(i + 1).padStart(2, "0")}>{nm}</option>)}
      </select>
    </div>
  );

  const personalRecords = presensiAll.filter((p) => p.nis === user?.nis && dalamBulan(p.waktu_submit));
  // Untuk Pembina, default tampilkan rekap bukan pribadi
  useEffect(() => {
    if (user?.group_name === "Pembina") {
      setActiveTab("rekap");
    }
  }, [user]);

  const personalRecords = presensiAll.filter((p) => p.nis === user?.nis);
  const stats = {
    hadir: personalRecords.filter((p) => p.tipe.toLowerCase() === "hadir").length,
    izin: personalRecords.filter((p) => p.tipe.toLowerCase() === "izin").length,
    sakit: personalRecords.filter((p) => p.tipe.toLowerCase() === "sakit").length,
    alpa: personalRecords.filter((p) => p.tipe.toLowerCase() === "alpa").length,
  };

  // Riwayat absen hanya untuk Trimitra, BPH (Sekretaris + Bendahara), dan Pembina
  const isTrimitra = user?.group_name === "Trimitra";
  const isBPH = user?.group_name === "Sekretaris" || user?.group_name === "Bendahara";
  const canSeeRekap = isTrimitra || isBPH || isPembina;

  const rekapTitle =
    isPembina ? "Rekap Organisasi — Seluruh Anggota (Pembina)" :
    isTrimitra ? "Rekap Lintas Divisi (Trimitra)" :
    isBPH ? "Rekap Organisasi (BPH)" :
    "Rekap";

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanRapatId || !scanQr) { setMsg("Rapat dan QR wajib diisi"); return; }
    setScanLoading(true);
    setMsg("");
    try {
      const res = await api.scanPresensi({
        qr_token: scanQr,
        acara_id: Number(scanRapatId),
        tipe: scanTipe,
        keterangan: scanKet || undefined,
      });
      setMsg(`✓ Presensi berhasil: ${res.tipe} - ${res.status_verifikasi}`);
      fetchData();
      setScanQr(""); setScanKet("");
    } catch (err: any) {
      setMsg("Gagal scan: " + (err.message || "Unknown"));
    } finally {
      setScanLoading(false);
    }
  };

  const getRapatTitle = (acara_id: number) => {
    const m = meetings.find((x) => x.rapat_id === acara_id);
    return m ? m.judul : `Rapat #${acara_id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kehadiran</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Pantau status kehadiran kegiatan organisasi. Data tersimpan di database & local fallback.</p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-xs">Refresh</button>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
        {!isPembina && <button onClick={() => setActiveTab("pribadi")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab==="pribadi" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>Presensi Pribadi</button>}
        {canSeeRekap && <button onClick={() => setActiveTab("rekap")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab==="rekap" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>{rekapTitle}</button>}
        {canSeeRekap && <button onClick={() => setActiveTab("gabungan")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab==="gabungan" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"} flex items-center gap-1`}>📊 Rekap Gabungan <span className="badge badge-info text-[10px]">{anggotaAll.length}</span></button>}
        <button onClick={() => setActiveTab("scan")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab==="scan" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>Scan QR / Izin</button>
      </div>

      {activeTab === "pribadi" && !isPembina && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="card p-4 text-center"><p className="text-2xl font-bold text-green-500">{stats.hadir}</p><p className="text-xs text-[var(--text-muted)] mt-1">Hadir</p></div>
            <div className="card p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.izin}</p><p className="text-xs text-[var(--text-muted)] mt-1">Izin</p></div>
            <div className="card p-4 text-center"><p className="text-2xl font-bold text-blue-500">{stats.sakit}</p><p className="text-xs text-[var(--text-muted)] mt-1">Sakit</p></div>
            <div className="card p-4 text-center"><p className="text-2xl font-bold text-red-500">{stats.alpa}</p><p className="text-xs text-[var(--text-muted)] mt-1">Alpa</p></div>
          </div>
          <div className="card">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center gap-3">
              <h3 className="font-semibold">Riwayat Kehadiran</h3>
              <div className="flex items-center gap-2">
                {BulanSelect}
                <span className="text-xs text-[var(--text-muted)]">{personalRecords.length} records</span>
              </div>
            </div>
            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Memuat...</div> :
             personalRecords.length===0 ? <div className="p-8 text-center text-[var(--text-muted)]">Belum ada presensi. Gunakan tab Scan QR atau minta Sekretaris input absensi rapat.</div> :
             <div className="divide-y divide-[var(--border)]">
               {personalRecords.map((r)=>(
                 <div key={r.presensi_id} className="p-4 flex items-center justify-between">
                   <div>
                     <p className="font-medium text-sm">{getRapatTitle(r.acara_id)}</p>
                     <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(r.waktu_submit).toLocaleString("id-ID")} • NIS {r.nis}</p>
                     {r.keterangan && <p className="text-xs text-[var(--text-muted)]">Ket: {r.keterangan}</p>}
                   </div>
                   <div className="text-right">
                     <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${r.tipe.toLowerCase()==="hadir"?"bg-green-500/10 text-green-500":r.tipe.toLowerCase()==="izin"?"bg-yellow-500/10 text-yellow-500":r.tipe.toLowerCase()==="sakit"?"bg-blue-500/10 text-blue-500":"bg-red-500/10 text-red-500"}`}>{r.tipe}</span>
                     <p className="text-[10px] text-[var(--text-muted)] mt-1">{r.status_verifikasi}</p>
                   </div>
                 </div>
               ))}
             </div>
            }
          </div>
        </div>
      )}

      {activeTab === "rekap" && canSeeRekap && (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold">Rekap Kehadiran — {rekapTitle}</h3>
            {BulanSelect}
          </div>
          {presensiTersaring.length===0 ? <p className="text-sm text-[var(--text-muted)] text-center py-8">Belum ada data presensi{!filterBulan ? "" : ` pada ${labelPeriode()}`}. Data akan muncul setelah absensi rapat disimpan (via Meetings → Absensi).</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[var(--text-muted)] border-b"><th className="text-left p-2">Rapat</th><th className="text-left p-2">NIS</th><th className="text-left p-2">Tipe</th><th className="text-left p-2">Status</th><th className="text-left p-2">Waktu</th></tr></thead>
              <tbody>
                {presensiTersaring.slice(0, 50).map((p)=>(
                  <tr key={p.presensi_id} className="border-b border-[var(--border)]">
                    <td className="p-2 text-xs">{getRapatTitle(p.acara_id)} <span className="text-[10px] text-[var(--text-muted)]">#{p.acara_id}</span></td>
                    <td className="p-2 text-xs">{p.nis}</td>
                    <td className="p-2"><span className="badge text-[10px]">{p.tipe}</span></td>
                    <td className="p-2 text-xs">{p.status_verifikasi}</td>
                    <td className="p-2 text-xs">{new Date(p.waktu_submit).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {presensiTersaring.length>50 && <p className="text-xs text-[var(--text-muted)] mt-2">Menampilkan 50 dari {presensiTersaring.length} records.</p>}
          </div>
          }
        </div>
      )}

      {activeTab === "gabungan" && canSeeRekap && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">📊 Rekap Gabungan — Semua Anggota</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Rekap terpisah & disatukan untuk semua anggota agar sekretaris mudah mendata. Data dari <code>anggota</code> + <code>presensi</code> (database + local fallback).</p>
              </div>
              <div className="flex gap-2">
                {BulanSelect}
                <select value={filterDivisi} onChange={(e)=>setFilterDivisi(e.target.value)} className="input-field bg-[var(--bg-primary)] text-xs py-1.5">
                  <option value="semua">Semua SEKBID</option>
                  {Array.from({length:10},(_,i)=><option key={i+1} value={String(i+1)}>SEKBID {i+1}</option>)}
                </select>
                <button onClick={()=>{
                  const rows = anggotaAll.filter((a:any)=> filterDivisi==="semua" || String(a.division_id)===filterDivisi).map((m:any)=>{
                    const recs = presensiTersaring.filter(p=>p.nis===m.nis);
                    const hadir = recs.filter(r=>r.tipe.toLowerCase()==="hadir").length;
                    const izin = recs.filter(r=>r.tipe.toLowerCase()==="izin").length;
                    const sakit = recs.filter(r=>r.tipe.toLowerCase()==="sakit").length;
                    const alpa = recs.filter(r=>r.tipe.toLowerCase()==="alpa").length;
                    const total = rapatTersaring.length || 1;
                    const hadirRate = ((hadir/total)*100).toFixed(0);
                    return [m.nis, m.nama, `SEKBID ${m.division_id}`, hadir, izin, sakit, alpa, `${hadirRate}%`].join(",");
                  });
                  const periode = !filterBulan ? "semua-bulan" : labelPeriode().replace(/\s+/g,"-");
                  const csv = [`Rekap: ${periode}`, "NIS,Nama,SEKBID,Hadir,Izin,Sakit,Alpa,Hadir%"].concat(rows).join("\n");
                  const blob = new Blob([csv], {type:"text/csv"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href=url; a.download=`rekap-gabungan-${!filterBulan ? "semua-bulan" : `${tahunAktif}-${filterBulan}`}.csv`; a.click(); URL.revokeObjectURL(url);
                }} className="btn-secondary text-xs">Export CSV</button>
              </div>
            </div>
            {(() => {
              const filteredAnggota = anggotaAll.filter((a:any)=> filterDivisi==="semua" || String(a.division_id)===filterDivisi);
              if (filteredAnggota.length===0) return <p className="text-sm text-[var(--text-muted)] text-center py-8">Belum ada data anggota. Tambahkan di Team → SEKBID → Tambah Anggota.</p>;
              const totalRapat = rapatTersaring.length;
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-[var(--text-muted)] border-b"><th className="text-left p-2">#</th><th className="text-left p-2">Nama / NIS</th><th className="text-left p-2">SEKBID</th><th className="text-center p-2">Hadir</th><th className="text-center p-2">Izin</th><th className="text-center p-2">Sakit</th><th className="text-center p-2">Alpa</th><th className="text-center p-2">%</th><th className="text-left p-2">Detail Rapat</th></tr></thead>
                    <tbody>
                      {filteredAnggota.map((m:any, idx:number)=>{
                        const recs = presensiTersaring.filter(p=>p.nis===m.nis);
                        const hadir = recs.filter(r=>r.tipe.toLowerCase()==="hadir").length;
                        const izin = recs.filter(r=>r.tipe.toLowerCase()==="izin").length;
                        const sakit = recs.filter(r=>r.tipe.toLowerCase()==="sakit").length;
                        const alpa = recs.filter(r=>r.tipe.toLowerCase()==="alpa").length;
                        const total = totalRapat || 1;
                        const rate = Math.round((hadir/total)*100);
                        return (
                          <tr key={m.nis} className="border-b border-[var(--border)] hover:bg-[var(--bg-primary)]">
                            <td className="p-2 text-xs text-[var(--text-muted)]">{idx+1}</td>
                            <td className="p-2"><p className="font-medium text-xs truncate max-w-[160px]">{m.nama}</p><p className="text-[10px] text-[var(--text-muted)]">{m.nis} • {m.jurusan || "-"}</p></td>
                            <td className="p-2"><span className="badge badge-info text-[10px]">SEKBID {m.division_id}</span></td>
                            <td className="p-2 text-center"><span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-bold">{hadir}</span></td>
                            <td className="p-2 text-center"><span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs font-bold">{izin}</span></td>
                            <td className="p-2 text-center"><span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs font-bold">{sakit}</span></td>
                            <td className="p-2 text-center"><span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-xs font-bold">{alpa}</span></td>
                            <td className="p-2 text-center"><span className={`text-xs font-bold ${rate>=75?"text-green-500":rate>=50?"text-yellow-500":"text-red-500"}`}>{rate}%</span></td>
                            <td className="p-2">
                              <div className="flex gap-1 flex-wrap max-w-[220px]">
                                {rapatTersaring.slice(0,5).map((rap:any)=>{
                                  const pr = recs.find(r=>r.acara_id===rap.rapat_id);
                                  const tipe = pr ? pr.tipe : "Belum";
                                  const color = tipe.toLowerCase()==="hadir" ? "bg-green-500" : tipe.toLowerCase()==="izin" ? "bg-yellow-500" : tipe.toLowerCase()==="sakit" ? "bg-blue-500" : tipe.toLowerCase()==="alpa" ? "bg-red-500" : "bg-gray-500";
                                  return <span key={rap.rapat_id} className={`w-2 h-2 rounded-full ${color}`} title={`${rap.judul}: ${tipe}`}></span>;
                                })}
                                {rapatTersaring.length>5 && <span className="text-[10px] text-[var(--text-muted)]">+{rapatTersaring.length-5}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[var(--bg-primary)] p-3 rounded"><p className="text-xs text-[var(--text-muted)]">Total Anggota</p><p className="font-bold">{filteredAnggota.length}</p></div>
                    <div className="bg-[var(--bg-primary)] p-3 rounded"><p className="text-xs text-[var(--text-muted)]">Total Rapat{!filterBulan ? "" : ` (${labelPeriode()})`}</p><p className="font-bold">{totalRapat}</p></div>
                    <div className="bg-[var(--bg-primary)] p-3 rounded"><p className="text-xs text-[var(--text-muted)]">Total Presensi</p><p className="font-bold">{presensiTersaring.length}</p></div>
                    <div className="bg-[var(--bg-primary)] p-3 rounded"><p className="text-xs text-[var(--text-muted)]">Rata Hadir</p><p className="font-bold">{filteredAnggota.length ? Math.round(filteredAnggota.reduce((acc:any,m:any)=>{ const r=presensiTersaring.filter(p=>p.nis===m.nis).filter(x=>x.tipe.toLowerCase()==="hadir").length; return acc + (r/(totalRapat||1)); },0)/filteredAnggota.length*100) : 0}%</p></div>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* Rekap Terpisah per Rapat */}
          <div className="glass-card p-6">
            <h4 className="font-semibold text-sm mb-3">
              Rekap Terpisah per Rapat{!filterBulan ? "" : ` — ${labelPeriode()}`}
            </h4>
            {rapatTersaring.length===0 ? <p className="text-xs text-[var(--text-muted)]">Belum ada rapat{!filterBulan ? "" : ` pada ${labelPeriode()}`}.</p> :
            <div className="space-y-3">
              {rapatTersaring.slice(0,5).map((rap)=> {
                const list = presensiAll.filter(p=>p.acara_id===rap.rapat_id);
                const hadir = list.filter(p=>p.tipe.toLowerCase()==="hadir").length;
                const izin = list.filter(p=>p.tipe.toLowerCase()==="izin").length;
                const sakit = list.filter(p=>p.tipe.toLowerCase()==="sakit").length;
                const alpa = list.filter(p=>p.tipe.toLowerCase()==="alpa").length;
                return (
                  <div key={rap.rapat_id} className="p-3 rounded border border-[var(--border)] bg-[var(--bg-primary)]">
                    <p className="font-medium text-sm truncate">{rap.judul} <span className="text-xs text-[var(--text-muted)]">• {new Date(rap.tanggal).toLocaleDateString("id-ID")}</span></p>
                    <div className="flex gap-2 mt-2 text-xs">
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded">Hadir {hadir}</span>
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded">Izin {izin}</span>
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded">Sakit {sakit}</span>
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded">Alpa {alpa}</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)]">{list.length} tercatat / {anggotaAll.length} anggota</span>
                    </div>
                  </div>
                );
              })}
              {rapatTersaring.length>5 && <p className="text-xs text-[var(--text-muted)]">+ {rapatTersaring.length-5} rapat lain.</p>}
            </div>
            }
          </div>
        </div>
      )}

      {activeTab === "scan" && (
        <div className="glass-card p-6 max-w-lg">
          <h3 className="font-semibold mb-3">Scan QR Presensi / Ajukan Izin/Sakit</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Gunakan token QR dari rapat (lihat di Meetings → QR Code) atau isi manual untuk test. Data tersimpan di database, fallback ke local jika backend belum migrate.</p>
          <form onSubmit={handleScan} className="space-y-3">
            <div>
              <label className="text-xs font-medium">Rapat ID *</label>
              <select value={scanRapatId} onChange={(e)=>setScanRapatId(e.target.value)} className="input-field bg-[var(--bg-primary)] text-sm" required>
                <option value="">Pilih Rapat...</option>
                {meetings.map((m)=><option key={m.rapat_id} value={String(m.rapat_id)}>{m.judul} — {new Date(m.tanggal).toLocaleDateString("id-ID")}</option>)}
              </select>
              {meetings.length===0 && <p className="text-[10px] text-amber-400 mt-1">Belum ada rapat, buat dulu di Meetings. Atau isi manual ID (misal 101).</p>}
              <input type="text" value={scanRapatId} onChange={(e)=>setScanRapatId(e.target.value)} placeholder="Atau ketik ID manual" className="input-field text-xs mt-2" />
            </div>
            <div>
              <label className="text-xs font-medium">QR Token *</label>
              <input type="text" value={scanQr} onChange={(e)=>setScanQr(e.target.value)} placeholder="Paste QR code (misal QR-BPH-2026 atau token rapat)" className="input-field text-sm" required />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Untuk test lokal, bisa isi bebas (fallback tidak validasi QR ketat jika backend down).</p>
            </div>
            <div>
              <label className="text-xs font-medium">Tipe *</label>
              <select value={scanTipe} onChange={(e)=>setScanTipe(e.target.value as any)} className="input-field bg-[var(--bg-primary)] text-sm">
                <option value="Hadir">Hadir (QR Masuk)</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Keterangan (opsional)</label>
              <textarea value={scanKet} onChange={(e)=>setScanKet(e.target.value)} placeholder="Alasan izin/sakit..." className="input-field text-sm" rows={2} />
            </div>
            <button type="submit" disabled={scanLoading} className="btn-primary w-full justify-center text-sm">{scanLoading ? "Memproses..." : "Kirim Presensi"}</button>
            {msg && <p className={`text-xs p-2 rounded ${msg.startsWith("✓")?"bg-green-500/10 text-green-400":"bg-red-500/10 text-red-400"}`}>{msg}</p>}
          </form>
          <div className="mt-6 p-3 bg-[var(--bg-primary)] rounded text-xs text-[var(--text-muted)]">
            <p className="font-semibold">Info:</p>
            <p>• Hadir langsung Disetujui, Izin/Sakit menunggu verifikasi Sekretaris.</p>
            <p>• Data tersimpan di <code>canopy_local_presensi</code> jika backend staging belum migrate (relation missing), tetap bisa dilihat di tab Pribadi/Rekap dan persist setelah refresh.</p>
          </div>
        </div>
      )}
    </div>
  );
}
