import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase.js";

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
    --error:    #f07070;
  }

  .login-root {
    font-family: 'Barlow', sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    box-sizing: border-box;
    background: var(--bg);
  }

  .login-card {
    width: 100%;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 20px;
    padding: 2.25rem 2rem;
    box-shadow: 0 8px 40px rgba(0,0,0,0.4);
    opacity: 0;
    transform: translateY(16px);
    animation: loginFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes loginFadeIn { to { opacity: 1; transform: translateY(0); } }
  @keyframes loginSpin   { to { transform: rotate(360deg); } }

  /* Logo */
  .login-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
    text-align: center;
  }

  .login-logo-icon {
    width: 48px; height: 48px;
    background: rgba(123,140,255,0.12);
    border: 1px solid rgba(123,140,255,0.25);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    color: var(--accent2);
  }

  .login-logo-title {
    font-size: 1.35rem; font-weight: 600;
    color: var(--text); letter-spacing: -0.01em; margin: 0;
  }

  .login-logo-sub {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--dim); margin-top: -0.25rem;
  }

  /* Form */
  .login-fields { display: flex; flex-direction: column; gap: 1rem; }

  .login-field { display: flex; flex-direction: column; gap: 0.35rem; }

  .login-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--dim);
  }

  .login-input {
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 9px;
    padding: 0.7rem 0.875rem;
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    width: 100%;
  }
  .login-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(123,140,255,0.12);
  }
  .login-input::placeholder { color: var(--dim); }
  .login-input.error { border-color: var(--error); }

  /* Error message */
  .login-error {
    background: rgba(240,112,112,0.07);
    border: 1px solid rgba(240,112,112,0.2);
    border-radius: 8px;
    padding: 0.6rem 0.875rem;
    font-size: 0.8rem;
    color: var(--error);
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: loginFadeIn 0.2s ease;
  }

  .login-error-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--error); flex-shrink: 0;
  }

  /* Submit button */
  .login-btn {
    margin-top: 0.5rem;
    width: 100%;
    padding: 0.875rem;
    border: none;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    font-family: 'Barlow', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 2px 16px rgba(123,140,255,0.3);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .login-btn:hover:not(:disabled) {
    opacity: 0.88;
    transform: translateY(-1px);
    box-shadow: 0 4px 24px rgba(123,140,255,0.45);
  }
  .login-btn:active:not(:disabled) { transform: translateY(0); }
  .login-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .login-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: loginSpin 0.65s linear infinite;
    flex-shrink: 0;
  }

  /* Footer note */
  .login-footer {
    margin-top: 1.5rem;
    text-align: center;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--dim);
    line-height: 1.6;
  }
`;

// Map Firebase auth error codes to friendly messages
function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":           return "That doesn't look like a valid email address.";
    case "auth/user-not-found":          return "No account found with that email.";
    case "auth/wrong-password":          return "Incorrect password — please try again.";
    case "auth/invalid-credential":      return "Email or password is incorrect.";
    case "auth/too-many-requests":       return "Too many attempts. Please wait a moment and try again.";
    case "auth/user-disabled":           return "This account has been disabled.";
    case "auth/network-request-failed":  return "Network error — check your connection.";
    default:                             return "Sign-in failed. Please try again.";
  }
}

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // AuthContext listener picks up the new user — router redirects automatically
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="login-root">
        <div className="login-card">

          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2l2 4.5h5l-4 3 1.5 4.5L11 11.5 7.5 14 9 9.5l-4-3h5L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="login-logo-title">Snow Archive</h1>
              <div className="login-logo-sub">Family Photo Library</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="login-fields">

              <div className="login-field">
                <label className="login-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className={`login-input${error ? " error" : ""}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className={`login-input${error ? " error" : ""}`}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="login-error">
                  <span className="login-error-dot" />
                  {error}
                </div>
              )}

              <button className="login-btn" type="submit" disabled={loading || !email || !password}>
                {loading ? <><span className="login-spinner" /> Signing in…</> : "Sign in"}
              </button>

            </div>
          </form>

          <p className="login-footer">
            Access is by invitation only.<br />
            Contact the family admin to get an account.
          </p>

        </div>
      </div>
    </>
  );
}
