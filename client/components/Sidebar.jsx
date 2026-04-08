import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api.js";
import axios from "axios";

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

  .sb-sidebar {
    width: 200px;
    flex-shrink: 0;
    background: #16171c;
    border-right: 1px solid #2a2d38;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 1rem 0;
  }

  .sb-section { padding: 0 0.75rem 0.25rem; }

  .sb-section-hd {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #3d4255;
    padding: 0 0.5rem;
    margin-bottom: 0.25rem;
  }

  .sb-item {
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
  }
  .sb-item:hover  { background: rgba(255,255,255,0.04); color: #b8bdd4; }
  .sb-item.active { background: rgba(123,140,255,0.12); color: #a5b0ff; }
  .sb-item.unknown:hover  { background: rgba(255,255,255,0.04); color: #8d93ad; }
  .sb-item.unknown.active { background: rgba(86,92,120,0.15); color: #8d93ad; }

  .sb-item-label  { flex: 1; overflow: hidden; text-overflow: ellipsis; }

  .sb-count {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: #3d4255;
    flex-shrink: 0;
  }
  .sb-item.active .sb-count { color: rgba(165,176,255,0.5); }

  .sb-divider { height: 1px; background: #22242e; margin: 0.5rem 0.75rem; }

  .sb-albums-list {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: #2a2d38 transparent;
    padding: 0 0.75rem 0.5rem;
  }

  /* ── Mobile pill bar ── */
  .sb-pills {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.5rem 1rem;
    gap: 0.5rem;
    background: #16171c;
    border-bottom: 1px solid #2a2d38;
    scrollbar-width: none;
    display: none;
  }
  .sb-pills::-webkit-scrollbar { display: none; }

  .sb-pill {
    flex-shrink: 0;
    padding: 0.3rem 0.8rem;
    border-radius: 99px;
    border: 1px solid #2a2d38;
    background: none;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    color: #7a8099;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .sb-pill:hover  { background: rgba(255,255,255,0.04); color: #b8bdd4; border-color: #3d4255; }
  .sb-pill.active { background: rgba(123,140,255,0.15); border-color: rgba(123,140,255,0.4); color: #a5b0ff; }
  .sb-pill.unknown.active { background: rgba(86,92,120,0.2); border-color: rgba(86,92,120,0.4); color: #8d93ad; }

  .sb-pill-sep    { width: 1px; background: #2a2d38; align-self: stretch; flex-shrink: 0; }

  @media (max-width: 700px) {
    .sb-sidebar { display: none; }
    .sb-pills   { display: flex; }
  }
`;

function capitalize(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function useSidebarData() {
  const { user } = useAuth();
  const [families,     setFamilies]     = useState([]);
  const [counts,       setCounts]       = useState({});
  const [unknownCount, setUnknownCount] = useState(0);
  const [albums,       setAlbums]       = useState([]);

  function fetchFamilies() {
    const req = user ? api.get("/api/families") : axios.get("/api/public/families");
    req.then(r => {
        setFamilies(r.data.names || []);
        setCounts(r.data.counts || {});
        setUnknownCount(r.data.unknownCount || 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchFamilies();
    window.addEventListener("familiesUpdated", fetchFamilies);
    return () => window.removeEventListener("familiesUpdated", fetchFamilies);
  }, [user]);

  useEffect(() => {
    const endpoint = user ? "/api/albums" : "/api/public/albums";
    const req = user ? api.get(endpoint) : axios.get(endpoint);
    req.then(r => setAlbums(r.data.albums || [])).catch(() => {});
  }, [user]);

  return { families, counts, unknownCount, albums };
}

function useNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const onGallery = location.pathname === "/" || location.pathname === "/gallery";
  const activeFamily = onGallery ? (searchParams.get("family")   || null) : null;
  const activeAlbum  = onGallery ? (searchParams.get("album_id") || null) : null;
  const isAll = onGallery && !activeFamily && !activeAlbum;

  return {
    isAll, activeFamily, activeAlbum,
    goAll:    ()    => navigate("/"),
    goFamily: (key) => navigate(`/?family=${key}`),
    goAlbum:  (id)  => navigate(`/?album_id=${id}`),
  };
}

export function DesktopSidebar() {
  const { isAll, activeFamily, activeAlbum, goAll, goFamily, goAlbum } = useNav();
  const { families, counts, unknownCount, albums } = useSidebarData();

  return (
    <>
      <style>{STYLES}</style>
      <aside className="sb-sidebar">

        <div className="sb-section">
          <button className={`sb-item${isAll ? " active" : ""}`} onClick={goAll}>
            <FolderIcon open={isAll} />
            <span className="sb-item-label">All Photos</span>
          </button>
        </div>

        <div className="sb-divider" />

        <div className="sb-section">
          <div className="sb-section-hd">Families</div>

          {families.map(key => (
            <button
              key={key}
              className={`sb-item${activeFamily === key ? " active" : ""}`}
              onClick={() => goFamily(key)}
            >
              <FolderIcon open={activeFamily === key} />
              <span className="sb-item-label">{capitalize(key)}</span>
              {counts[key] > 0 && <span className="sb-count">{counts[key]}</span>}
            </button>
          ))}

          {unknownCount > 0 && (
            <button
              className={`sb-item unknown${activeFamily === "__unknown__" ? " active" : ""}`}
              onClick={() => goFamily("__unknown__")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
              </svg>
              <span className="sb-item-label">Unknown</span>
              <span className="sb-count">{unknownCount}</span>
            </button>
          )}
        </div>

        {albums.length > 0 && (
          <>
            <div className="sb-divider" style={{ marginTop: "0.5rem" }} />
            <div className="sb-section-hd" style={{ padding: "0 1.375rem", marginBottom: "0.25rem" }}>
              Albums
            </div>
            <div className="sb-albums-list">
              {albums.map(album => (
                <button
                  key={album.id}
                  className={`sb-item${activeAlbum === album.id ? " active" : ""}`}
                  onClick={() => goAlbum(album.id)}
                >
                  <FolderIcon open={activeAlbum === album.id} />
                  <span className="sb-item-label">{album.name}</span>
                  {album.photo_count > 0 && <span className="sb-count">{album.photo_count}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function MobilePillBar() {
  const { isAll, activeFamily, activeAlbum, goAll, goFamily, goAlbum } = useNav();
  const { families, unknownCount, albums } = useSidebarData();

  return (
    <>
      <style>{STYLES}</style>
      <div className="sb-pills">
        <button className={`sb-pill${isAll ? " active" : ""}`} onClick={goAll}>All Photos</button>

        {families.map(key => (
          <button
            key={key}
            className={`sb-pill${activeFamily === key ? " active" : ""}`}
            onClick={() => goFamily(key)}
          >
            {capitalize(key)}
          </button>
        ))}

        {unknownCount > 0 && (
          <button
            className={`sb-pill unknown${activeFamily === "__unknown__" ? " active" : ""}`}
            onClick={() => goFamily("__unknown__")}
          >
            Unknown
          </button>
        )}

        {albums.length > 0 && <div className="sb-pill-sep" />}
        {albums.map(album => (
          <button
            key={album.id}
            className={`sb-pill${activeAlbum === album.id ? " active" : ""}`}
            onClick={() => goAlbum(album.id)}
          >
            {album.name}
          </button>
        ))}
      </div>
    </>
  );
}
