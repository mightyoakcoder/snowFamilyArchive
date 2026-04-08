import { useState, useEffect } from "react";
import axios from "axios";

const STYLES = `
  .fc-wrap { display: flex; flex-direction: column; gap: 0.5rem; }

  .fc-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
  }

  .fc-check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    font-size: 0.875rem;
    user-select: none;
    transition: color 0.12s;
  }
  .fc-check:hover { color: var(--text, #d4d8e8); }
  .fc-check.checked { color: var(--accent2, #a5b0ff); }
  .fc-check.disabled { opacity: 0.5; cursor: default; }

  .fc-check input[type="checkbox"] {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accentColor: var(--accent, #7b8cff);
    flex-shrink: 0;
  }
  .fc-check.disabled input { cursor: default; }

  .fc-unknown {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8125rem;
    color: var(--dim, #565c78);
    user-select: none;
    margin-top: 0.1rem;
    transition: color 0.12s;
  }
  .fc-unknown:hover { color: var(--text2, #8d93ad); }
  .fc-unknown input { width: 13px; height: 13px; cursor: pointer; flex-shrink: 0; }

  .fc-add {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }

  .fc-add-input {
    flex: 1;
    background: var(--bg, #18191d);
    border: 1px solid var(--border2, #353849);
    border-radius: 7px;
    padding: 0.35rem 0.6rem;
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem;
    color: var(--text, #d4d8e8);
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;
  }
  .fc-add-input:focus { border-color: var(--accent, #7b8cff); }
  .fc-add-input::placeholder { color: var(--dim, #565c78); }

  .fc-add-btn {
    padding: 0.35rem 0.65rem;
    border: 1px solid rgba(123,140,255,0.3);
    border-radius: 7px;
    background: rgba(123,140,255,0.1);
    color: var(--accent2, #a5b0ff);
    font-family: 'Barlow', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s;
    flex-shrink: 0;
  }
  .fc-add-btn:hover { background: rgba(123,140,255,0.18); border-color: rgba(123,140,255,0.5); }
  .fc-add-btn:disabled { opacity: 0.4; cursor: default; }
`;

// Capitalize first letter of each word
function capitalize(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function FamilyCheckboxes({ value = [], onChange, disabled = false }) {
  const [knownFamilies, setKnownFamilies] = useState([]);
  const [newFamily,     setNewFamily]     = useState("");

  // Load known family names from server, merge with any already in value
  useEffect(() => {
    axios.get("/api/public/families")
      .then(r => {
        const serverNames = r.data.names || [];
        setKnownFamilies(prev => {
          const merged = [...new Set([...serverNames, ...prev, ...value.filter(f => f !== "__unknown__")])].sort();
          return merged;
        });
      })
      .catch(() => {
        // Fallback: at least show families already in value
        setKnownFamilies(value.filter(f => f !== "__unknown__").sort());
      });
  }, []);

  // If value has families not yet in knownFamilies, add them
  useEffect(() => {
    const extras = value.filter(f => f !== "__unknown__" && !knownFamilies.includes(f));
    if (extras.length) {
      setKnownFamilies(prev => [...new Set([...prev, ...extras])].sort());
    }
  }, [value]);

  const isUnknown = value.length === 0;

  function toggle(key) {
    if (disabled) return;
    if (value.includes(key)) {
      onChange(value.filter(f => f !== key));
    } else {
      onChange([...value, key]);
    }
  }

  function handleUnknown() {
    if (disabled) return;
    // Toggling "unknown" clears all selections (empty = unknown)
    if (!isUnknown) onChange([]);
  }

  function addNew() {
    const trimmed = newFamily.trim().toLowerCase().replace(/\s+/g, " ");
    if (!trimmed || disabled) return;
    if (!knownFamilies.includes(trimmed)) {
      setKnownFamilies(prev => [...new Set([...prev, trimmed])].sort());
    }
    if (!value.includes(trimmed)) {
      onChange([...value.filter(f => f !== "__unknown__"), trimmed]);
    }
    setNewFamily("");
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="fc-wrap">
        <div className="fc-checks">
          {knownFamilies.map(key => (
            <label
              key={key}
              className={`fc-check${value.includes(key) ? " checked" : ""}${disabled ? " disabled" : ""}`}
            >
              <input
                type="checkbox"
                checked={value.includes(key)}
                onChange={() => toggle(key)}
                disabled={disabled}
                style={{ accentColor: "#7b8cff" }}
              />
              {capitalize(key)}
            </label>
          ))}
        </div>

        <label className={`fc-unknown${disabled ? " disabled" : ""}`}>
          <input
            type="checkbox"
            checked={isUnknown}
            onChange={handleUnknown}
            disabled={disabled}
            style={{ accentColor: "#565c78" }}
          />
          Unknown / not sure
        </label>

        <div className="fc-add">
          <input
            className="fc-add-input"
            placeholder="Add a family name…"
            value={newFamily}
            disabled={disabled}
            onChange={e => setNewFamily(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addNew())}
          />
          <button
            className="fc-add-btn"
            onClick={addNew}
            disabled={disabled || !newFamily.trim()}
            type="button"
          >
            Add
          </button>
        </div>
      </div>
    </>
  );
}
