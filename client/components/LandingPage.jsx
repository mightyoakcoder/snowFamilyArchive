import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const FAMILIES = [
  { key: "snow",  label: "Snow",  sub: "Family" },
  { key: "dunn",  label: "Dunn",  sub: "Family" },
  { key: "weeks", label: "Weeks", sub: "Family" },
  { key: null,    label: "All",   sub: "Photos"  },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@200;300;400;500;600;700&display=swap');

  .lp-root {
    width: 100vw;
    height: calc(100vh - 56px);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    overflow: hidden;
    background: #0d0e11;
  }

  .lp-tile {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    opacity: 0;
    filter: blur(18px) brightness(0.6);
    transform: scale(1.06);
    animation: lp-reveal 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .lp-tile:nth-child(1) { animation-delay: 0.0s; }
  .lp-tile:nth-child(2) { animation-delay: 0.15s; }
  .lp-tile:nth-child(3) { animation-delay: 0.3s; }
  .lp-tile:nth-child(4) { animation-delay: 0.45s; }

  @keyframes lp-reveal {
    0%   { opacity: 0; filter: blur(18px) brightness(0.6); transform: scale(1.06); }
    60%  { opacity: 1; filter: blur(0px)  brightness(1);   transform: scale(1.02); }
    100% { opacity: 1; filter: blur(0px)  brightness(1);   transform: scale(1);    }
  }

  /* Background photo */
  .lp-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .lp-tile:hover .lp-bg {
    transform: scale(1.06);
  }

  /* Dark gradient overlay */
  .lp-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.78) 0%,
      rgba(0,0,0,0.25) 45%,
      rgba(0,0,0,0.12) 100%
    );
    transition: background 0.4s ease;
  }

  .lp-tile:hover .lp-overlay {
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.65) 0%,
      rgba(0,0,0,0.18) 45%,
      rgba(0,0,0,0.06) 100%
    );
  }

  /* No-photo placeholder */
  .lp-placeholder {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #1a1c24 0%, #0f1015 100%);
  }

  /* Separator lines between tiles */
  .lp-tile:nth-child(1),
  .lp-tile:nth-child(2) {
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .lp-tile:nth-child(1),
  .lp-tile:nth-child(3) {
    border-right: 1px solid rgba(255,255,255,0.08);
  }

  /* Text content */
  .lp-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .lp-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    transition: color 0.3s;
  }

  .lp-tile:hover .lp-eyebrow {
    color: rgba(165,176,255,0.85);
  }

  .lp-name {
    font-family: 'Barlow', sans-serif;
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 2px 20px rgba(0,0,0,0.5);
  }

  /* Arrow indicator */
  .lp-arrow {
    position: absolute;
    top: 1.25rem;
    right: 1.5rem;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.5);
    opacity: 0;
    transform: translate(-4px, 4px);
    transition: opacity 0.3s ease, transform 0.3s ease, border-color 0.3s;
  }

  .lp-tile:hover .lp-arrow {
    opacity: 1;
    transform: translate(0, 0);
    border-color: rgba(165,176,255,0.4);
    color: rgba(165,176,255,0.9);
  }

  /* "All Photos" tile: subtle grid collage placeholder */
  .lp-tile-all .lp-placeholder {
    background: linear-gradient(135deg, #1c1e28 0%, #131520 100%);
  }

  .lp-tile-all .lp-name {
    color: #a5b0ff;
  }

  @media (max-width: 600px) {
    .lp-root {
      height: calc(100vh - 56px);
    }
    .lp-content {
      padding: 1rem 1.25rem;
    }
    .lp-name {
      font-size: clamp(1.5rem, 7vw, 2rem);
    }
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [covers, setCovers] = useState({});

  useEffect(() => {
    axios.get("/api/public/families")
      .then(r => setCovers(r.data.covers || {}))
      .catch(() => {});
  }, []);

  function goTo(familyKey) {
    if (familyKey) {
      navigate(`/gallery?family=${familyKey}`);
    } else {
      navigate("/gallery");
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="lp-root">
        {FAMILIES.map(({ key, label, sub }) => {
          const cover = key ? covers[key] : null;
          const bgUrl = cover ? `/proxy/${cover.id || cover.doc_id}` : null;

          return (
            <div
              key={key ?? "all"}
              className={`lp-tile${key === null ? " lp-tile-all" : ""}`}
              onClick={() => goTo(key)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && goTo(key)}
            >
              {bgUrl ? (
                <div
                  className="lp-bg"
                  style={{ backgroundImage: `url(${bgUrl})` }}
                />
              ) : (
                <div className="lp-placeholder" />
              )}

              <div className="lp-overlay" />

              {/* Top-right arrow */}
              <div className="lp-arrow">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="lp-content">
                <span className="lp-eyebrow">{sub}</span>
                <span className="lp-name">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
