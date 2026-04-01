import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@300;400;500;600&display=swap');

  :root {
    --bg:       #18191d;
    --surface:  #1f2128;
    --surface2: #272a33;
    --border:   #2e3140;
    --border2:  #353849;
    --accent:   #7b8cff;
    --accent2:  #a5b0ff;
    --dim:      #818ec4;
    --text:     #d4d8e8;
    --text2:    #8d93ad;
    --success:  #4ade98;
    --error:    #f07070;
  }

  .alb-root {
    font-family: 'Barlow', sans-serif;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 2rem 1.25rem 3rem;
    box-sizing: border-box;
  }

  .alb-inner {
    width: 100%;
    max-width: 1100px;
    opacity: 0;
    transform: translateY(14px);
    animation: albFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes albFadeIn { to { opacity: 1; transform: translateY(0); } }

  .alb-header { margin-bottom: 2rem; }
  .alb-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); opacity: 0.8; margin-bottom: 0.6rem;
  }
  .alb-title {
    font-size: clamp(1.7rem, 5vw, 2rem); font-weight: 600;
    letter-spacing: -0.01em; color: var(--text); margin: 0;
  }
  .alb-subtitle { font-size: 1rem; color: var(--text2); margin-top: 0.4rem; font-weight: 300; }

  /* Toolbar */
  .alb-toolbar {
    display: flex; gap: 0.75rem; margin-bottom: 1.75rem; align-items: center; flex-wrap: wrap;
  }
  .alb-btn {
    display: flex; align-items: center; gap: 0.4rem;
    background: var(--accent); border: none; border-radius: 9px;
    padding: 0.55rem 1rem; color: #fff; font-family: 'Barlow', sans-serif;
    font-size: 0.9rem; font-weight: 500; cursor: pointer;
    transition: background 0.15s;
  }
  .alb-btn:hover { background: #8f9fff; }
  .alb-btn-ghost {
    background: none; border: 1px solid var(--border2); color: var(--text2);
  }
  .alb-btn-ghost:hover { border-color: var(--accent); color: var(--accent); background: none; }
  .alb-btn-danger {
    background: none; border: 1px solid transparent; color: var(--error);
  }
  .alb-btn-danger:hover { background: rgba(240,112,112,0.1); }

  /* Grid */
  .alb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.25rem;
  }

  /* Album card */
  .alb-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    position: relative;
  }
  .alb-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  .alb-card-thumb {
    width: 100%; aspect-ratio: 4/3;
    background: var(--surface2);
    overflow: hidden; position: relative;
  }
  .alb-card-thumb img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.3s;
  }
  .alb-card:hover .alb-card-thumb img { transform: scale(1.04); }
  .alb-card-thumb-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--border2);
  }

  .alb-card-body { padding: 0.9rem 1rem 1rem; }
  .alb-card-name {
    font-size: 1rem; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .alb-card-meta {
    font-family: 'DM Mono', monospace; font-size: 11px;
    color: var(--dim); margin-top: 0.25rem; letter-spacing: 0.04em;
  }
  .alb-card-desc {
    font-size: 0.82rem; color: var(--text2); margin-top: 0.35rem;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Admin actions overlay */
  .alb-card-actions {
    position: absolute; top: 0.5rem; right: 0.5rem;
    display: flex; gap: 0.3rem; opacity: 0; transition: opacity 0.15s;
  }
  .alb-card:hover .alb-card-actions { opacity: 1; }
  .alb-icon-btn {
    background: rgba(18,19,22,0.75); backdrop-filter: blur(4px);
    border: 1px solid var(--border2); border-radius: 7px;
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text2); cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .alb-icon-btn:hover { color: var(--text); border-color: var(--accent); }
  .alb-icon-btn.danger:hover { color: var(--error); border-color: var(--error); }

  /* All Photos card */
  .alb-card-all { border-style: dashed; }
  .alb-card-all:hover { border-style: solid; }

  /* Modal */
  .alb-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 1rem;
  }
  .alb-modal {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 14px; padding: 1.5rem; width: 100%; max-width: 420px;
    animation: albFadeIn 0.2s ease;
  }
  .alb-modal h3 { margin: 0 0 1rem; font-size: 1.1rem; color: var(--text); }
  .alb-modal-field { margin-bottom: 0.9rem; }
  .alb-modal-field label {
    display: block; font-size: 0.8rem; color: var(--dim);
    font-family: 'DM Mono', monospace; letter-spacing: 0.06em;
    text-transform: uppercase; margin-bottom: 0.35rem;
  }
  .alb-modal-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border2);
    border-radius: 8px; padding: 0.55rem 0.75rem;
    font-family: 'Barlow', sans-serif; font-size: 1rem; color: var(--text);
    outline: none; box-sizing: border-box; transition: border-color 0.15s;
  }
  .alb-modal-input:focus { border-color: var(--accent); }
  .alb-modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.25rem; }

  .alb-empty {
    text-align: center; padding: 4rem 1rem; color: var(--text2);
  }
  .alb-empty-icon { color: var(--border2); margin-bottom: 1rem; }
  .alb-spinner {
    width: 32px; height: 32px; border: 3px solid var(--border2);
    border-top-color: var(--accent); border-radius: 50%;
    animation: albSpin 0.7s linear infinite; margin: 4rem auto;
  }
  @keyframes albSpin { to { transform: rotate(360deg); } }
`;

export default function Albums() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const isAdmin     = user?.email === "mightyoakcoder@gmail.com";

  const [modal, setModal]   = useState(null); // null | "create" | { id, name, description }
  const [form, setForm]     = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const endpoint = user ? "/api/albums" : "/api/public/albums";
  const { data, isLoading } = useQuery({
    queryKey: ["albums", user ? "authed" : "public"],
    queryFn:  () => api.get(endpoint).then(r => r.data.albums || []),
    staleTime: 60_000,
  });

  function openCreate() {
    setForm({ name: "", description: "" });
    setModal("create");
    setError(null);
  }

  function openEdit(album, e) {
    e.stopPropagation();
    setForm({ name: album.name, description: album.description || "" });
    setModal({ id: album.id, name: album.name, description: album.description });
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      if (modal === "create") {
        await api.post("/api/albums", form);
      } else {
        await api.patch(`/api/albums/${modal.id}`, form);
      }
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(album, e) {
    e.stopPropagation();
    if (!confirm(`Delete album "${album.name}"? Photos will not be deleted.`)) return;
    try {
      await api.delete(`/api/albums/${album.id}`);
      queryClient.invalidateQueries({ queryKey: ["albums"] });
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="alb-root">
        <div className="alb-inner">

          <div className="alb-header">
            <div className="alb-eyebrow">Snow Family Archive</div>
            <h1 className="alb-title">Albums</h1>
            <p className="alb-subtitle">Browse photos organized by event or occasion</p>
          </div>

          {isAdmin && (
            <div className="alb-toolbar">
              <button className="alb-btn" onClick={openCreate}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                New Album
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="alb-spinner" />
          ) : (
            <div className="alb-grid">
              {/* All Photos tile */}
              <div className="alb-card alb-card-all" onClick={() => navigate("/gallery")}>
                <div className="alb-card-thumb">
                  <div className="alb-card-thumb-placeholder">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="4" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="22" y="4" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="4" y="22" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="22" y="22" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                </div>
                <div className="alb-card-body">
                  <div className="alb-card-name">All Photos</div>
                  <div className="alb-card-meta">Browse everything</div>
                </div>
              </div>

              {(data || []).map(album => (
                <div
                  key={album.id}
                  className="alb-card"
                  onClick={() => navigate(`/albums/${album.id}`, { state: { albumName: album.name } })}
                >
                  <div className="alb-card-thumb">
                    {album.cover ? (
                      <img
                        src={`/proxy/${album.cover.id || album.cover.doc_id}`}
                        alt={album.name}
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="alb-card-thumb-placeholder">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                          <rect x="3" y="7" width="30" height="22" rx="4" stroke="currentColor" strokeWidth="1.4"/>
                          <circle cx="13" cy="16" r="3" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M3 24l7-6 5 5 5-4 8 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="alb-card-body">
                    <div className="alb-card-name">{album.name}</div>
                    <div className="alb-card-meta">{album.photo_count} photo{album.photo_count !== 1 ? "s" : ""}</div>
                    {album.description && <div className="alb-card-desc">{album.description}</div>}
                  </div>

                  {isAdmin && (
                    <div className="alb-card-actions">
                      <button className="alb-icon-btn" onClick={e => openEdit(album, e)} title="Rename">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M8.5 1.5a1.414 1.414 0 0 1 2 2L4 10H2v-2l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button className="alb-icon-btn danger" onClick={e => handleDelete(album, e)} title="Delete">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 3h8M5 3V2h2v1M4.5 3v6M7.5 3v6M3 3l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {!isLoading && (!data || data.length === 0) && (
                <div className="alb-empty" style={{ gridColumn: "1 / -1" }}>
                  <div className="alb-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect x="6" y="10" width="36" height="28" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="18" cy="22" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 32l10-9 7 7 6-5 13 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p>No albums yet{isAdmin ? " — create one above" : ""}.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="alb-modal-overlay" onClick={() => setModal(null)}>
          <div className="alb-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === "create" ? "New Album" : "Edit Album"}</h3>

            <div className="alb-modal-field">
              <label>Name</label>
              <input
                className="alb-modal-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Hawaii 2023"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleSave()}
              />
            </div>

            <div className="alb-modal-field">
              <label>Description (optional)</label>
              <input
                className="alb-modal-input"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="A short note about this album"
              />
            </div>

            {error && <p style={{ color: "var(--error)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{error}</p>}

            <div className="alb-modal-actions">
              <button className="alb-btn alb-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="alb-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
