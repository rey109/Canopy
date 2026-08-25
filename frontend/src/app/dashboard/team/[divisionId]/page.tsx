"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, type B1Event, type B2Record, type B3Roster, type B4Competition, type B5Survey, type B6Sale, type B7Visit, type B8Mading, type B9Link, type B10Word } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { canManageDivision, canViewDivision, divisionCapabilities } from "@/lib/division-access";

type DivisionRow = B1Event | B2Record | B3Roster | B4Competition | B5Survey | B6Sale | B7Visit | B8Mading | B9Link | B10Word;

const fetchers: Record<number, () => Promise<DivisionRow[]>> = {
  1: () => api.getB1Events().then((r) => r.events), 2: () => api.getB2Records().then((r) => r.records), 3: () => api.getB3Rosters().then((r) => r.rosters), 4: () => api.getB4Competitions().then((r) => r.competitions), 5: () => api.getB5Surveys().then((r) => r.surveys), 6: () => api.getB6Sales().then((r) => r.sales), 7: () => api.getB7Visits().then((r) => r.visits), 8: () => api.getB8Mading().then((r) => r.mading), 9: () => api.getB9Links().then((r) => r.links), 10: () => api.getB10Words().then((r) => r.words),
};

const creators: Record<number, (data: Record<string, string | number>) => Promise<DivisionRow>> = {
  1: (d) => api.createB1Event(d as Omit<B1Event, "id">), 2: (d) => api.createB2Record(d as Omit<B2Record, "id">), 3: (d) => api.createB3Roster(d as Omit<B3Roster, "id">), 4: (d) => api.createB4Competition(d as Omit<B4Competition, "id">), 5: (d) => api.createB5Survey(d as Omit<B5Survey, "id" | "yes_votes" | "no_votes">), 6: (d) => api.createB6Sale(d as Omit<B6Sale, "id">), 7: (d) => api.createB7Visit(d as Omit<B7Visit, "id" | "visit_date">), 8: (d) => api.createB8Mading(d as Omit<B8Mading, "id" | "created_at">), 9: (d) => api.createB9Link(d as Omit<B9Link, "id">), 10: (d) => api.createB10Word(d as Omit<B10Word, "id">),
};

export default function DivisionDetailPage() {
  const params = useParams();
  const division = Number(params.divisionId);
  const capability = divisionCapabilities[division];
  const { user } = useAuth();
  const [rows, setRows] = useState<DivisionRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const canView = canViewDivision(user, division);
  const canManage = canManageDivision(user, division);
  const canViewAsMember = user?.group_name === "Staf" && user.division_id === division;
  const canOpen = canView || canViewAsMember;

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchers[division]()); } catch { setRows([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (capability && canOpen) load(); }, [division, canOpen]);

  const columns = useMemo(() => capability?.fields || [], [capability]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await creators[division](Object.fromEntries(columns.map((field) => [field.key, field.type === "number" ? Number(form[field.key] || 0) : form[field.key] || ""]))); setForm({}); setShowForm(false); await load(); } finally { setSaving(false); }
  };

  if (!capability) return <div className="glass-card p-10 text-center">Divisi tidak ditemukan.</div>;
  if (!canOpen) return <div className="glass-card p-10 text-center"><h1 className="font-bold">Akses terbatas</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Data Sekbid ini berada di luar scope jabatanmu.</p></div>;

  return <div className="animate-fade-in space-y-6">
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/70 p-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-400">Divisiku · Sekbid {division}</p><h1 className="mt-1 text-2xl font-bold">{capability.name}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">{capability.focus}</p></div>
      {canManage && <button className="btn-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? "Tutup form" : "Tambah data"}</button>}
    </header>
    {canManage && showForm && <form onSubmit={submit} className="glass-card grid gap-4 p-6 sm:grid-cols-2">
      {columns.map((field) => <label key={field.key} className="text-sm font-medium"><span className="mb-1 block text-[var(--text-secondary)]">{field.label}</span><input required={field.key !== "example" && field.key !== "description"} type={field.type || "text"} value={form[field.key] || ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} className="input-field" /></label>)}
      <div className="sm:col-span-2"><button disabled={saving} className="btn-primary">{saving ? "Menyimpan..." : "Simpan data"}</button></div>
    </form>}
    {loading ? <div className="glass-card h-32 animate-pulse" /> : rows.length === 0 ? <div className="glass-card p-10 text-center text-sm text-[var(--text-secondary)]">Belum ada data khusus Sekbid ini.</div> : <div className="table-container"><table><thead><tr><th>#</th>{columns.map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td>{columns.map((field) => <td key={field.key}>{field.type === "url" ? <a href={String(row[field.key as keyof DivisionRow])} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Buka tautan</a> : String(row[field.key as keyof DivisionRow] ?? "—")}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}
