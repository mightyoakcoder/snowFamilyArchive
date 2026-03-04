import React, { useState, useRef, useEffect } from "react";
import api from "../api.js";

// ─── Field name mapping (backend uses image_date / people / description) ───
// Upload:  FormData fields → image_date, people (comma string), description
// Files:   response fields → id, image_date, people (array), description, size, original_filename
// PATCH:   { field: 'image_date'|'people'|'description', value: string }
// DELETE:  DELETE /api/files/:id

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

  .sfu-root {
    font-family: 'Barlow', sans-serif;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 2rem 1.25rem 3rem;
    box-sizing: border-box;
  }

  .sfu-inner {
    width: 100%;
    max-width: 620px;
    opacity: 0;
    transform: translateY(14px);
    animation: sfuFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    box-sizing: border-box;
  }

  @keyframes sfuFadeIn { to { opacity: 1; transform: translateY(0); } }
  @keyframes sfuSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .sfu-root { padding: 1.25rem 1rem 2rem; }
    .sfu-card-body { padding: 1.25rem !important; }
    .sfu-dropzone { padding: 2rem 1rem !important; }
  }

  .sfu-header { margin-bottom: 2rem; }
  .sfu-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); opacity: 0.8; margin-bottom: 0.6rem;
  }
  .sfu-title {
    font-size: clamp(1.7rem, 5vw, 2.1rem); font-weight: 600;
    letter-spacing: -0.01em; color: var(--text); line-height: 1.1; margin: 0;
  }
  .sfu-subtitle { font-size: 0.875rem; color: var(--text2); margin-top: 0.4rem; font-weight: 300; }

  .sfu-card {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.3);
  }
  .sfu-card-body { padding: 1.75rem; }

  .sfu-dropzone {
    border: 1.5px dashed var(--border2); border-radius: 12px; padding: 2.25rem 2rem;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; text-align: center; position: relative;
    transition: border-color 0.2s, background 0.2s; background: var(--bg); overflow: hidden;
  }
  .sfu-dropzone:hover { border-color: var(--accent); background: rgba(123,140,255,0.04); }
  .sfu-dropzone.active { border-color: var(--accent); background: rgba(123,140,255,0.07); border-style: solid; }
  .sfu-dropzone.active::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 50%, rgba(123,140,255,0.09) 0%, transparent 70%);
    pointer-events: none;
  }
  .sfu-upload-icon {
    width: 44px; height: 44px; margin-bottom: 1rem; opacity: 0.45;
    transition: opacity 0.2s, transform 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .sfu-dropzone:hover .sfu-upload-icon,
  .sfu-dropzone.active .sfu-upload-icon { opacity: 1; transform: translateY(-4px); }
  .sfu-drop-label { font-size: 0.95rem; font-weight: 500; color: var(--text); margin-bottom: 0.25rem; }
  .sfu-drop-sub { font-size: 0.78rem; color: var(--dim); font-family: 'DM Mono', monospace; }

  /* ── Per-file cards ───────────────────────────────────────────────────── */
  .sfu-file-list { margin-top: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

  .sfu-file-card {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 12px; overflow: hidden; animation: sfuSlideIn 0.2s ease;
  }

  .sfu-file-card-header {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }
  .sfu-file-card-header:hover { background: rgba(123,140,255,0.04); }

  .sfu-file-badge {
    background: rgba(123,140,255,0.15); color: var(--accent2);
    border: 1px solid rgba(123,140,255,0.25); font-family: 'DM Mono', monospace;
    font-size: 9px; font-weight: 500; letter-spacing: 0.05em; padding: 3px 7px;
    border-radius: 6px; flex-shrink: 0; min-width: 34px; text-align: center;
  }
  .sfu-file-name { font-size: 0.85rem; font-weight: 500; color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sfu-file-size { font-family: 'DM Mono', monospace; font-size: 0.72rem; color: var(--dim); flex-shrink: 0; }

  .sfu-file-status {
    font-family: 'DM Mono', monospace; font-size: 0.68rem; letter-spacing: 0.05em;
    padding: 2px 8px; border-radius: 99px; flex-shrink: 0;
  }
  .sfu-file-status.pending  { color: var(--dim);     background: rgba(86,92,120,0.15);  border: 1px solid rgba(86,92,120,0.25); }
  .sfu-file-status.uploading{ color: var(--accent2); background: rgba(123,140,255,0.12); border: 1px solid rgba(123,140,255,0.25); }
  .sfu-file-status.done     { color: var(--success);  background: rgba(74,222,152,0.1);  border: 1px solid rgba(74,222,152,0.25); }
  .sfu-file-status.error    { color: var(--error);    background: rgba(240,112,112,0.1); border: 1px solid rgba(240,112,112,0.25); }

  .sfu-chevron {
    color: var(--dim); flex-shrink: 0; transition: transform 0.2s;
  }
  .sfu-chevron.open { transform: rotate(180deg); }

  .sfu-file-remove {
    background: none; border: none; cursor: pointer; color: var(--dim);
    padding: 0.2rem; line-height: 1; transition: color 0.15s; flex-shrink: 0; display: flex; align-items: center;
    border-radius: 4px;
  }
  .sfu-file-remove:hover { color: var(--error); }

  .sfu-file-card-body {
    border-top: 1px solid var(--border);
    padding: 1rem 0.875rem 1rem;
  }

  .sfu-preview { margin-bottom: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid var(--border2); }
  .sfu-preview img { width: 100%; max-height: 130px; object-fit: cover; display: block; }

  .sfu-fields { display: flex; flex-direction: column; gap: 0.75rem; }
  .sfu-field { display: flex; flex-direction: column; gap: 0.35rem; }
  .sfu-label {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim);
  }
  .sfu-input, .sfu-textarea {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.6rem 0.75rem; font-family: 'Barlow', sans-serif; font-size: 0.875rem;
    color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%; box-sizing: border-box;
  }
  .sfu-input:focus, .sfu-textarea:focus {
    border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12);
  }
  .sfu-input::placeholder, .sfu-textarea::placeholder { color: var(--dim); }
  .sfu-textarea { resize: vertical; min-height: 70px; line-height: 1.5; }
  .sfu-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

  /* People tag input */
  .sfu-people-wrap { position: relative; }
  .sfu-people-box {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.5rem 0.75rem; display: flex; flex-wrap: wrap; gap: 0.4rem;
    align-items: center; transition: border-color 0.15s, box-shadow 0.15s; cursor: text;
    min-height: 42px;
  }
  .sfu-people-box:focus-within {
    border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12);
  }
  .sfu-tag {
    display: flex; align-items: center; gap: 0.3rem;
    background: rgba(123,140,255,0.15); border: 1px solid rgba(123,140,255,0.25);
    color: var(--accent2); font-size: 0.78rem;
    padding: 2px 8px 2px 10px; border-radius: 99px; white-space: nowrap;
  }
  .sfu-tag-remove {
    background: none; border: none; cursor: pointer; color: var(--accent2);
    padding: 0; line-height: 1; display: flex; opacity: 0.6; transition: opacity 0.15s;
  }
  .sfu-tag-remove:hover { opacity: 1; }
  .sfu-people-input {
    background: none; border: none; outline: none; color: var(--text);
    font-family: 'Barlow', sans-serif; font-size: 0.875rem;
    flex: 1; min-width: 120px; padding: 0.15rem 0;
  }
  .sfu-people-input::placeholder { color: var(--dim); }

  .sfu-suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px;
    overflow: hidden; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: sfuSlideIn 0.15s ease;
  }
  .sfu-suggestion { padding: 0.6rem 0.875rem; font-size: 0.875rem; color: var(--text2); cursor: pointer; transition: background 0.1s, color 0.1s; }
  .sfu-suggestion:hover, .sfu-suggestion.focused { background: rgba(123,140,255,0.1); color: var(--text); }
  .sfu-suggestion mark { background: none; color: var(--accent2); font-weight: 600; }

  /* Apply-to-all bar */
  .sfu-apply-bar {
    margin-top: 1.25rem; padding: 0.875rem 1rem;
    background: rgba(123,140,255,0.06); border: 1px solid rgba(123,140,255,0.18);
    border-radius: 10px; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
  }
  .sfu-apply-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent2); flex-shrink: 0; }
  .sfu-apply-btn {
    padding: 0.35rem 0.8rem; border: 1px solid rgba(123,140,255,0.3); border-radius: 7px;
    background: rgba(123,140,255,0.1); color: var(--accent2); font-family: 'Barlow', sans-serif;
    font-size: 0.78rem; font-weight: 500; cursor: pointer; transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .sfu-apply-btn:hover { background: rgba(123,140,255,0.18); border-color: rgba(123,140,255,0.5); }

  /* Progress */
  .sfu-progress-wrap { margin-top: 1.25rem; }
  .sfu-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .sfu-progress-label { font-family: 'DM Mono', monospace; font-size: 0.68rem; letter-spacing: 0.12em; color: var(--dim); text-transform: uppercase; }
  .sfu-progress-pct { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--accent); }
  .sfu-progress-track { height: 4px; background: var(--border2); border-radius: 99px; overflow: hidden; }
  .sfu-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 99px;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative; overflow: hidden;
  }
  .sfu-progress-bar::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
    animation: sfuShimmer 1.2s ease-in-out infinite;
  }
  @keyframes sfuShimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .sfu-btn {
    margin-top: 1.5rem; width: 100%; padding: 0.85rem 1rem; border: none; border-radius: 10px;
    cursor: pointer; font-family: 'Barlow', sans-serif; font-size: 0.875rem; font-weight: 600;
    letter-spacing: 0.04em; transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    background: var(--accent); color: #fff; box-shadow: 0 2px 16px rgba(123,140,255,0.25);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  }
  .sfu-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 24px rgba(123,140,255,0.4); }
  .sfu-btn:active:not(:disabled) { transform: translateY(0); }
  .sfu-btn:disabled { background: var(--surface2); color: var(--dim); cursor: not-allowed; box-shadow: none; }
  .sfu-btn-loader { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: spin 0.65s linear infinite; flex-shrink: 0; }

  .sfu-message {
    margin-top: 1rem; padding: 0.65rem 0.875rem; border-radius: 8px; font-size: 0.8rem;
    font-family: 'DM Mono', monospace; letter-spacing: 0.02em;
    display: flex; align-items: center; gap: 0.5rem; animation: sfuSlideIn 0.2s ease;
  }
  .sfu-message.success { background: rgba(74,222,152,0.07); border: 1px solid rgba(74,222,152,0.2); color: var(--success); }
  .sfu-message.error   { background: rgba(240,112,112,0.07); border: 1px solid rgba(240,112,112,0.2); color: var(--error); }
  .sfu-message-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .sfu-message.success .sfu-message-dot { background: var(--success); }
  .sfu-message.error   .sfu-message-dot { background: var(--error); }

  /* Search */
  .sfu-search-wrap { position: relative; margin-bottom: 0.875rem; }
  .sfu-search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--dim); pointer-events: none; }
  .sfu-search {
    width: 100%; background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.6rem 0.75rem 0.6rem 2.25rem; font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; color: var(--text); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
  }
  .sfu-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12); }
  .sfu-search::placeholder { color: var(--dim); }

  /* Records list */
  .sfu-recent { margin-top: 2rem; }
  .sfu-recent-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.875rem; }
  .sfu-recent-title { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dim); white-space: nowrap; }
  .sfu-recent-line { flex: 1; height: 1px; background: var(--border); }

  .sfu-record {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 12px;
    margin-bottom: 0.75rem; overflow: hidden; animation: sfuSlideIn 0.2s ease;
  }
  .sfu-record-main { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; }
  .sfu-row-ext {
    font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.05em;
    color: var(--accent2); background: rgba(123,140,255,0.1); border: 1px solid rgba(123,140,255,0.18);
    padding: 2px 6px; border-radius: 6px; min-width: 32px; text-align: center; flex-shrink: 0;
  }
  .sfu-record-info { flex: 1; min-width: 0; cursor: pointer; }
  .sfu-record-name { font-size: 0.875rem; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sfu-record-meta { display: flex; gap: 0.75rem; margin-top: 0.2rem; flex-wrap: wrap; }
  .sfu-record-date { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); }
  .sfu-record-date.unknown { color: var(--warn); opacity: 0.7; }
  .sfu-record-size { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); }
  .sfu-record-actions { display: flex; gap: 0.25rem; flex-shrink: 0; align-items: center; }

  .sfu-icon-btn {
    background: none; border: none; cursor: pointer; color: var(--dim);
    padding: 0.3rem; border-radius: 6px; display: flex; align-items: center;
    transition: color 0.15s, background 0.15s;
  }
  .sfu-icon-btn.edit:hover   { color: var(--accent); background: rgba(123,140,255,0.1); }
  .sfu-icon-btn.delete:hover { color: var(--error);  background: rgba(240,112,112,0.1); }
  .sfu-icon-btn.cancel:hover { color: var(--text2);  background: var(--surface2); }

  .sfu-confirm { display: flex; align-items: center; gap: 0.4rem; }
  .sfu-btn-danger {
    padding: 0.3rem 0.7rem; border: none; border-radius: 6px;
    background: var(--error); color: #fff; font-family: 'Barlow', sans-serif;
    font-size: 0.775rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; white-space: nowrap;
  }
  .sfu-btn-danger:hover { opacity: 0.85; }

  .sfu-record-details {
    border-top: 1px solid var(--border); padding: 0.75rem 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .sfu-detail-row { display: flex; gap: 0.5rem; align-items: flex-start; }
  .sfu-detail-key { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dim); flex-shrink: 0; min-width: 52px; padding-top: 2px; }
  .sfu-detail-val { font-size: 0.825rem; color: var(--text2); line-height: 1.5; }
  .sfu-person-pill {
    display: inline-flex; align-items: center;
    background: rgba(123,140,255,0.1); border: 1px solid rgba(123,140,255,0.2);
    color: var(--accent2); font-size: 0.75rem; padding: 1px 8px; border-radius: 99px; margin: 1px 2px;
  }

  /* Edit modal */
  .sfu-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.65);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 1rem; animation: sfuFadeIn 0.15s ease;
  }
  .sfu-modal {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 16px;
    padding: 1.75rem; width: 100%; max-width: 480px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5); animation: sfuSlideIn 0.2s ease;
  }
  .sfu-modal-title { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0 0 1.25rem; }
  .sfu-modal-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .sfu-btn-secondary {
    flex: 1; padding: 0.75rem; border: 1px solid var(--border2); border-radius: 10px;
    background: none; color: var(--text2); font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: border-color 0.15s, color 0.15s;
  }
  .sfu-btn-secondary:hover { border-color: var(--accent); color: var(--text); }
  .sfu-btn-primary {
    flex: 1; padding: 0.75rem; border: none; border-radius: 10px;
    background: var(--accent); color: #fff; font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s; box-shadow: 0 2px 12px rgba(123,140,255,0.25);
  }
  .sfu-btn-primary:hover { opacity: 0.88; }

  .sfu-empty { font-family: 'DM Mono', monospace; font-size: 0.73rem; color: var(--dim); padding: 1.5rem 0; text-align: center; letter-spacing: 0.06em; }
  .sfu-hidden { display: none; }

  /* Privacy toggle */
  .sfu-privacy-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.65rem 0.875rem; background: var(--bg);
    border: 1px solid var(--border2); border-radius: 8px; cursor: pointer;
    transition: border-color 0.15s;
  }
  .sfu-privacy-row:hover { border-color: var(--accent); }
  .sfu-privacy-row.private { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.04); }
  .sfu-privacy-left { display: flex; align-items: center; gap: 0.6rem; }
  .sfu-privacy-icon { color: var(--dim); flex-shrink: 0; }
  .sfu-privacy-row.private .sfu-privacy-icon { color: var(--warn); }
  .sfu-privacy-text { font-size: 0.85rem; font-weight: 500; color: var(--text2); }
  .sfu-privacy-row.private .sfu-privacy-text { color: var(--warn); }
  .sfu-privacy-sub { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--dim); margin-top: 1px; }
  .sfu-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .sfu-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .sfu-toggle-track { position: absolute; inset: 0; background: var(--border2); border-radius: 99px; transition: background 0.2s; }
  .sfu-toggle input:checked + .sfu-toggle-track { background: var(--warn); }
  .sfu-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s; pointer-events: none; }
  .sfu-toggle input:checked ~ .sfu-toggle-thumb { transform: translateX(16px); }
  .sfu-lock-badge { color: var(--warn); opacity: 0.8; flex-shrink: 0; display: flex; align-items: center; }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getFileExt(name) {
  return name?.split(".").pop()?.toUpperCase() || "FILE";
}

function peopleArrayToString(arr) {
  return (arr || []).join(", ");
}

function buildCorpus(files) {
  const set = new Set();
  files.forEach(f => (f.people || []).forEach(p => set.add(p)));
  return [...set];
}

// ── People tag input ───────────────────────────────────────────────────────
function PeopleInput({ value, onChange, corpus }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef();

  const suggestions = input.trim()
    ? corpus.filter(p => p.toLowerCase().includes(input.toLowerCase()) && !value.includes(p))
    : [];

  function addPerson(name) {
    const t = name.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput(""); setShowSuggestions(false); setFocusedIdx(-1);
    inputRef.current?.focus();
  }

  function removePerson(name) { onChange(value.filter(p => p !== name)); }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (focusedIdx >= 0 && suggestions[focusedIdx]) addPerson(suggestions[focusedIdx]);
      else if (input.trim()) addPerson(input);
    } else if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="sfu-people-wrap">
      <div className="sfu-people-box" onClick={() => inputRef.current?.focus()}>
        {value.map(p => (
          <span key={p} className="sfu-tag">
            {p}
            <button className="sfu-tag-remove" onClick={e => { e.stopPropagation(); removePerson(p); }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="sfu-people-input"
          placeholder={value.length === 0 ? "Add a person, press Enter…" : ""}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); setFocusedIdx(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="sfu-suggestions">
          {suggestions.map((s, i) => {
            const idx = s.toLowerCase().indexOf(input.toLowerCase());
            return (
              <div
                key={s}
                className={`sfu-suggestion${i === focusedIdx ? " focused" : ""}`}
                onMouseDown={() => addPerson(s)}
              >
                {s.slice(0, idx)}
                <mark>{s.slice(idx, idx + input.length)}</mark>
                {s.slice(idx + input.length)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Privacy toggle ─────────────────────────────────────────────────────────
function PrivacyToggle({ value, onChange }) {
  return (
    <div
      className={`sfu-privacy-row${value ? " private" : ""}`}
      onClick={() => onChange(!value)}
    >
      <div className="sfu-privacy-left">
        <span className="sfu-privacy-icon">
          {value ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="3" y="6.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="3" y="6.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 6.5V4.5a2.5 2.5 0 0 1 5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M10 6.5V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )}
        </span>
        <div>
          <div className="sfu-privacy-text">{value ? "Private — family only" : "Public — visible to everyone"}</div>
          <div className="sfu-privacy-sub">{value ? "Only logged-in users can see this" : "Anyone visiting the site can see this"}</div>
        </div>
      </div>
      <label className="sfu-toggle" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
        <span className="sfu-toggle-track" />
        <span className="sfu-toggle-thumb" />
      </label>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ file, corpus, onSave, onClose }) {
  const [date,      setDate]      = useState(file.image_date || "");
  const [desc,      setDesc]      = useState(file.description || "");
  const [people,    setPeople]    = useState(file.people || []);
  const [isPrivate, setIsPrivate] = useState(file.is_private ?? false);

  return (
    <div className="sfu-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sfu-modal">
        <p className="sfu-modal-title">Edit — {file.original_filename}</p>
        <div className="sfu-fields">
          <div className="sfu-field">
            <label className="sfu-label">Date</label>
            <input className="sfu-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="sfu-field">
            <label className="sfu-label">People</label>
            <PeopleInput value={people} onChange={setPeople} corpus={corpus} />
          </div>
          <div className="sfu-field">
            <label className="sfu-label">Description</label>
            <textarea className="sfu-textarea" placeholder="Additional information…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="sfu-field">
            <label className="sfu-label">Visibility</label>
            <PrivacyToggle value={isPrivate} onChange={setIsPrivate} />
          </div>
        </div>
        <div className="sfu-modal-actions">
          <button className="sfu-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="sfu-btn-primary"
            onClick={() => onSave({ image_date: date, people, description: desc, is_private: isPrivate })}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File metadata card ─────────────────────────────────────────────────────
// Renders the collapsible per-file card in the pending queue
function FileMetaCard({ entry, corpus, onChange, onRemove, disabled }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="sfu-file-card">
      {/* Header row — click to collapse / expand */}
      <div className="sfu-file-card-header" onClick={() => setOpen(o => !o)}>
        <span className="sfu-file-badge">{getFileExt(entry.file.name)}</span>
        <span className="sfu-file-name">{entry.file.name}</span>
        <span className="sfu-file-size">{formatFileSize(entry.file.size)}</span>

        {/* Status pill */}
        <span className={`sfu-file-status ${entry.status}`}>
          {entry.status === "pending"   && "pending"}
          {entry.status === "uploading" && `${entry.progress}%`}
          {entry.status === "done"      && "done"}
          {entry.status === "error"     && "error"}
        </span>

        {/* Chevron */}
        <svg className={`sfu-chevron${open ? " open" : ""}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        {/* Remove button — stop propagation so it doesn't toggle collapse */}
        {entry.status !== "uploading" && (
          <button
            className="sfu-file-remove"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {open && (
        <div className="sfu-file-card-body">
          {/* Image preview */}
          {entry.preview && (
            <div className="sfu-preview">
              <img src={entry.preview} alt="Preview" />
            </div>
          )}

          {/* Per-file progress bar */}
          {entry.status === "uploading" && (
            <div className="sfu-progress-wrap" style={{ marginBottom: "0.875rem", marginTop: 0 }}>
              <div className="sfu-progress-track">
                <div className="sfu-progress-bar" style={{ width: `${entry.progress}%` }} />
              </div>
            </div>
          )}

          {/* Metadata fields */}
          <div className="sfu-fields">
            <div className="sfu-field">
              <label className="sfu-label">Date</label>
              <input
                className="sfu-input"
                type="date"
                value={entry.date}
                disabled={disabled}
                onChange={e => onChange({ date: e.target.value })}
              />
            </div>
            <div className="sfu-field">
              <label className="sfu-label">People</label>
              <PeopleInput
                value={entry.people}
                onChange={people => onChange({ people })}
                corpus={corpus}
              />
            </div>
            <div className="sfu-field">
              <label className="sfu-label">Description</label>
              <textarea
                className="sfu-textarea"
                placeholder="Additional information…"
                value={entry.desc}
                disabled={disabled}
                onChange={e => onChange({ desc: e.target.value })}
              />
            </div>
            <div className="sfu-field">
              <label className="sfu-label">Visibility</label>
              <PrivacyToggle value={entry.isPrivate} onChange={val => onChange({ isPrivate: val })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unique ID helper ───────────────────────────────────────────────────────
let _uid = 0;
function uid() { return ++_uid; }

// ── Main component ─────────────────────────────────────────────────────────
export default function MultiFileUploader() {
  const fileInputRef   = useRef();
  const progressTimers = useRef({});  // uid → interval id

  // Queue of { id, file, preview, date, people, desc, status, progress, error }
  const [queue,        setQueue]        = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [overallProg,  setOverallProg]  = useState(0);
  const [dragActive,   setDragActive]   = useState(false);
  const [message,      setMessage]      = useState(null);

  // Shared-apply fields
  const [sharedDate,   setSharedDate]   = useState("");
  const [sharedPeople, setSharedPeople] = useState([]);
  const [sharedDesc,   setSharedDesc]   = useState("");

  // Uploaded files list
  const [files,        setFiles]        = useState([]);
  const [currentUser,   setCurrentUser]   = useState(undefined);
  const [search,       setSearch]       = useState("");
  const [expanded,     setExpanded]     = useState(null);
  const [editingFile,  setEditingFile]  = useState(null);
  const [confirmDelete,setConfirmDelete]= useState(null);

  useEffect(() => {
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      const unsub = onAuthStateChanged(auth, user => setCurrentUser(user ?? null));
      return unsub;
    }).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (currentUser !== undefined) loadFiles();
  }, [currentUser]);
  useEffect(() => () => Object.values(progressTimers.current).forEach(clearInterval), []);

  const corpus = buildCorpus(files);

  // ── Add files to queue ───────────────────────────────────────────────────
  function addFiles(fileList) {
    const newEntries = Array.from(fileList).map(file => ({
      id:        uid(),
      file,
      preview:   file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      date:      "",
      people:    [],
      desc:      "",
      isPrivate: false,
      status:    "pending",
      progress:  0,
      error:     null,
    }));
    setQueue(q => [...q, ...newEntries]);
    setMessage(null);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function removeFromQueue(id) {
    setQueue(q => {
      const entry = q.find(e => e.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return q.filter(e => e.id !== id);
    });
  }

  function updateEntry(id, patch) {
    setQueue(q => q.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  // ── Apply shared metadata to all pending entries ─────────────────────────
  function applySharedToAll() {
    setQueue(q => q.map(e => {
      if (e.status !== "pending") return e;
      return {
        ...e,
        date:   sharedDate   || e.date,
        people: sharedPeople.length ? sharedPeople : e.people,
        desc:   sharedDesc   || e.desc,
      };
    }));
  }

  // ── Upload all pending files sequentially ────────────────────────────────
  async function uploadAll() {
    const pending = queue.filter(e => e.status === "pending");
    if (!pending.length) return;

    setUploading(true);
    setMessage(null);
    let doneCount = 0;

    for (const entry of pending) {
      updateEntry(entry.id, { status: "uploading", progress: 0 });

      const formData = new FormData();
      formData.append("file",        entry.file);
      formData.append("image_date",  entry.date);
      formData.append("people",      peopleArrayToString(entry.people));
      formData.append("description", entry.desc);
      formData.append("is_private",  String(entry.isPrivate));

      try {
        await api.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: e => {
            if (!e.total) return;
            const pct = Math.round((e.loaded / e.total) * 90);
            updateEntry(entry.id, { progress: pct });

            if (e.loaded >= e.total) {
              clearInterval(progressTimers.current[entry.id]);
              progressTimers.current[entry.id] = setInterval(() => {
                setQueue(q => q.map(en => {
                  if (en.id !== entry.id) return en;
                  const next = en.progress + Math.max(1, Math.round((99 - en.progress) / 8));
                  if (next >= 99) { clearInterval(progressTimers.current[entry.id]); return { ...en, progress: 99 }; }
                  return { ...en, progress: next };
                }));
              }, 200);
            }
          },
        });

        clearInterval(progressTimers.current[entry.id]);
        updateEntry(entry.id, { status: "done", progress: 100 });
        doneCount++;

        // Overall progress
        setOverallProg(Math.round((doneCount / pending.length) * 100));

      } catch (err) {
        clearInterval(progressTimers.current[entry.id]);
        updateEntry(entry.id, {
          status: "error",
          error: err.response?.data?.error || err.message,
        });
      }
    }

    setUploading(false);
    setOverallProg(0);

    const errors = queue.filter(e => e.status === "error").length +
      pending.filter(e => e.status === "error").length;

    if (doneCount === pending.length) {
      setMessage({ type: "success", text: `${doneCount} file${doneCount !== 1 ? "s" : ""} uploaded successfully` });
      // Clear done entries after a short delay
      setTimeout(() => {
        setQueue(q => q.filter(e => e.status !== "done"));
      }, 1500);
    } else {
      setMessage({ type: "error", text: `${doneCount} uploaded, ${pending.length - doneCount} failed` });
    }

    loadFiles();
  }

  // ── Load files ───────────────────────────────────────────────────────────
  async function loadFiles() {
    try {
      const endpoint = currentUser ? "/api/files" : "/api/public/files";
      const res = await api.get(endpoint);
      setFiles(res.data.files || []);
    } catch {}
  }

  // ── Save edits ───────────────────────────────────────────────────────────
  async function saveEdit(fileId, patch) {
    const updates = [
      { field: "image_date",  value: patch.image_date  || "" },
      { field: "people",      value: peopleArrayToString(patch.people) },
      { field: "description", value: patch.description || "" },
      { field: "is_private",  value: String(patch.is_private ?? false) },
    ];
    try {
      await Promise.all(updates.map(u => api.patch(`/api/files/${fileId}`, u).catch(() => {})));
    } catch {}
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, image_date: patch.image_date, people: patch.people, description: patch.description, is_private: patch.is_private }
        : f
    ));
    setEditingFile(null);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteFile(fileId) {
    try { await api.delete(`/api/files/${fileId}`); } catch {}
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setConfirmDelete(null);
    if (expanded === fileId) setExpanded(null);
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredFiles = files.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.original_filename?.toLowerCase().includes(q) ||
      (f.people || []).some(p => p.toLowerCase().includes(q)) ||
      f.description?.toLowerCase().includes(q)
    );
  });

  const pendingCount = queue.filter(e => e.status === "pending").length;

  return (
    <>
      <style>{STYLES}</style>

      {editingFile && (
        <EditModal
          file={editingFile}
          corpus={corpus}
          onSave={patch => saveEdit(editingFile.id, patch)}
          onClose={() => setEditingFile(null)}
        />
      )}

      <section className="sfu-root">
        <div className="sfu-inner">

          <div className="sfu-header">
            <div className="sfu-eyebrow">File Transfer</div>
            <h1 className="sfu-title">Upload Files</h1>
            <p className="sfu-subtitle">Add one or more files — fill in metadata for each, then upload all at once</p>
          </div>

          <div className="sfu-card">
            <div className="sfu-card-body">

              {/* Drop zone */}
              <div
                className={`sfu-dropzone${dragActive ? " active" : ""}`}
                onClick={() => fileInputRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <svg className="sfu-upload-icon" viewBox="0 0 52 52" fill="none">
                  <rect x="1" y="1" width="50" height="50" rx="10" stroke="#7b8cff" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <path d="M26 34V20M26 20L20 26M26 20L32 26" stroke="#7b8cff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 36h16" stroke="#7b8cff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                </svg>
                <div className="sfu-drop-label">{dragActive ? "Release to drop" : "Drop your files here"}</div>
                <div className="sfu-drop-sub">or click to browse — multiple files supported</div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="sfu-hidden"
                multiple
                onChange={e => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ""; }}
              />

              {/* File queue */}
              {queue.length > 0 && (
                <>
                  {/* Apply-to-all shared metadata bar */}
                  {pendingCount > 1 && (
                    <div className="sfu-apply-bar">
                      <span className="sfu-apply-label">Apply to all</span>
                      <input
                        className="sfu-input"
                        type="date"
                        value={sharedDate}
                        style={{ maxWidth: 160, marginTop: 0 }}
                        onChange={e => setSharedDate(e.target.value)}
                      />
                      <button className="sfu-apply-btn" onClick={applySharedToAll}>
                        Apply date &amp; metadata →
                      </button>
                    </div>
                  )}

                  <div className="sfu-file-list">
                    {queue.map(entry => (
                      <FileMetaCard
                        key={entry.id}
                        entry={entry}
                        corpus={corpus}
                        disabled={uploading}
                        onChange={patch => updateEntry(entry.id, patch)}
                        onRemove={() => removeFromQueue(entry.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Overall progress bar while uploading */}
              {uploading && (
                <div className="sfu-progress-wrap">
                  <div className="sfu-progress-header">
                    <span className="sfu-progress-label">Uploading batch</span>
                    <span className="sfu-progress-pct">{overallProg}%</span>
                  </div>
                  <div className="sfu-progress-track">
                    <div className="sfu-progress-bar" style={{ width: `${overallProg}%` }} />
                  </div>
                </div>
              )}

              <button
                className="sfu-btn"
                onClick={uploadAll}
                disabled={pendingCount === 0 || uploading}
              >
                {uploading
                  ? <><span className="sfu-btn-loader" />Uploading…</>
                  : pendingCount > 0
                    ? `Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`
                    : "Upload Files"}
              </button>

              {message && (
                <div className={`sfu-message ${message.type}`}>
                  <span className="sfu-message-dot" />{message.text}
                </div>
              )}

            </div>
          </div>

          {/* Uploads list */}
          <div className="sfu-recent">
            <div className="sfu-recent-header">
              <span className="sfu-recent-title">Uploads</span>
              <div className="sfu-recent-line" />
            </div>

            <div className="sfu-search-wrap">
              <svg className="sfu-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                className="sfu-search"
                placeholder="Search by name, person, or description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {filteredFiles.length === 0 ? (
              <div className="sfu-empty">{search ? "no results" : "no files yet"}</div>
            ) : (
              filteredFiles.map(file => (
                <div key={file.id} className="sfu-record">
                  <div className="sfu-record-main">
                    <span className="sfu-row-ext">{getFileExt(file.original_filename)}</span>
                    <div
                      className="sfu-record-info"
                      onClick={() => setExpanded(expanded === file.id ? null : file.id)}
                    >
                      <div className="sfu-record-name">{file.original_filename}</div>
                      <div className="sfu-record-meta">
                        <span className={`sfu-record-date${!file.image_date ? " unknown" : ""}`}>
                          {file.image_date || "unknown"}
                        </span>
                        <span className="sfu-record-size">{formatFileSize(file.size)}</span>
                        {(file.people || []).length > 0 && (
                          <span className="sfu-record-date">
                            {file.people.length} person{file.people.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sfu-record-actions">
                      {file.is_private && (
                        <span className="sfu-lock-badge" title="Private — family only">
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <rect x="2.5" y="5.5" width="8" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M4.5 5.5V3.8a2 2 0 0 1 4 0v1.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                        </span>
                      )}
                      <button className="sfu-icon-btn edit" title="Edit" onClick={() => setEditingFile(file)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {confirmDelete === file.id ? (
                        <div className="sfu-confirm">
                          <button className="sfu-btn-danger" onClick={() => deleteFile(file.id)}>Delete</button>
                          <button className="sfu-icon-btn cancel" title="Cancel" onClick={() => setConfirmDelete(null)}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button className="sfu-icon-btn delete" title="Delete" onClick={() => setConfirmDelete(file.id)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {expanded === file.id && (
                    <div className="sfu-record-details">
                      {(file.people || []).length > 0 && (
                        <div className="sfu-detail-row">
                          <span className="sfu-detail-key">People</span>
                          <span className="sfu-detail-val">
                            {file.people.map(p => <span key={p} className="sfu-person-pill">{p}</span>)}
                          </span>
                        </div>
                      )}
                      {file.description && (
                        <div className="sfu-detail-row">
                          <span className="sfu-detail-key">Notes</span>
                          <span className="sfu-detail-val">{file.description}</span>
                        </div>
                      )}
                      {!file.description && (!file.people || file.people.length === 0) && (
                        <span className="sfu-detail-val" style={{opacity:0.4, fontStyle:"italic", fontSize:"0.8rem"}}>
                          No additional details
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </section>
    </>
  );
}
