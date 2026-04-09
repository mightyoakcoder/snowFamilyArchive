import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const TILE_H   = 290;
const TILE_GAP = 12;
const SPEEDS   = [0.42, 0.52, 0.38];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@200;300;400;500;600;700&display=swap');

  .lp-root {
    width: 100vw;
    height: calc(100vh - 56px);
    display: flex;
    align-items: center;
    overflow: hidden;
    background: #0d0e11;
    padding: 0 0 0 5rem;
    box-sizing: border-box;
    gap: 3rem;
  }

  /* ── Left panel ─────────────────────────────────────────────────────────── */
  .lp-left {
    flex: 1;
    max-width: 580px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 2;
  }

  .lp-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(165,176,255,0.6);
    margin-bottom: 1.25rem;
  }

  .lp-title {
    font-family: 'Barlow', sans-serif;
    font-size: clamp(2.4rem, 3vw, 3.6rem);
    font-weight: 700;
    color: #f0f2ff;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0 0 1.25rem;
  }

  .lp-title span {
    display: block;
    color: rgba(165,176,255,0.85);
    font-weight: 300;
    font-size: 0.58em;
    letter-spacing: -0.01em;
    margin-top: 0.25em;
  }

  .lp-subtitle {
    font-family: 'Barlow', sans-serif;
    font-size: 0.95rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.62);
    line-height: 1.7;
    max-width: 475px;
    margin-bottom: 2.5rem;
  }

  .lp-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1.75rem;
    background: rgba(123,140,255,0.15);
    border: 1px solid rgba(123,140,255,0.35);
    border-radius: 10px;
    color: #a5b0ff;
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
    align-self: flex-start;
  }
  .lp-cta:hover {
    background: rgba(123,140,255,0.25);
    border-color: rgba(123,140,255,0.6);
    color: #c4ccff;
    transform: translateX(3px);
  }
  .lp-cta svg { transition: transform 0.2s; }
  .lp-cta:hover svg { transform: translateX(3px); }

  /* ── Reel ───────────────────────────────────────────────────────────────── */
  .lp-right {
    flex: 0 0 auto;
    display: flex;
    gap: 12px;
    height: 100%;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
  }

  .lp-col {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    will-change: transform;
  }

  .lp-col:nth-child(2) { margin-top: 60px; }
  .lp-col:nth-child(3) { margin-top: 30px; }

  .lp-tile {
    width: 220px;
    height: ${TILE_H}px;
    flex-shrink: 0;
    border-radius: 14px;
    overflow: hidden;
    background: #1a1c24;
    margin-bottom: ${TILE_GAP}px;
    cursor: pointer;
    position: relative;
  }
  .lp-tile:hover .lp-tile-overlay { opacity: 1; }

  .lp-tile-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    border-radius: 14px;
  }
  .lp-tile-overlay svg { color: #fff; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.5)); }

  .lp-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* ── Photo overlay ──────────────────────────────────────────────────────── */
  .lp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.82);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    animation: lp-fade-in 0.2s ease;
  }

  @keyframes lp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .lp-overlay-card {
    position: relative;
    background: #1f2128;
    border: 1px solid #2e3140;
    border-radius: 18px;
    overflow: hidden;
    display: flex;
    max-width: 1000px;
    width: 100%;
    max-height: 92vh;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6);
    animation: lp-slide-up 0.25s cubic-bezier(.215,.61,.355,1);
  }

  @keyframes lp-slide-up {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .lp-overlay-img {
    flex: 0 0 auto;
    width: 62%;
    object-fit: cover;
    display: block;
    min-width: 0;
  }

  .lp-overlay-info {
    flex: 1;
    min-width: 200px;
    padding: 2rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
    justify-content: center;
  }

  .lp-overlay-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: rgba(255,255,255,0.6);
    transition: background 0.15s, color 0.15s;
  }
  .lp-overlay-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

  .lp-overlay-date {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    color: rgba(165,176,255,0.6);
    letter-spacing: 0.08em;
  }

  .lp-overlay-people {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }

  .lp-overlay-pill {
    background: rgba(123,140,255,0.12);
    border: 1px solid rgba(123,140,255,0.25);
    color: #a5b0ff;
    font-family: 'Barlow', sans-serif;
    font-size: 0.78rem;
    padding: 2px 10px;
    border-radius: 99px;
  }

  .lp-overlay-desc {
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    color: rgba(255,255,255,0.55);
    line-height: 1.6;
  }

  .lp-overlay-filename {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.2);
    margin-top: auto;
    word-break: break-all;
  }

  /* ── Mobile ─────────────────────────────────────────────────────────────── */
  @media (max-width: 800px) {
    .lp-root {
      position: relative;
      padding: 0;
      gap: 0;
      align-items: stretch;
    }

    /* Single scrolling column fills the background */
    .lp-right {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      -webkit-mask-image: none;
      mask-image: none;
    }

    /* Show only first column, full width */
    .lp-col {
      width: 100% !important;
      flex: 1;
    }
    .lp-col:nth-child(2),
    .lp-col:nth-child(3) { display: none; }

    .lp-tile {
      width: 100% !important;
    }

    /* Text overlaid on top with gradient backing */
    .lp-left {
      position: relative;
      z-index: 2;
      flex: 1;
      max-width: 100%;
      justify-content: flex-end;
      padding: 2.5rem 1.75rem 10rem;
      background: linear-gradient(
        to top,
        rgba(13,14,17,0.97) 20%,
        rgba(13,14,17,0.6)  80%,
        rgba(13,14,17,0.2)  90%,
        transparent 100%
      );
    }

    .lp-subtitle { max-width: 100%; }

    /* Overlay card stacks vertically */
    .lp-overlay-card { flex-direction: column; max-height: 95vh; }
    .lp-overlay-img { flex: 0 0 auto; width: 100%; max-height: 55vw; }
  }
`;

export default function LandingPage() {
  const navigate    = useNavigate();
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const col1Ref = useRef(null);
  const col2Ref = useRef(null);
  const col3Ref = useRef(null);

  useEffect(() => {
    axios.get("/api/public/splash")
      .then(r => setFiles(r.data.files || []))
      .catch(() => {});
  }, []);

  // Split into three columns; duplicate each for seamless loop
  const third = Math.ceil(files.length / 3);
  const col1  = files.slice(0, third);
  const col2  = files.slice(third, third * 2);
  const col3  = files.slice(third * 2);

  const setH = [
    col1.length * (TILE_H + TILE_GAP),
    col2.length * (TILE_H + TILE_GAP),
    col3.length * (TILE_H + TILE_GAP),
  ];

  useEffect(() => {
    if (!col1Ref.current || setH[0] === 0) return;

    const refs = [col1Ref, col2Ref, col3Ref];
    const pos  = [-setH[0], 0, -setH[2]];

    let raf;
    function tick() {
      pos[0] += SPEEDS[0];
      if (pos[0] >= 0) pos[0] -= setH[0];

      pos[1] -= SPEEDS[1];
      if (pos[1] <= -setH[1]) pos[1] += setH[1];

      pos[2] += SPEEDS[2];
      if (pos[2] >= 0) pos[2] -= setH[2];

      refs.forEach((r, i) => {
        if (r.current) r.current.style.transform = `translateY(${pos[i]}px)`;
      });

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setH[0], setH[1], setH[2]]);

  // Debug: log selected file to console
  useEffect(() => {
    if (selected) console.log('[splash] selected file:', selected);
  }, [selected]);

  // Close overlay on Escape
  useEffect(() => {
    if (!selected) return;
    const onKey = e => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function formatDate(d) {
    if (!d) return null;
    return d;
  }

  function normalizePeople(p) {
    if (!p) return [];
    if (Array.isArray(p)) return p.filter(Boolean);
    if (typeof p === "string") return p.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  }

  const cols = [col1, col2, col3];
  const colRefs = [col1Ref, col2Ref, col3Ref];

  return (
    <>
      <style>{STYLES}</style>
      <div className="lp-root">

        {/* ── Left panel ── */}
        <div className="lp-left">
          <p className="lp-eyebrow">Family Archive</p>
          <h1 className="lp-title">
            Snow Family
            <span>Memories &amp; Moments</span>
          </h1>
          <p className="lp-subtitle">
            Decades of family history — photos, faces, and the stories
            behind them — preserved in one place.
          </p>
          <a
            className="lp-cta"
            onClick={e => { e.preventDefault(); navigate("/gallery"); }}
            href="/gallery"
          >
            View Archive
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* ── Reel ── */}
        {files.length > 0 && (
          <div className="lp-right">
            {cols.map((col, ci) => (
              <div key={ci} className="lp-col" ref={colRefs[ci]}>
                {[...col, ...col].map((file, i) => (
                  <div
                    key={`c${ci}-${i}`}
                    className="lp-tile"
                    onClick={() => setSelected(file)}
                  >
                    <img src={`/proxy/${file.id}`} alt="" loading="eager" />
                    <div className="lp-tile-overlay">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.4"/>
                        <path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Photo card overlay ── */}
        {selected && (
          <div className="lp-overlay" onClick={() => setSelected(null)}>
            <div className="lp-overlay-card" onClick={e => e.stopPropagation()}>
              <img
                className="lp-overlay-img"
                src={`/proxy/${selected.id}`}
                alt={selected.original_filename}
              />
              <div className="lp-overlay-info">
                {formatDate(selected.image_date) && (
                  <div className="lp-overlay-date">{formatDate(selected.image_date)}</div>
                )}
                {normalizePeople(selected.people).length > 0 ? (
                  <div className="lp-overlay-people">
                    {normalizePeople(selected.people).map(p => (
                      <span key={p} className="lp-overlay-pill">{p}</span>
                    ))}
                  </div>
                ) : (
                  <div className="lp-overlay-date" style={{ opacity: 0.4 }}>No names tagged</div>
                )}
                {selected.description && (
                  <p className="lp-overlay-desc">{selected.description}</p>
                )}
              </div>
              <button className="lp-overlay-close" onClick={() => setSelected(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
