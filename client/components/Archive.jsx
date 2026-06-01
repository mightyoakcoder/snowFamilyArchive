import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import ImageGallery from "./ImageGallery.jsx";
import api from "../api.js";
import axios from "axios";

const FAMILIES = [
  { key: "snow",  label: "Snow"  },
  { key: "dunn",  label: "Dunn"  },
  { key: "weeks", label: "Weeks" },
];

function FolderIcon({ open }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 4.5C1 3.67 1.67 3 2.5 3H5l1.5 1.5H11.5C12.33 4.5 13 5.17 13 6v4.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V4.5Z" fill="rgba(123,140,255,0.18)" stroke="#7b8cff" strokeWidth="1.2"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 4.5C1 3.67 1.67 3 2.5 3H5l1.5 1.5H11.5C12.33 4.5 13 5.17 13 6v4.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V4.5Z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}


const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@300;400;500;600&display=swap');

  .arc-shell {
    display: flex;
    height: calc(100vh - 56px);
    overflow: hidden;
    background: #18191d;
  }

  /* ── Sidebar ─────────────────────────────────── */
  .arc-sidebar {
    width: 200px;
    flex-shrink: 0;
    background: #16171c;
    border-right: 1px solid #2a2d38;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 1rem 0;
  }

  .arc-sidebar-section {
    padding: 0 0.75rem 0.25rem;
  }

  .arc-sidebar-section + .arc-sidebar-section {
    margin-top: 0.25rem;
  }

  .arc-section-hd {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #3d4255;
    padding: 0 0.5rem;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    user-select: none;
  }

  .arc-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #7a8099;
    text-align: left;
    border-radius: 6px;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arc-item:hover {
    background: rgba(255,255,255,0.04);
    color: #b8bdd4;
  }

  .arc-item.active {
    background: rgba(123,140,255,0.12);
    color: #a5b0ff;
  }

  .arc-item-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arc-count {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: #3d4255;
    margin-left: auto;
    flex-shrink: 0;
  }

  .arc-item.active .arc-count { color: rgba(165,176,255,0.5); }

  .arc-divider {
    height: 1px;
    background: #22242e;
    margin: 0.5rem 0.75rem;
  }

  /* Albums section: scrollable within the sidebar */
  .arc-albums-list {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: #2a2d38 transparent;
    padding: 0 0.75rem 0.5rem;
  }

  /* ── Main content ─────────────────────────────── */
  .arc-main {
    flex: 1;
    overflow-y: auto;
    min-width: 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2d38 transparent;
  }

  /* ── Mobile pill bar ──────────────────────────── */
  .arc-pill-bar {
    display: none;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.625rem 1rem;
    gap: 0.5rem;
    background: #16171c;
    border-bottom: 1px solid #2a2d38;
    scrollbar-width: none;
  }
  .arc-pill-bar::-webkit-scrollbar { display: none; }

  .arc-pill {
    flex-shrink: 0;
    padding: 0.35rem 0.875rem;
    border-radius: 99px;
    border: 1px solid #2a2d38;
    background: none;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #7a8099;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .arc-pill:hover {
    background: rgba(255,255,255,0.04);
    color: #b8bdd4;
    border-color: #3d4255;
  }

  .arc-pill.active {
    background: rgba(123,140,255,0.15);
    border-color: rgba(123,140,255,0.4);
    color: #a5b0ff;
  }

  .arc-pill-sep {
    width: 1px;
    background: #2a2d38;
    align-self: stretch;
    flex-shrink: 0;
    margin: 0 0.125rem;
  }

  @media (max-width: 700px) {
    .arc-sidebar { display: none; }
    .arc-pill-bar { display: flex; }
  }
`;

export default function Archive() {
  const { user } = useAuth();

  const [selectedFamily,    setSelectedFamily]    = useState(null);
  const [selectedAlbum,     setSelectedAlbum]     = useState(null);
  const [selectedAlbumName, setSelectedAlbumName] = useState(null);
  const [albums,       setAlbums]       = useState([]);
  const [familyCounts, setFamilyCounts] = useState({});

  useEffect(() => {
    axios.get("/api/public/families")
      .then(r => setFamilyCounts(r.data.counts || {}))
      .catch(err => {
        if (!err.response || err.response.status >= 500) console.error("Failed to load families:", err.response?.data?.error || err.message);
      });
  }, []);

  useEffect(() => {
    const endpoint = user ? "/api/albums" : "/api/public/albums";
    const fetch = user ? api.get(endpoint) : axios.get(endpoint);
    fetch
      .then(r => setAlbums(r.data.albums || []))
      .catch(err => {
        if (!err.response || err.response.status >= 500) console.error("Failed to load albums:", err.response?.data?.error || err.message);
      });
  }, [user]);

  function selectAll()         { setSelectedFamily(null); setSelectedAlbum(null); setSelectedAlbumName(null); }
  function selectFamily(key)   { setSelectedFamily(key);  setSelectedAlbum(null); setSelectedAlbumName(null); }
  function selectAlbum(id, name) { setSelectedAlbum(id); setSelectedAlbumName(name); setSelectedFamily(null); }

  const isAll = !selectedFamily && !selectedAlbum;

  return (
    <>
      <style>{STYLES}</style>
      <div className="arc-shell">

        {/* ── Desktop sidebar ── */}
        <aside className="arc-sidebar">

          {/* All Photos */}
          <div className="arc-sidebar-section">
            <button
              className={`arc-item${isAll ? " active" : ""}`}
              onClick={selectAll}
            >
              <FolderIcon open={isAll} />
              <span className="arc-item-label">All Photos</span>
            </button>
          </div>

          <div className="arc-divider" />

          {/* Families */}
          <div className="arc-sidebar-section">
            <div className="arc-section-hd">Families</div>
            {FAMILIES.map(({ key, label }) => (
              <button
                key={key}
                className={`arc-item${selectedFamily === key ? " active" : ""}`}
                onClick={() => selectFamily(key)}
              >
                <FolderIcon open={selectedFamily === key} />
                <span className="arc-item-label">{label}</span>
                {familyCounts[key] > 0 && (
                  <span className="arc-count">{familyCounts[key]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Albums — scrollable section at bottom */}
          {albums.length > 0 && (
            <>
              <div className="arc-divider" style={{ marginTop: "0.5rem" }} />
              <div className="arc-section-hd" style={{ padding: "0 1.375rem", marginBottom: "0.25rem" }}>
                Albums
              </div>
              <div className="arc-albums-list">
                {albums.map(album => (
                  <button
                    key={album.id}
                    className={`arc-item${selectedAlbum === album.id ? " active" : ""}`}
                    onClick={() => selectAlbum(album.id, album.name)}
                  >
                    <FolderIcon open={selectedAlbum === album.id} />
                    <span className="arc-item-label">{album.name}</span>
                    {album.photo_count > 0 && (
                      <span className="arc-count">{album.photo_count}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="arc-main">

          {/* Mobile pill bar — always visible, no hamburger */}
          <div className="arc-pill-bar">
            <button className={`arc-pill${isAll ? " active" : ""}`} onClick={selectAll}>
              All Photos
            </button>
            {FAMILIES.map(({ key, label }) => (
              <button
                key={key}
                className={`arc-pill${selectedFamily === key ? " active" : ""}`}
                onClick={() => selectFamily(key)}
              >
                {label}
              </button>
            ))}
            {albums.length > 0 && <div className="arc-pill-sep" />}
            {albums.map(album => (
              <button
                key={album.id}
                className={`arc-pill${selectedAlbum === album.id ? " active" : ""}`}
                onClick={() => selectAlbum(album.id, album.name)}
              >
                {album.name}
              </button>
            ))}
          </div>

          <ImageGallery
            familyFilter={selectedFamily}
            albumId={selectedAlbum}
            albumName={selectedAlbumName}
            embedded
          />
        </main>

      </div>
    </>
  );
}
