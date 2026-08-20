"use client";

import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";

export default function UpdatesPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState("organisasi");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.getAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAnnouncement({ title, body, scope });
      setIsComposing(false);
      setTitle("");
      setBody("");
      fetchAnnouncements();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const canCreateOrg = user?.role === "Trimitra" || user?.role === "Sekretariat" || user?.role === "Pembina";
  const canCreateDiv = user?.role === "Ketua Bidang" || user?.role === "Trimitra";
  const canCreateAny = canCreateOrg || canCreateDiv;

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading updates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Updates</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Pengumuman dan informasi terbaru.
          </p>
        </div>
        
        {canCreateAny && !isComposing && (
          <button onClick={() => setIsComposing(true)} className="btn-primary text-xs flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Buat Pengumuman
          </button>
        )}
      </div>

      {isComposing && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Pengumuman Baru</h3>
            <button type="button" onClick={() => setIsComposing(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded text-[var(--text-muted)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cakupan (Scope)</label>
              <select 
                value={scope} 
                onChange={e => setScope(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {canCreateOrg && <option value="organisasi">Seluruh Organisasi</option>}
                {canCreateDiv && <option value="divisi">Hanya Internal Divisi</option>}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Judul Pengumuman</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Info Rapat Pleno"
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Isi Pengumuman</label>
              <textarea 
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Tuliskan detail pengumuman di sini..."
                rows={4}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsComposing(false)} className="btn-secondary text-xs">Batal</button>
            <button type="submit" className="btn-primary text-xs">Publish</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)] text-sm">
            Belum ada pengumuman.
          </div>
        ) : (
          announcements.map((item) => (
            <div key={item.id} className="card p-5 hover:border-[var(--accent)]/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.scope === 'organisasi' 
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]' 
                        : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {item.scope === 'organisasi' ? 'ORGANISASI' : 'DIVISI'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mt-2">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
                  {item.created_by.charAt(0)}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Oleh: <span className="font-medium text-[var(--text-primary)]">{item.created_by}</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
