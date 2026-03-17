import { useState, useEffect, useCallback } from "react";
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
    --dim:      #565c78;
    --text:     #d4d8e8;
    --text2:    #8d93ad;
    --success:  #4ade98;
    --error:    #f07070;
    --warn:     #fbbf24;
  }

  .al-root {
    font-family: 'Barlow', sans-serif;
    width: 100%; display: flex; justify-content: center;
    padding: 2rem 1.25rem 3rem; box-sizing: border-box;
  }

  .al-inner {
    width: 100%; max-width: 860px;
    opacity: 0; transform: translateY(14px);
    animation: alFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes alFadeIn  { to { opacity:1; transform:translateY(0); } }
  @keyframes alSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes alSpin    { to { transform:rotate(360deg); } }

  .al-header { margin-bottom: 2rem; }
  .al-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); opacity: 0.8; margin-bottom: 0.6rem;
  }
  .al-title {
    font-size: clamp(1.7rem,5vw,2.1rem); font-weight: 600;
    letter-spacing: -0.01em; color: var(--text); line-height: 1.1; margin: 0;
  }
  .al-subtitle { font-size: 0.875rem; color: var(--text2); margin-top: 0.4rem; font-weight: 300; }

  /* ── Toolbar ── */
  .al-toolbar {
    display: flex; gap: 0.75rem; margin-bottom: 1.25rem;
    flex-wrap: wrap; align-items: center;
  }

  .al-filter-btn {
    display: flex; align-items: center; gap: 0.35rem;
    background: var(--surface); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.45rem 0.75rem; font-family: 'DM Mono', monospace;
    font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--text2); cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .al-filter-btn:hover    { border-color: var(--accent); color: var(--text); }
  .al-filter-btn.active   { background: rgba(123,140,255,0.1); border-color: var(--accent); color: var(--accent2); }
  .al-filter-btn.upload   { --dot: var(--accent2); }
  .al-filter-btn.edit     { --dot: var(--warn); }
  .al-filter-btn.delete   { --dot: var(--error); }
  .al-filter-btn.view     { --dot: var(--success); }
  .al-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dot, var(--dim)); flex-shrink: 0; }

  .al-refresh-btn {
    margin-left: auto; background: none; border: 1px solid var(--border2);
    border-radius: 8px; padding: 0.45rem 0.75rem; color: var(--dim); cursor: pointer;
    font-family: 'DM Mono', monospace; font-size: 0.72rem; letter-spacing: 0.06em;
    text-transform: uppercase; transition: border-color 0.15s, color 0.15s;
    display: flex; align-items: center; gap: 0.4rem;
  }
  .al-refresh-btn:hover { border-color: var(--accent); color: var(--accent2); }

  /* ── Stats row ── */
  .al-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .al-stat {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 10px;
    padding: 0.875rem 1rem;
  }
  .al-stat-num {
    font-size: 1.5rem; font-weight: 600; color: var(--text); line-height: 1;
    font-family: 'DM Mono', monospace;
  }
  .al-stat-label {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); margin-top: 0.3rem;
  }
  .al-stat-num.upload { color: var(--accent2); }
  .al-stat-num.edit   { color: var(--warn); }
  .al-stat-num.delete { color: var(--error); }
  .al-stat-num.view   { color: var(--success); }

  /* ── Table ── */
  .al-table-wrap {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 12px;
    overflow: hidden;
  }

  .al-table-head {
    display: grid; grid-template-columns: 120px 1fr 160px 80px 1fr;
    padding: 0.6rem 1rem; border-bottom: 1px solid var(--border2);
    background: var(--surface2);
  }
  .al-th {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim);
    display: flex; align-items: center; gap: 0.3rem;
    cursor: pointer; user-select: none;
    transition: color 0.15s;
  }
  .al-th:hover { color: var(--text2); }
  .al-th.sorted { color: var(--accent2); }
  .al-th-arrow { opacity: 0.4; transition: opacity 0.15s, transform 0.15s; }
  .al-th.sorted .al-th-arrow { opacity: 1; }
  .al-th.sorted.desc .al-th-arrow { transform: rotate(180deg); }

  .al-row {
    display: grid; grid-template-columns: 120px 1fr 160px 80px 1fr;
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);
    align-items: center; gap: 0; animation: alSlideIn 0.2s ease both;
    transition: background 0.1s;
  }
  .al-row:last-child { border-bottom: none; }
  .al-row:hover { background: rgba(123,140,255,0.03); }

  .al-cell { font-size: 0.8rem; color: var(--text2); min-width: 0; padding-right: 0.75rem; }

  /* Action badge */
  .al-action {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-family: 'DM Mono', monospace; font-size: 0.68rem;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 99px; white-space: nowrap;
  }
  .al-action.upload { color: var(--accent2); background: rgba(123,140,255,0.12); border: 1px solid rgba(123,140,255,0.25); }
  .al-action.edit   { color: var(--warn);    background: rgba(251,191,36,0.1);   border: 1px solid rgba(251,191,36,0.25); }
  .al-action.delete { color: var(--error);   background: rgba(240,112,112,0.1);  border: 1px solid rgba(240,112,112,0.25); }
  .al-action.view   { color: var(--success); background: rgba(74,222,152,0.08);  border: 1px solid rgba(74,222,152,0.2); }

  /* Filename cell */
  .al-filename {
    font-size: 0.82rem; font-weight: 500; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .al-filename.deleted { color: var(--dim); text-decoration: line-through; }

  /* User cell */
  .al-user { display: flex; flex-direction: column; gap: 0.1rem; }
  .al-user-email { font-size: 0.78rem; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .al-user-uid   { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Timestamp */
  .al-time { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); white-space: nowrap; }

  /* Detail cell */
  .al-detail { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .al-detail-from { color: var(--error); opacity: 0.8; }
  .al-detail-to   { color: var(--success); opacity: 0.8; }
  .al-detail-arrow { color: var(--dim); margin: 0 0.3rem; }

  /* Loading / empty */
  .al-spinner {
    width: 24px; height: 24px; border: 2px solid var(--border2);
    border-top-color: var(--accent); border-radius: 50%;
    animation: alSpin 0.7s linear infinite; margin: 3rem auto;
  }
  .al-empty {
    font-family: 'DM Mono', monospace; font-size: 0.73rem; color: var(--dim);
    padding: 3rem 0; text-align: center; letter-spacing: 0.06em;
  }

  .al-count {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim);
    margin-bottom: 0.75rem;
  }

  @media (max-width: 680px) {
    .al-root { padding: 1.25rem 1rem 2rem; }
    .al-table-head { display: none; }
    .al-row { grid-template-columns: 1fr; gap: 0.2rem; }
    .al-stats { grid-template-columns: repeat(2,1fr); }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTs(ts) {
  if (!ts) return "—";
  // Firestore Timestamp comes back as { _seconds, _nanoseconds }
  const ms = (ts._seconds || ts.seconds || 0) * 1000;
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDetail(entry) {
  const { action, detail = {} } = entry;
  if (action === "upload") {
    const size = detail.size ? `${(detail.size / 1024).toFixed(0)} KB` : "";
    const priv = detail.is_private ? " · private" : " · public";
    return size + priv;
  }
  if (action === "edit") {
    const from = JSON.stringify(detail.from ?? "—");
    const to   = JSON.stringify(detail.to   ?? "—");
    return (
      <span>
        <span className="al-detail">{detail.field}: </span>
        <span className="al-detail-from">{from}</span>
        <span className="al-detail-arrow">→</span>
        <span className="al-detail-to">{to}</span>
      </span>
    );
  }
  if (action === "delete") {
    return detail.was_private ? "was private" : "was public";
  }
  return "—";
}

const ACTION_FILTERS = ["upload", "edit", "delete", "view"];

// Returns a stable string for sorting each column
function getSortValue(entry, key) {
  switch (key) {
    case "action":    return entry.action || "";
    case "filename":  return (entry.filename || "").toLowerCase();
    case "timestamp": return (entry.timestamp?._seconds || entry.timestamp?.seconds || 0).toString().padStart(15, "0");
    case "user":      return (entry.user_email || "").toLowerCase();
    case "detail": {
      const d = entry.detail || {};
      // For edits, group by field name so all "is_private" edits sort together
      if (entry.action === "edit") return `${d.field || ""}`;
      if (entry.action === "upload") return d.is_private ? "private" : "public";
      if (entry.action === "delete") return d.was_private ? "private" : "public";
      return "";
    }
    default: return "";
  }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AuditLog() {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionFilter, setActionFilter] = useState(null);
  const [error,        setError]        = useState(null);
  const [sortKey,      setSortKey]      = useState("timestamp");
  const [sortDir,      setSortDir]      = useState("desc"); // "asc" | "desc"

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Default direction per column — timestamp newest first, everything else A→Z
      setSortDir(key === "timestamp" ? "desc" : "asc");
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await api.get(`/api/audit?${params}`);
      setEntries(res.data.entries || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const counts = entries.reduce((acc, e) => {
    acc[e.action] = (acc[e.action] || 0) + 1;
    return acc;
  }, {});

  const displayedEntries = [...(actionFilter ? entries.filter(e => e.action === actionFilter) : entries)]
    .sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <>
      <style>{STYLES}</style>
      <section className="al-root">
        <div className="al-inner">

          {/* Header */}
          <div className="al-header">
            <div className="al-eyebrow">Admin</div>
            <h1 className="al-title">Audit Log</h1>
            <p className="al-subtitle">All uploads, edits, deletes and views across the archive</p>
          </div>

          {/* Stats */}
          <div className="al-stats">
            {[
              { key: "upload", label: "Uploads" },
              { key: "edit",   label: "Edits"   },
              { key: "delete", label: "Deletes" },
              { key: "view",   label: "Views"   },
            ].map(({ key, label }) => (
              <div key={key} className="al-stat">
                <div className={`al-stat-num ${key}`}>{counts[key] || 0}</div>
                <div className="al-stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="al-toolbar">
            <button
              className={`al-filter-btn${!actionFilter ? " active" : ""}`}
              onClick={() => setActionFilter(null)}
            >
              All
            </button>
            {ACTION_FILTERS.map(a => (
              <button
                key={a}
                className={`al-filter-btn ${a}${actionFilter === a ? " active" : ""}`}
                onClick={() => setActionFilter(actionFilter === a ? null : a)}
              >
                <span className="al-dot" />
                {a}
              </button>
            ))}
            <button className="al-refresh-btn" onClick={load}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M9.5 5.5a4 4 0 1 1-1.1-2.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9.5 2v3.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* Count */}
          <div className="al-count">
            {loading ? "Loading…" : `${displayedEntries.length} event${displayedEntries.length !== 1 ? "s" : ""}${actionFilter ? ` · ${actionFilter}` : ""}`}
          </div>

          {/* Table */}
          {loading ? (
            <div className="al-spinner" />
          ) : error ? (
            <div className="al-empty" style={{ color: "var(--error)" }}>{error}</div>
          ) : displayedEntries.length === 0 ? (
            <div className="al-empty">no events yet</div>
          ) : (
            <div className="al-table-wrap">
              <div className="al-table-head">
                {[
                  { key: "action",    label: "Action"  },
                  { key: "filename",  label: "File"    },
                  { key: "timestamp", label: "When"    },
                  { key: "user",      label: "User"    },
                  { key: "detail",    label: "Detail"  },
                ].map(({ key, label }) => (
                  <span
                    key={key}
                    className={`al-th${sortKey === key ? ` sorted${sortDir === "desc" ? " desc" : ""}` : ""}`}
                    onClick={() => handleSort(key)}
                    title={`Sort by ${label}`}
                  >
                    {label}
                    <svg className="al-th-arrow" width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 3L4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                ))}
              </div>

              {displayedEntries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="al-row"
                  style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
                >
                  {/* Action badge */}
                  <div className="al-cell">
                    <span className={`al-action ${entry.action}`}>
                      <span className="al-dot" />
                      {entry.action}
                    </span>
                  </div>

                  {/* Filename */}
                  <div className="al-cell">
                    <div className={`al-filename${entry.action === "delete" ? " deleted" : ""}`}>
                      {entry.filename || <span style={{opacity:0.4, fontStyle:"italic"}}>unknown</span>}
                    </div>
                    {entry.file_id && (
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.63rem", color:"var(--dim)", marginTop:"1px" }}>
                        {entry.file_id}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="al-cell">
                    <span className="al-time">{formatTs(entry.timestamp)}</span>
                  </div>

                  {/* User */}
                  <div className="al-cell">
                    <div className="al-user">
                      <span className="al-user-email">{entry.user_email || <span style={{opacity:0.4,fontStyle:"italic"}}>guest</span>}</span>
                      {entry.user_name && (
                        <span className="al-user-uid">{entry.user_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="al-cell al-detail">
                    {formatDetail(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>
    </>
  );
}
