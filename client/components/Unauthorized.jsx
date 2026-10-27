import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@300;400;500;600&display=swap');

  .unauth-root {
    --surface:  #1f2128;
    --border2:  #353849;
    --accent:   #7b8cff;
    --accent2:  #a5b0ff;
    --dim:      #565c78;
    --text:     #d4d8e8;
    --text2:    #8d93ad;

    font-family: 'Barlow', sans-serif;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    box-sizing: border-box;
  }

  .unauth-card {
    width: 100%;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 20px;
    padding: 2.25rem 2rem;
    box-shadow: 0 8px 40px rgba(0,0,0,0.4);
    text-align: center;
    opacity: 0;
    transform: translateY(16px);
    animation: unauthFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes unauthFadeIn { to { opacity: 1; transform: translateY(0); } }

  .unauth-icon {
    width: 48px; height: 48px;
    margin: 0 auto 1rem;
    background: rgba(123,140,255,0.12);
    border: 1px solid rgba(123,140,255,0.25);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    color: var(--accent2);
    font-size: 1.25rem;
  }

  .unauth-code {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--dim);
  }

  .unauth-title {
    font-size: 1.35rem; font-weight: 600;
    color: var(--text); letter-spacing: -0.01em;
    margin: 0.35rem 0 0.75rem;
  }

  .unauth-text {
    font-size: 0.9rem; line-height: 1.5;
    color: var(--text2);
    margin: 0 0 1.75rem;
  }

  .unauth-actions { display: flex; flex-direction: column; gap: 0.625rem; }

  .unauth-btn {
    display: block;
    padding: 0.875rem;
    border-radius: 10px;
    font-size: 0.9rem; font-weight: 600; letter-spacing: 0.03em;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
  }

  .unauth-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 2px 16px rgba(123,140,255,0.3);
  }
  .unauth-btn-primary:hover {
    opacity: 0.88;
    transform: translateY(-1px);
    box-shadow: 0 4px 24px rgba(123,140,255,0.45);
  }

  .unauth-btn-secondary {
    border: 1px solid var(--border2);
    color: var(--text2);
  }
  .unauth-btn-secondary:hover { color: var(--text); border-color: var(--dim); }
`;

export default function Unauthorized() {
  const { user } = useAuth();

  return (
    <>
      <style>{STYLES}</style>
      <div className="unauth-root">
        <div className="unauth-card">
          <div className="unauth-icon"><i className="bi bi-lock" /></div>
          <div className="unauth-code">401 · Unauthorized</div>
          <h1 className="unauth-title">This photo is private</h1>
          <p className="unauth-text">
            {user
              ? "Your session has expired. Reload the gallery to view private photos again."
              : "Sign in to view private photos in the Snow Archive."}
          </p>
          <div className="unauth-actions">
            {!user && <Link className="unauth-btn unauth-btn-primary" to="/login">Sign in</Link>}
            <Link className="unauth-btn unauth-btn-secondary" to="/gallery">Back to gallery</Link>
          </div>
        </div>
      </div>
    </>
  );
}
